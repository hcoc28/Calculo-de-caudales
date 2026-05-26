using System.Diagnostics;
using System.Security.Authentication;

namespace CaudalesBackend.Infrastructure;

internal static class HttpJsonFetcher
{
    public static async Task<string> GetStringAsync(HttpClient httpClient, Uri uri)
    {
        try
        {
            using var response = await httpClient.GetAsync(uri);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync();
        }
        catch (HttpRequestException)
        {
            return await GetStringWithCurlAsync(uri);
        }
        catch (AuthenticationException)
        {
            return await GetStringWithCurlAsync(uri);
        }
    }

    private static async Task<string> GetStringWithCurlAsync(Uri uri)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "curl.exe",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        startInfo.ArgumentList.Add("-L");
        startInfo.ArgumentList.Add("-sS");
        startInfo.ArgumentList.Add("--max-time");
        startInfo.ArgumentList.Add("25");
        startInfo.ArgumentList.Add(uri.ToString());

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("No se pudo iniciar curl.exe.");

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var output = await outputTask;
        var error = await errorTask;

        if (process.ExitCode != 0)
        {
            throw new HttpRequestException($"curl.exe fallo con codigo {process.ExitCode}: {error}");
        }

        return output;
    }
}
