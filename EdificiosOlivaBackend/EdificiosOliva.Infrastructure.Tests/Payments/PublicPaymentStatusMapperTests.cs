using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Infrastructure.Services;
using Xunit;

namespace EdificiosOliva.Infrastructure.Tests.Payments;

public sealed class PublicPaymentStatusMapperTests
{
    private static readonly DateTime Now = new(2026, 11, 5, 12, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime Future = Now.AddMinutes(10);
    private static readonly DateTime Past = Now.AddMinutes(-1);

    [Fact]
    public void NoIntent_IsNotStarted()
    {
        Assert.Equal(
            PublicPaymentState.NotStarted,
            PublicPaymentStatusMapper.Resolve(ReservationStatus.Pending, null, null, Now));
    }

    [Theory]
    [InlineData(ReservationStatus.Confirmed)]
    [InlineData(ReservationStatus.InProgress)]
    [InlineData(ReservationStatus.Completed)]
    public void SucceededIntent_WithConfirmedReservation_IsConfirmed(ReservationStatus reservation)
    {
        Assert.Equal(
            PublicPaymentState.Confirmed,
            PublicPaymentStatusMapper.Resolve(reservation, PaymentIntentStatus.Succeeded, Future, Now));
    }

    [Theory]
    [InlineData(ReservationStatus.Pending)]
    [InlineData(ReservationStatus.Cancelled)]
    public void SucceededIntent_WithoutConfirmedReservation_RequiresReview(ReservationStatus reservation)
    {
        // El pago nunca se declara confirmado si la reserva no lo está en el backend.
        Assert.Equal(
            PublicPaymentState.RequiresReview,
            PublicPaymentStatusMapper.Resolve(reservation, PaymentIntentStatus.Succeeded, Future, Now));
    }

    [Theory]
    [InlineData(PaymentIntentStatus.Created)]
    [InlineData(PaymentIntentStatus.Processing)]
    [InlineData(PaymentIntentStatus.RequiresAction)]
    public void OpenIntent_BeforeExpiry_IsPending(PaymentIntentStatus status)
    {
        Assert.Equal(
            PublicPaymentState.Pending,
            PublicPaymentStatusMapper.Resolve(ReservationStatus.Pending, status, Future, Now));
    }

    [Theory]
    [InlineData(PaymentIntentStatus.Created)]
    [InlineData(PaymentIntentStatus.Processing)]
    [InlineData(PaymentIntentStatus.RequiresAction)]
    public void OpenIntent_AfterExpiry_RequiresReview(PaymentIntentStatus status)
    {
        Assert.Equal(
            PublicPaymentState.RequiresReview,
            PublicPaymentStatusMapper.Resolve(ReservationStatus.Pending, status, Past, Now));
    }

    [Theory]
    [InlineData(PaymentIntentStatus.Failed, PublicPaymentState.Declined)]
    [InlineData(PaymentIntentStatus.Cancelled, PublicPaymentState.Cancelled)]
    [InlineData(PaymentIntentStatus.Refunded, PublicPaymentState.Refunded)]
    public void TerminalIntent_MapsToMatchingState(
        PaymentIntentStatus status,
        PublicPaymentState expected)
    {
        Assert.Equal(
            expected,
            PublicPaymentStatusMapper.Resolve(ReservationStatus.Pending, status, Future, Now));
    }
}
