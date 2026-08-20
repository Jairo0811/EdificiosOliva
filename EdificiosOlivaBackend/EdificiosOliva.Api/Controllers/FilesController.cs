using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public sealed class FilesController(IWebHostEnvironment environment) : ControllerBase
{
    private static readonly HashSet<string> AllowedContentTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    private const long MaximumFileSize = 5 * 1024 * 1024;
    private const long MaximumPixels = 20_000_000;

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

        Image image;
        try
        {
            await using var input = file.OpenReadStream();
            image = await Image.LoadAsync(input, cancellationToken);
        }
        catch (UnknownImageFormatException)
        {
            return BadRequest("El contenido no es una imagen válida.");
        }
        catch (InvalidImageContentException)
        {
            return BadRequest("La imagen está dañada o contiene datos inválidos.");
        }

        using (image)
        {
            if ((long)image.Width * image.Height > MaximumPixels)
                return BadRequest("La imagen excede el límite de 20 megapíxeles.");

            image.Mutate(context => context.AutoOrient());

            var safeFolder = SanitizeFolder(folder);
            var storedFileName = $"{Guid.NewGuid():N}.webp";
            var relativePath = Path.Combine("uploads", safeFolder, storedFileName)
                .Replace('\\', '/');
            var physicalDirectory = Path.Combine(
                environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"),
                "uploads",
                safeFolder);

            Directory.CreateDirectory(physicalDirectory);

            var physicalPath = Path.Combine(physicalDirectory, storedFileName);
            await image.SaveAsync(physicalPath, new WebpEncoder { Quality = 85 }, cancellationToken);

            var publicUrl = $"{Request.Scheme}://{Request.Host}/{relativePath}";

            return Created(publicUrl, new FileUploadResponse(
                publicUrl,
                relativePath,
                Path.GetFileName(file.FileName)));
        }
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

        var allowedPrefix = allowedRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(allowedPrefix, StringComparison.OrdinalIgnoreCase))
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
