using System.Security.Claims;
using System.Threading.RateLimiting;
using EdificiosOliva.Api.Middlewares;
using EdificiosOliva.Api.Security;
using EdificiosOliva.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "Frontend";
const long MaximumRequestSize = 6 * 1024 * 1024;

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:DefaultConnection debe configurarse mediante User Secrets o variables de entorno.");
}

var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
if (string.IsNullOrWhiteSpace(firebaseProjectId))
{
    throw new InvalidOperationException(
        "Firebase:ProjectId es obligatorio para validar los tokens de la API.");
}

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .ToArray() ?? [];

if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "Cors:AllowedOrigins debe contener al menos un origen confiable.");
}

if (!builder.Environment.IsDevelopment() &&
    string.Equals(builder.Configuration["AllowedHosts"], "*", StringComparison.Ordinal))
{
    throw new InvalidOperationException(
        "AllowedHosts debe restringirse al dominio público en producción.");
}

if (!builder.Environment.IsDevelopment() &&
    allowedOrigins.Any(origin => !origin.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException(
        "Todos los orígenes CORS deben usar HTTPS en producción.");
}

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = MaximumRequestSize;
    options.Limits.RequestHeadersTimeout = TimeSpan.FromSeconds(15);
});

builder.Services.AddControllers(options =>
{
    options.MaxModelBindingCollectionSize = 1_000;
});
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = MaximumRequestSize;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "Firebase ID token",
        In = ParameterLocation.Header
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var issuer = $"https://securetoken.google.com/{firebaseProjectId}";

        options.Authority = issuer;
        options.Audience = firebaseProjectId;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = firebaseProjectId,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "user_id",
            RoleClaimType = "role"
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    options.AddPolicy(SecurityPolicies.Admin, policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("admin");
        policy.RequireAssertion(context =>
            context.User.Claims.Any(claim =>
                claim.Type == "email_verified" &&
                string.Equals(claim.Value, "true", StringComparison.OrdinalIgnoreCase)));
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    options.AddPolicy("uploads", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.User.FindFirstValue("user_id") ??
            context.Connection.RemoteIpAddress?.ToString() ??
            "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
app.UseHttpsRedirection();
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
app.UseStaticFiles();
app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new
{
    service = "EdificiosOliva.Api",
    status = "Healthy",
    utc = DateTime.UtcNow
})).AllowAnonymous();

app.MapControllers();

app.Run();

public partial class Program;
