using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Repositories;

public sealed class ReservationRepository(ApplicationDbContext dbContext)
    : IReservationRepository
{
    public IQueryable<Reservation> Query() => dbContext.Reservations;

    public Task<Reservation?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Reservations
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.Apartment)
            .SingleOrDefaultAsync(
                reservation => reservation.Id == id && !reservation.IsDeleted,
                cancellationToken);
    }

    public async Task AddAsync(
        Reservation reservation,
        CancellationToken cancellationToken = default)
    {
        await dbContext.Reservations.AddAsync(reservation, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
