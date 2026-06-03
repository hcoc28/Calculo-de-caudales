using CaudalesBackend.Models;

namespace CaudalesBackend.Services;

internal static class SimuladorCaudales
{
    public const int HorasSimulacion = 24;

    private static readonly double[][] TablaVolumen =
    [
        [0.00, 770.00],
        [2297.00, 770.50],
        [5167.70, 771.00],
        [8623.90, 771.50],
        [12769.60, 772.00],
        [17624.49, 772.50],
        [23241.57, 773.00],
        [29304.76, 773.50],
        [35764.33, 774.00],
        [42637.14, 774.50],
        [49924.80, 775.00],
        [57672.94, 775.50],
        [65881.95, 776.00],
        [74567.19, 776.50],
        [83801.42, 777.00],
        [93664.56, 777.50],
        [104784.00, 778.00]
    ];

    private static readonly int[] HorasObligatorias = [18, 19, 20, 21];
    private static readonly Dictionary<int, double> AjustesCaudalNeto = new()
    {
        [19] = -0.53,
        [20] = -0.26,
        [21] = 0.81
    };

    private const double NivelMinimo = 773.50;
    private const double NivelInicio = 777.50;
    private const double NivelRebalse = 777.75;
    private const double PotenciaUnidad1 = 4.2;
    private const double PotenciaUnidad2 = 4.2;
    private const double PotenciaMaximaDefecto = 8.3;
    private const int HorasMinimasUnidad2 = 2;
    private const int HorasMinimasAntesUnidad2 = 2;
    private const double UmbralCaudalAlto = 2.20;
    private const double MargenPosteriorObligatorio = 0.15;
    private const int HorasProyeccion = 5;

