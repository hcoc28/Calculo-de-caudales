namespace CaudalesBackend.Infrastructure;

internal sealed record ApiKeyOptions(string? Value);

internal static class ApiKeyVerificador
{
    public static IResult? Verificar(HttpContext http)
    {
        var opciones = http.RequestServices.GetRequiredService<ApiKeyOptions>();
        if (string.IsNullOrEmpty(opciones.Value))
        {
            return null;
        }

        var provisto = http.Request.Headers["X-Api-Key"].ToString();
        if (string.Equals(provisto, opciones.Value, StringComparison.Ordinal))
        {
            return null;
        }

        return Results.Json(new { error = "API key invalida o faltante." }, statusCode: StatusCodes.Status401Unauthorized);
    }
}

internal sealed class ApiKeyEndpointFilter : IEndpointFilter
{
    public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var resultado = ApiKeyVerificador.Verificar(context.HttpContext);
        return resultado is not null ? ValueTask.FromResult<object?>(resultado) : next(context);
    }
}
