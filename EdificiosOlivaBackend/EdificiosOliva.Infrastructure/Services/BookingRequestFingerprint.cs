using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using EdificiosOliva.Application.DTOs.Reservations;

namespace EdificiosOliva.Infrastructure.Services;

/// <summary>
/// Huella estable de una solicitud de reserva pública. Permite distinguir un
/// reintento idéntico (misma clave, mismos datos) de una reutilización indebida
/// de la clave con datos distintos.
/// </summary>
public static class BookingRequestFingerprint
{
    public static string Compute(PublicBookingRequest request)
    {
        var canonical = string.Join(
            "\n",
            request.ApartmentId.ToString("N"),
            request.CheckInDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            request.CheckOutDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            request.GuestCount.ToString(CultureInfo.InvariantCulture),
            request.Email.Trim().ToLowerInvariant(),
            request.FullName.Trim(),
            request.Phone.Trim(),
            string.IsNullOrWhiteSpace(request.Notes) ? string.Empty : request.Notes.Trim());

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }

    /// <summary>
    /// Devuelve la clave normalizada, o null si no se envió. Lanza
    /// <see cref="ArgumentException"/> si el formato no es aceptable.
    /// </summary>
    public static string? NormalizeKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return null;
        }

        var trimmed = key.Trim();
        if (trimmed.Length is < 8 or > 100 || !trimmed.All(IsAllowed))
        {
            throw new ArgumentException(
                "La clave de idempotencia debe tener entre 8 y 100 caracteres alfanuméricos, '-', '_', '.' o ':'.");
        }

        return trimmed;

        static bool IsAllowed(char c) =>
            char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '.' or ':';
    }
}