    public static SimulacionResponse SimularDia(
        double nivelInicial,
        double[] datosLluvia,
        PatronEntradaDto patron,
        EscorrentiaOptions escorrentia,
        double? potenciaGeneracionMw)
    {
        var volumenInicial = NivelAVolumen(nivelInicial);
        var arregloEntrada = GenerarPatronEntrada(datosLluvia, patron, nivelInicial, escorrentia);
        var areaEscorrentia = ObtenerAreaEscorrentia(nivelInicial, escorrentia);
        var potenciaMaxima = ObtenerPotenciaGeneracion(potenciaGeneracionMw);
        var potenciaUnidad1 = Math.Min(PotenciaUnidad1, potenciaMaxima);
        var potenciaDosUnidades = potenciaMaxima;
        var opcionesObligatorias = CrearOpcionesObligatorias(potenciaUnidad1, potenciaMaxima);

        var volumenAcumulado = volumenInicial;
        var nivelActual = nivelInicial;
        var produccionValida = true;
        var horasProduccion = 0;
        var modoProduccion = 0;
        var horasEnModo = 0;
        double? potenciaObligatoriaConstante = null;
        var resultados = new List<ResultadoHorarioDto>();

        for (var h = 0; h < HorasSimulacion; h++)
        {
            var horaDesde = h;
            var horaHasta = (h + 1) % 24;
            var volumenAnterior = volumenAcumulado;
            var caudalEntrada = arregloEntrada[h];
            var esObligatoria = HorasObligatorias.Contains(h);
            var promedioEntradaProyectada = CalcularPromedioEntradaProyectada(arregloEntrada, h, HorasProyeccion);

            var escenario0 = EvaluarEscenario(volumenAnterior, caudalEntrada, 0);
            var escenario1 = EvaluarEscenario(volumenAnterior, caudalEntrada, potenciaUnidad1);
            var escenario2 = EvaluarEscenario(volumenAnterior, caudalEntrada, potenciaDosUnidades);

            var elegido = escenario0;
            var estado = "Apagada";
            var nuevoModo = modoProduccion;

            if (esObligatoria)
            {
                potenciaObligatoriaConstante ??= EncontrarPotenciaObligatoriaConstanteMaxima(volumenAnterior, arregloEntrada, opcionesObligatorias);

                if (potenciaObligatoriaConstante > 0)
                {
                    elegido = EvaluarEscenario(volumenAnterior, caudalEntrada, potenciaObligatoriaConstante.Value);
                    nuevoModo = ObtenerCantidadUnidadesPorPotencia(elegido.PotenciaGenerada, potenciaUnidad1);
                    estado = "Encendida";
                    horasProduccion++;
                }
                else
                {
                    elegido = escenario0;
                    estado = "No viable - Apagada";
                    produccionValida = false;
                    nuevoModo = 0;
                }
            }
            else
            {
                var despuesObligatoria = h > HorasObligatorias.Last();
                var cercaObligatoria = h < HorasObligatorias[0] && (HorasObligatorias[0] - h) <= 1;

                if (despuesObligatoria)
                {
                    var nivelSeguro = nivelActual >= NivelMinimo + MargenPosteriorObligatorio;
                    var caudalSuficiente = promedioEntradaProyectada >= UmbralCaudalAlto;

                    if (nivelSeguro && caudalSuficiente && escenario2.NivelFinal >= NivelMinimo)
                    {
                        elegido = escenario2;
                        estado = "Encendida";
                        nuevoModo = 2;
                        horasProduccion++;
                    }
                    else if (nivelSeguro && caudalSuficiente && escenario1.NivelFinal >= NivelMinimo)
                    {
                        elegido = escenario1;
                        estado = "Encendida";
                        nuevoModo = 1;
                        horasProduccion++;
                    }
                }
                else if (modoProduccion == 2)
                {
                    var bloqueViableCon2 = EsViableParaBloqueObligatorio(h, escenario2.VolumenFinal, arregloEntrada, opcionesObligatorias);

                    if (escenario2.NivelFinal >= NivelMinimo && bloqueViableCon2)
                    {
                        elegido = escenario2;
                        estado = "Encendida continua (2 unidades)";
                        nuevoModo = 2;
                        horasProduccion++;
                    }
                    else if (!cercaObligatoria && escenario1.NivelFinal >= NivelMinimo && horasEnModo >= HorasMinimasUnidad2)
                    {
                        elegido = escenario1;
                        estado = "Encendida continua (1 unidad)";
                        nuevoModo = 1;
                        horasProduccion++;
                    }
                    else
                    {
                        nuevoModo = 0;
                    }
                }
                else if (modoProduccion == 1)
                {
                    var horasHastaObligatoria = HorasObligatorias[0] - h;
                    var puedeSubirUnidad = horasEnModo >= HorasMinimasAntesUnidad2 &&
                        (nivelActual >= NivelInicio || (horasHastaObligatoria <= 1 && escenario2.NivelFinal >= NivelMinimo));

                    if (puedeSubirUnidad && escenario2.NivelFinal >= NivelMinimo)
                    {
                        elegido = escenario2;
                        estado = "Encendida continua (2 unidades)";
                        nuevoModo = 2;
                        horasProduccion++;
                    }
                    else if (escenario1.NivelFinal >= NivelMinimo)
                    {
                        elegido = escenario1;
                        estado = "Encendida continua (1 unidad)";
                        nuevoModo = 1;
                        horasProduccion++;
                    }
                    else
                    {
                        nuevoModo = 0;
                    }
                }
                else
                {
                    var bloqueViableCon2 = EsViableParaBloqueObligatorio(h, escenario2.VolumenFinal, arregloEntrada, opcionesObligatorias);
                    var bloqueViableCon1 = EsViableParaBloqueObligatorio(h, escenario1.VolumenFinal, arregloEntrada, opcionesObligatorias);

                    if (nivelActual >= NivelRebalse && escenario2.NivelFinal >= NivelMinimo && bloqueViableCon2)
                    {
                        elegido = escenario2;
                        estado = "Encendida continua (2 unidades)";
                        nuevoModo = 2;
                        horasProduccion++;
                    }
                    else if (nivelActual >= NivelInicio && escenario1.NivelFinal >= NivelMinimo && bloqueViableCon1)
                    {
                        elegido = escenario1;
                        estado = "Encendida continua (1 unidad)";
                        nuevoModo = 1;
                        horasProduccion++;
                    }
                }
            }

            volumenAcumulado = elegido.VolumenFinal;
            nivelActual = elegido.NivelFinal;
            horasEnModo = nuevoModo == modoProduccion ? horasEnModo + 1 : 1;
            modoProduccion = nuevoModo;

            resultados.Add(new ResultadoHorarioDto(
                horaDesde,
                horaHasta,
                elegido.PotenciaGenerada,
                elegido.Salida,
                elegido.VolumenTurbinado,
                caudalEntrada,
                elegido.VolumenPorHora,
                elegido.Diferencia,
                volumenAcumulado,
                nivelActual,
                estado));
        }

        var resumen = new ResumenSimulacionDto(
            nivelInicial,
            volumenInicial,
            resultados[^1].Nivel,
            resultados[^1].Acumulado,
            resultados.Min(r => r.Nivel),
            resultados.Max(r => r.Nivel),
            potenciaMaxima,
            horasProduccion,
            produccionValida,
            patron.Fecha,
            patron.Registros,
            patron.Completo,
            escorrentia.Coeficiente,
            areaEscorrentia);

        return new SimulacionResponse(resultados, resumen);
    }

