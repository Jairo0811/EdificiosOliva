using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.WebUtilities;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/public/payments")]
[AllowAnonymous]
public sealed class PublicPaymentsController(
    IPaymentIntentService paymentIntentService,
    IConfiguration configuration) : ControllerBase
{
    [HttpGet("providers")]
    [EnableRateLimiting("PublicPayment")]
    [ProducesResponseType<IReadOnlyCollection<PaymentProviderResponse>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyCollection<PaymentProviderResponse>> GetProviders()
    {
        return Ok(paymentIntentService.GetProviders());
    }

    [HttpPost("checkout")]
    [EnableRateLimiting("PublicPayment")]
    [ProducesResponseType<PublicPaymentCheckoutResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PublicPaymentCheckoutResponse>> CreateCheckout(
        [FromBody] CreatePublicPaymentCheckoutRequest request,
        CancellationToken cancellationToken)
    {
        var checkout = await paymentIntentService.CreatePublicCheckoutAsync(
            request,
            cancellationToken);

        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";

        return Ok(checkout);
    }

    [HttpGet("returns/{provider}/{outcome}")]
    [EnableRateLimiting("PaymentWebhook")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Return(
        string provider,
        string outcome,
        CancellationToken cancellationToken)
    {
        var normalizedOutcome = outcome.Trim().ToLowerInvariant();
        if (normalizedOutcome is not ("approved" or "declined" or "cancelled"))
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Resultado de pago no reconocido.",
                Detail = "El resultado devuelto por la pasarela no es válido.",
                Instance = Request.Path,
            });
        }

        var payload = Request.QueryString.HasValue
            ? Request.QueryString.Value!.TrimStart('?')
            : string.Empty;

        var headers = Request.Headers.ToDictionary(
            item => item.Key,
            item => item.Value.ToString(),
            StringComparer.OrdinalIgnoreCase);
        headers["X-EO-Payment-Outcome"] = normalizedOutcome;

        var result = await paymentIntentService.ProcessWebhookAsync(
            provider,
            payload,
            headers,
            cancellationToken);

        var paymentResult = result.Outcome switch
        {
            PaymentWebhookOutcome.InvalidSignature => "invalid",
            PaymentWebhookOutcome.Ignored => "unverified",
            _ => normalizedOutcome,
        };

        var frontendReturnUrl =
            configuration["Payments:FrontendReturnUrl"]?.Trim();

        if (string.IsNullOrWhiteSpace(frontendReturnUrl))
        {
            frontendReturnUrl = "http://localhost:4200/reservar";
        }

        var redirectUrl = QueryHelpers.AddQueryString(
            frontendReturnUrl,
            new Dictionary<string, string?>
            {
                ["payment"] = paymentResult,
                ["intent"] = result.PaymentIntentId?.ToString(),
            });

        return Redirect(redirectUrl);
    }
}
