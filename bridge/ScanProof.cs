using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace ChaqBridge;

/// <summary>
/// Signs each scan result so the web server only accepts results that really came from this program.
///   proof = base64url(JSON {v:1, s:status, u:userId|null, t:unix ms, n:random}) + "." + base64url(HMAC-SHA256)
///   signing key = HMAC-SHA256(BRIDGE_API_KEY, "chaq-scan-v1")
/// Keep in step with web/src/lib/scan-proof.ts. The API key itself never leaves this program in the proof.
/// </summary>
public static class ScanProof
{
    public static string? Create(string apiKey, string status, long? userId)
    {
        if (string.IsNullOrWhiteSpace(apiKey) || (status != "matched" && status != "no_match")) return null;

        var json = JsonSerializer.Serialize(new
        {
            v = 1,
            s = status,
            u = status == "matched" ? userId : null,
            t = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            n = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)),
        });
        var payload = Base64Url(Encoding.UTF8.GetBytes(json));
        var key = HMACSHA256.HashData(Encoding.UTF8.GetBytes(apiKey), Encoding.UTF8.GetBytes("chaq-scan-v1"));
        return payload + "." + Base64Url(HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(payload)));
    }

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
