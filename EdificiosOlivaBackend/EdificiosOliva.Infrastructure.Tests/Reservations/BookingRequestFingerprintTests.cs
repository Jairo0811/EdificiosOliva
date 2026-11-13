using EdificiosOliva.Application.DTOs.Reservations;
using EdificiosOliva.Infrastructure.Services;
using Xunit;

namespace EdificiosOliva.Infrastructure.Tests.Reservations;

public sealed class BookingRequestFingerprintTests
{
    private static readonly Guid ApartmentId = Guid.Parse("11111111-2222-3333-4444-555555555555");

    private static PublicBookingRequest Request(
        string email = "guest@example.com",
        string name = "Ana Perez",
        int guests = 2,
        DateOnly? checkOut = null,
        string? notes = null) =>
        new()
        {
            FullName = name,
            Email = email,
            Phone = "8095551234",
            ApartmentId = ApartmentId,
            CheckInDate = new DateOnly(2030, 1, 10),
            CheckOutDate = checkOut ?? new DateOnly(2030, 1, 15),
            GuestCount = guests,
            Notes = notes,
        };

    [Fact]
    public void SameData_ProducesSameFingerprint()
    {
        Assert.Equal(
            BookingRequestFingerprint.Compute(Request()),
            BookingRequestFingerprint.Compute(Request()));
    }

    [Fact]
    public void Whitespace_CaseInEmail_AndEmptyNotes_AreNormalized()
    {
        Assert.Equal(
            BookingRequestFingerprint.Compute(Request(notes: null)),
            BookingRequestFingerprint.Compute(
                Request(email: "  GUEST@Example.com ", name: " Ana Perez ", notes: "   ")));
    }

    [Fact]
    public void DifferentDates_ProduceDifferentFingerprint()
    {
        Assert.NotEqual(
            BookingRequestFingerprint.Compute(Request()),
            BookingRequestFingerprint.Compute(Request(checkOut: new DateOnly(2030, 1, 16))));
    }

    [Fact]
    public void DifferentGuests_ProduceDifferentFingerprint()
    {
        Assert.NotEqual(
            BookingRequestFingerprint.Compute(Request(guests: 2)),
            BookingRequestFingerprint.Compute(Request(guests: 3)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void BlankKey_IsTreatedAsAbsent(string? key)
    {
        Assert.Null(BookingRequestFingerprint.NormalizeKey(key));
    }

    [Fact]
    public void ValidKey_IsTrimmed()
    {
        Assert.Equal("booking-1234abcd", BookingRequestFingerprint.NormalizeKey("  booking-1234abcd "));
    }

    [Theory]
    [InlineData("short")]
    [InlineData("has spaces in it")]
    [InlineData("inyección-de-clave")]
    public void InvalidKey_IsRejected(string key)
    {
        Assert.Throws<ArgumentException>(() => BookingRequestFingerprint.NormalizeKey(key));
    }

    [Fact]
    public void TooLongKey_IsRejected()
    {
        Assert.Throws<ArgumentException>(
            () => BookingRequestFingerprint.NormalizeKey(new string('a', 101)));
    }
}
