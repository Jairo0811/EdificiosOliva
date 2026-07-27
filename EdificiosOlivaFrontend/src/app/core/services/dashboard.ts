import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface DashboardReservationItem {
  id: string;
  customerName: string;
  apartmentName: string;
  checkInDate: string;
  checkOutDate: string;
  status: number;
}

export interface DashboardSummary {
  totalApartments: number;
  availableApartments: number;
  totalReservations: number;
  reservationsThisMonth: number;
  activeCustomers: number;
  totalRevenue: number;
  currentOccupancyRate: number;
  nextCheckInDate?: string | null;
  recentReservations: DashboardReservationItem[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/dashboard`;

  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(this.endpoint);
  }
}
