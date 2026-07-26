using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Apartments;
using EdificiosOliva.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ApartmentsController(IApartmentService apartmentService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<ApartmentResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<ApartmentResponse>>> GetAll(
        [FromQuery] ApartmentQueryParameters parameters,
        CancellationToken cancellationToken)
    {
        if (parameters.MinimumPrice.HasValue &&
            parameters.MaximumPrice.HasValue &&
            parameters.MinimumPrice > parameters.MaximumPrice)
        {
            ModelState.AddModelError(
                nameof(parameters.MinimumPrice),
                "MinimumPrice no puede ser mayor que MaximumPrice.");

            return ValidationProblem(ModelState);
        }

        var apartments = await apartmentService.GetPagedAsync(parameters, cancellationToken);
        return Ok(apartments);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<ApartmentResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApartmentResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var apartment = await apartmentService.GetByIdAsync(id, cancellationToken);
        return apartment is null ? NotFound() : Ok(apartment);
    }

    [HttpPost]
    [ProducesResponseType<ApartmentResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApartmentResponse>> Create(
        [FromBody] CreateApartmentRequest request,
        CancellationToken cancellationToken)
    {
        var apartment = await apartmentService.CreateAsync(request, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = apartment.Id },
            apartment);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateApartmentRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await apartmentService.UpdateAsync(id, request, cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var deleted = await apartmentService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
