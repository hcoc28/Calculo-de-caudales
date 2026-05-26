using CaudalesBackend.Models;

namespace CaudalesBackend.Configuration;

internal sealed record AppSettings(
    int Port,
    string ConnectionString,
    CoraOptions Cora,
    SyncOptions Sync,
    EscorrentiaOptions Escorrentia)
{
    public static AppSettings FromEnvironment()
    {
        return new AppSettings(
            AppConfig.GetInt("PORT", 4000),
            AppConfig.GetPostgresConnectionString("DATABASE_URL"),
            new CoraOptions(
                AppConfig.GetRequired("CORA_API_URL"),
                AppConfig.GetInt("CORA_API_CANTIDAD", 72)),
            new SyncOptions(
                TimeSpan.FromMinutes(AppConfig.GetInt("CORA_SYNC_MINUTES", 10)),
                AppConfig.GetBool("CORA_SYNC_ON_START", true)),
            new EscorrentiaOptions(
                AppConfig.GetDouble("ESCORRENTIA_COEFICIENTE", 0.65),
                AppConfig.GetNullableDouble("ESCORRENTIA_AREA_M2")));
    }
}
