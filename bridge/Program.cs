using System.Windows.Forms;
using ChaqBridge;

// One exe, two roles:
//   no arguments -> invisible SUPERVISOR that starts the bridge and restarts it if it ever crashes
//   --worker     -> the real bridge: HTTP API on localhost, scanner, status window + tray icon
if (!args.Contains("--worker")) return Supervisor.Run();

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
    return 2;   // non-zero: the supervisor will try again
}

AppLog.Add($"Bridge listening on http://localhost:{cfg.Port}");
AppLog.Add("Allowed origins: " + string.Join(", ", cfg.AllowedOrigins));

// After the scanner is re-plugged the SDK starts empty, so download the fingerprints again right away.
scanner.NeedsTemplates += () => _ = Task.Run(sync.SyncOnceAsync);
scanner.Start();
var cts = new CancellationTokenSource();
_ = Task.Run(() => sync.RunLoopAsync(cts.Token));

Application.Run(new StatusForm(cfg, scanner, sync));   // returns when "Exit" is chosen in the tray menu

cts.Cancel();
await app.StopAsync();
scanner.Dispose();
return 0;
