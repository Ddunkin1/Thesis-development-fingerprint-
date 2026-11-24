using libzkfpcsharp;

namespace ChaqBridge;

public sealed class ScannerLostException : Exception
{
    public ScannerLostException() : base("Scanner is not connected.") { }
}

/// <summary>The scanner is open but the fingerprints are still being downloaded (a few seconds after start or re-plug).</summary>
public sealed class ScannerStartingException : Exception
{
    public ScannerStartingException() : base("Loading fingerprints, please try again in a moment.") { }
}

public sealed record IdentifyResult(string Status, long? UserId = null, int? Score = null, int? FingerIndex = null);

public sealed record EnrollResult(bool Ok, string? Code = null, string? Message = null, string? TemplateBase64 = null, long? MatchedUserId = null);

/// <summary>
/// Everything that talks to the ZKTeco SDK (libzkfpcsharp -> libzkfp.dll).
/// The call sequence is the same one the SDK demo (Demo2\Form1.cs) uses:
///   Init -> GetDeviceCount -> OpenDevice -> DBInit -> (AcquireFingerprint loop) -> DBMerge / DBAdd / DBIdentify / DBMatch.
/// Matching ALWAYS happens here, in memory; the database is never touched by the bridge.
/// </summary>
public sealed class ScannerService : IDisposable
{
    private const int TemplateBuf = 2048;   // the SDK demo uses 2048-byte template buffers
    private const int EnrollScans = 3;      // REGISTER_FINGER_COUNT in the demo

    private IntPtr _dev = IntPtr.Zero;      // device handle (OpenDevice)
    private IntPtr _db = IntPtr.Zero;       // in-memory matching cache handle (DBInit)
    private bool _libReady;
    private int _w, _h;
    private byte[] _img = Array.Empty<byte>();

    private Thread? _capThread;
    private volatile bool _capStop;
    private volatile bool _lost;
    private long _lastCapture;              // Environment.TickCount64 of the last successful capture

    private readonly object _pendingGate = new();
    private TaskCompletionSource<byte[]?>? _pending;   // someone is waiting for a finger

    private readonly object _dbGate = new();            // protects every native DB call + the id map
    private readonly Dictionary<int, (long UserId, int Finger)> _map = new();

    private readonly SemaphoreSlim _opLock = new(1, 1); // one scan operation (enroll / identify) at a time
    private readonly object _opCtsGate = new();
    private CancellationTokenSource? _currentOp;

    private CancellationTokenSource _monitorCts = new();

    // ---- state read by /status and the status window ----
    public bool Connected { get; private set; }
    /// <summary>What Windows says: true = the USB scanner is plugged in (it may still be starting), false = unplugged, null = unknown.</summary>
    public bool? UsbPresent { get; private set; }
    /// <summary>True from start / SDK reset until the templates have been downloaded again. Scans are refused meanwhile,
    /// otherwise a registered finger would be reported as "not recognized".</summary>
    public volatile bool TemplatesPending = true;
    public string? LastError { get; private set; }
    public int TemplatesLoaded { get; private set; }
    public DateTime? LastScanAt { get; private set; }
    public string LastScanResult { get; private set; } = "-";
    public volatile int LastAcquireCode;   // debug: last return code of AcquireFingerprint
    public int Captures;                   // debug: number of successful captures
    public volatile bool EnrollActive;
    public volatile int EnrollCount;
    public volatile string EnrollMessage = "";

    // ------------------------------------------------------------------ lifecycle

    public void Start() => Task.Run(MonitorLoopAsync);

    /// <summary>Raised when the scanner connects (true) or disconnects (false); the status window shows a tray notification.</summary>
    public event Action<bool>? ConnectionChanged;
    /// <summary>Raised after the SDK was reset: the in-memory templates are gone and must be downloaded again.</summary>
    public event Action? NeedsTemplates;

    private const string UsbVendorId = "1B55";   // ZKTeco (the Live20R shows up as VID_1B55)
    private bool? _lastUsb;
    private int _openFailures;
    private bool _needsReload = true;   // true at start: the first successful open also triggers a template download

