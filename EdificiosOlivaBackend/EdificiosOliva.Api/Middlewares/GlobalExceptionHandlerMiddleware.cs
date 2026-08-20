using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EdificiosOliva.Api.Middlewares;

public sealed class GlobalExceptionHandlerMiddleware(
    RequestDelegate next,
    ILogger<GlobalExceptionHandlerMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException)
            when (context.RequestAborted.IsCancellationRequested)
        {
            logger.LogInformation(
                "La solicitud HTTP fue cancelada por el cliente. TraceId: {TraceId}",
                context.TraceIdentifier);

            context.Response.StatusCode = 499;
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Ocurrió un error no controlado. TraceId: {TraceId}",
                context.TraceIdentifier);

            await WriteProblemDetailsAsync(context, exception);
        }
    }

    private static async Task WriteProblemDetailsAsync(
        HttpContext context,
        Exception exception)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        var (status, title) = exception switch
        {
            InvalidOperationException => (
                StatusCodes.Status409Conflict,
                "La operación no es válida para el estado actual."),
            DbUpdateException => (
                StatusCodes.Status409Conflict,
                "La operación entra en conflicto con los datos existentes."),
            _ => (
                StatusCodes.Status500InternalServerError,
                "Ocurrió un error inesperado.")
        };

        var problemDetails = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = "No fue posible completar la solicitud.",
            Instance = context.Request.Path
        };

        problemDetails.Extensions["traceId"] =
            context.TraceIdentifier;

        context.Response.StatusCode =
            problemDetails.Status.Value;

        context.Response.ContentType =
            "application/problem+json";

        await context.Response.WriteAsJsonAsync(problemDetails);
    }
}
