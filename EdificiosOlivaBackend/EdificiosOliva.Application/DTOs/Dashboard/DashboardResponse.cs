namespace EdificiosOliva.Application.DTOs.Dashboard;

public sealed record DashboardReservationItem(
    Guid Id,
    string CustomerName,
    string ApartmentName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int Status);

public sealed record DashboardResponse(
    int TotalApartments,
    int AvailableApartments,
    int TotalReservations,
    int ReservationsThisMonth,
    int ActiveCustomers,
    decimal TotalRevenue,
    decimal CurrentOccupancyRate,
    DateOnly? NextCheckInDate,
    IReadOnlyCollection<DashboardReservationItem> RecentReservations);
