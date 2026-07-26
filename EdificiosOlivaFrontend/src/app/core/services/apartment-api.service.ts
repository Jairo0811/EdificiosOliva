import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApartmentQuery } from '../interfaces/apartment-query.interface';
import { PagedResult } from '../interfaces/paged-result.interface';
import { ApiApartment } from '../models/apartment-api.model';
import {
  CreateApartmentRequest,
  UpdateApartmentRequest,
} from '../models/apartment-request.model';

@Injectable({
  providedIn: 'root',
})
export class ApartmentApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/apartments`;

  getAll(
    query: ApartmentQuery = {},
  ): Observable<PagedResult<ApiApartment>> {
    let params = new HttpParams();

    if (query.page !== undefined) {
      params = params.set('page', query.page.toString());
    }

    if (query.pageSize !== undefined) {
      params = params.set('pageSize', query.pageSize.toString());
    }

    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }

    if (query.status !== undefined) {
      params = params.set('status', query.status.toString());
    }

    if (query.minimumPrice !== undefined) {
      params = params.set(
        'minimumPrice',
        query.minimumPrice.toString(),
      );
    }

    if (query.maximumPrice !== undefined) {
      params = params.set(
        'maximumPrice',
        query.maximumPrice.toString(),
      );
    }

    if (query.minimumGuestCapacity !== undefined) {
      params = params.set(
        'minimumGuestCapacity',
        query.minimumGuestCapacity.toString(),
      );
    }

    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }

    if (query.descending !== undefined) {
      params = params.set(
        'descending',
        query.descending.toString(),
      );
    }

    return this.http.get<PagedResult<ApiApartment>>(
      this.endpoint,
      { params },
    );
  }

  getById(id: string): Observable<ApiApartment> {
    return this.http.get<ApiApartment>(
      `${this.endpoint}/${id}`,
    );
  }

  create(
    request: CreateApartmentRequest,
  ): Observable<ApiApartment> {
    return this.http.post<ApiApartment>(
      this.endpoint,
      request,
    );
  }

  update(
    id: string,
    request: UpdateApartmentRequest,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.endpoint}/${id}`,
      request,
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.endpoint}/${id}`,
    );
  }
}