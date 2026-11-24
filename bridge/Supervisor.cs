using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;

namespace ChaqBridge;

/// <summary>
/// Watchdog. Starting ChaqBridge.exe without arguments runs this invisible supervisor, which starts the real
/// bridge ("--worker") and starts it again if it ever dies. The ZKTeco driver is native code: if it crashes
/// (for example when the scanner is yanked out), only the worker dies and a new one is running again within
/// a few seconds. Choosing "Exit" in the tray menu ends the worker with exit code 0, which stops the supervisor too.
/// </summary>
internal static class Supervisor
{
    public static int Run()
    {
        // Only one bridge per PC (two would fight over the scanner and the port).
        using var single = new Mutex(true, "Global\\ChaqGymFingerprintBridge", out var isFirst);
        if (!isFirst)
        {
            MessageBox.Show("The CHAQ GYM Fingerprint Bridge is already running (look for its icon near the clock).",
                "CHAQ GYM", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 0;
        }

        int quickCrashes = 0;
        while (true)
        {
            var started = DateTime.UtcNow;
            int code;
            try
            {
                using var worker = Process.Start(WorkerStartInfo())!;
                worker.WaitForExit();
                code = worker.ExitCode;
            }
            catch (Exception e)
            {
                Log("Could not start the bridge: " + e.Message);
                code = -1;
            }

            if (code == 0) return 0;   // closed on purpose from the tray menu

            Log($"Bridge stopped unexpectedly (exit code {code}). Restarting.");
            quickCrashes = (DateTime.UtcNow - started).TotalSeconds < 30 ? quickCrashes + 1 : 0;
            Thread.Sleep(Math.Min(15_000, 1_000 * (1 + quickCrashes)));   // 1s, 2s, 3s ... max 15s if it keeps failing
        }
    }

    private static ProcessStartInfo WorkerStartInfo()
    {
        var host = Environment.ProcessPath!;
        // `dotnet run` starts us through dotnet.exe; the published ChaqBridge.exe starts itself.
        if (Path.GetFileName(host).Equals("dotnet.exe", StringComparison.OrdinalIgnoreCase))
            return new ProcessStartInfo(host, $"\"{Assembly.GetEntryAssembly()!.Location}\" --worker") { UseShellExecute = false };
        return new ProcessStartInfo(host, "--worker") { UseShellExecute = false };
    }

    private static void Log(string message)
    {
        try { File.AppendAllText(Path.Combine(AppContext.BaseDirectory, "bridge.log"), $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {message}{Environment.NewLine}"); }
        catch { /* logging must never stop the watchdog */ }
    }
}