    /// <summary>
    /// Keeps the scanner connected. Every 2 seconds it asks Windows whether the USB device is plugged in:
    ///   unplugged  -> stop capturing, close the device and RESET the SDK (so a stale handle is never reused);
    ///   plugged in -> initialise the SDK again, reopen the scanner and ask for the templates to be re-downloaded.
    /// So after an accidental unplug it is usable again within a few seconds, with nobody touching the PC.
    /// </summary>
    private async Task MonitorLoopAsync()
    {
        while (!_monitorCts.IsCancellationRequested)
        {
            try
            {
                bool? usb = UsbPresence.IsVendorPresent(UsbVendorId);   // null = Windows could not tell
                UsbPresent = usb;

                if (usb == false)
                {
                    if (Connected) HandleRemoval();
                    LastError = "Scanner unplugged. Plug the USB cable back in.";
                }
                else
                {
                    // Freshly re-plugged: never trust the SDK state from before the removal.
                    if (_lastUsb == false && _libReady) ResetLibrary();
                    if (Connected && _lost) HandleRemoval();
                    if (!_libReady) InitLibrary();
                    if (_libReady)
                    {
                        // only when Windows cannot tell: fall back to asking the SDK
                        if (Connected && usb == null && zkfp2.GetDeviceCount() <= 0) HandleRemoval();
                        if (!Connected && !TryOpenDevice() && usb == true && ++_openFailures >= 3)
                        {
                            AppLog.Add("Scanner is plugged in but would not open: resetting the driver.");
                            ResetLibrary();
                            _openFailures = 0;
                        }
                    }
                }
                _lastUsb = usb;
            }
            catch (Exception e)
            {
                LastError = e.Message;
                AppLog.Add("Scanner monitor error: " + e.Message);
            }
            try { await Task.Delay(2000, _monitorCts.Token); } catch (OperationCanceledException) { }
        }
    }

    /// <summary>The scanner went away: stop everything that uses it and start over from a clean SDK.</summary>
    private void HandleRemoval()
    {
        AppLog.Add("Scanner disconnected.");
        CloseDevice();
        ResetLibrary();
        ConnectionChanged?.Invoke(false);
    }

    /// <summary>Frees the SDK completely (matching cache + library). The next InitLibrary starts fresh.</summary>
    private void ResetLibrary()
    {
        lock (_dbGate)
        {
            try { if (_db != IntPtr.Zero) zkfp2.DBFree(_db); } catch { }
            _db = IntPtr.Zero;
            _map.Clear();
            TemplatesLoaded = 0;
            try { zkfp2.Terminate(); } catch { }
            _libReady = false;
        }
        _needsReload = true;
        TemplatesPending = true;
    }

    private void InitLibrary()
    {
        int r = zkfp2.Init();
        if (r != zkfperrdef.ZKFP_ERR_OK && r != 1 /* already initialised */)
        {
            LastError = $"ZKFinger library init failed (code {r}).";
            return;
        }
        IntPtr db = zkfp2.DBInit();
        if (db == IntPtr.Zero) { LastError = "DBInit failed."; return; }
        lock (_dbGate) _db = db;
        _libReady = true;
        AppLog.Add("ZKFinger library ready.");
    }

    private bool TryOpenDevice()
    {
        int count = zkfp2.GetDeviceCount();
        if (count <= 0) { LastError = "No scanner detected. Plug in the Live20R."; return false; }

        _dev = zkfp2.OpenDevice(0);
        if (_dev == IntPtr.Zero) { LastError = "Could not open the scanner (is another program using it?)."; return false; }

        // Image size parameters 1 = width, 2 = height (same as the demo).
        var pv = new byte[4]; int size = 4;
        zkfp2.GetParameters(_dev, 1, pv, ref size); zkfp2.ByteArray2Int(pv, ref _w);
        size = 4;
        zkfp2.GetParameters(_dev, 2, pv, ref size); zkfp2.ByteArray2Int(pv, ref _h);
        _img = new byte[Math.Max(1, _w * _h)];

        _lost = false;
        _capStop = false;
        _capThread = new Thread(CaptureLoop) { IsBackground = true, Name = "fp-capture" };
        _capThread.Start();
        Connected = true;
        LastError = null;
        _openFailures = 0;
        AppLog.Add($"Scanner connected ({_w}x{_h}).");
        ConnectionChanged?.Invoke(true);
        if (_needsReload) { _needsReload = false; NeedsTemplates?.Invoke(); }   // the SDK was reset: reload fingerprints
        return true;
    }

    private void CloseDevice()
    {
        Connected = false;
        _capStop = true;
        try { _capThread?.Join(1500); } catch { }
        if (_dev != IntPtr.Zero) { try { zkfp2.CloseDevice(_dev); } catch { } _dev = IntPtr.Zero; }
        lock (_pendingGate) { _pending?.TrySetResult(null); _pending = null; } // wake waiters: "scanner lost"
    }

