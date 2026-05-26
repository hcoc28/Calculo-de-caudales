namespace CaudalesBackend.Models;

internal sealed record SimulacionRequest(
    string? Planta,
    double NivelInicial,
    double? AlturaCanal);

internal sealed record ResultadoHorarioDto(
    int De,
    int A,
    double Potencia,
    double CaudalSalida,
    double VolumenTurbinado,
    double CaudalIngreso,
    double VolumenPorHora,
    double Diferencia,
    double Acumulado,
    double Nivel,
    string Estado);

internal sealed record ResumenSimulacionDto(
    double NivelInicial,
    double VolumenInicial,
    double NivelFinal,
    double VolumenFinal,
    double NivelMinimo,
    double NivelMaximo,
    double PotenciaElegida,
    int HorasProduccion,
    bool ProduccionValida,
    DateOnly FechaPatron,
    int RegistrosPatron,
    bool PatronCompleto,
    double CoeficienteEscorrentia,
    double AreaEscorrentiaM2);

internal sealed record SimulacionResponse(
    List<ResultadoHorarioDto> Resultados,
    ResumenSimulacionDto Resumen);

internal sealed record EscorrentiaOptions(double Coeficiente, double? AreaAporteM2);