    public static SimulacionResponse RecalcularConPotencias(ProyeccionDetalleDto proyeccion, double[] potencias)
    {
        var resultadosOriginales = proyeccion.Resultados;
        var resultados = new List<ResultadoHorarioDto>();
        var volumenAcumulado = proyeccion.Resumen.VolumenInicial;

        for (var h = 0; h < resultadosOriginales.Count; h++)
        {
            var original = resultadosOriginales[h];
            var potencia = h < potencias.Length ? NormalizarPotenciaManual(potencias[h]) : original.Potencia;
            var escenario = EvaluarEscenario(volumenAcumulado, original.CaudalIngreso, potencia);

            volumenAcumulado = escenario.VolumenFinal;
            resultados.Add(new ResultadoHorarioDto(
                original.De,
                original.A,
                escenario.PotenciaGenerada,
                escenario.Salida,
                escenario.VolumenTurbinado,
                original.CaudalIngreso,
                escenario.VolumenPorHora,
                escenario.Diferencia,
                escenario.VolumenFinal,
                escenario.NivelFinal,
                escenario.PotenciaGenerada > 0 ? "Editada" : "Apagada"));
        }

        var resumen = proyeccion.Resumen with
        {
            NivelFinal = resultados[^1].Nivel,
            VolumenFinal = resultados[^1].Acumulado,
            NivelMinimo = resultados.Min(r => r.Nivel),
            NivelMaximo = resultados.Max(r => r.Nivel),
            PotenciaElegida = resultados.Max(r => r.Potencia),
            HorasProduccion = resultados.Count(r => r.Potencia > 0),
            ProduccionValida = resultados.All(r => r.Nivel >= NivelMinimo)
        };

        return new SimulacionResponse(resultados, resumen, proyeccion.Id);
    }

    private static double[] GenerarPatronEntrada(double[] datosLluvia, PatronEntradaDto patron, double nivelReferencia, EscorrentiaOptions escorrentia)
    {
        var arregloEntrada = new double[HorasSimulacion];

        for (var h = 0; h < HorasSimulacion; h++)
        {
            var entradaReal = patron.Patron[h];
            if (!entradaReal.HasValue)
            {
                throw new InvalidOperationException($"Falta QE en base de datos para la hora operativa {h + 1}.");
            }

            // 1 mm de lluvia sobre 1 m2 equivale a 1 litro.
            var lluvia = h >= 2 ? datosLluvia[h - 2] : 0;
            var caudalPorLluvia = CalcularCaudalEscorrentiaPorLluvia(lluvia, nivelReferencia, escorrentia);
            var ajuste = AjustesCaudalNeto.GetValueOrDefault(h, 0);
            arregloEntrada[h] = Redondear2((double)entradaReal.Value + caudalPorLluvia + ajuste);
        }

        return arregloEntrada;
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
        if (nivel <= TablaVolumen[0][1])
        {
            return PendienteArea(0);
        }

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
        var v1 = TablaVolumen[i][0];
        var h1 = TablaVolumen[i][1];
        var v2 = TablaVolumen[i + 1][0];
        var h2 = TablaVolumen[i + 1][1];
        return (v2 - v1) / (h2 - h1);
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

        return 770;
    }

    private static Escenario EvaluarEscenario(double volumenAnterior, double caudalEntrada, double potenciaGenerada)
    {
        var salida = potenciaGenerada > 0 ? CalcularCaudalSalida(potenciaGenerada) : 0;
        var volumenTurbinado = salida > 0 ? CalcularVolumenTurbinado(salida) : 0;
        var volumenPorHora = Redondear2(caudalEntrada * 3600);
        var diferencia = Redondear2(volumenPorHora - volumenTurbinado);
        var volumenFinal = LimitarVolumen(volumenAnterior + diferencia);
        var nivelFinal = VolumenANivel(volumenFinal);

        return new Escenario(
            potenciaGenerada,
            Redondear2(salida),
            Redondear2(volumenTurbinado),
            volumenPorHora,
            diferencia,
            volumenFinal,
            nivelFinal);
    }

