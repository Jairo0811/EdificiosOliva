using EdificiosOliva.Application.DTOs.Dashboard;

namespace EdificiosOliva.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardResponse> GetSummaryAsync(
        CancellationToken cancellationToken = default);
}
