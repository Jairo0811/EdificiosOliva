using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Reservations;

namespace EdificiosOliva.Application.Interfaces;

public interface IReservationService
{
    Task<PagedResult<ReservationResponse>> GetPagedAsync(
        ReservationQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<ReservationResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<ReservationResponse> CreateAsync(
        CreateReservationRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(
        Guid id,
        UpdateReservationRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
