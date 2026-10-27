using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/public/calendars")]
[AllowAnonymous]
[EnableRateLimiting("PublicBooking")]
public sealed class PublicCalendarsController(
    IOperationsService operationsService) : ControllerBase
{
    [HttpGet("{apartmentId:guid}.ics")]
    [Produces("text/calendar")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetApartmentCalendar(
        Guid apartmentId,
        CancellationToken cancellationToken)
    {
        var calendar = await operationsService.GetPublicICalendarAsync(
            apartmentId,
            cancellationToken);

        return Content(calendar, "text/calendar; charset=utf-8");
    }
}
