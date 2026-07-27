using EdificiosOliva.Application.DTOs.Dashboard;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class DashboardService(ApplicationDbContext dbContext)
    : IDashboardService
{
    public async Task<DashboardResponse> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var nextMonth = monthStart.AddMonths(1);

        var totalApartments = await dbContext.Apartments
            .AsNoTracking()
            .CountAsync(apartment => !apartment.IsDeleted, cancellationToken);

        var availableApartments = await dbContext.Apartments
            .AsNoTracking()
            .CountAsync(
                apartment => !apartment.IsDeleted &&
                             apartment.Status == ApartmentStatus.Available,
                cancellationToken);

        var totalReservations = await dbContext.Reservations
            .AsNoTracking()
            .CountAsync(reservation => !reservation.IsDeleted, cancellationToken);

        var reservationsThisMonth = await dbContext.Reservations
            .AsNoTracking()
            .CountAsync(
                reservation => !reservation.IsDeleted &&
                               reservation.CheckInDate >= monthStart &&
                               reservation.CheckInDate < nextMonth,
                cancellationToken);

        var activeCustomers = await dbContext.Customers
            .AsNoTracking()
            .CountAsync(
                customer => !customer.IsDeleted && customer.IsActive,
                cancellationToken);

        var totalRevenue = await dbContext.Payments
            .AsNoTracking()
            .Where(payment =>
                !payment.IsDeleted &&
                payment.Status == PaymentStatus.Paid)
            .SumAsync(payment => (decimal?)payment.Amount, cancellationToken)
            ?? 0m;

        var occupiedApartments = await dbContext.Reservations
            .AsNoTracking()
            .Where(reservation =>
                !reservation.IsDeleted &&
                reservation.Status != ReservationStatus.Cancelled &&
                reservation.CheckInDate <= today &&
                reservation.CheckOutDate > today)
            .Select(reservation => reservation.ApartmentId)
            .Distinct()
            .CountAsync(cancellationToken);

        var occupancyRate = totalApartments == 0
            ? 0m
            : Math.Round((decimal)occupiedApartments / totalApartments * 100m, 2);

        var nextCheckInDate = await dbContext.Reservations
            .AsNoTracking()
            .Where(reservation =>
                !reservation.IsDeleted &&
                reservation.Status != ReservationStatus.Cancelled &&
                reservation.CheckInDate >= today)
            .OrderBy(reservation => reservation.CheckInDate)
            .Select(reservation => (DateOnly?)reservation.CheckInDate)
            .FirstOrDefaultAsync(cancellationToken);

        var recentReservations = await dbContext.Reservations
            .AsNoTracking()
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.Apartment)
            .Where(reservation => !reservation.IsDeleted)
            .OrderByDescending(reservation => reservation.CreatedAtUtc)
            .Take(5)
            .Select(reservation => new DashboardReservationItem(
                reservation.Id,
                reservation.Customer.Name,
                reservation.Apartment.Name,
                reservation.CheckInDate,
                reservation.CheckOutDate,
                (int)reservation.Status))
            .ToListAsync(cancellationToken);

        return new DashboardResponse(
            totalApartments,
            availableApartments,
            totalReservations,
            reservationsThisMonth,
            activeCustomers,
            totalRevenue,
            occupancyRate,
            nextCheckInDate,
            recentReservations);
    }
}
