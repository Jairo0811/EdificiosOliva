using EdificiosOliva.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Persistence.Context;

public sealed class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options)
    : DbContext(options)
{
    public DbSet<Apartment> Apartments => Set<Apartment>();
    public DbSet<ApartmentImage> ApartmentImages => Set<ApartmentImage>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<ApartmentAmenity> ApartmentAmenities => Set<ApartmentAmenity>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
