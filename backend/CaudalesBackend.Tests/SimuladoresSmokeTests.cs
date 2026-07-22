using CaudalesBackend.Models;
using CaudalesBackend.Services;

namespace CaudalesBackend.Tests;

public class SimuladoresSmokeTests
{
    private static readonly EscorrentiaOptions Escorrentia = new(Coeficiente: 0.65, AreaAporteM2: 500_000, CurvaNumero: 75);

    [Fact]
    public void SimuladorCaudales_SimulaUnDiaCompletoSinLanzarExcepciones()
    {
        var patron = new PatronEntradaDto(
            Fecha: DateOnly.FromDateTime(DateTime.Today),
            Patron: Enumerable.Repeat((decimal?)1.5m, SimuladorCaudales.HorasSimulacion).ToArray(),
            Registros: SimuladorCaudales.HorasSimulacion,
            Completo: true);
        var datosLluvia = new double[SimuladorCaudales.HorasSimulacion];

        var resultado = SimuladorCaudales.SimularDia(
            nivelInicial: 776,
            datosLluvia: datosLluvia,
            patron: patron,
            escorrentia: Escorrentia,
            potenciaGeneracionMw: null);

        Assert.Equal(SimuladorCaudales.HorasSimulacion, resultado.Resultados.Count);
    }

    [Fact]
    public void SimuladorLaPerla_SimulaUnDiaCompletoSinLanzarExcepciones()
    {
        var datosLluvia = new double[SimuladorLaPerla.HorasSimulacion];

        var resultado = SimuladorLaPerla.SimularDia(
            nivelInicial: 598,
            alturaCanalM: 0.5,
            datosLluvia: datosLluvia,
            escorrentia: Escorrentia,
            potenciaGeneracionMw: null);

        Assert.Equal(SimuladorLaPerla.HorasSimulacion, resultado.Resultados.Count);
    }
}
