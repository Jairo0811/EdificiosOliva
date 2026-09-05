using System.Data;
using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class ReservationService(
    IReservationRepository reservationRepository,
    ApplicationDbContext dbContext) : IReservationService
{
    private static readonly ReservationStatus[] BlockingStatuses =
    [
        ReservationStatus.Pending,
        ReservationStatus.Confirmed,
        ReservationStatus.InProgress,
    ];

    public async Task<PagedResult<ReservationResponse>> GetPagedAsync(
        ReservationQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = reservationRepository.Query()
            .AsNoTracking()
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.Apartment)
            .Where(reservation => !reservation.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(reservation =>
                reservation.Customer.Name.Contains(search) ||
                reservation.Customer.Email.Contains(search) ||
                reservation.Apartment.Name.Contains(search));
        }

        if (parameters.Status.HasValue)
        {
            query = query.Where(reservation => reservation.Status == parameters.Status.Value);
        }

        if (parameters.FromDate.HasValue)
        {
            query = query.Where(reservation => reservation.CheckInDate >= parameters.FromDate.Value);
        }

        if (parameters.ToDate.HasValue)
        {
            query = query.Where(reservation => reservation.CheckOutDate <= parameters.ToDate.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(reservation => reservation.CreatedAtUtc)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(reservation => MapResponse(reservation))
            .ToListAsync(cancellationToken);

        return new PagedResult<ReservationResponse>(
            items,
            parameters.Page,
            parameters.PageSize,
            totalItems);
    }

    public async Task<ReservationResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var reservation = await reservationRepository.GetByIdAsync(id, cancellationToken);
        return reservation is null ? null : MapResponse(reservation);
    }

    public async Task<ReservationResponse> CreateAsync(
        CreateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        var (customer, apartment) = await ValidateRequestAsync(request, null, cancellationToken);
        var nights = request.CheckOutDate.DayNumber - request.CheckInDate.DayNumber;

        var reservation = new Reservation
        {
            CustomerId = customer.Id,
            ApartmentId = apartment.Id,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            GuestCount = request.GuestCount,
            NightlyRate = apartment.PricePerNight,
            TotalAmount = apartment.PricePerNight * nights,
            Status = request.Status,
            Notes = NormalizeOptional(request.Notes),
        };

        await reservationRepository.AddAsync(reservation, cancellationToken);
        await reservationRepository.SaveChangesAsync(cancellationToken);

        reservation.Customer = customer;
        reservation.Apartment = apartment;
        return MapResponse(reservation);
    }

    public async Task<BookingAvailabilityResponse> CheckAvailabilityAsync(
        Guid apartmentId,
        DateOnly checkInDate,
        DateOnly checkOutDate,
        int guestCount,
        CancellationToken cancellationToken = default)
    {
        ValidateDates(checkInDate, checkOutDate);

        if (guestCount < 1)
        {
            throw new InvalidOperationException("Debes indicar al menos un huésped.");
        }

        var apartment = await GetBookableApartmentAsync(apartmentId, cancellationToken);

        if (guestCount > apartment.GuestCapacity)
        {
            throw new InvalidOperationException("La cantidad de huéspedes supera la capacidad del apartamento.");
        }

        var overlaps = await HasOverlapAsync(
            apartmentId,
            checkInDate,
            checkOutDate,
            null,
            cancellationToken);

        var nights = checkOutDate.DayNumber - checkInDate.DayNumber;

        return new BookingAvailabilityResponse(
            apartment.Id,
            apartment.Name,
            !overlaps,
            nights,
            apartment.PricePerNight,
            apartment.PricePerNight * nights);
    }

    public async Task<PublicBookingResponse> CreatePublicAsync(
        PublicBookingRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var availability = await CheckAvailabilityAsync(
            request.ApartmentId,
            request.CheckInDate,
            request.CheckOutDate,
            request.GuestCount,
            cancellationToken);

        if (!availability.Available)
        {
            throw new InvalidOperationException(
                "El apartamento ya tiene una reserva que se solapa con las fechas seleccionadas.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var customer = await dbContext.Customers.SingleOrDefaultAsync(
            item => !item.IsDeleted && item.Email == normalizedEmail,
            cancellationToken);

        if (customer is null)
        {
            customer = new Customer
            {
                Name = request.FullName.Trim(),
                Email = normalizedEmail,
                Phone = request.Phone.Trim(),
                IsActive = true,
            };

            await dbContext.Customers.AddAsync(customer, cancellationToken);
        }
        else
        {
            customer.Name = request.FullName.Trim();
            customer.Phone = request.Phone.Trim();
            customer.IsActive = true;
            customer.UpdatedAtUtc = DateTime.UtcNow;
        }

        var apartment = await GetBookableApartmentAsync(request.ApartmentId, cancellationToken);
        var reservation = new Reservation
        {
            CustomerId = customer.Id,
            ApartmentId = apartment.Id,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            GuestCount = request.GuestCount,
            NightlyRate = availability.NightlyRate,
            TotalAmount = availability.TotalAmount,
            Status = ReservationStatus.Pending,
            Notes = NormalizeOptional(request.Notes),
            Customer = customer,
            Apartment = apartment,
        };

        await dbContext.Reservations.AddAsync(reservation, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return MapPublicResponse(reservation, normalizedEmail);
    }

    public async Task<bool> UpdateAsync(
        Guid id,
        UpdateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        var reservation = await reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation is null)
        {
            return false;
        }

        var (customer, apartment) = await ValidateRequestAsync(request, id, cancellationToken);
        var nights = request.CheckOutDate.DayNumber - request.CheckInDate.DayNumber;

        reservation.CustomerId = customer.Id;
        reservation.ApartmentId = apartment.Id;
        reservation.CheckInDate = request.CheckInDate;
        reservation.CheckOutDate = request.CheckOutDate;
        reservation.GuestCount = request.GuestCount;
        reservation.NightlyRate = apartment.PricePerNight;
        reservation.TotalAmount = apartment.PricePerNight * nights;
        reservation.Status = request.Status;
        reservation.Notes = NormalizeOptional(request.Notes);
        reservation.UpdatedAtUtc = DateTime.UtcNow;

        await reservationRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var reservation = await reservationRepository.GetByIdAsync(id, cancellationToken);
        if (reservation is null)
        {
            return false;
        }

        reservation.IsDeleted = true;
        reservation.UpdatedAtUtc = DateTime.UtcNow;
        await reservationRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<(Customer Customer, Apartment Apartment)> ValidateRequestAsync(
        ReservationRequest request,
        Guid? reservationId,
        CancellationToken cancellationToken)
    {
        ValidateDates(request.CheckInDate, request.CheckOutDate);

        var customer = await dbContext.Customers
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == request.CustomerId && !item.IsDeleted && item.IsActive,
                cancellationToken)
            ?? throw new InvalidOperationException("El cliente no existe o está inactivo.");

        var apartment = await GetBookableApartmentAsync(request.ApartmentId, cancellationToken);

        if (request.GuestCount > apartment.GuestCapacity)
        {
            throw new InvalidOperationException("La cantidad de huéspedes supera la capacidad del apartamento.");
        }

        var overlaps = await HasOverlapAsync(
            request.ApartmentId,
            request.CheckInDate,
            request.CheckOutDate,
            reservationId,
            cancellationToken);

        if (overlaps)
        {
            throw new InvalidOperationException("El apartamento ya tiene una reserva que se solapa con las fechas seleccionadas.");
        }

        return (customer, apartment);
    }

    private async Task<Apartment> GetBookableApartmentAsync(
        Guid apartmentId,
        CancellationToken cancellationToken)
    {
        var apartment = await dbContext.Apartments
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == apartmentId && !item.IsDeleted,
                cancellationToken)
            ?? throw new InvalidOperationException("El apartamento no existe.");

        if (apartment.Status == ApartmentStatus.Maintenance)
        {
            throw new InvalidOperationException("No se puede reservar un apartamento en mantenimiento.");
        }

        return apartment;
    }

    private Task<bool> HasOverlapAsync(
        Guid apartmentId,
        DateOnly checkInDate,
        DateOnly checkOutDate,
        Guid? reservationId,
        CancellationToken cancellationToken) =>
        dbContext.Reservations.AnyAsync(
            reservation =>
                !reservation.IsDeleted &&
                reservation.Id != reservationId &&
                reservation.ApartmentId == apartmentId &&
                BlockingStatuses.Contains(reservation.Status) &&
                checkInDate < reservation.CheckOutDate &&
                checkOutDate > reservation.CheckInDate,
            cancellationToken);

    private static void ValidateDates(DateOnly checkInDate, DateOnly checkOutDate)
    {
        if (checkOutDate <= checkInDate)
        {
            throw new InvalidOperationException("La fecha de salida debe ser posterior a la fecha de entrada.");
        }

        if (checkInDate < DateOnly.FromDateTime(DateTime.UtcNow))
        {
            throw new InvalidOperationException("La fecha de entrada no puede estar en el pasado.");
        }
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ReservationResponse MapResponse(Reservation reservation)
    {
        return new ReservationResponse(
            reservation.Id,
            reservation.CustomerId,
            reservation.Customer.Name,
            reservation.ApartmentId,
            reservation.Apartment.Name,
            reservation.CheckInDate,
            reservation.CheckOutDate,
            reservation.GuestCount,
            reservation.NightlyRate,
            reservation.TotalAmount,
            reservation.Status,
            reservation.Notes,
            reservation.CreatedAtUtc,
            reservation.UpdatedAtUtc);
    }

    private static PublicBookingResponse MapPublicResponse(
        Reservation reservation,
        string email)
    {
        var nights = reservation.CheckOutDate.DayNumber - reservation.CheckInDate.DayNumber;
        var confirmationCode = $"EO-{reservation.Id.ToString("N")[..8].ToUpperInvariant()}";

        return new PublicBookingResponse(
            reservation.Id,
            confirmationCode,
            reservation.Customer.Name,
            email,
            reservation.ApartmentId,
            reservation.Apartment.Name,
            reservation.CheckInDate,
            reservation.CheckOutDate,
            reservation.GuestCount,
            nights,
            reservation.NightlyRate,
            reservation.TotalAmount,
            reservation.Status);
    }
}
