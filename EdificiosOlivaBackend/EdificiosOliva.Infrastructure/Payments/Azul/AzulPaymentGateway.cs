using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using EdificiosOliva.Application.DTOs.Payments;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Infrastructure.Payments.Azul;

public sealed class AzulPaymentGateway(AzulOptions options) : IPaymentGateway
{
    public const string ProviderName = "AZUL";
    private const string OutcomeHeader = "X-EO-Payment-Outcome";

    public string Provider => ProviderName;
    public PaymentMethod Method => PaymentMethod.Card;

    public Task<PaymentGatewayCreateResult> CreateIntentAsync(
        PaymentGatewayCreateCommand command,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureCurrency(command.Currency);

        var orderNumber = BuildOrderNumber(command.PaymentIntentId);

        return Task.FromResult(new PaymentGatewayCreateResult(
            orderNumber,
            PaymentIntentStatus.RequiresAction,
            options.PaymentPageUrl,
            DateTime.UtcNow.AddMinutes(30)));
    }

    public Task<PaymentGatewayCheckoutResult> BuildCheckoutAsync(
        PaymentGatewayCheckoutCommand command,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        EnsureCurrency(command.Currency);

        var orderNumber = command.ProviderReference.Trim();
        var expectedOrderNumber = BuildOrderNumber(command.PaymentIntentId);

        if (!string.Equals(orderNumber, expectedOrderNumber, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "La referencia del intento no coincide con la orden esperada para AZUL.");
        }

        var amount = ToMinorUnits(command.Amount);
        var itbis = CalculateItbisMinorUnits(command.Amount);

        var approvedUrl = BuildReturnUrl("approved");
        var declinedUrl = BuildReturnUrl("declined");
        var cancelUrl = BuildCancelUrl(orderNumber);

        const string useCustomField1 = "0";
        const string customField1Label = "";
        const string customField1Value = "";
        const string useCustomField2 = "0";
        const string customField2Label = "";
        const string customField2Value = "";

        var authHash = CalculateRequestHash(
            orderNumber,
            amount,
            itbis,
            approvedUrl,
            declinedUrl,
            cancelUrl,
            useCustomField1,
            customField1Label,
            customField1Value,
            useCustomField2,
            customField2Label,
            customField2Value);

        var fields = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["MerchantId"] = options.MerchantId,
            ["MerchantName"] = options.MerchantName,
            ["MerchantType"] = options.MerchantType,
            ["CurrencyCode"] = options.CurrencyCode,
            ["OrderNumber"] = orderNumber,
            ["Amount"] = amount,
            ["ITBIS"] = itbis,
            ["ApprovedUrl"] = approvedUrl,
            ["DeclinedUrl"] = declinedUrl,
            ["CancelUrl"] = cancelUrl,
            ["UseCustomField1"] = useCustomField1,
            ["CustomField1Label"] = customField1Label,
            ["CustomField1Value"] = customField1Value,
            ["UseCustomField2"] = useCustomField2,
            ["CustomField2Label"] = customField2Label,
            ["CustomField2Value"] = customField2Value,
            ["ShowTransactionResult"] = "0",
            ["Locale"] = options.Locale,
            ["SaveToDataVault"] = "0",
            ["AuthHash"] = authHash,
        };

        if (options.UseGooglePay)
        {
            fields["UseGooglePay"] = "1";
        }

