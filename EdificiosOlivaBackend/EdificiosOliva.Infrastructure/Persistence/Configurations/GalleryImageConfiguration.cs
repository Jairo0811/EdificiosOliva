using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class GalleryImageConfiguration : IEntityTypeConfiguration<GalleryImage>
{
    public void Configure(EntityTypeBuilder<GalleryImage> builder)
    {
        builder.ToTable("GalleryImages");
        builder.HasKey(image => image.Id);

        builder.Property(image => image.Title)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(image => image.Category)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(image => image.Url)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(image => image.PublicId)
            .HasMaxLength(300);

        builder.Property(image => image.AltText)
            .HasMaxLength(250)
            .IsRequired();

        builder.HasIndex(image => new { image.Category, image.SortOrder });
        builder.HasIndex(image => image.PublicId)
            .IsUnique()
            .HasFilter("[PublicId] IS NOT NULL");
    }
}
