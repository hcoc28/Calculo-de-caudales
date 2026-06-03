using System.Globalization;

namespace CaudalesBackend.Configuration;

internal static class AppConfig
{
    public static string GetRequired(string key)
    {
        return Environment.GetEnvironmentVariable(key)
            ?? throw new InvalidOperationException($"Falta configurar {key}.");
    }

    public static string? GetOptional(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    public static string GetPostgresConnectionString(string key)
    {
        var value = GetRequired(key);
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return value;
        }

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? "");
        var password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? "");
        var database = uri.AbsolutePath.TrimStart('/');
        var port = uri.Port > 0 ? uri.Port : 5432;

        return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password}";
    }

    public static int GetInt(string key, int fallback)
    {
        return int.TryParse(Environment.GetEnvironmentVariable(key), out var value) ? value : fallback;
    }

    public static double GetDouble(string key, double fallback)
    {
        return double.TryParse(Environment.GetEnvironmentVariable(key), NumberStyles.Any, CultureInfo.InvariantCulture, out var value)
            ? value
            : fallback;
    }

    public static double? GetNullableDouble(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return double.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;
    }

    public static bool GetBool(string key, bool fallback)
    {
        return bool.TryParse(Environment.GetEnvironmentVariable(key), out var value) ? value : fallback;
    }
}
