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

    public void Validate() => _ = ResolveTimeZone();

    public TimeZoneInfo ResolveTimeZone()
    {
        if (string.IsNullOrWhiteSpace(TimeZoneId))
        {
            throw new InvalidOperationException("Property:TimeZoneId es obligatorio.");
        }

        if (TryFind(TimeZoneId, out var direct))
        {
            return direct;
        }

        if (TimeZoneInfo.TryConvertIanaIdToWindowsId(TimeZoneId, out var windowsId) &&
            TryFind(windowsId, out var windowsZone))
        {
            return windowsZone;
        }

        if (TimeZoneInfo.TryConvertWindowsIdToIanaId(TimeZoneId, out var ianaId) &&
            TryFind(ianaId, out var ianaZone))
        {
            return ianaZone;
        }

        throw new InvalidOperationException(
            $"Property:TimeZoneId '{TimeZoneId}' no existe o no es válido en este entorno.");
    }

    private static bool TryFind(string id, out TimeZoneInfo timeZone)
    {
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(id);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
        }
        catch (InvalidTimeZoneException)
        {
        }

        timeZone = null!;
        return false;
    }
}
