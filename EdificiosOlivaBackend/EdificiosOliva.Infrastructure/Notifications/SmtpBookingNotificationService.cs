using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using EdificiosOliva.Application.DTOs.Notifications;
using EdificiosOliva.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace EdificiosOliva.Infrastructure.Notifications;

public sealed class SmtpBookingNotificationService(
    EmailNotificationOptions options,
    ILogger<SmtpBookingNotificationService> logger) : IBookingNotificationService
{
    public Task SendBookingCreatedAsync(
        BookingCreatedNotification notification,
        CancellationToken cancellationToken = default)
    {
        if (!options.Enabled)
        {
            logger.LogInformation(
                "Email deshabilitado: reserva {ReservationId} creada para {Email}.",
                notification.ReservationId,
                notification.Email);
            return Task.CompletedTask;
        }

        var subject = $"Recibimos tu reserva {notification.ConfirmationCode}";
        var body = BuildLayout(
            "Solicitud de reserva recibida",
            $"""
            <p>Hola <strong>{E(notification.CustomerName)}</strong>, recibimos tu solicitud de reserva en Edificios Oliva.</p>
            <div class="card">
              <p><strong>Código:</strong> {E(notification.ConfirmationCode)}</p>
              <p><strong>Apartamento:</strong> {E(notification.ApartmentName)}</p>
              <p><strong>Entrada:</strong> {notification.CheckInDate:yyyy-MM-dd}</p>
              <p><strong>Salida:</strong> {notification.CheckOutDate:yyyy-MM-dd}</p>
              <p><strong>Noches:</strong> {notification.Nights}</p>
              <p><strong>Total:</strong> {E(notification.Currency)} {notification.TotalAmount:N2}</p>
            </div>
            <p>La reserva permanece pendiente hasta que el pago sea confirmado. Si el pago en línea está habilitado, puedes continuar desde el sitio de Edificios Oliva.</p>
            {BuildPoliciesLink()}
            """);

        return SendAsync(notification.Email, subject, body, cancellationToken);
    }

    public Task SendPaymentConfirmedAsync(
        PaymentConfirmedNotification notification,
        CancellationToken cancellationToken = default)
    {
        if (!options.Enabled)
        {
            logger.LogInformation(
                "Email deshabilitado: pago confirmado para reserva {ReservationId}.",
                notification.ReservationId);
            return Task.CompletedTask;
        }

        var subject = $"Pago confirmado · {notification.ConfirmationCode}";
        var body = BuildLayout(
            "Pago confirmado",
            $"""
            <p>Hola <strong>{E(notification.CustomerName)}</strong>, el pago de tu reserva fue confirmado.</p>
            <div class="card">
              <p><strong>Reserva:</strong> {E(notification.ConfirmationCode)}</p>
              <p><strong>Apartamento:</strong> {E(notification.ApartmentName)}</p>
              <p><strong>Estadía:</strong> {notification.CheckInDate:yyyy-MM-dd} → {notification.CheckOutDate:yyyy-MM-dd}</p>
              <p><strong>Pago:</strong> {E(notification.Currency)} {notification.Amount:N2}</p>
              <p><strong>Proveedor:</strong> {E(notification.Provider)}</p>
              <p><strong>Referencia:</strong> {E(notification.TransactionReference)}</p>
            </div>
            <p>Conserva este correo como comprobante de confirmación. Los detalles de llegada se coordinan con Edificios Oliva.</p>
            {BuildPoliciesLink()}
            """);

        return SendAsync(notification.Email, subject, body, cancellationToken);
    }

    private async Task SendAsync(
        string recipient,
        string subject,
        string html,
        CancellationToken cancellationToken)
    {
        using var message = new MailMessage
        {
            From = new MailAddress(options.FromAddress, options.FromName),
            Subject = subject,
            Body = html,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(recipient));

        using var client = new SmtpClient(options.Host, options.Port)
        {
            EnableSsl = options.EnableSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
        };

        if (!string.IsNullOrWhiteSpace(options.Username))
        {
            client.Credentials = new NetworkCredential(options.Username, options.Password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }

    private string BuildPoliciesLink()
    {
        var url = $"{options.PublicBaseUrl.TrimEnd('/')}/politicas";
        return $"<p><a href=\"{E(url)}\">Consultar políticas de reserva, pago, cancelación y privacidad</a></p>";
    }

    private static string BuildLayout(string title, string body) =>
        $"""
        <!doctype html>
        <html lang="es">
        <body style="margin:0;background:#f4f7fa;font-family:Arial,sans-serif;color:#19354e">
          <div style="max-width:640px;margin:0 auto;padding:32px 18px">
            <div style="background:#0f4c81;color:white;padding:26px;border-radius:18px 18px 0 0">
              <h1 style="margin:0;font-size:25px">{E(title)}</h1>
              <p style="margin:8px 0 0;color:#dbeaf5">Edificios Oliva · Bávaro, Punta Cana</p>
            </div>
            <div style="background:white;padding:28px;border-radius:0 0 18px 18px;line-height:1.6">
              {body}
              <p style="margin-top:28px;color:#66788a;font-size:13px">
                Este mensaje fue generado automáticamente por el sistema de reservas de Edificios Oliva.
              </p>
            </div>
          </div>
        </body>
        </html>
        """.Replace(
            "class=\"card\"",
            "style=\"margin:20px 0;padding:18px;border-radius:14px;background:#f5f9fc\"",
            StringComparison.Ordinal);

    private static string E(string value) => HtmlEncoder.Default.Encode(value);
}
