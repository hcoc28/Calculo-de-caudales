using CaudalesBackend.Configuration;
using CaudalesBackend.Endpoints;
using CaudalesBackend.Extensions;
using CaudalesBackend.Infrastructure;

DotEnv.Load(Path.Combine(AppContext.BaseDirectory, ".env"));
DotEnv.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
if (Enum.TryParse<LogLevel>(AppConfig.GetOptional("LOG_LEVEL"), ignoreCase: true, out var nivelLog))
{
    builder.Logging.SetMinimumLevel(nivelLog);
}

var settings = AppSettings.FromEnvironment();

builder.WebHost.UseUrls($"http://0.0.0.0:{settings.Port}");
builder.Services.AddCaudalesBackend(settings);

var app = builder.Build();

await app.Services.GetRequiredService<DatabaseInitializer>().InitializeAsync();

app.UseManejoErrores();
app.UseRegistroSolicitudes();
app.UseApiNoCacheHeaders();
app.MapCaudalesApi();
app.UseFrontendFiles();

app.Run();