    /// <summary>Background capture loop (like DoCapture in the demo). Delivers a template to whoever is waiting.</summary>
    private void CaptureLoop()
    {
        var tmp = new byte[TemplateBuf];
        int errors = 0;
        while (!_capStop)
        {
            int size = TemplateBuf;
            int r = zkfp2.AcquireFingerprint(_dev, _img, tmp, ref size);
            LastAcquireCode = r;
            if (r == zkfperrdef.ZKFP_ERR_OK) Captures++;
            if (r == zkfperrdef.ZKFP_ERR_OK && size > 0)
            {
                errors = 0;
                _lastCapture = Environment.TickCount64;
                var copy = new byte[TemplateBuf];            // zero-padded like the demo's CapTmp
                Array.Copy(tmp, copy, Math.Min(size, TemplateBuf));
                lock (_pendingGate) { _pending?.TrySetResult(copy); _pending = null; }
            }
            else if (r == zkfperrdef.ZKFP_ERR_CAPTURE) { errors = 0; }   // -8: no finger on the glass (normal)
            else if (++errors >= 10) { _lost = true; return; }          // repeated hard errors: device gone
            Thread.Sleep(100);
        }
    }

    // ------------------------------------------------------------------ template cache

    /// <summary>Replaces the whole in-memory database (DBClear + DBAdd for each template).</summary>
    public int ReplaceTemplates(IEnumerable<(long UserId, int Finger, byte[] Template)> items)
    {
        if (!_libReady) InitLibrary();
        if (!_libReady) throw new InvalidOperationException(LastError ?? "Library not ready.");
        int loaded = 0, fid = 1;
        lock (_dbGate)
        {
            zkfp2.DBClear(_db);
            _map.Clear();
            foreach (var (userId, finger, tpl) in items)
            {
                var padded = new byte[TemplateBuf];
                Array.Copy(tpl, padded, Math.Min(tpl.Length, TemplateBuf));
                if (zkfp2.DBAdd(_db, fid, padded) == zkfperrdef.ZKFP_ERR_OK)
                {
                    _map[fid] = (userId, finger);
                    loaded++;
                }
                else AppLog.Add($"DBAdd failed for user {userId} finger {finger}.");
                fid++;
            }
            TemplatesLoaded = loaded;
        }
        TemplatesPending = false;   // the cache is filled: scanning may start
        return loaded;
    }

    // ------------------------------------------------------------------ exclusive operations

    /// <summary>Cancel whatever scan is running (used when the page navigates away or a new op starts).</summary>
    public void CancelCurrent()
    {
        lock (_opCtsGate) _currentOp?.Cancel();
    }

    /// <summary>A new operation preempts the previous one, then runs alone (the sensor can only serve one caller).</summary>
    private async Task<T> RunExclusive<T>(Func<CancellationToken, Task<T>> work, CancellationToken external)
    {
        CancellationTokenSource cts;
        lock (_opCtsGate)
        {
            _currentOp?.Cancel();
            cts = CancellationTokenSource.CreateLinkedTokenSource(external);
            _currentOp = cts;
        }
        await _opLock.WaitAsync(cts.Token);
        try { return await work(cts.Token); }
        finally
        {
            _opLock.Release();
            lock (_opCtsGate) { if (ReferenceEquals(_currentOp, cts)) _currentOp = null; }
            cts.Dispose();
        }
    }

    private void RequireConnected()
    {
        if (!Connected) throw new ScannerLostException();
    }

    /// <summary>Connected AND fingerprints loaded; used before any scan that matches against the cache.</summary>
    private void RequireReady()
    {
        RequireConnected();
        if (TemplatesPending) throw new ScannerStartingException();
    }

    /// <summary>Waits until a finger is captured. Returns (template, timedOut). Throws if the scanner disappears.</summary>
    private async Task<(byte[]? Template, bool TimedOut)> WaitForFingerAsync(int timeoutMs, CancellationToken ct)
    {
        RequireConnected();
        var tcs = new TaskCompletionSource<byte[]?>(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_pendingGate) _pending = tcs;
        try
        {
            var tpl = await tcs.Task.WaitAsync(TimeSpan.FromMilliseconds(timeoutMs), ct);
            if (tpl == null) throw new ScannerLostException();
            return (tpl, false);
        }
        catch (TimeoutException) { return (null, true); }
        finally { lock (_pendingGate) { if (ReferenceEquals(_pending, tcs)) _pending = null; } }
    }

    /// <summary>Requires the previous finger to be lifted so one touch is never counted twice.</summary>
    private async Task WaitForLiftAsync(int maxMs, CancellationToken ct)
    {
        var until = Environment.TickCount64 + maxMs;
        while (Environment.TickCount64 - Interlocked.Read(ref _lastCapture) < 700 && Environment.TickCount64 < until)
            await Task.Delay(100, ct);
    }

