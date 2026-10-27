using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Domain.Enums;
using EdificiosOliva.Infrastructure.Payments.Azul;
using Xunit;

namespace EdificiosOliva.Infrastructure.Tests.Payments.Azul;

public sealed class AzulPaymentGatewayTests
{
    private const string AuthKey = "integration-test-auth-key";

    [Fact]
    public async Task BuildCheckoutAsync_ProducesExpectedSignedHostedForm()
    {
        var options = CreateOptions();
        var gateway = new AzulPaymentGateway(options);
        var intentId = Guid.Parse("12345678-1234-1234-1234-1234567890ab");

        var create = await gateway.CreateIntentAsync(
            new PaymentGatewayCreateCommand(
                intentId,
                Guid.NewGuid(),
                123.45m,
                "USD",
                "test-idempotency",
                "Reserva de prueba"));

        Assert.Equal(PaymentIntentStatus.RequiresAction, create.Status);
        Assert.NotNull(create.ProviderReference);
        Assert.Equal(15, create.ProviderReference.Length);

        var checkout = await gateway.BuildCheckoutAsync(
            new PaymentGatewayCheckoutCommand(
                intentId,
                Guid.NewGuid(),
                create.ProviderReference,
                123.45m,
                "USD",
                "Reserva de prueba"));

        Assert.Equal("POST", checkout.Method);
        Assert.Equal(options.PaymentPageUrl, checkout.ActionUrl);
        Assert.Equal(options.MerchantId, checkout.Fields["MerchantID"]);
        Assert.Equal("12345", checkout.Fields["Amount"]);
        Assert.Equal("000", checkout.Fields["ITBIS"]);
        Assert.Equal("0", checkout.Fields["SaveToDataVault"]);

        var expectedMaterial = string.Concat(
            options.MerchantId,
            options.MerchantName,
            options.MerchantType,
            options.CurrencyCode,
            checkout.Fields["OrderNumber"],
            checkout.Fields["Amount"],
            checkout.Fields["ITBIS"],
            checkout.Fields["ApprovedUrl"],
            checkout.Fields["DeclinedUrl"],
            checkout.Fields["CancelUrl"],
            checkout.Fields["UseCustomField1"],
            checkout.Fields["CustomField1Label"],
            checkout.Fields["CustomField1Value"],
            checkout.Fields["UseCustomField2"],
            checkout.Fields["CustomField2Label"],
            checkout.Fields["CustomField2Value"],
            options.AuthKey);

        Assert.Equal(
            CalculateUnicodeHmacSha512(expectedMaterial, options.AuthKey),
            checkout.Fields["AuthHash"]);
    }

    [Fact]
    public async Task ParseWebhookAsync_AcceptsValidApprovedReturn()
    {
        var gateway = new AzulPaymentGateway(CreateOptions());
        const string orderNumber = "EO1234567890ABC";
        const string amount = "12345";
        const string authorizationCode = "ABC123";
        const string dateTime = "20261027011500";
        const string responseCode = "00";
        const string isoCode = "00";
        const string responseMessage = "APROBADA";
        const string errorDescription = "";
        const string rrn = "123456789012";

        var hash = CalculateResponseHash(
            orderNumber,
            amount,
            authorizationCode,
            dateTime,
            responseCode,
            isoCode,
            responseMessage,
            errorDescription,
            rrn);

        var payload = BuildQuery(new Dictionary<string, string>
        {
            ["OrderNumber"] = orderNumber,
            ["Amount"] = amount,
            ["AuthorizationCode"] = authorizationCode,
            ["DateTime"] = dateTime,
            ["ResponseCode"] = responseCode,
            ["IsoCode"] = isoCode,
            ["ResponseMessage"] = responseMessage,
            ["ErrorDescription"] = errorDescription,
            ["RRN"] = rrn,
            ["AuthHash"] = hash,
        });

        var result = await gateway.ParseWebhookAsync(
            new PaymentGatewayWebhookRequest(
                payload,
                new Dictionary<string, string>
                {
                    ["X-EO-Payment-Outcome"] = "approved",
                }));

        Assert.True(result.SignatureVerified);
        Assert.Equal(orderNumber, result.ProviderReference);
        Assert.Equal(PaymentIntentStatus.Succeeded, result.Status);
        Assert.Equal(123.45m, result.Amount);
        Assert.Null(result.FailureCode);
    }

