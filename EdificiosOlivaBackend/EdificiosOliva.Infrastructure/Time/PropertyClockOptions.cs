using Microsoft.Extensions.Configuration;

namespace EdificiosOliva.Infrastructure.Time;

public sealed class PropertyClockOptions
{
    public string TimeZoneId { get; init; } = "America/Santo_Domingo";

    public static PropertyClockOptions FromConfiguration(IConfiguration configuration) =>
        new()
        {
            TimeZoneId = configuration["Property:TimeZoneId"]?.Trim()
                ?? "America/Santo_Domingo",
        };

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(TimeZoneId))
        {
            throw new InvalidOperationException("Property:TimeZoneId es obligatorio.");
        }

        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        }
        catch (TimeZoneNotFoundException exception)
        {
            throw new InvalidOperationException(
                $"Property:TimeZoneId '{TimeZoneId}' no existe en este entorno.",
                exception);
        }
        catch (InvalidTimeZoneException exception)
        {
            throw new InvalidOperationException(
                $"Property:TimeZoneId '{TimeZoneId}' no es válido.",
                exception);
        }
    }
}
