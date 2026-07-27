using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class FilesController(IWebHostEnvironment environment) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    private const long MaximumFileSize = 5 * 1024 * 1024;

    [HttpPost("images")]
    [RequestSizeLimit(MaximumFileSize)]
    [ProducesResponseType<FileUploadResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FileUploadResponse>> UploadImage(
        [FromForm] IFormFile file,
        [FromForm] string? folder,
        CancellationToken cancellationToken)
    {
        if (file.Length == 0)
        {
            return BadRequest("El archivo está vacío.");
        }

        if (file.Length > MaximumFileSize)
        {
            return BadRequest("Cada imagen debe pesar 5 MB o menos.");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            return BadRequest("Solo se permiten imágenes JPG, PNG o WEBP.");
        }

        var safeFolder = SanitizeFolder(folder);
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var relativePath = Path.Combine("uploads", safeFolder, storedFileName)
            .Replace('\\', '/');
        var physicalDirectory = Path.Combine(
            environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"),
            "uploads",
            safeFolder);

        Directory.CreateDirectory(physicalDirectory);

        var physicalPath = Path.Combine(physicalDirectory, storedFileName);
        await using var stream = System.IO.File.Create(physicalPath);
        await file.CopyToAsync(stream, cancellationToken);

        var publicUrl = $"{Request.Scheme}://{Request.Host}/{relativePath}";

        return Created(publicUrl, new FileUploadResponse(
            publicUrl,
            relativePath,
            file.FileName));
    }

    [HttpDelete("images")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult DeleteImage([FromQuery] string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return BadRequest("La ruta de la imagen es obligatoria.");
        }

        var relativePath = ExtractRelativePath(path);
        if (!relativePath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("La ruta indicada no pertenece al almacenamiento local.");
        }

        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var fullPath = Path.GetFullPath(Path.Combine(webRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var allowedRoot = Path.GetFullPath(Path.Combine(webRoot, "uploads"));

        if (!fullPath.StartsWith(allowedRoot, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("La ruta indicada no es válida.");
        }

        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        return NoContent();
    }

    private static string SanitizeFolder(string? folder)
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return "general";
        }

        var segments = folder
            .Replace('\\', '/')
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(segment => new string(segment
                .Where(character => char.IsLetterOrDigit(character) || character is '-' or '_')
                .ToArray()))
            .Where(segment => !string.IsNullOrWhiteSpace(segment));

        var safeFolder = Path.Combine(segments.ToArray());
        return string.IsNullOrWhiteSpace(safeFolder) ? "general" : safeFolder;
    }

    private static string ExtractRelativePath(string pathOrUrl)
    {
        if (Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var uri))
        {
            return uri.AbsolutePath.TrimStart('/');
        }

        return pathOrUrl.TrimStart('/').Replace('\\', '/');
    }
}

public sealed record FileUploadResponse(
    string DownloadUrl,
    string FullPath,
    string FileName);
