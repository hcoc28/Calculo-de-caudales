using CaudalesBackend.Models;

namespace CaudalesBackend.Configuration;

internal sealed record AppSettings(
    int Port,
    string ConnectionString,
    IReadOnlyList<CoraOptions> Cora,
    IReadOnlyList<PlantWeatherOptions> Clima,
    SyncOptions Sync,
    IReadOnlyDictionary<string, EscorrentiaOptions> EscorrentiaPorPlanta,
    string? ApiKey)
{
    public static AppSettings FromEnvironment()
    {
        return new AppSettings(
            AppConfig.GetInt("PORT", 4000),
            AppConfig.GetPostgresConnectionString("DATABASE_URL"),
            CrearOpcionesCora(),
            CrearOpcionesClima(),
            new SyncOptions(
                TimeSpan.FromMinutes(AppConfig.GetInt("CORA_SYNC_MINUTES", 10)),
                AppConfig.GetBool("CORA_SYNC_ON_START", true)),
            CrearOpcionesEscorrentia(),
            AppConfig.GetOptional("API_KEY"));
    }

    private static IReadOnlyDictionary<string, EscorrentiaOptions> CrearOpcionesEscorrentia()
    {
        var coeficiente = AppConfig.GetDouble("ESCORRENTIA_COEFICIENTE", 0.65);
        var areaM2 = AppConfig.GetNullableDouble("ESCORRENTIA_AREA_M2");

        return new Dictionary<string, EscorrentiaOptions>
        {
            ["cafetal"] = new(coeficiente, areaM2, AppConfig.GetDouble("CAFETAL_CURVA_NUMERO", 75)),
            ["la-perla"] = new(coeficiente, areaM2, AppConfig.GetDouble("LA_PERLA_CURVA_NUMERO", 75))
        };
    }

    private static IReadOnlyList<CoraOptions> CrearOpcionesCora()
    {
        var cantidad = AppConfig.GetInt("CORA_API_CANTIDAD", 72);
        var opciones = new List<CoraOptions>
        {
            new("cafetal", AppConfig.GetRequired("CORA_API_URL"), cantidad)
        };

        var laPerlaUrl = AppConfig.GetOptional("CORA_API_URL_LA_PERLA");
        if (laPerlaUrl is not null)
        {
            opciones.Add(new CoraOptions("la-perla", laPerlaUrl, cantidad));
        }

        return opciones;
    }

    private static IReadOnlyList<PlantWeatherOptions> CrearOpcionesClima()
    {
        return
        [
            new(
                "cafetal",
                "El Cafetal",
                AppConfig.GetDouble("CAFETAL_LATITUD", 15.22553),
                AppConfig.GetDouble("CAFETAL_LONGITUD", -90.11064)),
            new(
                "la-perla",
                "Tucuru",
                AppConfig.GetDouble("LA_PERLA_LATITUD", 15.640000),
                AppConfig.GetDouble("LA_PERLA_LONGITUD", -90.069444))
        ];
    }
}