    // ------------------------------------------------------------------ identify

    /// <summary>Capture one scan and match it against the in-memory templates.</summary>
    public Task<IdentifyResult> IdentifyAsync(int timeoutMs, CancellationToken external) =>
        RunExclusive(async ct =>
        {
            RequireReady();
            await WaitForLiftAsync(timeoutMs, ct);
            var (tpl, timedOut) = await WaitForFingerAsync(timeoutMs, ct);
            if (tpl == null) return new IdentifyResult(timedOut ? "timeout" : "no_match");

            int fid = 0, score = 0, r;
            (long UserId, int Finger) owner = default;
            bool found;
            lock (_dbGate)
            {
                if (_db == IntPtr.Zero) throw new ScannerLostException();
                r = zkfp2.DBIdentify(_db, tpl, ref fid, ref score);
                found = r == zkfperrdef.ZKFP_ERR_OK && _map.TryGetValue(fid, out owner);
            }
            LastScanAt = DateTime.Now;
            if (found)
            {
                LastScanResult = $"Matched user {owner.UserId} (score {score})";
                return new IdentifyResult("matched", owner.UserId, score, owner.Finger);
            }
            LastScanResult = "No match";
            return new IdentifyResult("no_match");
        }, external);

    // ------------------------------------------------------------------ enroll

    /// <summary>
    /// Captures 3 scans of the same finger, merges them into one template (DBMerge) and returns it.
    /// If <paramref name="userId"/> is given, a match with that same user is allowed (re-enrollment);
    /// a match with anyone else is rejected so one finger can't belong to two members.
    /// </summary>
    public Task<EnrollResult> EnrollAsync(long? userId, CancellationToken external) =>
        RunExclusive(async ct =>
        {
            RequireReady();
            EnrollActive = true; EnrollCount = 0; EnrollMessage = "Place your finger on the scanner.";
            try
            {
                var caps = new List<byte[]>();
                while (caps.Count < EnrollScans)
                {
                    EnrollMessage = caps.Count == 0 ? "Place your finger on the scanner." : $"Lift, then place the SAME finger again ({caps.Count + 1}/{EnrollScans}).";
                    await WaitForLiftAsync(10_000, ct);
                    var (tpl, timedOut) = await WaitForFingerAsync(20_000, ct);
                    if (tpl == null) return new EnrollResult(false, "timeout", "No finger detected. Please try again.");

                    if (caps.Count == 0)
                    {
                        // Reject a finger that already belongs to a different member (same check as the demo).
                        lock (_dbGate)
                        {
                            if (_db == IntPtr.Zero) throw new ScannerLostException();
                            int fid = 0, score = 0;
                            if (zkfp2.DBIdentify(_db, tpl, ref fid, ref score) == zkfperrdef.ZKFP_ERR_OK && _map.TryGetValue(fid, out var o) && o.UserId != userId)
                                return new EnrollResult(false, "already_registered", "This finger is already registered to another member.", null, o.UserId);
                        }
                    }
                    else
                    {
                        int match;
                        lock (_dbGate) { if (_db == IntPtr.Zero) throw new ScannerLostException(); match = zkfp2.DBMatch(_db, tpl, caps[^1]); }
                        if (match <= 0) { EnrollMessage = "That was a different finger. Please use the same finger 3 times."; continue; }
                    }
                    caps.Add(tpl);
                    EnrollCount = caps.Count;
                }

                var merged = new byte[TemplateBuf];
                int len = TemplateBuf, r;
                lock (_dbGate) { if (_db == IntPtr.Zero) throw new ScannerLostException(); r = zkfp2.DBMerge(_db, caps[0], caps[1], caps[2], merged, ref len); }
                if (r != zkfperrdef.ZKFP_ERR_OK || len <= 0)
                    return new EnrollResult(false, "poor_scan", $"Scans could not be combined (code {r}). Press firmly and keep the finger still, then try again.");

                LastScanAt = DateTime.Now;
                LastScanResult = "Enrolled a new fingerprint";
                EnrollMessage = "Done.";
                return new EnrollResult(true, null, null, Convert.ToBase64String(merged, 0, len));
            }
            finally { EnrollActive = false; }
        }, external);

    public void Dispose()
    {
        _monitorCts.Cancel();
        CloseDevice();
        try { if (_db != IntPtr.Zero) zkfp2.DBFree(_db); } catch { }
        try { zkfp2.Terminate(); } catch { }
    }
}

