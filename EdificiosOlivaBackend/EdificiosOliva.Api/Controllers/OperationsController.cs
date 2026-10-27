using EdificiosOliva.Application.DTOs.Operations;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/operations")]
[Authorize(Policy = "Admin")]
public sealed class OperationsController(
    IOperationsService operationsService,
    IPropertyClock propertyClock) : ControllerBase
{
    [HttpGet("analytics")]
    [ProducesResponseType<OperationsAnalyticsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OperationsAnalyticsResponse>> GetAnalytics(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveRange(fromDate, toDate);
        return Ok(await operationsService.GetAnalyticsAsync(from, to, cancellationToken));
    }

    [HttpGet("calendar")]
    [ProducesResponseType<OperationsCalendarResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<OperationsCalendarResponse>> GetCalendar(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveRange(fromDate, toDate);
        return Ok(await operationsService.GetCalendarAsync(from, to, cancellationToken));
    }

    [HttpGet("reports/reservations.csv")]
    public async Task<IActionResult> ExportReservations(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveRange(fromDate, toDate);
        var file = await operationsService.ExportReservationsCsvAsync(
            from,
            to,
            cancellationToken);

        return File(
            file,
            "text/csv; charset=utf-8",
            $"reservas-{from:yyyyMMdd}-{to:yyyyMMdd}.csv");
    }

    [HttpGet("reports/payments.csv")]
    public async Task<IActionResult> ExportPayments(
        [FromQuery] DateOnly? fromDate,
        [FromQuery] DateOnly? toDate,
        CancellationToken cancellationToken)
    {
        var (from, to) = ResolveRange(fromDate, toDate);
        var file = await operationsService.ExportPaymentsCsvAsync(
            from,
            to,
            cancellationToken);

        return File(
            file,
            "text/csv; charset=utf-8",
            $"pagos-{from:yyyyMMdd}-{to:yyyyMMdd}.csv");
    }

    private (DateOnly From, DateOnly To) ResolveRange(
        DateOnly? fromDate,
        DateOnly? toDate)
    {
        var today = propertyClock.Today;
        var from = fromDate ?? new DateOnly(today.Year, today.Month, 1);
        var to = toDate ?? from.AddMonths(1).AddDays(-1);
        return (from, to);
    }
}
