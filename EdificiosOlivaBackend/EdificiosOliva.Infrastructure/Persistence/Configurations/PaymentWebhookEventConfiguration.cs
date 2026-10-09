using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class PaymentWebhookEventConfiguration : IEntityTypeConfiguration<PaymentWebhookEvent>
{
    public void Configure(EntityTypeBuilder<PaymentWebhookEvent> builder)
    {
        builder.ToTable("PaymentWebhookEvents");
        builder.HasKey(webhook => webhook.Id);

        builder.Property(webhook => webhook.Provider)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(webhook => webhook.EventId)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(webhook => webhook.EventType)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(webhook => webhook.ProviderReference)
            .HasMaxLength(200);

        builder.Property(webhook => webhook.PayloadHash)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(webhook => webhook.ErrorMessage)
            .HasMaxLength(500);

        builder.HasIndex(webhook => new { webhook.Provider, webhook.EventId })
            .IsUnique();

        builder.HasIndex(webhook => webhook.PaymentIntentId);
        builder.HasIndex(webhook => webhook.Status);

        builder.HasOne(webhook => webhook.PaymentIntent)
            .WithMany()
            .HasForeignKey(webhook => webhook.PaymentIntentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
