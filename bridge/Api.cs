namespace ChaqBridge;

/// <summary>The local HTTP API on http://localhost:5055 used by the web app's pages.</summary>
public static class Api
{
    public static void Map(WebApplication app, BridgeConfig cfg, ScannerService scanner, SyncService sync)
    {
        // ---- CORS: only the web app origin(s) may call the bridge from a browser. ----
        app.Use(async (ctx, next) =>
        {
            var origin = ctx.Request.Headers.Origin.ToString().TrimEnd('/');
            if (origin.Length > 0)
            {
                if (!cfg.AllowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                {
                    ctx.Response.StatusCode = 403;
                    await ctx.Response.WriteAsJsonAsync(new { ok = false, code = "origin_not_allowed", message = "Origin not allowed." });
                    return;
                }
                var h = ctx.Response.Headers;
                h["Access-Control-Allow-Origin"] = origin;
                h["Vary"] = "Origin";
                h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
                h["Access-Control-Allow-Headers"] = "Content-Type";
                h["Access-Control-Allow-Private-Network"] = "true"; // Chrome: public site -> localhost
                h["Access-Control-Max-Age"] = "600";
            }
            if (HttpMethods.IsOptions(ctx.Request.Method)) { ctx.Response.StatusCode = 204; return; }
            await next();
        });

        // GET /status - is the scanner connected, how many templates are loaded?
        app.MapGet("/status", () => Results.Json(new
        {
            ok = true,
            scannerConnected = scanner.Connected,
            scannerPluggedIn = scanner.UsbPresent,   // true while the scanner is plugged in but still reconnecting
            scannerReady = scanner.Connected && !scanner.TemplatesPending,   // connected AND fingerprints loaded
            templatesPending = scanner.TemplatesPending,
            scannerError = scanner.Connected ? null : scanner.LastError,
            templatesLoaded = scanner.TemplatesLoaded,
            lastScanAt = scanner.LastScanAt,
            lastScan = scanner.LastScanResult,
            debug = new { lastAcquireCode = scanner.LastAcquireCode, captures = scanner.Captures },
            lastSyncAt = sync.LastSyncAt,
            lastSyncOk = sync.LastSyncOk,
            lastSyncMessage = sync.LastSyncMessage,
        }));

        // GET /enroll/progress - polled by the Register page to show 1/3, 2/3, 3/3.
        app.MapGet("/enroll/progress", () => Results.Json(new
        {
            active = scanner.EnrollActive,
            count = scanner.EnrollCount,
            total = 3,
            message = scanner.EnrollMessage,
        }));

        // POST /enroll {userId?} - capture 3 scans, merge, return the template as base64.
        app.MapPost("/enroll", async (HttpContext ctx) =>
        {
            long? userId = null;
            try
            {
                var body = await ctx.Request.ReadFromJsonAsync<EnrollRequest>();
                userId = body?.UserId;
            }
            catch { /* empty body is fine: new member */ }

            return await Guard(async () =>
            {
                var r = await scanner.EnrollAsync(userId, ctx.RequestAborted);
                if (r.Ok) return Results.Json(new { ok = true, template = r.TemplateBase64, length = Convert.FromBase64String(r.TemplateBase64!).Length });
                var status = r.Code == "already_registered" ? 409 : 422;
                return Results.Json(new { ok = false, code = r.Code, message = r.Message, matchedUserId = r.MatchedUserId }, statusCode: status);
            });
        });

        // POST /identify - wait for one scan and match it locally. Statuses: matched | no_match | timeout.
        app.MapPost("/identify", async (HttpContext ctx) =>
        {
            // Block body + explicit return so ASP.NET uses the returned IResult (an expression-bodied
            // lambda would bind to RequestDelegate and silently drop the response).
            return await Guard(async () =>
            {
                var r = await scanner.IdentifyAsync(10_000, ctx.RequestAborted);
                // proof = the signed form of this result; the web server trusts only that
                var proof = ScanProof.Create(cfg.ApiKey, r.Status, r.UserId);
                return Results.Json(new { ok = true, status = r.Status, userId = r.UserId, score = r.Score, fingerIndex = r.FingerIndex, proof });
            });
        });

        // POST /sync - re-download templates now (the web app calls this right after saving an enrollment).
        app.MapPost("/sync", async () =>
        {
            var (ok, msg) = await sync.SyncOnceAsync();
            return Results.Json(new { ok, message = msg, templatesLoaded = scanner.TemplatesLoaded }, statusCode: ok ? 200 : 502);
        });

        // POST /cancel - abort a running scan (e.g. the admin left the page).
        app.MapPost("/cancel", () => { scanner.CancelCurrent(); return Results.Json(new { ok = true }); });
    }

    private sealed record EnrollRequest(long? UserId);

    /// <summary>Turns scanner problems into friendly JSON errors the web UI can show.</summary>
    private static async Task<IResult> Guard(Func<Task<IResult>> action)
    {
        try { return await action(); }
        catch (ScannerLostException)
        {
            return Results.Json(new { ok = false, code = "scanner_disconnected", message = "Scanner is not connected. Check the USB cable." }, statusCode: 503);
        }
        catch (ScannerStartingException)
        {
            return Results.Json(new { ok = false, code = "starting", message = "Loading fingerprints, please try again in a moment." }, statusCode: 503);
        }
        catch (OperationCanceledException)
        {
            return Results.Json(new { ok = false, code = "cancelled", message = "Scan cancelled." }, statusCode: 499);
        }
        catch (Exception e)
        {
            AppLog.Add("Error: " + e.Message);
            return Results.Json(new { ok = false, code = "internal_error", message = e.Message }, statusCode: 500);
        }
    }
}
