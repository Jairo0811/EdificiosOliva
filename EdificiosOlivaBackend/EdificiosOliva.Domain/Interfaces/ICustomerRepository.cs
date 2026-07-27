using EdificiosOliva.Domain.Entities;

namespace EdificiosOliva.Domain.Interfaces;

public interface ICustomerRepository
{
    IQueryable<Customer> Query();
    Task<Customer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Customer customer, CancellationToken cancellationToken = default);
    Task<bool> EmailExistsAsync(string email, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
