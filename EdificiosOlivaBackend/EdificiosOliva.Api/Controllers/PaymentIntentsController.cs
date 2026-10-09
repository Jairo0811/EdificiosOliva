using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/payment-intents")]
[Authorize(Policy = "Admin")]
public sealed class PaymentIntentsController(
    IPaymentIntentService paymentIntentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<PaymentIntentResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PaymentIntentResponse>>> GetAll(
        [FromQuery] PaymentIntentQueryParameters parameters,
        CancellationToken cancellationToken)
    {
        var intents = await paymentIntentService.GetPagedAsync(
            parameters,
            cancellationToken);

        return Ok(intents);
    }

    [HttpGet("providers")]
    [ProducesResponseType<IReadOnlyCollection<PaymentProviderResponse>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyCollection<PaymentProviderResponse>> GetProviders()
    {
        return Ok(paymentIntentService.GetProviders());
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<PaymentIntentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentIntentResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var intent = await paymentIntentService.GetByIdAsync(id, cancellationToken);
        return intent is null ? NotFound() : Ok(intent);
    }

    [HttpPost]
    [ProducesResponseType<PaymentIntentResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentIntentResponse>> Create(
        [FromBody] CreatePaymentIntentRequest request,
        CancellationToken cancellationToken)
    {
        var intent = await paymentIntentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = intent.Id }, intent);
    }
}
