using System.ComponentModel.DataAnnotations;

namespace EdificiosOliva.Application.DTOs.Customers;

public sealed record CustomerResponse(
    Guid Id,
    string Name,
    string Email,
    string Phone,
    bool IsActive,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public sealed class CustomerQueryParameters
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    [StringLength(150)]
    public string? Search { get; init; }

    public bool? IsActive { get; init; }
}

public class CustomerRequest
{
    [Required]
    [StringLength(150)]
    public string Name { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(200)]
    public string Email { get; init; } = string.Empty;

    [Required]
    [StringLength(30)]
    [RegularExpression(
        @"^\+?[0-9 ()-]{7,30}$",
        ErrorMessage = "El teléfono solo puede contener dígitos, espacios, paréntesis, + y -."
    )]
    public string Phone { get; init; } = string.Empty;

    public bool IsActive { get; init; } = true;
}

public sealed class CreateCustomerRequest : CustomerRequest
{
}

public sealed class UpdateCustomerRequest : CustomerRequest
{
}
