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

            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 499;
            }
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
            {
                throw;
            }

            var (statusCode, title, detail) = MapException(exception);

            if (statusCode >= StatusCodes.Status500InternalServerError)
            {
                logger.LogError(
                    exception,
                    "Ocurrió un error no controlado. TraceId: {TraceId}",
                    context.TraceIdentifier);
            }
            else
            {
                logger.LogWarning(
                    exception,
                    "La solicitud fue rechazada con HTTP {StatusCode}. TraceId: {TraceId}",
                    statusCode,
                    context.TraceIdentifier);
            }

            await WriteProblemDetailsAsync(
                context,
                statusCode,
                title,
                detail);
        }
    }

    private static (int StatusCode, string Title, string Detail) MapException(
        Exception exception) => exception switch
        {
            ArgumentException => (
                StatusCodes.Status400BadRequest,
                "La solicitud contiene datos inválidos.",
                exception.Message),

            InvalidOperationException => (
                StatusCodes.Status400BadRequest,
                "La operación solicitada no es válida.",
                exception.Message),

            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "No se encontró el recurso solicitado.",
                exception.Message),

            UnauthorizedAccessException => (
                StatusCodes.Status403Forbidden,
                "No tienes permisos para realizar esta operación.",
                "La cuenta autenticada no cuenta con los permisos requeridos."),

            _ => (
                StatusCodes.Status500InternalServerError,
                "Ocurrió un error inesperado.",
                "No fue posible completar la solicitud.")
        };

    private static async Task WriteProblemDetailsAsync(
        HttpContext context,
        int statusCode,
        string title,
        string detail)
    {
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };

        problemDetails.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problemDetails);
    }
}
