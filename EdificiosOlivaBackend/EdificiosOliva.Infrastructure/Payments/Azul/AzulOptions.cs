using Microsoft.Extensions.Configuration;

namespace EdificiosOliva.Infrastructure.Payments.Azul;

public sealed class AzulOptions
{
    public bool Enabled { get; init; }
    public string MerchantId { get; init; } = string.Empty;
    public string MerchantName { get; init; } = "Edificios Oliva";
    public string MerchantType { get; init; } = "ECommerce";
    public string SettlementCurrency { get; init; } = "USD";
    public string CurrencyCode { get; init; } = "$";
    public string AuthKey { get; init; } = string.Empty;
    public string PaymentPageUrl { get; init; } = "https://pruebas.azul.com.do/PaymentPage/";
    public string? AlternatePaymentPageUrl { get; init; }
    public string ReturnBaseUrl { get; init; } = string.Empty;
    public string Locale { get; init; } = "ES";
    public decimal ItbisRate { get; init; }
    public bool PricesIncludeItbis { get; init; } = true;
    public bool UseGooglePay { get; init; }

    public static AzulOptions FromConfiguration(IConfiguration configuration)
    {
        var prefix = "Payments:Azul:";

        return new AzulOptions
        {
            Enabled = bool.TryParse(configuration[$"{prefix}Enabled"], out var enabled) && enabled,
            MerchantId = configuration[$"{prefix}MerchantId"]?.Trim() ?? string.Empty,
            MerchantName = configuration[$"{prefix}MerchantName"]?.Trim() ?? "Edificios Oliva",
            MerchantType = configuration[$"{prefix}MerchantType"]?.Trim() ?? "ECommerce",
            SettlementCurrency = configuration[$"{prefix}SettlementCurrency"]?.Trim().ToUpperInvariant() ?? "USD",
            CurrencyCode = configuration[$"{prefix}CurrencyCode"]?.Trim() ?? "$",
            AuthKey = configuration[$"{prefix}AuthKey"] ?? string.Empty,
            PaymentPageUrl = configuration[$"{prefix}PaymentPageUrl"]?.Trim() ?? "https://pruebas.azul.com.do/PaymentPage/",
            AlternatePaymentPageUrl = NullIfWhiteSpace(configuration[$"{prefix}AlternatePaymentPageUrl"]),
            ReturnBaseUrl = configuration[$"{prefix}ReturnBaseUrl"]?.Trim() ?? string.Empty,
            Locale = configuration[$"{prefix}Locale"]?.Trim().ToUpperInvariant() ?? "ES",
            ItbisRate = decimal.TryParse(
                configuration[$"{prefix}ItbisRate"],
                System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture,
                out var rate)
                ? rate
                : 0m,
            PricesIncludeItbis = !bool.TryParse(
                configuration[$"{prefix}PricesIncludeItbis"],
                out var pricesIncludeItbis) || pricesIncludeItbis,
            UseGooglePay = bool.TryParse(
                configuration[$"{prefix}UseGooglePay"],
                out var useGooglePay) && useGooglePay,
        };
    }

    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        Require(MerchantId, nameof(MerchantId));
        Require(MerchantName, nameof(MerchantName));
        Require(MerchantType, nameof(MerchantType));
        Require(SettlementCurrency, nameof(SettlementCurrency));
        Require(CurrencyCode, nameof(CurrencyCode));
        Require(AuthKey, nameof(AuthKey));
        Require(ReturnBaseUrl, nameof(ReturnBaseUrl));

        ValidateHttpsUrl(PaymentPageUrl, nameof(PaymentPageUrl));
        ValidateHttpsUrl(ReturnBaseUrl, nameof(ReturnBaseUrl));

        if (!string.IsNullOrWhiteSpace(AlternatePaymentPageUrl))
        {
            ValidateHttpsUrl(AlternatePaymentPageUrl, nameof(AlternatePaymentPageUrl));
        }

        if (Locale is not ("ES" or "EN"))
        {
            throw new InvalidOperationException("Payments:Azul:Locale debe ser ES o EN.");
        }

        if (ItbisRate < 0m || ItbisRate >= 1m)
        {
            throw new InvalidOperationException(
                "Payments:Azul:ItbisRate debe estar entre 0 y 1 (por ejemplo, 0.18).");
        }

        if (ItbisRate > 0m && !PricesIncludeItbis)
        {
            throw new InvalidOperationException(
                "Edificios Oliva todavía no suma impuestos al total de la reserva. " +
                "Si configuras ItbisRate > 0, Payments:Azul:PricesIncludeItbis debe ser true.");
        }
    }

    private static void Require(string value, string name)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Falta Payments:Azul:{name}.");
        }
    }

    private static void ValidateHttpsUrl(string value, string name)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Payments:Azul:{name} debe ser una URL HTTPS absoluta.");
        }
    }

    private static string? NullIfWhiteSpace(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
