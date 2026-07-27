using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");
        builder.HasKey(payment => payment.Id);

        builder.Property(payment => payment.Amount)
            .HasPrecision(18, 2);

        builder.Property(payment => payment.TransactionId)
            .HasMaxLength(200);

        builder.Property(payment => payment.Notes)
            .HasMaxLength(1000);

        builder.HasIndex(payment => payment.ReservationId);
        builder.HasIndex(payment => payment.TransactionId)
            .IsUnique()
            .HasFilter("[TransactionId] IS NOT NULL");

        builder.HasOne(payment => payment.Reservation)
            .WithMany()
            .HasForeignKey(payment => payment.ReservationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
