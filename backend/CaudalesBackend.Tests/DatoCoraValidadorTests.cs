using System.Text.Json.Nodes;
using CaudalesBackend.Models;
using CaudalesBackend.Repositories;
using Microsoft.Extensions.Logging.Abstractions;

namespace CaudalesBackend.Tests;

public class DatoCoraValidadorTests
{
    private static readonly NullLogger Logger = NullLogger.Instance;

    private static DatoCora CrearDato(string planta, decimal? nivel = null, decimal? qe = null, decimal? qs = null, decimal? qv = null, decimal? potencia = null)
    {
        return new DatoCora(
            planta,
            DateOnly.FromDateTime(DateTime.Today),
            new TimeOnly(10, 0),
            nivel,
            qe,
            qs,
            qv,
            potencia,
            Clima: null,
            DatosOriginales: new JsonObject());
    }

    [Fact]
    public void ValoresDentroDeRango_SeConservan()
    {
        var dato = CrearDato("cafetal", nivel: 775, qe: 2.5m, qs: 2.0m, qv: 0m, potencia: 4.2m);

        var resultado = DatoCoraValidador.Sanear(dato, Logger);

        Assert.Equal(775, resultado.Nivel);
        Assert.Equal(2.5m, resultado.Qe);
        Assert.Equal(2.0m, resultado.Qs);
        Assert.Equal(0m, resultado.Qv);
        Assert.Equal(4.2m, resultado.PotenciaActiva);
    }

    [Theory]
    [InlineData("cafetal", 700)] // por debajo del rango operativo
    [InlineData("cafetal", 900)] // por encima del rango operativo
    [InlineData("la-perla", 500)]
    public void NivelFueraDeRangoParaLaPlanta_SeDescarta(string planta, decimal nivel)
    {
        var dato = CrearDato(planta, nivel: nivel);

        var resultado = DatoCoraValidador.Sanear(dato, Logger);

        Assert.Null(resultado.Nivel);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(9999)]
    public void CaudalFueraDeRango_SeDescarta(decimal caudal)
    {
        var dato = CrearDato("cafetal", qe: caudal, qs: caudal, qv: caudal);

        var resultado = DatoCoraValidador.Sanear(dato, Logger);

        Assert.Null(resultado.Qe);
        Assert.Null(resultado.Qs);
        Assert.Null(resultado.Qv);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(500)]
    public void PotenciaFueraDeRango_SeDescarta(decimal potencia)
    {
        var dato = CrearDato("cafetal", potencia: potencia);

        var resultado = DatoCoraValidador.Sanear(dato, Logger);

        Assert.Null(resultado.PotenciaActiva);
    }

    [Fact]
    public void ValoresNulos_SePreservanComoNulos()
    {
        var dato = CrearDato("cafetal");

        var resultado = DatoCoraValidador.Sanear(dato, Logger);

        Assert.Null(resultado.Nivel);
        Assert.Null(resultado.Qe);
        Assert.Null(resultado.Qs);
        Assert.Null(resultado.Qv);
        Assert.Null(resultado.PotenciaActiva);
    }
}
