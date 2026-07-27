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
}
