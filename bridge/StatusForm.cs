using System.Drawing;
using System.Windows.Forms;

namespace ChaqBridge;

/// <summary>Small always-available window: scanner connected, templates loaded, last scan, recent log.</summary>
public sealed class StatusForm : Form
{
    private readonly ScannerService _scanner;
    private readonly SyncService _sync;
    private readonly BridgeConfig _cfg;
    private readonly Label _scannerLbl = new(), _tplLbl = new(), _scanLbl = new(), _syncLbl = new();
    private readonly TextBox _log = new();
    private readonly System.Windows.Forms.Timer _timer = new() { Interval = 1000 };

    public StatusForm(BridgeConfig cfg, ScannerService scanner, SyncService sync)
    {
        _cfg = cfg; _scanner = scanner; _sync = sync;
        Text = "CHAQ GYM Fingerprint Bridge";
        Size = new Size(460, 380);
        MinimumSize = new Size(420, 340);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(11, 7, 19);
        ForeColor = Color.FromArgb(236, 232, 247);
        Font = new Font("Segoe UI", 10);

        var title = new Label { Text = "CHAQ GYM  •  Fingerprint Bridge", Font = new Font("Segoe UI", 13, FontStyle.Bold), ForeColor = Color.FromArgb(167, 139, 250), Dock = DockStyle.Top, Height = 40, Padding = new Padding(10, 8, 0, 0) };
        var info = new TableLayoutPanel { Dock = DockStyle.Top, Height = 120, ColumnCount = 1, RowCount = 4, Padding = new Padding(12, 4, 12, 0) };
        foreach (var l in new[] { _scannerLbl, _tplLbl, _scanLbl, _syncLbl }) { l.AutoSize = true; info.Controls.Add(l); }

        var syncBtn = new Button { Text = "Sync templates now", Dock = DockStyle.Top, Height = 32, FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(124, 58, 237), ForeColor = Color.White };
        syncBtn.Click += async (_, _) => { syncBtn.Enabled = false; await _sync.SyncOnceAsync(); syncBtn.Enabled = true; };

        _log.Multiline = true; _log.ReadOnly = true; _log.Dock = DockStyle.Fill; _log.ScrollBars = ScrollBars.Vertical;
        _log.BackColor = Color.FromArgb(21, 15, 35); _log.ForeColor = Color.FromArgb(154, 144, 184); _log.BorderStyle = BorderStyle.None; _log.Font = new Font("Consolas", 9);

        Controls.Add(_log); Controls.Add(syncBtn); Controls.Add(info); Controls.Add(title);
        _timer.Tick += (_, _) => Refresh_();
        _timer.Start();
        Refresh_();
    }

    private void Refresh_()
    {
        _scannerLbl.Text = _scanner.Connected ? "●  Scanner: connected" : "●  Scanner: NOT connected  (" + (_scanner.LastError ?? "starting…") + ")";
        _scannerLbl.ForeColor = _scanner.Connected ? Color.FromArgb(74, 222, 128) : Color.FromArgb(248, 113, 113);
        _tplLbl.Text = $"Templates loaded: {_scanner.TemplatesLoaded}";
        _scanLbl.Text = "Last scan: " + (_scanner.LastScanAt is { } t ? $"{t:HH:mm:ss} - {_scanner.LastScanResult}" : "-");
        _syncLbl.Text = "Last sync: " + (_sync.LastSyncAt is { } s ? $"{s:HH:mm:ss} - {_sync.LastSyncMessage}" : "-") + $"\nAPI: http://localhost:{_cfg.Port}";
        _syncLbl.ForeColor = _sync.LastSyncAt == null || _sync.LastSyncOk ? ForeColor : Color.FromArgb(251, 191, 36);
        _log.Text = string.Join(Environment.NewLine, AppLog.Snapshot());
    }
}
