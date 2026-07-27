using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Customers;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class CustomerService(ICustomerRepository repository) : ICustomerService
{
    public async Task<PagedResult<CustomerResponse>> GetPagedAsync(CustomerQueryParameters parameters, CancellationToken cancellationToken = default)
    {
        var query = repository.Query().AsNoTracking().Where(customer => !customer.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(customer =>
                customer.Name.Contains(search) ||
                customer.Email.Contains(search) ||
                customer.Phone.Contains(search));
        }

        if (parameters.IsActive.HasValue)
        {
            query = query.Where(customer => customer.IsActive == parameters.IsActive.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(customer => customer.Name)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(customer => Map(customer))
            .ToListAsync(cancellationToken);

        return new PagedResult<CustomerResponse>(items, parameters.Page, parameters.PageSize, totalItems);
    }

    public async Task<CustomerResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await repository.Query()
            .AsNoTracking()
            .Where(customer => customer.Id == id && !customer.IsDeleted)
            .Select(customer => Map(customer))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<CustomerResponse> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(request.Email);
        if (await repository.EmailExistsAsync(email, cancellationToken: cancellationToken))
        {
            throw new InvalidOperationException("Ya existe un cliente registrado con ese correo.");
        }

        var customer = new Customer
        {
            Name = request.Name.Trim(),
            Email = email,
            Phone = request.Phone.Trim(),
            IsActive = request.IsActive
        };

        await repository.AddAsync(customer, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return Map(customer);
    }

    public async Task<bool> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken cancellationToken = default)
    {
        var customer = await repository.GetByIdAsync(id, cancellationToken);
        if (customer is null) return false;

        var email = NormalizeEmail(request.Email);
        if (await repository.EmailExistsAsync(email, id, cancellationToken))
        {
            throw new InvalidOperationException("Ya existe un cliente registrado con ese correo.");
        }

        customer.Name = request.Name.Trim();
        customer.Email = email;
        customer.Phone = request.Phone.Trim();
        customer.IsActive = request.IsActive;
        customer.UpdatedAtUtc = DateTime.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var customer = await repository.GetByIdAsync(id, cancellationToken);
        if (customer is null) return false;

        customer.IsDeleted = true;
        customer.UpdatedAtUtc = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static CustomerResponse Map(Customer customer) =>
        new(customer.Id, customer.Name, customer.Email, customer.Phone, customer.IsActive, customer.CreatedAtUtc, customer.UpdatedAtUtc);
}
