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
