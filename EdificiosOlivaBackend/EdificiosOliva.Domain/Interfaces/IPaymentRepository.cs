using EdificiosOliva.Domain.Entities;

namespace EdificiosOliva.Domain.Interfaces;

public interface IPaymentRepository
{
    IQueryable<Payment> Query();
    Task<Payment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(Payment payment, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
