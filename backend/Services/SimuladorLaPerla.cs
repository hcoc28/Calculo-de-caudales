using CaudalesBackend.Models;

namespace CaudalesBackend.Services;

internal static class SimuladorLaPerla
{
    public const int HorasSimulacion = 24;

    private static readonly double[][] TablaVolumen =
    [
        [0.00, 595.00],
        [2449.08, 595.50],
        [5198.88, 596.00],
        [8181.54, 596.50],
        [11358.15, 597.00],
        [14733.01, 597.50],
        [18313.03, 598.00],
        [22105.44, 598.50],
        [26118.00, 599.00],
        [30355.50, 599.50],
        [34819.77, 600.00]
    ];

    private const double NivelMinimo = 595.00;
    private const double NivelInicio = 599.00;
    private const double NivelRebalse = 600.00;
    private const double PotenciaUnidadMw = 3.6;
    private const double CaidaHidraulicaM = 253.00;
    private const double AnchoCanalM = 3.50;
    private const double PendienteCanal = 0.00184;
    private const double ManningConcreto = 0.014;

    public static SimulacionResponse SimularDia(double nivelInicial, double alturaCanalM, double[] datosLluvia, EscorrentiaOptions escorrentia)
    {
        var volumenInicial = NivelAVolumen(nivelInicial);
        var areaEscorrentia = ObtenerAreaEscorrentia(nivelInicial, escorrentia);
        var caudalEntradaBase = CalcularCaudalManning(alturaCanalM);

        var volumenAcumulado = volumenInicial;
        var resultados = new List<ResultadoHorarioDto>();

        for (var h = 0; h < HorasSimulacion; h++)
        {
            var lluvia = h >= 2 ? datosLluvia[h - 2] : 0;
            var caudalEntrada = Redondear2(caudalEntradaBase + CalcularCaudalEscorrentiaPorLluvia(lluvia, nivelInicial, escorrentia));
            var potencia = ElegirPotencia(volumenAcumulado, caudalEntrada);
            var escenario = EvaluarEscenario(volumenAcumulado, caudalEntrada, potencia);

            volumenAcumulado = escenario.VolumenFinal;
            resultados.Add(new ResultadoHorarioDto(
                h,
                (h + 1) % 24,
                escenario.PotenciaGenerada,
                escenario.Salida,
                escenario.VolumenTurbinado,
                caudalEntrada,
                escenario.VolumenPorHora,
                escenario.Diferencia,
                escenario.VolumenFinal,
                escenario.NivelFinal,
                escenario.PotenciaGenerada > 0 ? "Encendida" : "Apagada"));
        }

        var resumen = new ResumenSimulacionDto(
            nivelInicial,
            volumenInicial,
            resultados[^1].Nivel,
            resultados[^1].Acumulado,
            resultados.Min(r => r.Nivel),
            resultados.Max(r => r.Nivel),
            PotenciaUnidadMw,
            resultados.Count(r => r.Potencia > 0),
            true,
            DateOnly.FromDateTime(DateTime.Now),
            HorasSimulacion,
            true,
            escorrentia.Coeficiente,
            areaEscorrentia);

        return new SimulacionResponse(resultados, resumen);
    }

    private static double ElegirPotencia(double volumenAnterior, double caudalEntrada)
    {
        var nivelActual = VolumenANivel(volumenAnterior);
        if (nivelActual < NivelInicio) return 0;

        var escenario = EvaluarEscenario(volumenAnterior, caudalEntrada, PotenciaUnidadMw);
        return escenario.NivelFinal >= NivelMinimo ? PotenciaUnidadMw : 0;
    }

    private static double CalcularCaudalManning(double alturaM)
    {
        var altura = Math.Clamp(alturaM, 0.01, 1.50);
        var area = AnchoCanalM * altura;
        var perimetroMojado = AnchoCanalM + (2 * altura);
        var radioHidraulico = area / perimetroMojado;
        var caudal = (1 / ManningConcreto) * area * Math.Pow(radioHidraulico, 2.0 / 3.0) * Math.Sqrt(PendienteCanal);
        return Redondear2(caudal);
    }

