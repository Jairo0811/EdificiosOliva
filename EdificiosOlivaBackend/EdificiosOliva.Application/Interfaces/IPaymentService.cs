using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;

namespace EdificiosOliva.Application.Interfaces;

public interface IPaymentService
{
    Task<PagedResult<PaymentResponse>> GetPagedAsync(
        PaymentQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<PaymentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<PaymentResponse> CreateAsync(
        CreatePaymentRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(
        Guid id,
        UpdatePaymentRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> RefundAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
