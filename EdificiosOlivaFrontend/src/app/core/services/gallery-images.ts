import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../interfaces/paged-result.interface';
import { GalleryImage } from '../models/gallery-image.model';

export interface GalleryImageRequest {
  title: string;
  category: string;
  url: string;
  publicId?: string | null;
  altText: string;
  sortOrder: number;
  isPublished: boolean;
}

@Injectable({ providedIn: 'root' })
export class GalleryImages {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/gallery`;

  getAll(
    category = '',
    search = '',
    isPublished?: boolean,
  ): Observable<PagedResult<GalleryImage>> {
    let params = new HttpParams().set('page', '1').set('pageSize', '100');

    if (category) params = params.set('category', category);
    if (search.trim()) params = params.set('search', search.trim());
    if (isPublished !== undefined) {
      params = params.set('isPublished', String(isPublished));
    }

    return this.http.get<PagedResult<GalleryImage>>(this.endpoint, { params });
  }

  create(request: GalleryImageRequest): Observable<GalleryImage> {
    return this.http.post<GalleryImage>(this.endpoint, request);
  }

  update(id: string, request: GalleryImageRequest): Observable<void> {
    return this.http.put<void>(`${this.endpoint}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