    private static double CalcularCaudalSalida(double potenciaGenerada) => Redondear2(potenciaGenerada / 2.69266667);

    private static double CalcularVolumenTurbinado(double caudalSalida) => Redondear2(caudalSalida * 3600);

    private static double LimitarVolumen(double volumen)
    {
        var min = TablaVolumen[0][0];
        var max = TablaVolumen[^1][0];
        return Math.Max(min, Math.Min(max, Redondear2(volumen)));
    }

    private static double CalcularPromedioEntradaProyectada(double[] arregloEntrada, int horaActual, int horasAdelante)
    {
        var fin = Math.Min(horaActual + horasAdelante, arregloEntrada.Length);
        var valores = arregloEntrada[horaActual..fin];
        return valores.Length > 0 ? Redondear2(valores.Average()) : 0;
    }

    private static bool EsViableParaBloqueObligatorio(
        int horaActual,
        double volumen,
        double[] arregloEntrada,
        double[] opcionesObligatorias)
    {
        var volumenActual = volumen;

        for (var h = horaActual + 1; h < HorasSimulacion; h++)
        {
            var potenciaObligatoriaMaxima = opcionesObligatorias.Max();
            var potenciaGenerada = HorasObligatorias.Contains(h) ? potenciaObligatoriaMaxima : 0;
            var escenario = EvaluarEscenario(volumenActual, arregloEntrada[h], potenciaGenerada);
            volumenActual = escenario.VolumenFinal;

            if (escenario.NivelFinal < NivelMinimo)
            {
                return false;
            }
        }

        return true;
    }

    private static double EncontrarPotenciaObligatoriaConstanteMaxima(
        double volumenInicialBloque,
        double[] arregloEntrada,
        double[] opcionesObligatorias)
    {
        for (var i = opcionesObligatorias.Length - 1; i >= 0; i--)
        {
            var potenciaPrueba = opcionesObligatorias[i];
            var volumenActual = volumenInicialBloque;
            var esViable = true;

            foreach (var horaObligatoria in HorasObligatorias)
            {
                var escenario = EvaluarEscenario(volumenActual, arregloEntrada[horaObligatoria], potenciaPrueba);
                if (escenario.NivelFinal < NivelMinimo)
                {
                    esViable = false;
                    break;
                }

                volumenActual = escenario.VolumenFinal;
            }

            if (esViable) return potenciaPrueba;
        }

        return 0;
    }

    private static int ObtenerCantidadUnidadesPorPotencia(double potenciaGenerada, double potenciaUnidad1)
    {
        if (potenciaGenerada <= 0) return 0;
        return potenciaGenerada <= potenciaUnidad1 ? 1 : 2;
    }

    private static double ObtenerPotenciaGeneracion(double? potenciaGeneracionMw)
    {
        return potenciaGeneracionMw is > 0
            ? Math.Clamp(Redondear1(potenciaGeneracionMw.Value), 0.1, PotenciaUnidad1 + PotenciaUnidad2)
            : PotenciaMaximaDefecto;
    }

    private static double NormalizarPotenciaManual(double potencia)
    {
        if (!double.IsFinite(potencia) || potencia <= 0) return 0;
        return Math.Clamp(Redondear1(potencia), 0, PotenciaUnidad1 + PotenciaUnidad2);
    }

    private static double[] CrearOpcionesObligatorias(double potenciaMinima, double potenciaMaxima)
    {
        var inicio = Math.Min(potenciaMinima, potenciaMaxima);
        var pasos = Math.Max(0, (int)Math.Round((potenciaMaxima - inicio) * 10));
        var opciones = Enumerable
            .Range(0, pasos + 1)
            .Select(i => Redondear1(inicio + i * 0.1))
            .Append(Redondear1(potenciaMaxima))
            .Distinct()
            .Order()
            .ToArray();

        return opciones.Length > 0 ? opciones : [potenciaMaxima];
    }

    private static double Redondear2(double valor) => Math.Round(valor * 100) / 100;
    private static double Redondear1(double valor) => Math.Round(valor * 10) / 10;

    private sealed record Escenario(
        double PotenciaGenerada,
        double Salida,
        double VolumenTurbinado,
        double VolumenPorHora,
        double Diferencia,
        double VolumenFinal,
        double NivelFinal);
}
