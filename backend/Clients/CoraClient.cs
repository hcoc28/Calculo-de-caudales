using System.Globalization;
using System.Text.Json.Nodes;
using CaudalesBackend.Infrastructure;
using CaudalesBackend.Models;

namespace CaudalesBackend.Clients;

internal sealed class CoraClient
{
    private readonly HttpClient httpClient;

    public CoraClient(HttpClient httpClient)
    {
        this.httpClient = httpClient;
    }

    public async Task<List<DatoCora>> ObtenerDatosAsync(CoraOptions options)
    {
        var url = new UriBuilder(options.ApiUrl);
        var separator = string.IsNullOrWhiteSpace(url.Query) ? "" : "&";
        url.Query = $"{url.Query.TrimStart('?')}{separator}cantidad={options.Cantidad}";

        var json = await HttpJsonFetcher.GetStringAsync(httpClient, url.Uri);
        var root = JsonNode.Parse(json);

        return NormalizarLista(root)
            .Select(registro => NormalizarRegistro(options.Planta, registro))
            .Where(dato => dato is not null)
            .Cast<DatoCora>()
            .ToList();
    }

    private static IEnumerable<JsonNode> NormalizarLista(JsonNode? root)
    {
        if (root is JsonArray array) return array.OfType<JsonNode>();
        if (root?["data"] is JsonArray data) return data.OfType<JsonNode>();
        if (root?["items"] is JsonArray items) return items.OfType<JsonNode>();
        if (root?["result"] is JsonArray result) return result.OfType<JsonNode>();
        return root is null ? [] : [root];
    }

    private static DatoCora? NormalizarRegistro(string planta, JsonNode registro)
    {
        var (fecha, hora) = SepararFechaHora(registro);
        if (fecha is null || hora is null) return null;

        return new DatoCora(
            planta,
            fecha.Value,
            hora.Value,
            BuscarDecimal(registro, ["nivel", "embalse"]),
            BuscarDecimal(registro, ["qe", "caudalentrada", "entrada", "ingreso"]),
            BuscarDecimal(registro, ["qs", "caudalsalida", "salida"]),
            BuscarDecimal(registro, ["qv", "caudalvertido", "vertido", "vertedero"]),
            BuscarDecimal(registro, ["potenciaactiva", "potencia_activa", "potencia", "pa", "mw"]),
            BuscarTexto(registro, ["clima", "weather", "condicion", "condición"]),
            registro.DeepClone());
    }

    private static (DateOnly? Fecha, TimeOnly? Hora) SepararFechaHora(JsonNode registro)
    {
        var fechaLectura = BuscarTexto(registro, ["fechalectura", "fecha_lectura", "timestamp", "createdat", "created_at", "datetime", "fecha"]);
        var horaLectura = BuscarTexto(registro, ["hora", "time"]);

        if (DateTime.TryParse(fechaLectura, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var fechaHora))
        {
            return (DateOnly.FromDateTime(fechaHora), TimeOnly.FromDateTime(fechaHora));
        }

        var fecha = DateOnly.TryParse(fechaLectura, out var soloFecha) ? soloFecha : (DateOnly?)null;
        var hora = TimeOnly.TryParse(horaLectura, out var soloHora) ? soloHora : new TimeOnly(0, 0);
        return (fecha, hora);
    }

    private static string? BuscarTexto(JsonNode registro, string[] candidatos)
    {
        if (registro is not JsonObject obj) return null;

        foreach (var candidato in candidatos)
        {
            var exacto = obj.FirstOrDefault(prop => string.Equals(prop.Key, candidato, StringComparison.OrdinalIgnoreCase));
            if (exacto.Value is not null) return exacto.Value.ToString();
        }

        foreach (var candidato in candidatos)
        {
            var parcial = obj.FirstOrDefault(prop => prop.Key.Contains(candidato, StringComparison.OrdinalIgnoreCase));
            if (parcial.Value is not null) return parcial.Value.ToString();
        }

        return null;
    }

    private static decimal? BuscarDecimal(JsonNode registro, string[] candidatos)
    {
        var texto = BuscarTexto(registro, candidatos);
        if (string.IsNullOrWhiteSpace(texto)) return null;

        texto = texto.Replace(',', '.');
        return decimal.TryParse(texto, NumberStyles.Any, CultureInfo.InvariantCulture, out var numero)
            ? numero
            : null;
    }
}
