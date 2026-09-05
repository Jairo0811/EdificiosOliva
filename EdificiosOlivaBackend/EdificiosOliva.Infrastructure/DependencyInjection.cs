using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Persistence.Context;
using EdificiosOliva.Infrastructure.Repositories;
using EdificiosOliva.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EdificiosOliva.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configura ConnectionStrings:DefaultConnection para el entorno actual.");
        }

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString));

        services.AddScoped<IApartmentRepository, ApartmentRepository>();
        services.AddScoped<IApartmentService, ApartmentService>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IReservationRepository, ReservationRepository>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IGalleryImageRepository, GalleryImageRepository>();
        services.AddScoped<IGalleryImageService, GalleryImageService>();

        return services;
    }
}
