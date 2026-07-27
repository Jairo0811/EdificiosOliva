using System.ComponentModel.DataAnnotations;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Application.DTOs.Payments;

public sealed record PaymentResponse(
    Guid Id,
    Guid ReservationId,
    string CustomerName,
    string ApartmentName,
    decimal ReservationTotal,
    decimal Amount,
    PaymentMethod Method,
    PaymentStatus Status,
    string? TransactionId,
    string? Notes,
    DateTime? PaidAtUtc,
    DateTime? RefundedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed class PaymentQueryParameters
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    [StringLength(150)]
    public string? Search { get; init; }

    public PaymentStatus? Status { get; init; }
    public PaymentMethod? Method { get; init; }
}

public class PaymentRequest
{
    [Required]
    public Guid ReservationId { get; init; }

    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal Amount { get; init; }

    public PaymentMethod Method { get; init; }
    public PaymentStatus Status { get; init; } = PaymentStatus.Pending;

    [StringLength(200)]
    public string? TransactionId { get; init; }

    [StringLength(1000)]
    public string? Notes { get; init; }
}

public sealed class CreatePaymentRequest : PaymentRequest;
public sealed class UpdatePaymentRequest : PaymentRequest;
