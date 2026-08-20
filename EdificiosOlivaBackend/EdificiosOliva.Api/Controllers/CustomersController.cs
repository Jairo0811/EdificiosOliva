using EdificiosOliva.Application.Common.Models;
using EdificiosOliva.Application.DTOs.Customers;
using EdificiosOliva.Application.Interfaces;
using EdificiosOliva.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EdificiosOliva.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = SecurityPolicies.Admin)]
public sealed class CustomersController(ICustomerService customerService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerResponse>>> GetAll(
        [FromQuery] CustomerQueryParameters parameters,
        CancellationToken cancellationToken) =>
        Ok(await customerService.GetPagedAsync(parameters, cancellationToken));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CustomerResponse>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var customer = await customerService.GetByIdAsync(id, cancellationToken);
        return customer is null ? NotFound() : Ok(customer);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerResponse>> Create(
        [FromBody] CreateCustomerRequest request,
        CancellationToken cancellationToken)
    {
        var customer = await customerService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, customer);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCustomerRequest request,
        CancellationToken cancellationToken) =>
        await customerService.UpdateAsync(id, request, cancellationToken) ? NoContent() : NotFound();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken) =>
        await customerService.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
}
