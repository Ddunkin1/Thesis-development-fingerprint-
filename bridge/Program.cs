using System.Windows.Forms;
using ChaqBridge;

// Only one bridge per PC (they would fight over the scanner and the port).
using var single = new Mutex(true, "Global\\ChaqGymFingerprintBridge", out var isFirst);
if (!isFirst)
{
    MessageBox.Show("The CHAQ GYM Fingerprint Bridge is already running.", "CHAQ GYM", MessageBoxButtons.OK, MessageBoxIcon.Information);
    return;
}

ApplicationConfiguration.Initialize();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions { ContentRootPath = AppContext.BaseDirectory });
builder.Configuration.AddJsonFile("appsettings.local.json", optional: true);
var cfg = BridgeConfig.From(builder.Configuration);
builder.WebHost.UseUrls($"http://localhost:{cfg.Port}");
builder.Logging.ClearProviders();

var scanner = new ScannerService();
var sync = new SyncService(cfg, scanner);

var app = builder.Build();
Api.Map(app, cfg, scanner, sync);

try
{
    await app.StartAsync();
}
catch (Exception e)
{
    MessageBox.Show($"Could not start the bridge on port {cfg.Port}:\n{e.Message}", "CHAQ GYM", MessageBoxButtons.OK, MessageBoxIcon.Error);
    return;
}

AppLog.Add($"Bridge listening on http://localhost:{cfg.Port}");
AppLog.Add("Allowed origins: " + string.Join(", ", cfg.AllowedOrigins));
scanner.Start();
var cts = new CancellationTokenSource();
_ = Task.Run(() => sync.RunLoopAsync(cts.Token));

Application.Run(new StatusForm(cfg, scanner, sync));

cts.Cancel();
await app.StopAsync();
scanner.Dispose();
