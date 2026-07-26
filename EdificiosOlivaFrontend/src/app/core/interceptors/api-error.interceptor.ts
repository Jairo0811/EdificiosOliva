import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

interface ProblemDetailsResponse {
  title?: string;
  detail?: string;
  status?: number;
  traceId?: string;
  errors?: Record<string, string[]>;
}

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      const problem = error.error as ProblemDetailsResponse | null;
      const validationMessage = problem?.errors
        ? Object.values(problem.errors).flat().join(' ')
        : undefined;

      const message =
        validationMessage ||
        problem?.detail ||
        problem?.title ||
        getDefaultMessage(error);

      const apiError = new Error(message);

      Object.assign(apiError, {
        status: error.status,
        traceId: problem?.traceId,
        originalError: error,
      });

      return throwError(() => apiError);
    }),
  );

function getDefaultMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No fue posible conectar con la API. Verifica que el backend esté ejecutándose y que el certificado HTTPS sea confiable.';
  }

  switch (error.status) {
    case 400:
      return 'La solicitud contiene datos inválidos.';
    case 401:
      return 'Debes iniciar sesión para realizar esta acción.';
    case 403:
      return 'No tienes permisos para realizar esta acción.';
    case 404:
      return 'El recurso solicitado no fue encontrado.';
    case 409:
      return 'La operación entra en conflicto con el estado actual del recurso.';
    default:
      return 'Ocurrió un error inesperado al comunicarse con el servidor.';
  }
}
