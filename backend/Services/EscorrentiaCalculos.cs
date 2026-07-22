namespace CaudalesBackend.Services;

internal static class EscorrentiaCalculos
{
    public static double CalcularEscorrentiaCurvaNumero(double lluviaMm, double curvaNumero)
    {
        var cn = Math.Clamp(curvaNumero, 30, 100);
        var retencionPotencial = (25400 / cn) - 254;
        var abstraccionInicial = 0.2 * retencionPotencial;

        if (lluviaMm <= abstraccionInicial)
        {
            return 0;
        }

        var escorrentiaMm = Math.Pow(lluviaMm - abstraccionInicial, 2) / (lluviaMm + (0.8 * retencionPotencial));
        return Math.Max(0, escorrentiaMm);
    }
}
