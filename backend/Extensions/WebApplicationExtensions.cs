namespace CaudalesBackend.Extensions;

internal static class WebApplicationExtensions
{
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
