using EdificiosOliva.Domain.Entities;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Infrastructure.Repositories;

public sealed class PaymentRepository(ApplicationDbContext dbContext)
    : IPaymentRepository
{
    public IQueryable<Payment> Query() => dbContext.Payments;

    public Task<Payment?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Payments
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Customer)
            .Include(payment => payment.Reservation)
                .ThenInclude(reservation => reservation.Apartment)
            .SingleOrDefaultAsync(
                payment => payment.Id == id && !payment.IsDeleted,
                cancellationToken);
    }

    public async Task AddAsync(
        Payment payment,
        CancellationToken cancellationToken = default)
    {
        await dbContext.Payments.AddAsync(payment, cancellationToken);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return dbContext.SaveChangesAsync(cancellationToken);
    }
}
