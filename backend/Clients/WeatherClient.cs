using System.Text.Json.Nodes;
using CaudalesBackend.Infrastructure;
using CaudalesBackend.Services;

namespace CaudalesBackend.Clients;

internal sealed class WeatherClient
{
    private readonly HttpClient httpClient;

    public WeatherClient(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<JsonNode> ObtenerClimaAsync()
    {
        var parametros = new Dictionary<string, string>
        {
            ["latitude"] = "15.14375",
            ["longitude"] = "-90.07007",
            ["timezone"] = "auto",
            ["current"] = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m",
            ["hourly"] = "temperature_2m,precipitation,weather_code,is_day",
            ["daily"] = "temperature_2m_max,temperature_2m_min,sunrise,sunset",
            ["forecast_days"] = "1"
        };

        var query = string.Join("&", parametros.Select(par => $"{par.Key}={Uri.EscapeDataString(par.Value)}"));
        var json = await HttpJsonFetcher.GetStringAsync(httpClient, new Uri($"https://api.open-meteo.com/v1/forecast?{query}"));
        return JsonNode.Parse(json) ?? new JsonObject();
    }

    public static double[] ExtraerLluvia(JsonNode clima)
    {
        var precipitacion = clima["hourly"]?["precipitation"]?.AsArray();
        var lluvia = new double[SimuladorCaudales.HorasSimulacion];

        for (var i = 0; i < lluvia.Length; i++)
        {
            lluvia[i] = LeerNumero(precipitacion?[i]) ?? 0;
        }

        return lluvia;
    }

    private static double? LeerNumero(JsonNode? node)
    {
        if (node is null) return null;
        return double.TryParse(node.ToString(), out var value) ? value : null;
    }
}
