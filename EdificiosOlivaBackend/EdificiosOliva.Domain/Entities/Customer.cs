using EdificiosOliva.Domain.Common;

namespace EdificiosOliva.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
