namespace CaudalesBackend.Models;

internal sealed record SimulacionRequest(
    string? Planta,
    double NivelInicial,
    double? AlturaCanal,
    bool Guardar = false);

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
    ResumenSimulacionDto Resumen,
    long? ProyeccionId = null);

internal sealed record EscorrentiaOptions(double Coeficiente, double? AreaAporteM2);

internal sealed record ProyeccionResumenDto(
    long Id,
    string Planta,
    DateTime CreadoEn,
    double NivelInicial,
    double? AlturaCanal,
    DateOnly? FechaPatron,
    double NivelFinal,
    int HorasProduccion);

internal sealed record ProyeccionDetalleDto(
    long Id,
    string Planta,
    DateTime CreadoEn,
    double NivelInicial,
    double? AlturaCanal,
    DateOnly? FechaPatron,
    List<ResultadoHorarioDto> Resultados,
    ResumenSimulacionDto Resumen);
