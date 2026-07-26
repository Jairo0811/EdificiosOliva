using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Apartments;

namespace EdificiosOliva.Application.Interfaces;

public interface IApartmentService
{
    Task<PagedResult<ApartmentResponse>> GetPagedAsync(
        ApartmentQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<ApartmentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApartmentResponse> CreateAsync(CreateApartmentRequest request, CancellationToken cancellationToken = default);
    Task<bool> UpdateAsync(Guid id, UpdateApartmentRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
