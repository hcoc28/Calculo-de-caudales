namespace CaudalesBackend.Configuration;

internal static class DotEnv
{
    public static void Load(string path)
    {
        if (!File.Exists(path)) return;

        foreach (var line in File.ReadAllLines(path))
        {
            var trimmed = line.Trim();
            if (trimmed.Length == 0 || trimmed.StartsWith('#')) continue;

            var separator = trimmed.IndexOf('=');
            if (separator <= 0) continue;

            var key = trimmed[..separator].Trim();
            var value = trimmed[(separator + 1)..].Trim();
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
