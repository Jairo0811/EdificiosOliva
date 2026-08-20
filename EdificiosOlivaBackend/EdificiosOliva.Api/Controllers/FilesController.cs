using System.Text.RegularExpressions;
using EdificiosOliva.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = SecurityPolicies.Admin)]
public sealed partial class FilesController(
    IWebHostEnvironment environment,
    ILogger<FilesController> logger) : ControllerBase
{
    private const long MaximumFileSize = 5 * 1024 * 1024;
    private const long MaximumPixelCount = 20_000_000;

    [GeneratedRegex("^[A-Za-z0-9_-]{1,50}$", RegexOptions.CultureInvariant)]
    private static partial Regex SafeFolderPattern();

    [HttpPost("images")]
    [EnableRateLimiting("uploads")]
    [RequestSizeLimit(MaximumFileSize)]
    [ProducesResponseType<FileUploadResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FileUploadResponse>> UploadImage(
        [FromForm] IFormFile file,
        [FromForm] string? folder,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("El archivo está vacío.");
        }

        if (file.Length > MaximumFileSize)
        {
            return BadRequest("Cada imagen debe pesar 5 MB o menos.");
        }

        byte[] payload;
        await using (var input = file.OpenReadStream())
        {
            await using var buffer = new MemoryStream((int)file.Length);
            await input.CopyToAsync(buffer, cancellationToken);
            payload = buffer.ToArray();
        }

        if (!HasAllowedImageSignature(payload))
        {
            return BadRequest("El archivo no contiene una imagen JPG, PNG o WEBP válida.");
        }

        Image image;
        try
        {
            var information = Image.Identify(payload);
            if (information is null ||
                (long)information.Width * information.Height > MaximumPixelCount)
            {
                return BadRequest("La imagen supera el límite de 20 millones de píxeles.");
            }

            image = Image.Load(payload);
        }
        catch (Exception exception) when (
            exception is UnknownImageFormatException or InvalidImageContentException)
        {
            logger.LogWarning(
                exception,
                "Se rechazó una carga de imagen inválida. TraceId: {TraceId}",
                HttpContext.TraceIdentifier);
            return BadRequest("El contenido del archivo no es una imagen válida.");
        }

        var safeFolder = NormalizeFolder(folder);
        if (safeFolder is null)
        {
            image.Dispose();
            return BadRequest("La carpeta solo puede contener letras, números, guiones y guiones bajos.");
        }

        var webRoot = GetWebRoot();
        var physicalDirectory = Path.Combine(webRoot, "uploads", safeFolder);
        Directory.CreateDirectory(physicalDirectory);

        var storedFileName = $"{Guid.NewGuid():N}.webp";
        var physicalPath = Path.Combine(physicalDirectory, storedFileName);

        using (image)
        {
            image.Mutate(operation => operation.AutoOrient());
            image.Metadata.ExifProfile = null;
            image.Metadata.IccProfile = null;
            image.Metadata.XmpProfile = null;

            await image.SaveAsWebpAsync(
                physicalPath,
                new WebpEncoder { Quality = 82 },
                cancellationToken);
        }

        var relativePath = $"uploads/{safeFolder}/{storedFileName}";
        var downloadUrl = $"/{relativePath}";

        return Created(downloadUrl, new FileUploadResponse(
            downloadUrl,
            relativePath,
            storedFileName));
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
        if (!relativePath.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(Path.GetExtension(relativePath), ".webp", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("La ruta indicada no pertenece al almacenamiento de imágenes.");
        }

        var webRoot = GetWebRoot();
        var allowedRoot = Path.GetFullPath(Path.Combine(webRoot, "uploads"));
        var allowedPrefix = allowedRoot.TrimEnd(
            Path.DirectorySeparatorChar,
            Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var fullPath = Path.GetFullPath(Path.Combine(
            webRoot,
            relativePath.Replace('/', Path.DirectorySeparatorChar)));
        var comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;

        if (!fullPath.StartsWith(allowedPrefix, comparison))
        {
            return BadRequest("La ruta indicada no es válida.");
        }

        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        return NoContent();
    }

    private string GetWebRoot() =>
        environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");

    private static string? NormalizeFolder(string? folder)
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return "general";
        }

        var normalized = folder.Trim();
        return SafeFolderPattern().IsMatch(normalized) ? normalized : null;
    }

    private static string ExtractRelativePath(string pathOrUrl)
    {
        if (Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var uri))
        {
            return uri.AbsolutePath.TrimStart('/');
        }

        return pathOrUrl.TrimStart('/').Replace('\\', '/');
    }

    private static bool HasAllowedImageSignature(byte[] payload)
    {
        if (payload.Length < 12)
        {
            return false;
        }

        var isJpeg =
            payload[0] == 0xFF &&
            payload[1] == 0xD8 &&
            payload[2] == 0xFF;
        var isPng =
            payload[0] == 0x89 &&
            payload[1] == 0x50 &&
            payload[2] == 0x4E &&
            payload[3] == 0x47 &&
            payload[4] == 0x0D &&
            payload[5] == 0x0A &&
            payload[6] == 0x1A &&
            payload[7] == 0x0A;
        var isWebp =
            payload[0] == (byte)'R' &&
            payload[1] == (byte)'I' &&
            payload[2] == (byte)'F' &&
            payload[3] == (byte)'F' &&
            payload[8] == (byte)'W' &&
            payload[9] == (byte)'E' &&
            payload[10] == (byte)'B' &&
            payload[11] == (byte)'P';

        return isJpeg || isPng || isWebp;
    }
}

public sealed record FileUploadResponse(
    string DownloadUrl,
    string FullPath,
    string FileName);