        return Task.FromResult(new PaymentGatewayCheckoutResult(
            options.PaymentPageUrl,
            options.AlternatePaymentPageUrl,
            "POST",
            fields));
    }

    public Task<PaymentGatewayWebhookResult> ParseWebhookAsync(
        PaymentGatewayWebhookRequest request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var values = ParseQueryString(request.Payload);
        var outcome = request.Headers.TryGetValue(OutcomeHeader, out var outcomeValue)
            ? outcomeValue.Trim().ToLowerInvariant()
            : string.Empty;

        if (outcome == "cancelled")
        {
            return Task.FromResult(ParseCancellation(values));
        }

        var orderNumber = Get(values, "OrderNumber");
        var amountRaw = Get(values, "Amount");
        var amount = ParseMinorUnits(amountRaw);
        var signatureVerified =
            !string.IsNullOrWhiteSpace(orderNumber) &&
            amount.HasValue &&
            VerifyResponseHash(values);

        var isoCode = Get(values, "IsoCode");
        var responseCode = Get(values, "ResponseCode");
        var responseMessage = Get(values, "ResponseMessage");
        var errorDescription = Get(values, "ErrorDescription");
        var rrn = Get(values, "RRN");
        var dateTime = Get(values, "DateTime");

        var succeeded =
            signatureVerified &&
            string.Equals(isoCode, "00", StringComparison.OrdinalIgnoreCase);

        var status = succeeded
            ? PaymentIntentStatus.Succeeded
            : PaymentIntentStatus.Failed;

        var eventId = BuildEventId(
            orderNumber,
            rrn,
            responseCode,
            dateTime,
            outcome,
            request.Payload);

        return Task.FromResult(new PaymentGatewayWebhookResult(
            eventId,
            succeeded ? "payment.succeeded" : "payment.failed",
            signatureVerified,
            NullIfWhiteSpace(orderNumber),
            status,
            amount,
            succeeded ? null : NullIfWhiteSpace(responseCode ?? isoCode),
            succeeded
                ? null
                : NullIfWhiteSpace(errorDescription ?? responseMessage ?? "Transacción declinada por AZUL.")));
    }

    public Task<PaymentGatewayRefundResult> RefundAsync(
        PaymentGatewayRefundCommand command,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        return Task.FromResult(new PaymentGatewayRefundResult(
            false,
            command.ProviderReference,
            "azul_refund_not_implemented",
            "La devolución automática de AZUL no forma parte de v1.1.1; debe gestionarse por el flujo administrativo hasta integrar la operación específica."));
    }

    private PaymentGatewayWebhookResult ParseCancellation(
        IReadOnlyDictionary<string, string> values)
    {
        var orderNumber = Get(values, "orderNumber");
        var state = Get(values, "state");
        var verified =
            !string.IsNullOrWhiteSpace(orderNumber) &&
            !string.IsNullOrWhiteSpace(state) &&
            VerifyReturnState(orderNumber, state);

        return new PaymentGatewayWebhookResult(
            $"cancel:{orderNumber ?? "unknown"}:{state ?? "missing"}",
            "payment.cancelled",
            verified,
            NullIfWhiteSpace(orderNumber),
            PaymentIntentStatus.Cancelled,
            null,
            verified ? null : "invalid_return_state",
            verified ? null : "No se pudo validar el retorno de cancelación de AZUL.");
    }

    private string CalculateRequestHash(
        string orderNumber,
        string amount,
        string itbis,
        string approvedUrl,
        string declinedUrl,
        string cancelUrl,
        string useCustomField1,
        string customField1Label,
        string customField1Value,
        string useCustomField2,
        string customField2Label,
        string customField2Value)
    {
        var material = string.Concat(
            options.MerchantId,
            options.MerchantName,
            options.MerchantType,
            options.CurrencyCode,
            orderNumber,
            amount,
            itbis,
            approvedUrl,
            declinedUrl,
            cancelUrl,
            useCustomField1,
            customField1Label,
            customField1Value,
            useCustomField2,
            customField2Label,
            customField2Value,
            options.AuthKey);

        return CalculateHmacSha512(material);
    }

    private bool VerifyResponseHash(IReadOnlyDictionary<string, string> values)
    {
        var received = Get(values, "AuthHash");
        if (string.IsNullOrWhiteSpace(received))
        {
            return false;
        }

        var material = string.Concat(
            Get(values, "OrderNumber") ?? string.Empty,
            Get(values, "Amount") ?? string.Empty,
            Get(values, "AuthorizationCode") ?? string.Empty,
            Get(values, "DateTime") ?? string.Empty,
            Get(values, "ResponseCode") ?? string.Empty,
            Get(values, "IsoCode") ?? string.Empty,
            Get(values, "ResponseMessage") ?? string.Empty,
            Get(values, "ErrorDescription") ?? string.Empty,
            Get(values, "RRN") ?? string.Empty,
            options.AuthKey);

        var expected = CalculateHmacSha512(material);
        return FixedTimeEqualsHex(expected, received);
    }

    private string CalculateHmacSha512(string material)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(options.AuthKey));
        var bytes = Encoding.Unicode.GetBytes(material);
        return Convert.ToHexString(hmac.ComputeHash(bytes)).ToLowerInvariant();
    }

    private string BuildCancelUrl(string orderNumber)
    {
        var state = CalculateReturnState(orderNumber);
        return $"{BuildReturnUrl("cancelled")}?orderNumber={Uri.EscapeDataString(orderNumber)}&state={state}";
    }

    private string BuildReturnUrl(string outcome) =>
        $"{options.ReturnBaseUrl.TrimEnd('/')}/api/public/payments/returns/AZUL/{outcome}";

    private string CalculateReturnState(string orderNumber)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(options.AuthKey));
        var material = Encoding.UTF8.GetBytes($"EO|AZUL|RETURN|{orderNumber}");
        return Convert.ToHexString(hmac.ComputeHash(material)).ToLowerInvariant();
    }

    private bool VerifyReturnState(string orderNumber, string receivedState)
    {
        var expected = CalculateReturnState(orderNumber);
        return FixedTimeEqualsHex(expected, receivedState);
    }

    private string CalculateItbisMinorUnits(decimal amount)
    {
        if (options.ItbisRate <= 0m)
        {
            return "000";
        }

        if (!options.PricesIncludeItbis)
        {
            throw new InvalidOperationException(
                "No se puede calcular ITBIS para AZUL porque el total de la reserva no lo incluye.");
        }

        var includedTax = amount - (amount / (1m + options.ItbisRate));
        return ToMinorUnits(includedTax);
    }

    private void EnsureCurrency(string currency)
    {
        if (!string.Equals(
                currency.Trim(),
                options.SettlementCurrency,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"AZUL está configurado para {options.SettlementCurrency}, pero el intento usa {currency}.");
        }
    }

    private static string BuildOrderNumber(Guid paymentIntentId) =>
        $"EO{paymentIntentId:N}".ToUpperInvariant();

    private static string ToMinorUnits(decimal amount)
    {
        var minorUnits = decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero);
        return minorUnits.ToString("0", CultureInfo.InvariantCulture);
    }

    private static decimal? ParseMinorUnits(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            !long.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var minorUnits))
        {
            return null;
        }

        return minorUnits / 100m;
    }

    private static IReadOnlyDictionary<string, string> ParseQueryString(string payload)
    {
        var query = payload.Trim().TrimStart('?');
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(query))
        {
            return values;
        }

        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var separator = pair.IndexOf('=');
            var rawKey = separator >= 0 ? pair[..separator] : pair;
            var rawValue = separator >= 0 ? pair[(separator + 1)..] : string.Empty;

            var key = Uri.UnescapeDataString(rawKey.Replace("+", " ", StringComparison.Ordinal));
            var value = Uri.UnescapeDataString(rawValue.Replace("+", " ", StringComparison.Ordinal));

            if (!values.ContainsKey(key))
            {
                values[key] = value;
            }
        }

        return values;
    }

    private static string BuildEventId(
        string? orderNumber,
        string? rrn,
        string? responseCode,
        string? dateTime,
        string outcome,
        string payload)
    {
        if (!string.IsNullOrWhiteSpace(orderNumber))
        {
            return string.Join(
                ":",
                "azul",
                orderNumber,
                rrn ?? "no-rrn",
                responseCode ?? "no-code",
                dateTime ?? "no-time",
                string.IsNullOrWhiteSpace(outcome) ? "return" : outcome);
        }

        return $"azul:payload:{Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant()}";
    }

    private static string? Get(
        IReadOnlyDictionary<string, string> values,
        string key) =>
        values.TryGetValue(key, out var value) ? value : null;

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool FixedTimeEqualsHex(string expected, string received)
    {
        try
        {
            var expectedBytes = Convert.FromHexString(expected);
            var receivedBytes = Convert.FromHexString(received.Trim());
            return expectedBytes.Length == receivedBytes.Length &&
                   CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
