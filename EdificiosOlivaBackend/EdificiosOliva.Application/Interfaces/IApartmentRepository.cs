using EdificiosOliva.Domain.Entities;

namespace EdificiosOliva.Domain.Interfaces;

public interface IApartmentRepository
{
    Task<IEnumerable<Apartment>> GetAllAsync();

    Task<Apartment?> GetByIdAsync(Guid id);

    Task AddAsync(Apartment apartment);

    Task UpdateAsync(Apartment apartment);

    Task DeleteAsync(Apartment apartment);

    Task<bool> ExistsAsync(Guid id);
}