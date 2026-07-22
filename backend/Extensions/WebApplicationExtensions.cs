using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;

namespace CaudalesBackend.Extensions;

internal static class WebApplicationExtensions
{
    public static WebApplication UseManejoErrores(this WebApplication app)
    {
        app.UseExceptionHandler(errorApp =>
        {
            errorApp.Run(async context =>
            {
                var feature = context.Features.Get<IExceptionHandlerFeature>();
                if (feature?.Error is { } error)
                {
                    var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Errores");
                    logger.LogError(error, "[HTTP] Error no controlado en {Ruta}", feature.Path);
                }

                context.Response.ContentType = "application/json";
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { error = "Ocurrio un error interno." });
            });
        });

        return app;
    }

    public static WebApplication UseRegistroSolicitudes(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            var inicio = Stopwatch.GetTimestamp();
            await next();
            var duracionMs = Stopwatch.GetElapsedTime(inicio).TotalMilliseconds;

            var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("Solicitudes");
            logger.LogInformation(
                "{Metodo} {Ruta} -> {Estado} ({DuracionMs} ms)",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                Math.Round(duracionMs, 1));
        });

        return app;
    }

    public static WebApplication UseApiNoCacheHeaders(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate";
                context.Response.Headers.Pragma = "no-cache";
                context.Response.Headers.Expires = "0";
            }

            await next();
        });

        return app;
    }

    public static WebApplication UseFrontendFiles(this WebApplication app)
    {
        var frontendPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "frontend"));
        var fileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendPath);

        app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = fileProvider });
        app.UseStaticFiles(new StaticFileOptions { FileProvider = fileProvider });

        app.MapFallback(async context =>
        {
            var indexPath = Path.Combine(frontendPath, "index.html");
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(indexPath);
        });

        return app;
    }
}
