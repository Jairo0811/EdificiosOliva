using System.ComponentModel.DataAnnotations;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Application.DTOs.Reservations;

public sealed record ReservationResponse(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    Guid ApartmentId,
    string ApartmentName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int GuestCount,
    decimal NightlyRate,
    decimal TotalAmount,
    ReservationStatus Status,
    string? Notes,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed record BookingAvailabilityResponse(
    Guid ApartmentId,
    string ApartmentName,
    bool Available,
    int Nights,
    decimal NightlyRate,
    decimal TotalAmount);

public sealed record PublicBookingResponse(
    Guid ReservationId,
    string ConfirmationCode,
    string CustomerName,
    string Email,
    Guid ApartmentId,
    string ApartmentName,
    DateOnly CheckInDate,
    DateOnly CheckOutDate,
    int GuestCount,
    int Nights,
    decimal NightlyRate,
    decimal TotalAmount,
    ReservationStatus Status);

public sealed class PublicBookingRequest
{
    [Required, StringLength(150, MinimumLength = 2)]
    public string FullName { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; init; } = string.Empty;

    [Required, Phone, StringLength(30, MinimumLength = 7)]
    public string Phone { get; init; } = string.Empty;

    [Required]
    public Guid ApartmentId { get; init; }

    [Required]
    public DateOnly CheckInDate { get; init; }

    [Required]
    public DateOnly CheckOutDate { get; init; }

    [Range(1, 100)]
    public int GuestCount { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

public sealed class ReservationQueryParameters
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    [StringLength(150)]
    public string? Search { get; init; }

    public ReservationStatus? Status { get; init; }
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
}

public class ReservationRequest
{
    [Required]
    public Guid CustomerId { get; init; }

    [Required]
    public Guid ApartmentId { get; init; }

    [Required]
    public DateOnly CheckInDate { get; init; }

    [Required]
    public DateOnly CheckOutDate { get; init; }

    [Range(1, 100)]
    public int GuestCount { get; init; }

    public ReservationStatus Status { get; init; } = ReservationStatus.Pending;

    [StringLength(1000)]
    public string? Notes { get; init; }
}

public sealed class CreateReservationRequest : ReservationRequest;
public sealed class UpdateReservationRequest : ReservationRequest;
