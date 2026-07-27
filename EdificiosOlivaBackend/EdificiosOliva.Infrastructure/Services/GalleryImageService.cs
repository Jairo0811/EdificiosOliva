using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Gallery;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class GalleryImageService(IGalleryImageRepository repository)
    : IGalleryImageService
{
    public async Task<PagedResult<GalleryImageResponse>> GetPagedAsync(
        GalleryQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = repository.Query()
            .AsNoTracking()
            .Where(image => !image.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Category))
        {
            var category = parameters.Category.Trim();
            query = query.Where(image => image.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(image =>
                image.Title.Contains(search) ||
                image.AltText.Contains(search));
        }

        if (parameters.IsPublished.HasValue)
        {
            query = query.Where(image => image.IsPublished == parameters.IsPublished.Value);
        }

        var totalItems = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(image => image.SortOrder)
            .ThenByDescending(image => image.CreatedAtUtc)
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(image => MapResponse(image))
            .ToListAsync(cancellationToken);

        return new PagedResult<GalleryImageResponse>(
            items,
            parameters.Page,
            parameters.PageSize,
            totalItems);
    }

    public async Task<GalleryImageResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var image = await repository.GetByIdAsync(id, cancellationToken);
        return image is null ? null : MapResponse(image);
    }

    public async Task<GalleryImageResponse> CreateAsync(
        CreateGalleryImageRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsurePublicIdAvailableAsync(request.PublicId, null, cancellationToken);

        var image = new GalleryImage
        {
            Title = request.Title.Trim(),
            Category = request.Category.Trim(),
            Url = request.Url.Trim(),
            PublicId = string.IsNullOrWhiteSpace(request.PublicId) ? null : request.PublicId.Trim(),
            AltText = request.AltText.Trim(),
            SortOrder = request.SortOrder,
            IsPublished = request.IsPublished,
        };

        await repository.AddAsync(image, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return MapResponse(image);
    }

    public async Task<bool> UpdateAsync(
        Guid id,
        UpdateGalleryImageRequest request,
        CancellationToken cancellationToken = default)
    {
        var image = await repository.GetByIdAsync(id, cancellationToken);
        if (image is null)
        {
            return false;
        }

        await EnsurePublicIdAvailableAsync(request.PublicId, id, cancellationToken);

        image.Title = request.Title.Trim();
        image.Category = request.Category.Trim();
        image.Url = request.Url.Trim();
        image.PublicId = string.IsNullOrWhiteSpace(request.PublicId) ? null : request.PublicId.Trim();
        image.AltText = request.AltText.Trim();
        image.SortOrder = request.SortOrder;
        image.IsPublished = request.IsPublished;
        image.UpdatedAtUtc = DateTime.UtcNow;

        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var image = await repository.GetByIdAsync(id, cancellationToken);
        if (image is null)
        {
            return false;
        }

        image.IsDeleted = true;
        image.UpdatedAtUtc = DateTime.UtcNow;
        await repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsurePublicIdAvailableAsync(
        string? publicId,
        Guid? excludedId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return;
        }

        var normalized = publicId.Trim();
        var exists = await repository.Query().AnyAsync(
            image =>
                !image.IsDeleted &&
                image.Id != excludedId &&
                image.PublicId == normalized,
            cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException("Ya existe una imagen con ese identificador público.");
        }
    }

    private static GalleryImageResponse MapResponse(GalleryImage image)
    {
        return new GalleryImageResponse(
            image.Id,
            image.Title,
            image.Category,
            image.Url,
            image.PublicId,
            image.AltText,
            image.SortOrder,
            image.IsPublished,
            image.CreatedAtUtc,
            image.UpdatedAtUtc);
    }
}
