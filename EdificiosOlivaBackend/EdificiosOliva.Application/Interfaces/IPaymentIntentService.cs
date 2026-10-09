using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;

namespace EdificiosOliva.Application.Interfaces;

public interface IPaymentIntentService
{
    Task<PagedResult<PaymentIntentResponse>> GetPagedAsync(
        PaymentIntentQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<PaymentIntentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    IReadOnlyCollection<PaymentProviderResponse> GetProviders();

    Task<PaymentIntentResponse> CreateAsync(
        CreatePaymentIntentRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentWebhookProcessResponse> ProcessWebhookAsync(
        string provider,
        string payload,
        IReadOnlyDictionary<string, string> headers,
        CancellationToken cancellationToken = default);
}
