using System.ComponentModel.DataAnnotations;
using EdificiosOliva.Application.Common.Validation;

namespace EdificiosOliva.Application.DTOs.Gallery;

public sealed record GalleryImageResponse(
    Guid Id,
    string Title,
    string Category,
    string Url,
    string? PublicId,
    string AltText,
    int SortOrder,
    bool IsPublished,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed class GalleryQueryParameters
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 50;

    [StringLength(100)]
    public string? Category { get; init; }

    [StringLength(150)]
    public string? Search { get; init; }

    public bool? IsPublished { get; init; }
}

public class GalleryImageRequest
{
    [Required, StringLength(150)]
    public string Title { get; init; } = string.Empty;

    [Required, StringLength(100)]
    public string Category { get; init; } = string.Empty;

    [Required, StringLength(1000), AllowedImageUrl]
    public string Url { get; init; } = string.Empty;

    [StringLength(300)]
    public string? PublicId { get; init; }

    [Required, StringLength(250)]
    public string AltText { get; init; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int SortOrder { get; init; }

    public bool IsPublished { get; init; } = true;
}

public sealed class CreateGalleryImageRequest : GalleryImageRequest;
public sealed class UpdateGalleryImageRequest : GalleryImageRequest;
