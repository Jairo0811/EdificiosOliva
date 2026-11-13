namespace EdificiosOliva.Application.Common.Exceptions;

/// <summary>
/// La clave de idempotencia ya fue utilizada con datos distintos.
/// Se traduce a HTTP 409 para que el cliente no la reutilice.
/// </summary>
public sealed class IdempotencyConflictException(string message) : Exception(message);
