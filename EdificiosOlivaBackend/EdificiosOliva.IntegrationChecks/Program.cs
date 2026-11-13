using EdificiosOliva.Application.Common.Exceptions;
using EdificiosOliva.Application.DTOs.Notifications;
using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Infrastructure.Persistence.Context;
using EdificiosOliva.Infrastructure.Repositories;
using EdificiosOliva.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

// Runs only against a disposable SQL Server database in GitHub Actions.
// No production connection string, AZUL credentials or email delivery are required.
var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString) ||
    !connectionString.Contains("EdificiosOliva_Migration_CI", StringComparison.Ordinal))
{
    throw new InvalidOperationException(
        "Integration checks require the disposable EdificiosOliva_Migration_CI database.");
}

var options = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseSqlServer(connectionString)
    .Options;

async Task<Guid> SeedApartmentAsync(string name)
{
    await using var db = new ApplicationDbContext(options);
    var apartment = new Apartment
    {
        Name = name,
        Description = "Apartamento de prueba aislada.",
        Location = "CI",
        GuestCapacity = 4,
        Bedrooms = 2,
        Bathrooms = 1,
        PricePerNight = 90m,
    };
    db.Apartments.Add(apartment);
    await db.SaveChangesAsync();
    return apartment.Id;
}

async Task<PublicBookingCreateResult> BookAsync(PublicBookingRequest request, string key)
{
    await using var db = new ApplicationDbContext(options);
    var service = new ReservationService(
        new ReservationRepository(db),
        db,
        new SilentNotifications(),
        new FixedClock(),
        NullLogger<ReservationService>.Instance);
    return await service.CreatePublicAsync(request, key);
}

async Task<int> CountByKeyAsync(string key)
{
    await using var db = new ApplicationDbContext(options);
    return await db.Reservations.CountAsync(reservation => reservation.IdempotencyKey == key);
}

PublicBookingRequest Request(Guid apartmentId, int guests, string email) => new()
{
    ApartmentId = apartmentId,
    CheckInDate = new DateOnly(2030, 1, 10),
    CheckOutDate = new DateOnly(2030, 1, 13),
    GuestCount = guests,
    FullName = "Cliente de integración",
    Email = email,
    Phone = "8095551234",
};

void Ensure(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}

var apartmentId = await SeedApartmentAsync("Prueba idempotencia secuencial");
var key = $"ci-sequential-{Guid.NewGuid():N}";
var request = Request(apartmentId, 2, $"ci-{Guid.NewGuid():N}@example.test");

var first = await BookAsync(request, key);
var replay = await BookAsync(request, key);
Ensure(!first.Replayed, "La primera reserva se marcó incorrectamente como replay.");
Ensure(replay.Replayed, "El reintento idéntico no se marcó como replay.");
Ensure(first.Booking.ReservationId == replay.Booking.ReservationId,
    "Un reintento idéntico creó una reserva diferente.");
Ensure(await CountByKeyAsync(key) == 1, "Se crearon reservas duplicadas para la misma clave.");

try
{
    await BookAsync(Request(apartmentId, 3, request.Email), key);
    throw new InvalidOperationException("Una clave reutilizada con datos distintos fue aceptada.");
}
catch (IdempotencyConflictException)
{
    // Expected HTTP 409 business conflict.
}

Console.WriteLine("PASS: first request, exact replay, and conflicting payload.");

for (var iteration = 0; iteration < 3; iteration++)
{
    var concurrentApartment = await SeedApartmentAsync($"Prueba simultánea {iteration}");
    var concurrentKey = $"ci-concurrent-{Guid.NewGuid():N}";
    var concurrentRequest = Request(
        concurrentApartment, 2, $"parallel-{Guid.NewGuid():N}@example.test");
    var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

    Task<PublicBookingCreateResult> Attempt() => Task.Run(async () =>
    {
        await gate.Task;
        return await BookAsync(concurrentRequest, concurrentKey);
    });

    var attemptA = Attempt();
    var attemptB = Attempt();
    gate.SetResult(true);

    var results = await Task.WhenAll(attemptA, attemptB);
    Ensure(results[0].Booking.ReservationId == results[1].Booking.ReservationId,
        $"Concurrent requests returned different reservations in round {iteration}.");
    Ensure(results.Count(result => !result.Replayed) == 1,
        $"Expected exactly one new reservation in round {iteration}.");
    Ensure(await CountByKeyAsync(concurrentKey) == 1,
        $"Concurrent requests persisted duplicate reservations in round {iteration}.");
}

Console.WriteLine("PASS: three concurrent two-request races, one reservation per key.");
Console.WriteLine("SQL Server reservation idempotency integration checks completed.");

sealed class FixedClock : IPropertyClock
{
    public DateOnly Today => new(2026, 11, 13);
    public DateTime GetUtcStartOfDay(DateOnly localDate) =>
        DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
}

sealed class SilentNotifications : IBookingNotificationService
{
    public Task SendBookingCreatedAsync(
        BookingCreatedNotification notification, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task SendPaymentConfirmedAsync(
        PaymentConfirmedNotification notification, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
