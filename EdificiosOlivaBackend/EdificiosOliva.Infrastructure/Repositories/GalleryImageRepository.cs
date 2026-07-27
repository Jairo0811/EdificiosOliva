using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Repositories;

public sealed class GalleryImageRepository(ApplicationDbContext dbContext)
    : IGalleryImageRepository
{
    public IQueryable<GalleryImage> Query() => dbContext.GalleryImages;

    public Task<GalleryImage?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return dbContext.GalleryImages.SingleOrDefaultAsync(
            image => image.Id == id && !image.IsDeleted,
            cancellationToken);
    }

    public async Task AddAsync(
        GalleryImage image,
        CancellationToken cancellationToken = default)
    {
        await dbContext.GalleryImages.AddAsync(image, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
