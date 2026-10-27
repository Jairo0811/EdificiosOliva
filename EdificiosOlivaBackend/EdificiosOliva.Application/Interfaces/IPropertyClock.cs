namespace EdificiosOliva.Application.Interfaces;

public interface IPropertyClock
{
    DateOnly Today { get; }

    DateTime GetUtcStartOfDay(DateOnly localDate);
}
