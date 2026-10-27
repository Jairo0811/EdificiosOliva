using EdificiosOliva.Application.Interfaces;

namespace EdificiosOliva.Infrastructure.Time;

public sealed class PropertyClock(
    PropertyClockOptions options,
    TimeProvider timeProvider) : IPropertyClock
{
    private readonly TimeZoneInfo timeZone =
        TimeZoneInfo.FindSystemTimeZoneById(options.TimeZoneId);

    public DateOnly Today
    {
        get
        {
            var local = TimeZoneInfo.ConvertTime(
                timeProvider.GetUtcNow(),
                timeZone);

            return DateOnly.FromDateTime(local.DateTime);
        }
    }

    public DateTime GetUtcStartOfDay(DateOnly localDate)
    {
        var localStart = localDate.ToDateTime(
            TimeOnly.MinValue,
            DateTimeKind.Unspecified);

        return TimeZoneInfo.ConvertTimeToUtc(localStart, timeZone);
    }
}
