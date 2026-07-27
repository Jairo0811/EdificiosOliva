using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Repositories;

public sealed class CustomerRepository(ApplicationDbContext context) : ICustomerRepository
{
    public IQueryable<Customer> Query() => context.Customers;

    public Task<Customer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Customers.SingleOrDefaultAsync(customer => customer.Id == id && !customer.IsDeleted, cancellationToken);

    public Task AddAsync(Customer customer, CancellationToken cancellationToken = default) =>
        context.Customers.AddAsync(customer, cancellationToken).AsTask();

    public Task<bool> EmailExistsAsync(string email, Guid? excludeId = null, CancellationToken cancellationToken = default) =>
        context.Customers.AnyAsync(customer =>
            !customer.IsDeleted &&
            customer.Email == email &&
            (!excludeId.HasValue || customer.Id != excludeId.Value),
            cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        context.SaveChangesAsync(cancellationToken);
}