    private static Escenario EvaluarEscenario(double volumenAnterior, double caudalEntrada, double potenciaGenerada)
    {
        var salida = potenciaGenerada > 0 ? CalcularCaudalTurbinadoPorPotencia(potenciaGenerada) : 0;
        var volumenTurbinado = salida * 3600;
        var volumenPorHora = caudalEntrada * 3600;
        var diferencia = Redondear2(volumenPorHora - volumenTurbinado);
        var volumenFinal = LimitarVolumen(volumenAnterior + diferencia);
        var nivelFinal = VolumenANivel(volumenFinal);

        return new Escenario(
            Redondear2(potenciaGenerada),
            Redondear2(salida),
            Redondear2(volumenTurbinado),
            Redondear2(volumenPorHora),
            diferencia,
            volumenFinal,
            nivelFinal);
    }

    private static double CalcularCaudalTurbinadoPorPotencia(double potenciaMw)
    {
        var potenciaKw = potenciaMw * 1000;
        var eficiencia = (-1.907e-8 * Math.Pow(potenciaKw, 2)) + (1.0119e-4 * potenciaKw) + 0.74;
        eficiencia = Math.Clamp(eficiencia, 0.50, 0.90);
        return potenciaKw / (9.81 * CaidaHidraulicaM * eficiencia);
    }

    private static double CalcularCaudalEscorrentiaPorLluvia(double lluviaMm, double nivelReferencia, EscorrentiaOptions escorrentia)
    {
        if (!double.IsFinite(lluviaMm) || lluviaMm <= 0) return 0;

        var area = ObtenerAreaEscorrentia(nivelReferencia, escorrentia);
        return Redondear2(escorrentia.Coeficiente * lluviaMm * area / 1000 / 3600);
    }

    private static double ObtenerAreaEscorrentia(double nivelReferencia, EscorrentiaOptions escorrentia)
    {
        return escorrentia.AreaAporteM2 is > 0
            ? escorrentia.AreaAporteM2.Value
            : EstimarAreaPorNivel(nivelReferencia);
    }

    private static double EstimarAreaPorNivel(double nivel)
    {
        if (nivel <= TablaVolumen[0][1]) return PendienteArea(0);

        for (var i = 0; i < TablaVolumen.Length - 1; i++)
        {
            if (nivel >= TablaVolumen[i][1] && nivel <= TablaVolumen[i + 1][1])
            {
                return PendienteArea(i);
            }
        }

        return PendienteArea(TablaVolumen.Length - 2);
    }

    private static double PendienteArea(int i)
    {
        return (TablaVolumen[i + 1][0] - TablaVolumen[i][0]) / (TablaVolumen[i + 1][1] - TablaVolumen[i][1]);
    }

    private static double NivelAVolumen(double nivel)
    {
        if (nivel <= TablaVolumen[0][1]) return TablaVolumen[0][0];
        if (nivel >= TablaVolumen[^1][1]) return TablaVolumen[^1][0];

        for (var i = 0; i < TablaVolumen.Length - 1; i++)
        {
            var v1 = TablaVolumen[i][0];
            var h1 = TablaVolumen[i][1];
            var v2 = TablaVolumen[i + 1][0];
            var h2 = TablaVolumen[i + 1][1];

            if (nivel >= h1 && nivel <= h2)
            {
                return Redondear2(v1 + ((nivel - h1) / (h2 - h1)) * (v2 - v1));
            }
        }

        return 0;
    }

    private static double VolumenANivel(double volumen)
    {
        if (volumen <= TablaVolumen[0][0]) return TablaVolumen[0][1];
        if (volumen >= TablaVolumen[^1][0]) return TablaVolumen[^1][1];

        for (var i = 0; i < TablaVolumen.Length - 1; i++)
        {
            var v1 = TablaVolumen[i][0];
            var h1 = TablaVolumen[i][1];
            var v2 = TablaVolumen[i + 1][0];
            var h2 = TablaVolumen[i + 1][1];

            if (volumen >= v1 && volumen <= v2)
            {
                return Redondear2(h1 + ((volumen - v1) / (v2 - v1)) * (h2 - h1));
            }
        }

        return 595;
    }

    private static double LimitarVolumen(double volumen)
    {
        return Math.Max(TablaVolumen[0][0], Math.Min(TablaVolumen[^1][0], Redondear2(volumen)));
    }

    private static double Redondear2(double valor) => Math.Round(valor * 100) / 100;

    private sealed record Escenario(
        double PotenciaGenerada,
        double Salida,
        double VolumenTurbinado,
        double VolumenPorHora,
        double Diferencia,
        double VolumenFinal,
        double NivelFinal);
}
