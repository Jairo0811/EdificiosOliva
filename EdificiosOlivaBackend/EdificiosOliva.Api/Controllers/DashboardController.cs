using EdificiosOliva.Application.DTOs.Dashboard;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = SecurityPolicies.Admin)]
public sealed class DashboardController(IDashboardService dashboardService)
    : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<DashboardResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardResponse>> Get(
        CancellationToken cancellationToken)
    {
        var summary = await dashboardService.GetSummaryAsync(cancellationToken);
        return Ok(summary);
    }
}
