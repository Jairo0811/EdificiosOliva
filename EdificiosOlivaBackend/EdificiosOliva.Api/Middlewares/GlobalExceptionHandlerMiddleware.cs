using System.Net;
using Microsoft.AspNetCore.Mvc;

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

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "Ocurrió un error inesperado.",
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