    [Fact]
    public async Task ParseWebhookAsync_RejectsTamperedAmount()
    {
        var gateway = new AzulPaymentGateway(CreateOptions());
        const string orderNumber = "EO1234567890ABC";
        const string signedAmount = "12345";
        const string tamperedAmount = "99999";
        const string authorizationCode = "ABC123";
        const string dateTime = "20261027011500";
        const string responseCode = "00";
        const string isoCode = "00";
        const string responseMessage = "APROBADA";
        const string errorDescription = "";
        const string rrn = "123456789012";

        var hash = CalculateResponseHash(
            orderNumber,
            signedAmount,
            authorizationCode,
            dateTime,
            responseCode,
            isoCode,
            responseMessage,
            errorDescription,
            rrn);

        var payload = BuildQuery(new Dictionary<string, string>
        {
            ["OrderNumber"] = orderNumber,
            ["Amount"] = tamperedAmount,
            ["AuthorizationCode"] = authorizationCode,
            ["DateTime"] = dateTime,
            ["ResponseCode"] = responseCode,
            ["IsoCode"] = isoCode,
            ["ResponseMessage"] = responseMessage,
            ["ErrorDescription"] = errorDescription,
            ["RRN"] = rrn,
            ["AuthHash"] = hash,
        });

        var result = await gateway.ParseWebhookAsync(
            new PaymentGatewayWebhookRequest(
                payload,
                new Dictionary<string, string>
                {
                    ["X-EO-Payment-Outcome"] = "approved",
                }));

        Assert.False(result.SignatureVerified);
        Assert.Equal(PaymentIntentStatus.Failed, result.Status);
        Assert.Equal(999.99m, result.Amount);
    }

    [Fact]
    public async Task ParseWebhookAsync_AcceptsOnlySignedCancellationState()
    {
        var gateway = new AzulPaymentGateway(CreateOptions());
        var intentId = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

        var create = await gateway.CreateIntentAsync(
            new PaymentGatewayCreateCommand(
                intentId,
                Guid.NewGuid(),
                80m,
                "USD",
                "cancel-idempotency",
                "Reserva cancelable"));

        var checkout = await gateway.BuildCheckoutAsync(
            new PaymentGatewayCheckoutCommand(
                intentId,
                Guid.NewGuid(),
                create.ProviderReference,
                80m,
                "USD",
                "Reserva cancelable"));

        var cancelUri = new Uri(checkout.Fields["CancelUrl"]);
        var validPayload = cancelUri.Query.TrimStart('?');

        var valid = await gateway.ParseWebhookAsync(
            new PaymentGatewayWebhookRequest(
                validPayload,
                new Dictionary<string, string>
                {
                    ["X-EO-Payment-Outcome"] = "cancelled",
                }));

        Assert.True(valid.SignatureVerified);
        Assert.Equal(PaymentIntentStatus.Cancelled, valid.Status);
        Assert.Equal(create.ProviderReference, valid.ProviderReference);

        var tamperedPayload = validPayload.Replace("state=", "state=00", StringComparison.Ordinal);
        var invalid = await gateway.ParseWebhookAsync(
            new PaymentGatewayWebhookRequest(
                tamperedPayload,
                new Dictionary<string, string>
                {
                    ["X-EO-Payment-Outcome"] = "cancelled",
                }));

        Assert.False(invalid.SignatureVerified);
    }

    [Fact]
    public async Task CreateIntentAsync_RejectsCurrencyDifferentFromConfiguredMid()
    {
        var gateway = new AzulPaymentGateway(CreateOptions());

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await gateway.CreateIntentAsync(
                new PaymentGatewayCreateCommand(
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    100m,
                    "DOP",
                    "currency-idempotency",
                    "Reserva de prueba")));
    }

    private static AzulOptions CreateOptions() =>
        new()
        {
            Enabled = true,
            MerchantId = "39038540010",
            MerchantName = "Edificios Oliva",
            MerchantType = "ECommerce",
            SettlementCurrency = "USD",
            CurrencyCode = "$",
            AuthKey = AuthKey,
            PaymentPageUrl = "https://pruebas.azul.com.do/PaymentPage/",
            AlternatePaymentPageUrl = "https://contpagos.azul.com.do/PaymentPage/Default.aspx",
            ReturnBaseUrl = "https://api.example.test",
            Locale = "ES",
            ItbisRate = 0m,
            PricesIncludeItbis = true,
            UseGooglePay = false,
        };

    private static string CalculateResponseHash(
        string orderNumber,
        string amount,
        string authorizationCode,
        string dateTime,
        string responseCode,
        string isoCode,
        string responseMessage,
        string errorDescription,
        string rrn)
    {
        var material = string.Concat(
            orderNumber,
            amount,
            authorizationCode,
            dateTime,
            responseCode,
            isoCode,
            responseMessage,
            errorDescription,
            rrn,
            AuthKey);

        return CalculateUnicodeHmacSha512(material, AuthKey);
    }

    private static string CalculateUnicodeHmacSha512(
        string material,
        string key)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var bytes = Encoding.Unicode.GetBytes(material);
        return Convert.ToHexString(hmac.ComputeHash(bytes)).ToLowerInvariant();
    }

    private static string BuildQuery(IReadOnlyDictionary<string, string> values) =>
        string.Join(
            "&",
            values.Select(pair =>
                $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
}
