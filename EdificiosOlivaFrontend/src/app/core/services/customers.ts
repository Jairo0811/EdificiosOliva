import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PagedResult } from '../interfaces/paged-result.interface';
import { Customer } from '../models/customer.model';

interface ApiCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

interface CustomerRequest {
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class Customers {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/customers`;

  getAll(search = '', status: 'Todos' | 'Activo' | 'Inactivo' = 'Todos'): Observable<Customer[]> {
    let params = new HttpParams().set('page', '1').set('pageSize', '100');

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    if (status !== 'Todos') {
      params = params.set('isActive', String(status === 'Activo'));
    }

    return this.http
      .get<PagedResult<ApiCustomer>>(this.endpoint, { params })
      .pipe(map((result) => result.items.map((customer) => this.toViewModel(customer))));
  }

  create(customer: Omit<Customer, 'id' | 'createdAt' | 'bookings'>): Observable<Customer> {
    return this.http
      .post<ApiCustomer>(this.endpoint, this.toRequest(customer))
      .pipe(map((created) => this.toViewModel(created)));
  }

  update(id: string, customer: Omit<Customer, 'id' | 'createdAt' | 'bookings'>): Observable<void> {
    return this.http.put<void>(`${this.endpoint}/${id}`, this.toRequest(customer));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }

  private toRequest(customer: Omit<Customer, 'id' | 'createdAt' | 'bookings'>): CustomerRequest {
    return {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      isActive: customer.status === 'Activo',
    };
  }

  private toViewModel(customer: ApiCustomer): Customer {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      bookings: 0,
      status: customer.isActive ? 'Activo' : 'Inactivo',
      createdAt: new Date(customer.createdAtUtc),
    };
  }
}
