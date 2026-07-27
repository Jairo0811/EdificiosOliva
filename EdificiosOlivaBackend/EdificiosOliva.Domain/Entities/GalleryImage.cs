using EdificiosOliva.Domain.Common;

namespace EdificiosOliva.Domain.Entities;

public sealed class GalleryImage : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? PublicId { get; set; }
    public string AltText { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}
