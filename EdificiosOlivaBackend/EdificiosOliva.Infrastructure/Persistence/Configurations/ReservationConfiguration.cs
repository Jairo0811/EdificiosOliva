using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations");
        builder.HasKey(reservation => reservation.Id);

        builder.Property(reservation => reservation.NightlyRate)
            .HasPrecision(18, 2);

        builder.Property(reservation => reservation.TotalAmount)
            .HasPrecision(18, 2);

        builder.Property(reservation => reservation.Notes)
            .HasMaxLength(1000);

        builder.HasIndex(reservation => new
        {
            reservation.ApartmentId,
            reservation.CheckInDate,
            reservation.CheckOutDate,
        });

        builder.HasOne(reservation => reservation.Customer)
            .WithMany()
            .HasForeignKey(reservation => reservation.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(reservation => reservation.Apartment)
            .WithMany()
            .HasForeignKey(reservation => reservation.ApartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
