using EdificiosOliva.Domain.Entities;

namespace EdificiosOliva.Domain.Interfaces;

public interface IApartmentRepository
{
    IQueryable<Apartment> Query();

    Task<Apartment?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task AddAsync(
        Apartment apartment,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(
        CancellationToken cancellationToken = default);
}
