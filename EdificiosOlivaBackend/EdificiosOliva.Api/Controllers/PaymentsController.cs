using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public sealed class PaymentsController(IPaymentService paymentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<PaymentResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PaymentResponse>>> GetAll(
        [FromQuery] PaymentQueryParameters parameters,
        CancellationToken cancellationToken)
    {
        var payments = await paymentService.GetPagedAsync(parameters, cancellationToken);
        return Ok(payments);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<PaymentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var payment = await paymentService.GetByIdAsync(id, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }

    [HttpPost]
    [ProducesResponseType<PaymentResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaymentResponse>> Create(
        [FromBody] CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var payment = await paymentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = payment.Id }, payment);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await paymentService.UpdateAsync(id, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/refund")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Refund(
        Guid id,
        CancellationToken cancellationToken)
    {
        var refunded = await paymentService.RefundAsync(id, cancellationToken);
        return refunded ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await paymentService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
