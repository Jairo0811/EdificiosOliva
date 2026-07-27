using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EdificiosOliva.Infrastructure.Persistence.Configurations;

public sealed class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.ToTable("Customers");
        builder.HasKey(customer => customer.Id);
        builder.Property(customer => customer.Name).HasMaxLength(150).IsRequired();
        builder.Property(customer => customer.Email).HasMaxLength(200).IsRequired();
        builder.Property(customer => customer.Phone).HasMaxLength(30).IsRequired();
        builder.HasIndex(customer => customer.Email).IsUnique();
        builder.HasQueryFilter(customer => !customer.IsDeleted);
    }
}
