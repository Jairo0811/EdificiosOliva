using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Gallery;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class GalleryController(IGalleryImageService galleryService) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType<PagedResult<GalleryImageResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<GalleryImageResponse>>> GetAll(
        [FromQuery] GalleryQueryParameters parameters,
        CancellationToken cancellationToken)
    {
        var images = await galleryService.GetPagedAsync(parameters, cancellationToken);
        return Ok(images);
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    [ProducesResponseType<GalleryImageResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GalleryImageResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var image = await galleryService.GetByIdAsync(id, cancellationToken);
        return image is null ? NotFound() : Ok(image);
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType<GalleryImageResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<GalleryImageResponse>> Create(
        [FromBody] CreateGalleryImageRequest request,
        CancellationToken cancellationToken)
    {
        var image = await galleryService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = image.Id }, image);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateGalleryImageRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await galleryService.UpdateAsync(id, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await galleryService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
