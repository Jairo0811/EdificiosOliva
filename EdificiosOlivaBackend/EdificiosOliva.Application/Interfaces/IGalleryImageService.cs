using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Gallery;

namespace EdificiosOliva.Application.Interfaces;

public interface IGalleryImageService
{
    Task<PagedResult<GalleryImageResponse>> GetPagedAsync(
        GalleryQueryParameters parameters,
        CancellationToken cancellationToken = default);

    Task<GalleryImageResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<GalleryImageResponse> CreateAsync(
        CreateGalleryImageRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> UpdateAsync(
        Guid id,
        UpdateGalleryImageRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
