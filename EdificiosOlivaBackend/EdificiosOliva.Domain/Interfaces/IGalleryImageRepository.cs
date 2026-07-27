using EdificiosOliva.Domain.Entities;

namespace EdificiosOliva.Domain.Interfaces;

public interface IGalleryImageRepository
{
    IQueryable<GalleryImage> Query();
    Task<GalleryImage?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task AddAsync(GalleryImage image, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
