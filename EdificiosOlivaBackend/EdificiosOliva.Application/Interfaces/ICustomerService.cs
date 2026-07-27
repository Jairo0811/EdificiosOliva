using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Customers;

namespace EdificiosOliva.Application.Interfaces;

public interface ICustomerService
{
    Task<PagedResult<CustomerResponse>> GetPagedAsync(CustomerQueryParameters parameters, CancellationToken cancellationToken = default);
    Task<CustomerResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<CustomerResponse> CreateAsync(CreateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Guid id, UpdateCustomerRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
