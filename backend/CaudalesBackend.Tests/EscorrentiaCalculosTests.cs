using CaudalesBackend.Services;

namespace CaudalesBackend.Tests;

public class EscorrentiaCalculosTests
{
    [Theory]
    [InlineData(0, 75)]
    [InlineData(-5, 75)]
    [InlineData(10, 75)] // por debajo de la abstraccion inicial (~16.93 mm para CN=75)
    public void LluviaPorDebajoDeAbstraccionInicial_NoGeneraEscorrentia(double lluviaMm, double curvaNumero)
    {
        var resultado = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(lluviaMm, curvaNumero);

        Assert.Equal(0, resultado);
    }

    [Fact]
    public void CalculaEscorrentiaSegunFormulaScsParaValoresConocidos()
    {
        // CN=75 -> S = 25400/75 - 254 = 84.6667; Ia = 0.2*S = 16.9333
        // P=50 -> Q = (P-Ia)^2 / (P + 0.8*S) = 9.2872 (calculado a mano)
        var resultado = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(50, 75);

        Assert.Equal(9.2872, resultado, precision: 3);
    }

    [Fact]
    public void CurvaNumeroSeAcotaAlRangoValido()
    {
        var resultadoBajo = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(50, 10);
        var resultadoEnLimite = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(50, 30);

        var resultadoAlto = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(50, 150);
        var resultadoEnLimiteSuperior = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(50, 100);

        Assert.Equal(resultadoEnLimite, resultadoBajo);
        Assert.Equal(resultadoEnLimiteSuperior, resultadoAlto);
    }

    [Fact]
    public void MayorCurvaNumero_GeneraMasEscorrentiaParaLaMismaLluvia()
    {
        var lluviaMm = 60;

        var escorrentiaSueloPermeable = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(lluviaMm, 50);
        var escorrentiaSueloImpermeable = EscorrentiaCalculos.CalcularEscorrentiaCurvaNumero(lluviaMm, 95);

        Assert.True(escorrentiaSueloImpermeable > escorrentiaSueloPermeable);
    }
}
