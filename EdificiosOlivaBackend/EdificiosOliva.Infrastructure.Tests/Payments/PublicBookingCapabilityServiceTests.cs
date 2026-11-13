using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace EdificiosOliva.Infrastructure.Tests.Payments;

public sealed class PublicBookingCapabilityServiceTests
{
    private static PublicBookingCapabilityService Service(DateOnly today, string? key = null)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["PublicPayments:ActiveKeyVersion"] = "1",
                ["PublicPayments:CapabilityKeys:1"] = key ??
                    Convert.ToBase64String(Enumerable.Repeat((byte)23, 32).ToArray()),
            }).Build();
        return new PublicBookingCapabilityService(config, new FixedClock(today));
    }

    private static Reservation Reservation(DateOnly checkout) => new()
    {
        Id = Guid.NewGuid(),
        CheckOutDate = checkout,
        PublicAccessNonce = PublicBookingCapabilityService.GenerateNonce(),
        PublicAccessKeyVersion = 1,
    };

    [Fact]
    public void ValidTokenIsDeterministicForIdempotentReplayAndScopedToReservation()
    {
        var service = Service(new DateOnly(2030, 1, 10));
        var booking = Reservation(new DateOnly(2030, 1, 12));
        var other = Reservation(new DateOnly(2030, 1, 12));
        var token = service.Issue(booking);
        Assert.Equal(64, token.Length);
        Assert.Equal(token, service.Issue(booking));
        Assert.True(service.Validate(booking, token));
        Assert.False(service.Validate(other, token));
        Assert.False(service.Validate(booking, new string('0', 64)));
        Assert.False(service.Validate(booking, "not-hex"));
        booking.PublicAccessNonce = PublicBookingCapabilityService.GenerateNonce();
        Assert.False(service.Validate(booking, token)); // Revocación por rotación del nonce.
    }

    [Fact]
    public void TokenExpiresThirtyDaysAfterCheckoutButNotAfterBookingCreation()
    {
        var checkout = new DateOnly(2030, 4, 3);
        var booking = Reservation(checkout);
        var valid = Service(checkout.AddDays(30));
        var token = valid.Issue(booking);
        Assert.True(valid.Validate(booking, token));
        Assert.False(Service(checkout.AddDays(31)).Validate(booking, token));
        Assert.True(Service(new DateOnly(2029, 1, 1)).Validate(booking, token));
    }

    [Fact]
    public void LegacyAndMissingSecretsFailClosed()
    {
        var service = Service(new DateOnly(2030, 1, 10));
        var legacy = Reservation(new DateOnly(2030, 1, 12));
        legacy.PublicAccessNonce = null;
        Assert.False(service.Validate(legacy, new string('0', 64)));
        Assert.Throws<InvalidOperationException>(() => service.Issue(legacy));
        var invalidKey = Service(new DateOnly(2030, 1, 10), "AA==");
        Assert.Throws<InvalidOperationException>(() => _ = invalidKey.ActiveKeyVersion);
    }

    private sealed class FixedClock(DateOnly today) : IPropertyClock
    {
        public DateOnly Today => today;
        public DateTime GetUtcStartOfDay(DateOnly localDate) =>
            DateTime.SpecifyKind(localDate.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
    }
}
