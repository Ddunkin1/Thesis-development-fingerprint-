namespace ChaqBridge;

/// <summary>Tiny in-memory log shown in the status window (and echoed to the debugger).</summary>
public static class AppLog
{
    private static readonly object Gate = new();
    private static readonly List<string> Lines = new();

    public static void Add(string message)
    {
        var line = $"{DateTime.Now:HH:mm:ss}  {message}";
        lock (Gate)
        {
            Lines.Add(line);
            if (Lines.Count > 200) Lines.RemoveAt(0);
        }
        System.Diagnostics.Debug.WriteLine(line);
    }

    public static string[] Snapshot(int last = 12)
    {
        lock (Gate) return Lines.Skip(Math.Max(0, Lines.Count - last)).ToArray();
    }
}
