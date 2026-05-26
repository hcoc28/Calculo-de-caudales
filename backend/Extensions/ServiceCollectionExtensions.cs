using System.Net.Security;
using System.Security.Authentication;
using CaudalesBackend.Clients;
using CaudalesBackend.Configuration;
using CaudalesBackend.Infrastructure;
using CaudalesBackend.Repositories;
using CaudalesBackend.Services;
using Npgsql;

namespace CaudalesBackend.Extensions;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCaudalesBackend(this IServiceCollection services, AppSettings settings)
    {
        services.AddSingleton(new NpgsqlDataSourceBuilder(settings.ConnectionString).Build());
        services.AddSingleton(settings.Cora);
        services.AddSingleton(settings.Sync);
        services.AddSingleton(settings.Escorrentia);
        services.AddSingleton<DatabaseInitializer>();

        services.AddHttpClient<CoraClient>()
            .ConfigurePrimaryHttpMessageHandler(CreateHttpHandler);
        services.AddHttpClient<WeatherClient>()
            .ConfigurePrimaryHttpMessageHandler(CreateHttpHandler);

        services.AddSingleton<CoraRepository>();
        services.AddSingleton<SimulacionService>();
        services.AddHostedService<CoraSyncService>();

        return services;
    }

    private static HttpMessageHandler CreateHttpHandler()
    {
        return new SocketsHttpHandler
        {
            SslOptions = new SslClientAuthenticationOptions
            {
                EnabledSslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
            }
        };
    }
}
