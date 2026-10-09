using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Application.Interfaces;

public interface IPaymentGateway
{
    string Provider { get; }
    PaymentMethod Method { get; }

    Task<PaymentGatewayCreateResult> CreateIntentAsync(
        PaymentGatewayCreateCommand command,
        CancellationToken cancellationToken = default);

    Task<PaymentGatewayWebhookResult> ParseWebhookAsync(
        PaymentGatewayWebhookRequest request,
        CancellationToken cancellationToken = default);

    Task<PaymentGatewayRefundResult> RefundAsync(
        PaymentGatewayRefundCommand command,
        CancellationToken cancellationToken = default);
}
