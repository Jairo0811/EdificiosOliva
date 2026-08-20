using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = SecurityPolicies.Admin)]
public sealed class ReservationsController(IReservationService reservationService)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<ReservationResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<ReservationResponse>>> GetAll(
        [FromQuery] ReservationQueryParameters parameters,
        CancellationToken cancellationToken)
    {
        var reservations = await reservationService.GetPagedAsync(parameters, cancellationToken);
        return Ok(reservations);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ReservationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ReservationResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var reservation = await reservationService.GetByIdAsync(id, cancellationToken);
        return reservation is null ? NotFound() : Ok(reservation);
    }

    [HttpPost]
    [ProducesResponseType<ReservationResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ReservationResponse>> Create(
        [FromBody] CreateReservationRequest request,
        CancellationToken cancellationToken)
    {
        var reservation = await reservationService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = reservation.Id }, reservation);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateReservationRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await reservationService.UpdateAsync(id, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await reservationService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
