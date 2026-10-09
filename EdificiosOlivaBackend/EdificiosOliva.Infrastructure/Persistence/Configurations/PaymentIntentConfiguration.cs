using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class PaymentIntentConfiguration : IEntityTypeConfiguration<PaymentIntent>
{
    public void Configure(EntityTypeBuilder<PaymentIntent> builder)
    {
        builder.ToTable("PaymentIntents");
        builder.HasKey(intent => intent.Id);

        builder.Property(intent => intent.Amount)
            .HasPrecision(18, 2);

        builder.Property(intent => intent.Currency)
            .IsRequired()
            .HasMaxLength(3);

        builder.Property(intent => intent.Provider)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(intent => intent.IdempotencyKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(intent => intent.ProviderReference)
            .HasMaxLength(200);

        builder.Property(intent => intent.CheckoutUrl)
            .HasMaxLength(1000);

        builder.Property(intent => intent.FailureCode)
            .HasMaxLength(100);

        builder.Property(intent => intent.FailureMessage)
            .HasMaxLength(500);

        builder.HasIndex(intent => intent.ReservationId);
        builder.HasIndex(intent => intent.Status);
        builder.HasIndex(intent => intent.IdempotencyKey)
            .IsUnique();

        builder.HasIndex(intent => new { intent.Provider, intent.ProviderReference })
            .IsUnique()
            .HasFilter("[ProviderReference] IS NOT NULL");

        builder.HasIndex(intent => intent.PaymentId)
            .IsUnique()
            .HasFilter("[PaymentId] IS NOT NULL");

        builder.HasOne(intent => intent.Reservation)
            .WithMany()
            .HasForeignKey(intent => intent.ReservationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(intent => intent.Payment)
            .WithMany()
            .HasForeignKey(intent => intent.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
