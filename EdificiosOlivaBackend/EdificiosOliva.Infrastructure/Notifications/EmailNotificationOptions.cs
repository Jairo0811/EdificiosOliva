using Microsoft.Extensions.Configuration;

namespace EdificiosOliva.Infrastructure.Notifications;

public sealed class EmailNotificationOptions
{
    public bool Enabled { get; init; }
    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public bool EnableSsl { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = "Edificios Oliva";
    public string PublicBaseUrl { get; init; } = string.Empty;

    public static EmailNotificationOptions FromConfiguration(IConfiguration configuration)
    {
        const string prefix = "Notifications:Email:";

        return new EmailNotificationOptions
        {
            Enabled = bool.TryParse(configuration[$"{prefix}Enabled"], out var enabled) && enabled,
            Host = configuration[$"{prefix}Host"]?.Trim() ?? string.Empty,
            Port = int.TryParse(configuration[$"{prefix}Port"], out var port) ? port : 587,
            EnableSsl = !bool.TryParse(configuration[$"{prefix}EnableSsl"], out var ssl) || ssl,
            Username = configuration[$"{prefix}Username"]?.Trim() ?? string.Empty,
            Password = configuration[$"{prefix}Password"] ?? string.Empty,
            FromAddress = configuration[$"{prefix}FromAddress"]?.Trim() ?? string.Empty,
            FromName = configuration[$"{prefix}FromName"]?.Trim() ?? "Edificios Oliva",
            PublicBaseUrl = configuration[$"{prefix}PublicBaseUrl"]?.Trim() ?? string.Empty,
        };
    }

    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(Host))
            throw new InvalidOperationException("Falta Notifications:Email:Host.");
        if (Port is < 1 or > 65535)
            throw new InvalidOperationException("Notifications:Email:Port no es válido.");
        if (string.IsNullOrWhiteSpace(FromAddress))
            throw new InvalidOperationException("Falta Notifications:Email:FromAddress.");
        if (!Uri.TryCreate(PublicBaseUrl, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("https" or "http"))
            throw new InvalidOperationException("Notifications:Email:PublicBaseUrl debe ser una URL absoluta.");
    }
}
