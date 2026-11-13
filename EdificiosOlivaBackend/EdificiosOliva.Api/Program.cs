using System.Threading.RateLimiting;
using System.Net;
using Microsoft.AspNetCore.HttpOverrides;
using EdificiosOliva.Api.Middlewares;
using EdificiosOliva.Infrastructure;
using EdificiosOliva.Infrastructure.Persistence.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "Frontend";
const string PublicBookingRatePolicy = "PublicBooking";
const string PaymentWebhookRatePolicy = "PaymentWebhook";
const string PublicPaymentRatePolicy = "PublicPayment";

builder.Services.AddControllers();

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var problemDetails = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "La solicitud contiene errores de validación.",
            Detail = "Revisa los campos indicados e intenta nuevamente.",
            Instance = context.HttpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] =
            context.HttpContext.TraceIdentifier;

        return new BadRequestObjectResult(problemDetails)
        {
            ContentTypes = { "application/problem+json" }
        };
    };
});

var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
if (string.IsNullOrWhiteSpace(firebaseProjectId))
{
    throw new InvalidOperationException("Falta Firebase:ProjectId.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
        options.Audience = firebaseProjectId;
        options.TokenValidationParameters.ValidIssuer =
            $"https://securetoken.google.com/{firebaseProjectId}";
        options.TokenValidationParameters.RoleClaimType = "role";

        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();

                if (context.Response.HasStarted)
                {
                    return;
                }

                var problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Autenticación requerida.",
                    Detail = "Debes iniciar sesión con una cuenta válida para acceder a este recurso.",
                    Instance = context.Request.Path
                };

                problemDetails.Extensions["traceId"] =
                    context.HttpContext.TraceIdentifier;

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(problemDetails);
            },
            OnForbidden = async context =>
            {
                if (context.Response.HasStarted)
                {
                    return;
                }

                var problemDetails = new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Acceso denegado.",
                    Detail = "Tu cuenta no cuenta con los permisos necesarios para realizar esta operación.",
                    Instance = context.Request.Path
                };

                problemDetails.Extensions["traceId"] =
                    context.HttpContext.TraceIdentifier;

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(problemDetails);
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy("Admin", policy =>
        policy
            .RequireAuthenticatedUser()
            .RequireClaim("role", "admin"));
});

// Solo confiamos en proxies enumerados explícitamente. X-Forwarded-For arbitrario
// enviado por el visitante no puede alterar la partición del limitador.
var knownProxyAddresses = builder.Configuration.GetSection("ReverseProxy:KnownProxies")
    .GetChildren()
    .Select(child => child.Value)
    .Where(value => !string.IsNullOrWhiteSpace(value))
    .Select(value => IPAddress.TryParse(value, out var address)
        ? address!
        : throw new InvalidOperationException("ReverseProxy:KnownProxies contiene una IP inválida."))
    .ToArray();

if (knownProxyAddresses.Length > 0)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        options.KnownProxies.Clear();
        options.KnownNetworks.Clear();
        foreach (var address in knownProxyAddresses)
            options.KnownProxies.Add(address);
    });
}

static string ClientIp(HttpContext context)
{
    var address = context.Connection.RemoteIpAddress;
    if (address is null) return "unknown";
    return address.IsIPv4MappedToIPv6 ? address.MapToIPv4().ToString() : address.ToString();
}

static FixedWindowRateLimiterOptions FixedWindow(int permits) => new()
{
    PermitLimit = permits,
    Window = TimeSpan.FromMinutes(1),
    QueueLimit = 0,
    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
    AutoReplenishment = true,
};

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Protección global secundaria: cuota suficientemente alta para no colisionar
    // con visitantes legítimos; requiere observabilidad y ajuste de carga en staging.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter("global", _ => FixedWindow(2000)));

    options.AddPolicy(PublicBookingRatePolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter($"booking:{ClientIp(context)}", _ => FixedWindow(30)));

    options.AddPolicy(PaymentWebhookRatePolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter($"webhook:{ClientIp(context)}", _ => FixedWindow(120)));

    options.AddPolicy(PublicPaymentRatePolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter($"payment:{ClientIp(context)}", _ => FixedWindow(20)));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .GetChildren()
    .Select(item => item.Value)
    .Where(value => !string.IsNullOrWhiteSpace(value))
    .Cast<string>()
    .ToArray();

var allowedOrigins = configuredOrigins.Length > 0
    ? configuredOrigins
    : ["http://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

if (knownProxyAddresses.Length > 0)
    app.UseForwardedHeaders();

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers.Append(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()");

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

var useHttpsRedirection =
    builder.Configuration.GetValue("Security:UseHttpsRedirection", true);

if (useHttpsRedirection)
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();
app.UseRouting();
app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    service = "EdificiosOliva.Api"
})).AllowAnonymous();

app.MapGet(
    "/health/ready",
    async (ApplicationDbContext dbContext, CancellationToken cancellationToken) =>
    {
        try
        {
            var databaseReady = await dbContext.Database.CanConnectAsync(cancellationToken);

            return databaseReady
                ? Results.Ok(new
                {
                    status = "ready",
                    service = "EdificiosOliva.Api",
                    database = "connected"
                })
                : Results.Json(
                    new
                    {
                        status = "not-ready",
                        service = "EdificiosOliva.Api",
                        database = "unavailable"
                    },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
        }
        catch
        {
            return Results.Json(
                new
                {
                    status = "not-ready",
                    service = "EdificiosOliva.Api",
                    database = "unavailable"
                },
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    })
    .AllowAnonymous();

app.MapControllers();

app.Run();
