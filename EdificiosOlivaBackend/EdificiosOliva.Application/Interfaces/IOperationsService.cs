using EdificiosOliva.Application.DTOs.Operations;

namespace EdificiosOliva.Application.Interfaces;

public interface IOperationsService
{
    Task<OperationsAnalyticsResponse> GetAnalyticsAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default);

    Task<OperationsCalendarResponse> GetCalendarAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportReservationsCsvAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportPaymentsCsvAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default);

    Task<string> GetPublicICalendarAsync(
        Guid apartmentId,
        CancellationToken cancellationToken = default);
}
