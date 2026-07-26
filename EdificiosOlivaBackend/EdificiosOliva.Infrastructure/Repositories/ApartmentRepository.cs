using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Repositories;

public sealed class ApartmentRepository(ApplicationDbContext dbContext)
    : IApartmentRepository
{
    public IQueryable<Apartment> Query() => dbContext.Apartments;

    public Task<Apartment?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Apartments
            .SingleOrDefaultAsync(
                apartment => apartment.Id == id && !apartment.IsDeleted,
                cancellationToken);
    }

    public async Task AddAsync(
        Apartment apartment,
        CancellationToken cancellationToken = default)
    {
        await dbContext.Apartments.AddAsync(apartment, cancellationToken);
    }

    public Task SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
