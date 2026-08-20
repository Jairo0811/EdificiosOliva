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
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

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
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        await reservationRepository.AddAsync(reservation, cancellationToken);
        await reservationRepository.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        reservation.Customer = customer;
        reservation.Apartment = apartment;
        return MapResponse(reservation);
    }

    public async Task<bool> UpdateAsync(
        Guid id,
        UpdateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

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
        reservation.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        reservation.UpdatedAtUtc = DateTime.UtcNow;

        await reservationRepository.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
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
        if (request.CheckOutDate <= request.CheckInDate)
        {
            throw new InvalidOperationException("La fecha de salida debe ser posterior a la fecha de entrada.");
        }

        var customer = await dbContext.Customers
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == request.CustomerId && !item.IsDeleted && item.IsActive,
                cancellationToken)
            ?? throw new InvalidOperationException("El cliente no existe o está inactivo.");

        var apartment = await dbContext.Apartments
            .AsNoTracking()
            .SingleOrDefaultAsync(
                item => item.Id == request.ApartmentId && !item.IsDeleted,
                cancellationToken)
            ?? throw new InvalidOperationException("El apartamento no existe.");

        if (apartment.Status == ApartmentStatus.Maintenance)
        {
            throw new InvalidOperationException("No se puede reservar un apartamento en mantenimiento.");
        }

        if (request.GuestCount > apartment.GuestCapacity)
        {
            throw new InvalidOperationException("La cantidad de huéspedes supera la capacidad del apartamento.");
        }

        var blockingStatuses = new[]
        {
            ReservationStatus.Pending,
            ReservationStatus.Confirmed,
            ReservationStatus.InProgress,
        };

        var overlaps = await dbContext.Reservations.AnyAsync(
            reservation =>
                !reservation.IsDeleted &&
                reservation.Id != reservationId &&
                reservation.ApartmentId == request.ApartmentId &&
                blockingStatuses.Contains(reservation.Status) &&
                request.CheckInDate < reservation.CheckOutDate &&
                request.CheckOutDate > reservation.CheckInDate,
            cancellationToken);

        if (overlaps)
        {
            throw new InvalidOperationException("El apartamento ya tiene una reserva que se solapa con las fechas seleccionadas.");
        }

        return (customer, apartment);
    }

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
}
