using CaudalesBackend.Configuration;
using CaudalesBackend.Endpoints;
using CaudalesBackend.Extensions;

DotEnv.Load(Path.Combine(AppContext.BaseDirectory, ".env"));
DotEnv.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

var settings = AppSettings.FromEnvironment();

builder.WebHost.UseUrls($"http://0.0.0.0:{settings.Port}");
builder.Services.AddCaudalesBackend(settings);

var app = builder.Build();

app.UseApiNoCacheHeaders();
app.MapCaudalesApi();
app.UseFrontendFiles();

app.Run();
