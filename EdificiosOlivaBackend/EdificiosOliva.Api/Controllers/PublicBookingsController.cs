using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/public/bookings")]
[AllowAnonymous]
[EnableRateLimiting("PublicBooking")]
public sealed class PublicBookingsController(IReservationService reservationService) : ControllerBase
{
    [HttpGet("availability")]
    [ProducesResponseType<BookingAvailabilityResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
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

    /// <summary>
    /// Crea una reserva pública. Si se envía la cabecera <c>Idempotency-Key</c>,
    /// un reintento con los mismos datos devuelve la reserva original (200) sin
    /// duplicarla; la misma clave con datos distintos responde 409.
    /// </summary>
    [HttpPost]
    [ProducesResponseType<PublicBookingResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<PublicBookingResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<PublicBookingResponse>> Create(
        [FromBody] PublicBookingRequest request,
        CancellationToken cancellationToken)
    {
        var idempotencyKey = Request.Headers["Idempotency-Key"].FirstOrDefault();
        // La respuesta incluye una credencial temporal: no permitir cache compartida.
        Response.Headers.CacheControl = "no-store";
        Response.Headers.Pragma = "no-cache";
        var result = await reservationService.CreatePublicAsync(
            request,
            idempotencyKey,
            cancellationToken);

        if (result.Replayed)
        {
            Response.Headers["Idempotent-Replayed"] = "true";
            return Ok(result.Booking);
        }

        return Created($"/api/reservations/{result.Booking.ReservationId}", result.Booking);
    }
}
