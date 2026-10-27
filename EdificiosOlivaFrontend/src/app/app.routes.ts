import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';



export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'departamentos', loadComponent: () => import('./pages/apartments/apartments').then(m => m.Apartments) },
  { path: 'departamentos/:id', loadComponent: () => import('./pages/apartment-detail/apartment-detail').then(m => m.ApartmentDetail) },
  { path: 'galeria', loadComponent: () => import('./pages/gallery/gallery').then(m => m.Gallery) },
  { path: 'nosotros', loadComponent: () => import('./pages/about/about').then(m => m.About) },
  { path: 'reservar', loadComponent: () => import('./pages/booking/booking').then(m => m.Booking) },
  { path: 'contacto', loadComponent: () => import('./pages/contact/contact').then(m => m.Contact) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'registro', loadComponent: () => import('./pages/register/register').then(m => m.Register) },
  { path: 'politicas', loadComponent: () => import('./pages/policies/policies').then(m => m.Policies) },

  {
    path: 'admin',
    loadComponent: () => import('./layouts/admin-layout/admin-layout').then(m => m.AdminLayout),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/admin/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'apartamentos', loadComponent: () => import('./pages/admin/apartments-admin/apartments-admin').then(m => m.ApartmentsAdmin) },
      { path: 'reservas', loadComponent: () => import('./pages/admin/bookings-admin/bookings-admin').then(m => m.BookingsAdmin) },
      { path: 'clientes', loadComponent: () => import('./pages/admin/customers/customers').then(m => m.Customers) },
      { path: 'pagos', loadComponent: () => import('./pages/admin/payments/payments').then(m => m.Payments) },
      { path: 'intentos-pago', loadComponent: () => import('./pages/admin/payment-intents-admin/payment-intents-admin').then(m => m.PaymentIntentsAdmin) },
      { path: 'operacion', loadComponent: () => import('./pages/admin/operations/operations').then(m => m.Operations) },
      { path: 'galeria', loadComponent: () => import('./pages/admin/gallery-admin/gallery-admin').then(m => m.GalleryAdmin) },
    ],
  },

  { path: '**', redirectTo: '' },
];