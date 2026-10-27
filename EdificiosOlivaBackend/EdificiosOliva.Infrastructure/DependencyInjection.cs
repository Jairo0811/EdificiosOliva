using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Domain.Interfaces;
using EdificiosOliva.Infrastructure.Notifications;
using EdificiosOliva.Infrastructure.Payments.Azul;
using EdificiosOliva.Infrastructure.Persistence.Context;
using EdificiosOliva.Infrastructure.Repositories;
using EdificiosOliva.Infrastructure.Services;
using EdificiosOliva.Infrastructure.Time;
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

        var propertyClockOptions = PropertyClockOptions.FromConfiguration(configuration);
        propertyClockOptions.Validate();
        services.AddSingleton(propertyClockOptions);
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<IPropertyClock, PropertyClock>();

        services.AddScoped<IApartmentRepository, ApartmentRepository>();
        services.AddScoped<IApartmentService, ApartmentService>();
        services.AddScoped<ICustomerRepository, CustomerRepository>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IReservationRepository, ReservationRepository>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IPaymentRepository, PaymentRepository>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IPaymentIntentService, PaymentIntentService>();

        var emailOptions = EmailNotificationOptions.FromConfiguration(configuration);
        emailOptions.Validate();
        services.AddSingleton(emailOptions);
        services.AddScoped<IBookingNotificationService, SmtpBookingNotificationService>();

        var azulOptions = AzulOptions.FromConfiguration(configuration);
        if (azulOptions.Enabled)
        {
            azulOptions.Validate();
            services.AddSingleton(azulOptions);
            services.AddScoped<IPaymentGateway, AzulPaymentGateway>();
        }

        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IOperationsService, OperationsService>();
        services.AddScoped<IGalleryImageRepository, GalleryImageRepository>();
        services.AddScoped<IGalleryImageService, GalleryImageService>();

        return services;
    }
}
