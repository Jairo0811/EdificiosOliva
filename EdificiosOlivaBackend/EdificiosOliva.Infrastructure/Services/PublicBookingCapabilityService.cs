using System.Security.Cryptography;
using System.Text;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace EdificiosOliva.Infrastructure.Services;

/// <summary>
/// Capacidad opaca para estado y checkout. No almacena credenciales en claro:
/// se reconstruyen mediante HMAC, nonce aleatorio y versión de llave.
/// </summary>
public sealed class PublicBookingCapabilityService(
    IConfiguration configuration,
    IPropertyClock propertyClock)
{
    public int ActiveKeyVersion
    {
        get
        {
            var version = configuration.GetValue<int>("PublicPayments:ActiveKeyVersion");
            if (version <= 0)
                throw new InvalidOperationException("Falta PublicPayments:ActiveKeyVersion.");
            _ = ReadKey(version); // Fail-closed antes de crear la reserva.
            return version;
        }
    }

    public static string GenerateNonce() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    public string Issue(Reservation reservation)
    {
        if (string.IsNullOrWhiteSpace(reservation.PublicAccessNonce) ||
            reservation.PublicAccessKeyVersion is not > 0)
            throw new InvalidOperationException(
                "La reserva no tiene capacidad pública; requiere recuperación segura.");

        var version = reservation.PublicAccessKeyVersion.Value;
        var key = ReadKey(version);
        var message = Encoding.UTF8.GetBytes(
            $"EdificiosOliva|public-payment|v1|{reservation.Id:N}|{version}|{reservation.PublicAccessNonce}");
        return Convert.ToHexString(HMACSHA256.HashData(key, message));
    }

    public bool Validate(Reservation reservation, string? presentedToken)
    {
        if (string.IsNullOrWhiteSpace(reservation.PublicAccessNonce) ||
            reservation.PublicAccessKeyVersion is not > 0 ||
            string.IsNullOrWhiteSpace(presentedToken) ||
            presentedToken.Length != 64 ||
            propertyClock.Today > reservation.CheckOutDate.AddDays(30))
            return false;

        byte[] presented;
        try
        {
            presented = Convert.FromHexString(presentedToken);
        }
        catch (FormatException)
        {
            return false;
        }

        var expected = Convert.FromHexString(Issue(reservation));
        return CryptographicOperations.FixedTimeEquals(expected, presented);
    }

    private byte[] ReadKey(int version)
    {
        var encoded = configuration[$"PublicPayments:CapabilityKeys:{version}"];
        byte[] key;
        try
        {
            key = Convert.FromBase64String(encoded ?? string.Empty);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException(
                "La clave HMAC pública configurada debe ser Base64 válido.");
        }

        if (key.Length < 32)
            throw new InvalidOperationException(
                "Falta una clave HMAC pública de al menos 256 bits en el gestor de secretos.");
        return key;
    }
}
