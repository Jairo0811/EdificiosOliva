namespace EdificiosOliva.Application.DTOs.Operations;

public sealed record OperationsReservationItem(
    Guid ReservationId,
    Guid ApartmentId,
    string ApartmentName,
    string CustomerName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int GuestCount,
    int Status,
    decimal TotalAmount);

public sealed record ApartmentPerformanceItem(
    Guid ApartmentId,
    string ApartmentName,
    int BookedNights,
    int InventoryNights,
    decimal OccupancyRate,
    decimal RecognizedRevenue);

public sealed record OperationsAnalyticsResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    int TotalReservations,
    int ConfirmedReservations,
    int CancelledReservations,
    decimal RecognizedRevenue,
    int BookedNights,
    int InventoryNights,
    decimal OccupancyRate,
    decimal AverageBookedNightlyRate,
    IReadOnlyCollection<ApartmentPerformanceItem> Apartments,
    IReadOnlyCollection<OperationsReservationItem> Reservations);

public sealed record OperationsCalendarResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    IReadOnlyCollection<OperationsReservationItem> Reservations);
