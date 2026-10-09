using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/payment-webhooks")]
[AllowAnonymous]
[EnableRateLimiting("PaymentWebhook")]
public sealed class PaymentWebhooksController(
    IPaymentIntentService paymentIntentService) : ControllerBase
{
    [HttpPost("{provider}")]
    [RequestSizeLimit(1_000_000)]
    [ProducesResponseType<PaymentWebhookProcessResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    public async Task<ActionResult<PaymentWebhookProcessResponse>> Receive(
        string provider,
        CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync(cancellationToken);

        var headers = Request.Headers.ToDictionary(
            item => item.Key,
            item => item.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);

        var result = await paymentIntentService.ProcessWebhookAsync(
            provider,
            payload,
            headers,
            cancellationToken);

        if (result.Outcome == PaymentWebhookOutcome.InvalidSignature)
        {
            return Unauthorized(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Webhook no autorizado.",
                Detail = "La firma del evento de pago no pudo verificarse.",
                Instance = Request.Path
            });
        }

        return Ok(result);
    }
}
