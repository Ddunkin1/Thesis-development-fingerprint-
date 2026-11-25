namespace ChaqBridge;

/// <summary>
/// Settings come from appsettings.json, then appsettings.local.json (git-ignored, holds the API key),
/// then environment variables (Bridge__ApiKey, or the plain BRIDGE_API_KEY used by the web app).
/// </summary>
public sealed class BridgeConfig
{
    public int Port { get; init; } = 5055;
    public string WebAppUrl { get; init; } = "http://localhost:3000";
    public string[] AllowedOrigins { get; init; } = { "http://localhost:3000" };
    public int SyncMinutes { get; init; } = 15;   // longer than the database's 5-minute idle sleep; changes made on this PC sync at once
    public string ApiKey { get; init; } = "";

    public static BridgeConfig From(IConfiguration c)
    {
        var s = c.GetSection("Bridge");
        var origins = s.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000" };
        // ALLOWED_ORIGINS="https://a.com,https://b.com" is handy on the gym PC / Railway later.
        var envOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
        if (!string.IsNullOrWhiteSpace(envOrigins))
            origins = envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var key = s["ApiKey"];
        if (string.IsNullOrWhiteSpace(key)) key = Environment.GetEnvironmentVariable("BRIDGE_API_KEY") ?? "";

        return new BridgeConfig
        {
            Port = s.GetValue("Port", 5055),
            WebAppUrl = (s["WebAppUrl"] ?? "http://localhost:3000").TrimEnd('/'),
            AllowedOrigins = origins.Select(o => o.TrimEnd('/')).ToArray(),
            SyncMinutes = Math.Max(1, s.GetValue("SyncMinutes", 15)),
            ApiKey = key!,
        };
    }
}
