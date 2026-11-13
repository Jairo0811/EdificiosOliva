using EdificiosOliva.Domain.Common;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Domain.Entities;

public sealed class Reservation : BaseEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid ApartmentId { get; set; }
    public Apartment Apartment { get; set; } = null!;

    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int GuestCount { get; set; }
    public decimal NightlyRate { get; set; }
    public decimal TotalAmount { get; set; }
    public ReservationStatus Status { get; set; } = ReservationStatus.Pending;
    public string? Notes { get; set; }

    /// <summary>Clave de idempotencia de la creación pública (nula en reservas administrativas).</summary>
    public string? IdempotencyKey { get; set; }

    /// <summary>Huella SHA-256 de la solicitud que originó la clave.</summary>
    public string? IdempotencyFingerprint { get; set; }

    /// <summary>Nonce CSPRNG; null en reservas antiguas sin token público.</summary>
    public string? PublicAccessNonce { get; set; }

    /// <summary>Versión de clave HMAC para rotación segura.</summary>
    public int? PublicAccessKeyVersion { get; set; }
}
