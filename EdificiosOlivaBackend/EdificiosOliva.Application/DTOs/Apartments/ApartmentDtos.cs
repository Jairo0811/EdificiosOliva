using System.ComponentModel.DataAnnotations;
using EdificiosOliva.Application.Common.Validation;
using EdificiosOliva.Domain.Enums;

namespace EdificiosOliva.Application.DTOs.Apartments;

public sealed record ApartmentResponse(
    Guid Id,
    string Name,
    string Description,
    decimal PricePerNight,
    int GuestCapacity,
    int Bedrooms,
    int Bathrooms,
    string Location,
    ApartmentStatus Status,
    IReadOnlyList<string> Images,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed class ApartmentQueryParameters
{
    private const int MaximumPageSize = 100;
    private int _pageSize = 10;

    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, MaximumPageSize)]
    public int PageSize
    {
        get => _pageSize;
        init => _pageSize = Math.Min(value, MaximumPageSize);
    }

    [StringLength(150)]
    public string? Search { get; init; }

    [EnumDataType(typeof(ApartmentStatus), ErrorMessage = "El estado del apartamento no es válido.")]
    public ApartmentStatus? Status { get; init; }

    [Range(0, double.MaxValue)]
    public decimal? MinimumPrice { get; init; }

    [Range(0, double.MaxValue)]
    public decimal? MaximumPrice { get; init; }

    [Range(1, 50)]
    public int? MinimumGuestCapacity { get; init; }

    [RegularExpression("^(name|price|capacity|createdAt)$", ErrorMessage = "SortBy debe ser name, price, capacity o createdAt.")]
    public string SortBy { get; init; } = "name";

    public bool Descending { get; init; }
}

public abstract class ApartmentRequest
{
    [Required]
    [StringLength(150)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [StringLength(2000)]
    public string Description { get; init; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal PricePerNight { get; init; }

    [Range(1, 50)]
    public int GuestCapacity { get; init; }

    [Range(0, 20)]
    public int Bedrooms { get; init; }

    [Range(0, 20)]
    public int Bathrooms { get; init; }

    [Required]
    [StringLength(250)]
    public string Location { get; init; } = string.Empty;

    [EnumDataType(typeof(ApartmentStatus), ErrorMessage = "El estado del apartamento no es válido.")]
    public ApartmentStatus Status { get; init; } = ApartmentStatus.Available;

    [MaxLength(10)]
    [AllowedImageUrlCollection]
    public IReadOnlyList<string> Images { get; init; } = [];
}

public sealed class CreateApartmentRequest : ApartmentRequest;
public sealed class UpdateApartmentRequest : ApartmentRequest;
