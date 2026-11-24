using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace ChaqBridge;

/// <summary>
/// Downloads every template from the web app (GET /api/bridge/templates, protected by the BRIDGE_API_KEY header)
/// and loads them into the scanner's in-memory database. The bridge never connects to the database itself.
/// </summary>
public sealed class SyncService
{
    private sealed record TemplateDto(
        [property: JsonPropertyName("userId")] long UserId,
        [property: JsonPropertyName("fingerIndex")] int FingerIndex,
        [property: JsonPropertyName("template")] string Template);

    private sealed record TemplatesResponse([property: JsonPropertyName("templates")] List<TemplateDto> Templates);

    private readonly BridgeConfig _cfg;
    private readonly ScannerService _scanner;
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private readonly SemaphoreSlim _gate = new(1, 1);

    public DateTime? LastSyncAt { get; private set; }
    public bool LastSyncOk { get; private set; }
    public string LastSyncMessage { get; private set; } = "Not synced yet";

    public SyncService(BridgeConfig cfg, ScannerService scanner)
    {
        _cfg = cfg;
        _scanner = scanner;
    }

    /// <summary>Runs one sync now. Returns (ok, message). On failure the old templates stay loaded.</summary>
    public async Task<(bool Ok, string Message)> SyncOnceAsync()
    {
        await _gate.WaitAsync();
        try
        {
            if (string.IsNullOrWhiteSpace(_cfg.ApiKey))
                return Record(false, "BRIDGE_API_KEY is not configured (see appsettings.local.json).");

            using var req = new HttpRequestMessage(HttpMethod.Get, _cfg.WebAppUrl + "/api/bridge/templates");
            req.Headers.Add("x-bridge-api-key", _cfg.ApiKey);
            using var res = await _http.SendAsync(req);
            if (!res.IsSuccessStatusCode)
                return Record(false, $"Web app answered {(int)res.StatusCode}.");

            var body = await res.Content.ReadFromJsonAsync<TemplatesResponse>();
            var items = (body?.Templates ?? new()).Select(t => (t.UserId, t.FingerIndex, Convert.FromBase64String(t.Template)));
            int n = _scanner.ReplaceTemplates(items);
            return Record(true, $"{n} template(s) loaded.");
        }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            return Record(false, "Web app not reachable: " + e.Message);
        }
        catch (Exception e)
        {
            return Record(false, "Sync error: " + e.Message);
        }
        finally { _gate.Release(); }
    }

    private (bool, string) Record(bool ok, string msg)
    {
        LastSyncAt = DateTime.Now;
        LastSyncOk = ok;
        LastSyncMessage = msg;
        AppLog.Add("Sync: " + msg);
        return (ok, msg);
    }

    /// <summary>Sync on start, then every few minutes.</summary>
    public async Task RunLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            await SyncOnceAsync();
            try { await Task.Delay(TimeSpan.FromMinutes(_cfg.SyncMinutes), ct); } catch (OperationCanceledException) { }
        }
    }
}
