using System.Text.Json;
using CaudalesBackend.Models;
using CaudalesBackend.Services;

namespace CaudalesBackend.Tests;

/// <summary>
/// Genera resultados de referencia (golden master) de los simuladores actuales.
/// Solo se ejecuta cuando existe la variable de entorno REFERENCIA_SALIDA; en cualquier
/// otro caso la prueba termina sin hacer nada. No forma parte de la suite normal.
/// </summary>
public class GeneradorReferenciaSimuladores
{
    private static readonly JsonSerializerOptions OpcionesJson = new(JsonSerializerDefaults.Web);
    private static readonly DateOnly FechaPatron = new(2026, 1, 15);

    [Fact]
    public void GenerarReferencia()
    {
        var salida = Environment.GetEnvironmentVariable("REFERENCIA_SALIDA");
        if (string.IsNullOrWhiteSpace(salida)) return;

        var escorrentias = new[]
        {
            new EscorrentiaOptions(0.65, 500_000, 75),
            new EscorrentiaOptions(0.65, null, 75),
            new EscorrentiaOptions(0.40, 300_000, 60)
        };

        var lluvias = new (string Nombre, double[] Valores)[]
        {
            ("ninguna", Lluvia(_ => 0)),
            ("moderada", Lluvia(h => h is 6 or 7 ? 20 : 0)),
            ("fuerte", Lluvia(h => h is >= 4 and <= 10 ? 40 : 0))
        };

        var documento = new
        {
            generadoDe = Environment.GetEnvironmentVariable("GITHUB_SHA") ?? "local",
            escorrentia = GenerarEscorrentia(),
            cafetal = GenerarCafetal(escorrentias, lluvias),
            laPerlaPatron = GenerarLaPerlaPatron(escorrentias, lluvias),
            laPerlaManning = GenerarLaPerlaManning(escorrentias, lluvias),
            recalcular = GenerarRecalculos(escorrentias[0], lluvias[0].Valores)
        };

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(salida))!);
        File.WriteAllText(salida, JsonSerializer.Serialize(documento, OpcionesJson));
    }

    private static List<object> GenerarEscorrentia()
    {
        var casos = new List<object>();
        double[] lluvias = [0, 5, 10, 16.9, 17, 20, 30, 50, 100, 200];
        double[] curvas = [10, 30, 50, 60, 75, 85, 95, 100, 150];

        foreach (var lluvia in lluvias)
        {
            foreach (var cn in curvas)
            {
                casos.Add(new
                {
                    lluviaMm = lluvia,
                    curvaNumero = cn,
                    resultado = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(lluvia, cn)
                });
            }
        }

        return casos;
    }

    private static List<object> GenerarCafetal(
        EscorrentiaOptions[] escorrentias,
        (string Nombre, double[] Valores)[] lluvias)
    {
        var patrones = PatronesEntrada();
        double[] niveles = [773.6, 775.0, 776.5, 777.5, 777.8];
        double?[] potencias = [null, 2.0, 4.2, 8.3];
        var casos = new List<object>();

        foreach (var nivel in niveles)
        foreach (var patron in patrones)
        foreach (var lluvia in lluvias)
        foreach (var (indiceEsc, esc) in escorrentias.Select((e, i) => (i, e)))
        {
            if (lluvia.Nombre == "ninguna" && indiceEsc > 0) continue;

            foreach (var potencia in potencias)
            {
                var entrada = new PatronEntradaDto(FechaPatron, patron.Valores, 24, true);
                casos.Add(new
                {
                    entrada = new
                    {
                        nivelInicial = nivel,
                        patron = patron.Nombre,
                        patronQe = patron.Valores,
                        lluvia = lluvia.Nombre,
                        lluviaMm = lluvia.Valores,
                        escorrentia = esc,
                        potenciaMw = potencia
                    },
                    salida = Ejecutar(() => SimuladorCaudales.SimularDia(nivel, lluvia.Valores, entrada, esc, potencia))
                });
            }
        }

        return casos;
    }

    private static List<object> GenerarLaPerlaPatron(
        EscorrentiaOptions[] escorrentias,
        (string Nombre, double[] Valores)[] lluvias)
    {
        var patrones = PatronesEntrada();
        double[] niveles = [595.5, 597.0, 598.5, 599.0, 599.9];
        double?[] potencias = [null, 2.0, 3.7];
        var casos = new List<object>();

        foreach (var nivel in niveles)
        foreach (var patron in patrones)
        foreach (var lluvia in lluvias)
        foreach (var (indiceEsc, esc) in escorrentias.Select((e, i) => (i, e)))
        {
            if (lluvia.Nombre == "ninguna" && indiceEsc > 0) continue;

            foreach (var potencia in potencias)
            {
                var entrada = new PatronEntradaDto(FechaPatron, patron.Valores, 24, true);
                casos.Add(new
                {
                    entrada = new
                    {
                        nivelInicial = nivel,
                        patron = patron.Nombre,
                        patronQe = patron.Valores,
                        lluvia = lluvia.Nombre,
                        lluviaMm = lluvia.Valores,
                        escorrentia = esc,
                        potenciaMw = potencia
                    },
                    salida = Ejecutar(() => SimuladorLaPerla.SimularDiaConPatronCora(nivel, lluvia.Valores, entrada, esc, potencia))
                });
            }
        }

        return casos;
    }

    private static List<object> GenerarLaPerlaManning(
        EscorrentiaOptions[] escorrentias,
        (string Nombre, double[] Valores)[] lluvias)
    {
        double[] niveles = [595.5, 597.0, 598.5, 599.0, 599.9];
        double[] alturasCanal = [0.3, 0.5, 1.0, 1.6];
        double?[] potencias = [null, 2.0, 3.7];
        var casos = new List<object>();

        foreach (var nivel in niveles)
        foreach (var altura in alturasCanal)
        foreach (var lluvia in lluvias)
        foreach (var (indiceEsc, esc) in escorrentias.Select((e, i) => (i, e)))
        {
            if (lluvia.Nombre == "ninguna" && indiceEsc > 0) continue;

            foreach (var potencia in potencias)
            {
                casos.Add(new
                {
                    entrada = new
                    {
                        nivelInicial = nivel,
                        alturaCanalM = altura,
                        lluvia = lluvia.Nombre,
                        lluviaMm = lluvia.Valores,
                        escorrentia = esc,
                        potenciaMw = potencia
                    },
                    salida = Ejecutar(() => SimuladorLaPerla.SimularDia(nivel, altura, lluvia.Valores, esc, potencia))
                });
            }
        }

        return casos;
    }

    private static List<object> GenerarRecalculos(EscorrentiaOptions esc, double[] lluviaNinguna)
    {
        var casos = new List<object>();
        var patron = new PatronEntradaDto(FechaPatron, Enumerable.Repeat((decimal?)2.0m, 24).ToArray(), 24, true);

        var baseCafetal = SimuladorCaudales.SimularDia(776.5, lluviaNinguna, patron, esc, null);
        var detalleCafetal = new ProyeccionDetalleDto(
            1, "cafetal", new DateTime(2026, 1, 15), 776.5, null, null, FechaPatron,
            baseCafetal.Resultados, baseCafetal.Resumen);

        double[][] conjuntosCafetal =
        [
            Enumerable.Repeat(0.0, 24).ToArray(),
            Enumerable.Repeat(1.0, 24).ToArray(),
            Enumerable.Repeat(4.2, 24).ToArray(),
            Enumerable.Repeat(8.4, 24).ToArray(),
            Enumerable.Repeat(8.5, 24).ToArray(),
            Enumerable.Range(0, 24).Select(h => h % 3 == 0 ? 0.05 : h % 3 == 1 ? 0.3 : 6.0).ToArray(),
            Enumerable.Range(0, 24).Select(h => h is >= 18 and <= 21 ? 8.0 : 0.0).ToArray()
        ];

        foreach (var potencias in conjuntosCafetal)
        {
            casos.Add(new
            {
                planta = "cafetal",
                potencias,
                salida = Ejecutar(() => SimuladorCaudales.RecalcularConPotencias(detalleCafetal, potencias))
            });
        }

        var baseLaPerla = SimuladorLaPerla.SimularDiaConPatronCora(598.5, lluviaNinguna, patron, esc, null);
        var detalleLaPerla = new ProyeccionDetalleDto(
            2, "la-perla", new DateTime(2026, 1, 15), 598.5, null, null, FechaPatron,
            baseLaPerla.Resultados, baseLaPerla.Resumen);

        double[][] conjuntosLaPerla =
        [
            Enumerable.Repeat(0.0, 24).ToArray(),
            Enumerable.Repeat(1.0, 24).ToArray(),
            Enumerable.Repeat(3.6, 24).ToArray(),
            Enumerable.Repeat(3.7, 24).ToArray(),
            Enumerable.Repeat(6.0, 24).ToArray(),
            Enumerable.Repeat(6.5, 24).ToArray(),
            Enumerable.Range(0, 24).Select(h => h % 3 == 0 ? 0.05 : h % 3 == 1 ? 0.3 : 3.0).ToArray()
        ];

        foreach (var potencias in conjuntosLaPerla)
        {
            casos.Add(new
            {
                planta = "la-perla",
                potencias,
                salida = Ejecutar(() => SimuladorLaPerla.RecalcularConPotencias(detalleLaPerla, potencias))
            });
        }

        return casos;
    }

    private static (string Nombre, decimal?[] Valores)[] PatronesEntrada()
    {
        return
        [
            ("constante-0.5", Patron(_ => 0.5m)),
            ("constante-1.0", Patron(_ => 1.0m)),
            ("constante-1.5", Patron(_ => 1.5m)),
            ("constante-2.5", Patron(_ => 2.5m)),
            ("pico-diurno", Patron(h => h is >= 10 and <= 14 ? 3.0m : 1.2m)),
            ("valle-madrugada", Patron(h => h <= 5 ? 1.0m : 2.5m))
        ];
    }

    private static decimal?[] Patron(Func<int, decimal> funcion)
    {
        return Enumerable.Range(0, 24).Select(h => (decimal?)funcion(h)).ToArray();
    }

    private static double[] Lluvia(Func<int, double> funcion)
    {
        return Enumerable.Range(0, 24).Select(funcion).ToArray();
    }

    private static object[] Fila(ResultadoHorarioDto r)
    {
        return
        [
            r.De, r.A, r.Potencia, r.CaudalSalida, r.VolumenTurbinado, r.CaudalIngreso,
            r.VolumenPorHora, r.Diferencia, r.Acumulado, r.Nivel, r.Estado
        ];
    }

    private static object Ejecutar(Func<SimulacionResponse> simulacion)
    {
        try
        {
            var respuesta = simulacion();
            return new
            {
                ok = true,
                columnas = "de,a,potencia,caudalSalida,volumenTurbinado,caudalIngreso,volumenPorHora,diferencia,acumulado,nivel,estado",
                filas = respuesta.Resultados.Select(Fila).ToArray(),
                resumen = respuesta.Resumen
            };
        }
        catch (Exception ex)
        {
            return new { ok = false, error = $"{ex.GetType().Name}: {ex.Message}" };
        }
    }
}
