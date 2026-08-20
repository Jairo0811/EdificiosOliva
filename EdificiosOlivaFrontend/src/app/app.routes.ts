import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';

import { Home } from './pages/home/home';
import { Apartments } from './pages/apartments/apartments';
import { ApartmentDetail } from './pages/apartment-detail/apartment-detail';
import { Contact } from './pages/contact/contact';
import { Gallery } from './pages/gallery/gallery';
import { About } from './pages/about/about';
import { Booking } from './pages/booking/booking';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';

import { AdminLayout } from './layouts/admin-layout/admin-layout';
import { Dashboard } from './pages/admin/dashboard/dashboard';
import { ApartmentsAdmin } from './pages/admin/apartments-admin/apartments-admin';
import { BookingsAdmin } from './pages/admin/bookings-admin/bookings-admin';
import { Customers } from './pages/admin/customers/customers';
import { Payments } from './pages/admin/payments/payments';
import { GalleryAdmin } from './pages/admin/gallery-admin/gallery-admin';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'departamentos', component: Apartments },
  { path: 'departamentos/:id', component: ApartmentDetail },
  { path: 'galeria', component: Gallery },
  { path: 'nosotros', component: About },
  { path: 'reservar', component: Booking },
  { path: 'contacto', component: Contact },
  { path: 'login', component: Login },
  { path: 'registro', component: Register },

  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', component: Dashboard },
      { path: 'apartamentos', component: ApartmentsAdmin },
      { path: 'reservas', component: BookingsAdmin },
      { path: 'clientes', component: Customers },
      { path: 'pagos', component: Payments },
      { path: 'galeria', component: GalleryAdmin },
    ],
  },

  { path: '**', redirectTo: '' },
];
