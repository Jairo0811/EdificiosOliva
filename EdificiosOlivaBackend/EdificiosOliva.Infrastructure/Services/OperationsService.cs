using System.Globalization;
using System.Text;
using EdificiosOliva.Application.DTOs.Operations;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class OperationsService(
    ApplicationDbContext dbContext,
    IPropertyClock propertyClock) : IOperationsService
{
    private static readonly ReservationStatus[] BookedStatuses =
    [
        ReservationStatus.Pending,
        ReservationStatus.Confirmed,
        ReservationStatus.InProgress,
        ReservationStatus.Completed,
    ];

    public async Task<OperationsAnalyticsResponse> GetAnalyticsAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var toExclusive = toDate.AddDays(1);
        var spanDays = toExclusive.DayNumber - fromDate.DayNumber;

        var apartments = await dbContext.Apartments
            .AsNoTracking()
            .Where(apartment => !apartment.IsDeleted)
            .OrderBy(apartment => apartment.Name)
            .Select(apartment => new
            {
                apartment.Id,
                apartment.Name,
            })
            .ToListAsync(cancellationToken);

        var reservations = await dbContext.Reservations
            .AsNoTracking()
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.Apartment)
            .Where(reservation =>
                !reservation.IsDeleted &&
                reservation.CheckInDate < toExclusive &&
                reservation.CheckOutDate > fromDate)
            .OrderBy(reservation => reservation.CheckInDate)
            .ThenBy(reservation => reservation.Apartment.Name)
            .ToListAsync(cancellationToken);

        var fromUtc = propertyClock.GetUtcStartOfDay(fromDate);
        var toUtc = propertyClock.GetUtcStartOfDay(toExclusive);

        var paidPayments = await dbContext.Payments
            .AsNoTracking()
            .Include(payment => payment.Reservation)
            .Where(payment =>
                !payment.IsDeleted &&
                payment.Status == PaymentStatus.Paid &&
                payment.PaidAtUtc.HasValue &&
                payment.PaidAtUtc.Value >= fromUtc &&
                payment.PaidAtUtc.Value < toUtc)
            .ToListAsync(cancellationToken);

        var revenueByApartment = paidPayments
            .GroupBy(payment => payment.Reservation.ApartmentId)
            .ToDictionary(
                group => group.Key,
                group => group.Sum(payment => payment.Amount));

        var bookedReservations = reservations
            .Where(reservation => BookedStatuses.Contains(reservation.Status))
            .ToList();

        var bookedNights = bookedReservations.Sum(reservation =>
            GetOverlappingNights(
                reservation.CheckInDate,
                reservation.CheckOutDate,
                fromDate,
                toExclusive));

        var inventoryNights = apartments.Count * spanDays;
        var occupancyRate = inventoryNights == 0
            ? 0m
            : Math.Round((decimal)bookedNights / inventoryNights * 100m, 2);

        var weightedRateTotal = bookedReservations.Sum(reservation =>
            reservation.NightlyRate *
            GetOverlappingNights(
                reservation.CheckInDate,
                reservation.CheckOutDate,
                fromDate,
                toExclusive));

        var averageBookedNightlyRate = bookedNights == 0
            ? 0m
            : Math.Round(weightedRateTotal / bookedNights, 2);

        var apartmentPerformance = apartments
            .Select(apartment =>
            {
                var apartmentBookedNights = bookedReservations
                    .Where(reservation => reservation.ApartmentId == apartment.Id)
                    .Sum(reservation => GetOverlappingNights(
                        reservation.CheckInDate,
                        reservation.CheckOutDate,
                        fromDate,
                        toExclusive));

                var apartmentOccupancy = spanDays == 0
                    ? 0m
                    : Math.Round((decimal)apartmentBookedNights / spanDays * 100m, 2);

                return new ApartmentPerformanceItem(
                    apartment.Id,
                    apartment.Name,
                    apartmentBookedNights,
                    spanDays,
                    apartmentOccupancy,
                    revenueByApartment.GetValueOrDefault(apartment.Id));
            })
            .ToArray();

        return new OperationsAnalyticsResponse(
            fromDate,
            toDate,
            reservations.Count,
            reservations.Count(reservation =>
                reservation.Status is ReservationStatus.Confirmed or
                    ReservationStatus.InProgress or
                    ReservationStatus.Completed),
            reservations.Count(reservation =>
                reservation.Status == ReservationStatus.Cancelled),
            paidPayments.Sum(payment => payment.Amount),
            bookedNights,
            inventoryNights,
            occupancyRate,
            averageBookedNightlyRate,
            apartmentPerformance,
            reservations.Select(MapReservation).ToArray());
    }

    public async Task<OperationsCalendarResponse> GetCalendarAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var toExclusive = toDate.AddDays(1);

        var reservations = await dbContext.Reservations
            .AsNoTracking()
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.Apartment)
            .Where(reservation =>
                !reservation.IsDeleted &&
                reservation.CheckInDate < toExclusive &&
                reservation.CheckOutDate > fromDate)
            .OrderBy(reservation => reservation.Apartment.Name)
            .ThenBy(reservation => reservation.CheckInDate)
            .ToListAsync(cancellationToken);

        return new OperationsCalendarResponse(
            fromDate,
            toDate,
            reservations.Select(MapReservation).ToArray());
    }

    public async Task<byte[]> ExportReservationsCsvAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        var calendar = await GetCalendarAsync(fromDate, toDate, cancellationToken);
        var csv = new StringBuilder();
        csv.AppendLine("ReservationId,Customer,Apartment,CheckIn,CheckOut,Guests,Status,TotalAmount");

        foreach (var reservation in calendar.Reservations)
        {
            csv.AppendLine(string.Join(
                ",",
                Csv(reservation.ReservationId.ToString()),
                Csv(reservation.CustomerName),
                Csv(reservation.ApartmentName),
                Csv(reservation.CheckInDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                Csv(reservation.CheckOutDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
                reservation.GuestCount.ToString(CultureInfo.InvariantCulture),
                reservation.Status.ToString(CultureInfo.InvariantCulture),
                reservation.TotalAmount.ToString("0.00", CultureInfo.InvariantCulture)));
        }

        return WithUtf8Bom(csv.ToString());
    }

    public async Task<byte[]> ExportPaymentsCsvAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default)
    {
        ValidateRange(fromDate, toDate);
        var fromUtc = propertyClock.GetUtcStartOfDay(fromDate);
        var toUtc = propertyClock.GetUtcStartOfDay(toDate.AddDays(1));

        var payments = await dbContext.Payments
            .AsNoTracking()
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .Where(payment =>
                !payment.IsDeleted &&
                payment.PaidAtUtc.HasValue &&
                payment.PaidAtUtc.Value >= fromUtc &&
                payment.PaidAtUtc.Value < toUtc)
            .OrderBy(payment => payment.PaidAtUtc)
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("PaymentId,ReservationId,Customer,Apartment,Amount,Method,Status,TransactionId,PaidAtUtc,RefundedAtUtc");

        foreach (var payment in payments)
        {
            csv.AppendLine(string.Join(
                ",",
                Csv(payment.Id.ToString()),
                Csv(payment.ReservationId.ToString()),
                Csv(payment.Reservation.Customer.Name),
                Csv(payment.Reservation.Apartment.Name),
                payment.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                ((int)payment.Method).ToString(CultureInfo.InvariantCulture),
                ((int)payment.Status).ToString(CultureInfo.InvariantCulture),
                Csv(payment.TransactionId ?? string.Empty),
                Csv(payment.PaidAtUtc?.ToString("O", CultureInfo.InvariantCulture) ?? string.Empty),
                Csv(payment.RefundedAtUtc?.ToString("O", CultureInfo.InvariantCulture) ?? string.Empty)));
        }

        return WithUtf8Bom(csv.ToString());
    }

    public async Task<string> GetPublicICalendarAsync(
        Guid apartmentId,
        CancellationToken cancellationToken = default)
    {
        var apartment = await dbContext.Apartments
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == apartmentId && !item.IsDeleted,
                cancellationToken)
            ?? throw new KeyNotFoundException("El apartamento indicado no existe.");

        var today = propertyClock.Today;
        var reservations = await dbContext.Reservations
            .AsNoTracking()
            .Where(reservation =>
                !reservation.IsDeleted &&
                reservation.ApartmentId == apartmentId &&
                reservation.Status != ReservationStatus.Cancelled &&
                reservation.CheckOutDate >= today.AddDays(-30))
            .OrderBy(reservation => reservation.CheckInDate)
            .ToListAsync(cancellationToken);

        var calendar = new StringBuilder();
        calendar.AppendLine("BEGIN:VCALENDAR");
        calendar.AppendLine("VERSION:2.0");
        calendar.AppendLine("PRODID:-//Edificios Oliva//Availability Calendar//ES");
        calendar.AppendLine("CALSCALE:GREGORIAN");
        calendar.AppendLine("METHOD:PUBLISH");
        calendar.AppendLine($"X-WR-CALNAME:{EscapeIcal($"Edificios Oliva - {apartment.Name}")}");

        foreach (var reservation in reservations)
        {
            calendar.AppendLine("BEGIN:VEVENT");
            calendar.AppendLine($"UID:{reservation.Id:N}@edificiosoliva");
            calendar.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMdd'T'HHmmss'Z'}");
            calendar.AppendLine($"DTSTART;VALUE=DATE:{reservation.CheckInDate:yyyyMMdd}");
            calendar.AppendLine($"DTEND;VALUE=DATE:{reservation.CheckOutDate:yyyyMMdd}");
            calendar.AppendLine("SUMMARY:Reservado - Edificios Oliva");
            calendar.AppendLine("TRANSP:OPAQUE");
            calendar.AppendLine("STATUS:CONFIRMED");
            calendar.AppendLine("END:VEVENT");
        }

        calendar.AppendLine("END:VCALENDAR");
        return calendar.ToString().Replace("\n", "\r\n", StringComparison.Ordinal);
    }

    private static OperationsReservationItem MapReservation(
        Reservation reservation) =>
        new(
            reservation.Id,
            reservation.ApartmentId,
            reservation.Apartment.Name,
            reservation.Customer.Name,
            reservation.CheckInDate,
            reservation.CheckOutDate,
            reservation.GuestCount,
            (int)reservation.Status,
            reservation.TotalAmount);

    private static int GetOverlappingNights(
        DateOnly checkIn,
        DateOnly checkOut,
        DateOnly fromDate,
        DateOnly toExclusive)
    {
        var start = checkIn > fromDate ? checkIn : fromDate;
        var end = checkOut < toExclusive ? checkOut : toExclusive;
        return Math.Max(0, end.DayNumber - start.DayNumber);
    }

    private static void ValidateRange(DateOnly fromDate, DateOnly toDate)
    {
        if (toDate < fromDate)
        {
            throw new ArgumentException("La fecha final debe ser igual o posterior a la fecha inicial.");
        }

        if (toDate.DayNumber - fromDate.DayNumber > 366)
        {
            throw new ArgumentException("El rango máximo para operación y reportes es de 367 días.");
        }
    }

    private static string Csv(string value)
    {
        var escaped = value.Replace(""", """", StringComparison.Ordinal);
        return $""{escaped}"";
    }

    private static byte[] WithUtf8Bom(string value)
    {
        var body = Encoding.UTF8.GetBytes(value);
        var preamble = Encoding.UTF8.GetPreamble();
        var result = new byte[preamble.Length + body.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(body, 0, result, preamble.Length, body.Length);
        return result;
    }

    private static string EscapeIcal(string value) =>
        value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace(";", "\\;", StringComparison.Ordinal)
            .Replace(",", "\\,", StringComparison.Ordinal)
            .Replace("\r\n", "\\n", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal);
}
