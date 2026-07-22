using CaudalesBackend.Models;

namespace CaudalesBackend.Repositories;

internal static class DatoCoraValidador
{
    private static readonly Dictionary<string, (double Min, double Max)> RangoNivelPorPlanta = new()
    {
        ["cafetal"] = (765, 782),
        ["la-perla"] = (590, 605)
    };

    private const double CaudalMaximoRazonableM3s = 50;
    private const double PotenciaMaximaRazonableMw = 20;

    public static DatoCora Sanear(DatoCora dato, ILogger logger)
    {
        return dato with
        {
            Nivel = SanearNivel(dato, logger),
            Qe = SanearCaudal(dato, dato.Qe, "qe", logger),
            Qs = SanearCaudal(dato, dato.Qs, "qs", logger),
            Qv = SanearCaudal(dato, dato.Qv, "qv", logger),
            PotenciaActiva = SanearPotencia(dato, logger)
        };
    }

    private static decimal? SanearNivel(DatoCora dato, ILogger logger)
    {
        if (dato.Nivel is not { } nivel) return null;

        var (min, max) = RangoNivelPorPlanta.GetValueOrDefault(dato.Planta, (0, double.MaxValue));
        if ((double)nivel < min || (double)nivel > max)
        {
            logger.LogWarning(
                "[CORA] Nivel fuera de rango para {Planta} {Fecha} {Hora}: {Nivel} (esperado {Min}-{Max}). Se descarta el valor.",
                dato.Planta, dato.Fecha, dato.Hora, nivel, min, max);
            return null;
        }

        return nivel;
    }

    private static decimal? SanearCaudal(DatoCora dato, decimal? valor, string campo, ILogger logger)
    {
        if (valor is not { } caudal) return null;

        if (caudal < 0 || (double)caudal > CaudalMaximoRazonableM3s)
        {
            logger.LogWarning(
                "[CORA] Campo {Campo} fuera de rango para {Planta} {Fecha} {Hora}: {Valor}. Se descarta el valor.",
                campo, dato.Planta, dato.Fecha, dato.Hora, caudal);
            return null;
        }

        return caudal;
    }

    private static decimal? SanearPotencia(DatoCora dato, ILogger logger)
    {
        if (dato.PotenciaActiva is not { } potencia) return null;

        if (potencia < 0 || (double)potencia > PotenciaMaximaRazonableMw)
        {
            logger.LogWarning(
                "[CORA] Potencia activa fuera de rango para {Planta} {Fecha} {Hora}: {Potencia}. Se descarta el valor.",
                dato.Planta, dato.Fecha, dato.Hora, potencia);
            return null;
        }

        return potencia;
    }
}
