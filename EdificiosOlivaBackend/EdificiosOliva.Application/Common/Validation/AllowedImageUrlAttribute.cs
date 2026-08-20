using System.Collections;
using System.ComponentModel.DataAnnotations;

namespace EdificiosOliva.Application.Common.Validation;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class AllowedImageUrlAttribute : ValidationAttribute
{
    public AllowedImageUrlAttribute()
    {
        ErrorMessage = "La imagen debe usar una ruta local de /uploads/.";
    }

    public override bool IsValid(object? value) =>
        value is null || value is string url && IsAllowed(url);

    internal static bool IsAllowed(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 1_000)
        {
            return false;
        }

        var url = value.Trim();
        return url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) &&
               !url.Contains("..", StringComparison.Ordinal) &&
               !url.Contains('\\') &&
               !url.Contains('?') &&
               !url.Contains('#');
    }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class AllowedImageUrlCollectionAttribute : ValidationAttribute
{
    public AllowedImageUrlCollectionAttribute()
    {
        ErrorMessage = "Todas las imágenes deben usar rutas locales de /uploads/.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null)
        {
            return true;
        }

        if (value is not IEnumerable values)
        {
            return false;
        }

        foreach (var item in values)
        {
            if (item is not string url || !AllowedImageUrlAttribute.IsAllowed(url))
            {
                return false;
            }
        }

        return true;
    }
}
