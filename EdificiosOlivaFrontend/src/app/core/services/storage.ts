import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface StorageUploadResult {
  downloadUrl: string;
  fullPath: string;
  fileName: string;
}

export interface StorageDeleteSummary {
  deleted: string[];
  failed: string[];
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/files/images`;

  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;

  uploadImage(
    file: File,
    folder: string,
    onProgress?: (progress: number) => void,
  ): Promise<StorageUploadResult> {
    this.validateImage(file);

    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('folder', folder);

    return new Promise<StorageUploadResult>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('POST', this.endpoint);

      request.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) {
          return;
        }

        onProgress?.(Math.round((event.loaded / event.total) * 100));
      });

      request.addEventListener('load', () => {
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(this.extractErrorMessage(request)));
          return;
        }

        try {
          resolve(JSON.parse(request.responseText) as StorageUploadResult);
        } catch {
          reject(new Error('La API devolvió una respuesta de carga inválida.'));
        }
      });

      request.addEventListener('error', () => {
        reject(new Error('No fue posible conectar con la API de archivos.'));
      });

      request.send(formData);
    });
  }

  async uploadImages(
    files: File[],
    folder: string,
    onFileProgress?: (fileIndex: number, progress: number) => void,
  ): Promise<StorageUploadResult[]> {
    if (files.length === 0) {
      return [];
    }

    return Promise.all(
      files.map((file, index) =>
        this.uploadImage(file, folder, (progress) => {
          onFileProgress?.(index, progress);
        }),
      ),
    );
  }

  async deleteImage(pathOrUrl: string): Promise<void> {
    if (!pathOrUrl.trim()) {
      return;
    }

    const params = new HttpParams().set('path', pathOrUrl);
    await firstValueFrom(this.http.delete<void>(this.endpoint, { params }));
  }

  async deleteImages(pathsOrUrls: string[]): Promise<StorageDeleteSummary> {
    const uniqueValues = [...new Set(pathsOrUrls.filter((value) => value.trim()))];
    const results = await Promise.allSettled(
      uniqueValues.map((value) => this.deleteImage(value)),
    );

    const summary: StorageDeleteSummary = {
      deleted: [],
      failed: [],
    };

    results.forEach((result, index) => {
      const value = uniqueValues[index];

      if (result.status === 'fulfilled') {
        summary.deleted.push(value);
      } else {
        summary.failed.push(value);
      }
    });

    return summary;
  }

  private validateImage(file: File): void {
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('Solo se permiten imágenes JPG, PNG o WEBP.');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new Error('Cada imagen debe pesar 5 MB o menos.');
    }
  }

  private extractErrorMessage(request: XMLHttpRequest): string {
    const fallback = `La carga falló con estado HTTP ${request.status}.`;

    if (!request.responseText) {
      return fallback;
    }

    try {
      const response = JSON.parse(request.responseText) as {
        detail?: string;
        title?: string;
      };
      return response.detail ?? response.title ?? fallback;
    } catch {
      return request.responseText || fallback;
    }
  }
}
