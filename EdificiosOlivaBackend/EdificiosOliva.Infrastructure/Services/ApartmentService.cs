using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Apartments;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Services;

public sealed class ApartmentService(IApartmentRepository apartmentRepository)
    : IApartmentService
{
    public async Task<PagedResult<ApartmentResponse>> GetPagedAsync(
        ApartmentQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var query = apartmentRepository.Query()
            .AsNoTracking()
            .Include(apartment => apartment.Images)
            .Where(apartment => !apartment.IsDeleted);

        if (!string.IsNullOrWhiteSpace(parameters.Search))
        {
            var search = parameters.Search.Trim();
            query = query.Where(apartment =>
                apartment.Name.Contains(search) ||
                apartment.Description.Contains(search) ||
                apartment.Location.Contains(search));
        }

        if (parameters.Status.HasValue)
        {
            query = query.Where(apartment => apartment.Status == parameters.Status.Value);
        }

        if (parameters.MinimumPrice.HasValue)
        {
            query = query.Where(apartment => apartment.PricePerNight >= parameters.MinimumPrice.Value);
        }

        if (parameters.MaximumPrice.HasValue)
        {
            query = query.Where(apartment => apartment.PricePerNight <= parameters.MaximumPrice.Value);
        }

        if (parameters.MinimumGuestCapacity.HasValue)
        {
            query = query.Where(apartment => apartment.GuestCapacity >= parameters.MinimumGuestCapacity.Value);
        }

        query = ApplyOrdering(query, parameters.SortBy, parameters.Descending);

        var totalItems = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((parameters.Page - 1) * parameters.PageSize)
            .Take(parameters.PageSize)
            .Select(apartment => Map(apartment))
            .ToListAsync(cancellationToken);

        return new PagedResult<ApartmentResponse>(
            items,
            parameters.Page,
            parameters.PageSize,
            totalItems);
    }

    public async Task<ApartmentResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await apartmentRepository.Query()
            .AsNoTracking()
            .Include(apartment => apartment.Images)
            .Where(apartment => apartment.Id == id && !apartment.IsDeleted)
            .Select(apartment => Map(apartment))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ApartmentResponse> CreateAsync(
        CreateApartmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var apartment = new Apartment
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            PricePerNight = request.PricePerNight,
            GuestCapacity = request.GuestCapacity,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Location = request.Location.Trim(),
            Status = request.Status,
            Images = CreateImages(request.Images)
        };

        await apartmentRepository.AddAsync(apartment, cancellationToken);
        await apartmentRepository.SaveChangesAsync(cancellationToken);

        return Map(apartment);
    }

    public async Task<bool> UpdateAsync(
        Guid id,
        UpdateApartmentRequest request,
        CancellationToken cancellationToken = default)
    {
        var apartment = await apartmentRepository.GetByIdAsync(id, cancellationToken);
        if (apartment is null)
        {
            return false;
        }

        apartment.Name = request.Name.Trim();
        apartment.Description = request.Description.Trim();
        apartment.PricePerNight = request.PricePerNight;
        apartment.GuestCapacity = request.GuestCapacity;
        apartment.Bedrooms = request.Bedrooms;
        apartment.Bathrooms = request.Bathrooms;
        apartment.Location = request.Location.Trim();
        apartment.Status = request.Status;
        apartment.UpdatedAtUtc = DateTime.UtcNow;

        apartment.Images.Clear();
        foreach (var image in CreateImages(request.Images))
        {
            apartment.Images.Add(image);
        }

        await apartmentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var apartment = await apartmentRepository.GetByIdAsync(id, cancellationToken);
        if (apartment is null)
        {
            return false;
        }

        apartment.IsDeleted = true;
        apartment.UpdatedAtUtc = DateTime.UtcNow;
        await apartmentRepository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static List<ApartmentImage> CreateImages(IReadOnlyList<string> urls)
    {
        return urls
            .Where(url => !string.IsNullOrWhiteSpace(url))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(10)
            .Select((url, index) => new ApartmentImage
            {
                Url = url.Trim(),
                PublicId = ExtractPublicId(url),
                IsCover = index == 0,
                SortOrder = index
            })
            .ToList();
    }

    private static string ExtractPublicId(string url)
    {
        if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        {
            return uri.AbsolutePath.TrimStart('/');
        }

        return url.TrimStart('/');
    }

    private static IQueryable<Apartment> ApplyOrdering(
        IQueryable<Apartment> query,
        string sortBy,
        bool descending)
    {
        return (sortBy.ToLowerInvariant(), descending) switch
        {
            ("price", false) => query.OrderBy(apartment => apartment.PricePerNight),
            ("price", true) => query.OrderByDescending(apartment => apartment.PricePerNight),
            ("capacity", false) => query.OrderBy(apartment => apartment.GuestCapacity),
            ("capacity", true) => query.OrderByDescending(apartment => apartment.GuestCapacity),
            ("createdat", false) => query.OrderBy(apartment => apartment.CreatedAtUtc),
            ("createdat", true) => query.OrderByDescending(apartment => apartment.CreatedAtUtc),
            ("name", true) => query.OrderByDescending(apartment => apartment.Name),
            _ => query.OrderBy(apartment => apartment.Name)
        };
    }

    private static ApartmentResponse Map(Apartment apartment) =>
        new(
            apartment.Id,
            apartment.Name,
            apartment.Description,
            apartment.PricePerNight,
            apartment.GuestCapacity,
            apartment.Bedrooms,
            apartment.Bathrooms,
            apartment.Location,
            apartment.Status,
            apartment.Images
                .Where(image => !image.IsDeleted)
                .OrderByDescending(image => image.IsCover)
                .ThenBy(image => image.SortOrder)
                .Select(image => image.Url)
                .ToList(),
            apartment.CreatedAtUtc,
            apartment.UpdatedAtUtc);
}
