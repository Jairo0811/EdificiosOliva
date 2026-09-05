using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/public/bookings")]
[AllowAnonymous]
public sealed class PublicBookingsController(IReservationService reservationService) : ControllerBase
{
    [HttpGet("availability")]
    [ProducesResponseType<BookingAvailabilityResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BookingAvailabilityResponse>> CheckAvailability(
        [FromQuery] Guid apartmentId,
        [FromQuery] DateOnly checkInDate,
        [FromQuery] DateOnly checkOutDate,
        [FromQuery] int guestCount = 1,
        CancellationToken cancellationToken = default)
    {
        var result = await reservationService.CheckAvailabilityAsync(
            apartmentId,
            checkInDate,
            checkOutDate,
            guestCount,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType<PublicBookingResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PublicBookingResponse>> Create(
        [FromBody] PublicBookingRequest request,
        CancellationToken cancellationToken)
    {
        var result = await reservationService.CreatePublicAsync(request, cancellationToken);
        return Created($"/api/reservations/{result.ReservationId}", result);
    }
}
