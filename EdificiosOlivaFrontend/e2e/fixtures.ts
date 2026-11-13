import type { Page } from '@playwright/test';

export const APARTMENT_ID = '11111111-1111-4111-8111-111111111111';
export const RESERVATION_ID = '22222222-2222-4222-8222-222222222222';

export const apartment = {
  id: APARTMENT_ID,
  name: 'Apartamento Vista Mar',
  description: 'Apartamento familiar de pruebas de contrato.',
  pricePerNight: 90,
  guestCapacity: 4,
  bedrooms: 2,
  bathrooms: 1,
  location: 'Bávaro, Punta Cana',
  status: 1,
  images: [],
  createdAtUtc: '2026-11-01T00:00:00Z',
  updatedAtUtc: null,
};

export const confirmation = {
  reservationId: RESERVATION_ID,
  confirmationCode: 'EO-E2E12345',
  capabilityToken: 'A'.repeat(64),
  customerName: 'Ana Pérez',
  email: 'ana@example.test',
  apartmentId: APARTMENT_ID,
  apartmentName: apartment.name,
  checkInDate: '2030-01-10',
  checkOutDate: '2030-01-13',
  guestCount: 2,
  nights: 3,
  nightlyRate: 90,
  totalAmount: 270,
  status: 1,
};

export async function mockPublicApi(page: Page, paymentState = 0) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let response: unknown;
    if (path === '/api/apartments') {
      response = { items: [apartment], page: 1, pageSize: 100, totalItems: 1,
        totalPages: 1, hasPreviousPage: false, hasNextPage: false };
    } else if (path === `/api/apartments/${APARTMENT_ID}`) {
      response = apartment;
    } else if (path === '/api/gallery') {
      response = { items: [], page: 1, pageSize: 100, totalItems: 0,
        totalPages: 0, hasPreviousPage: false, hasNextPage: false };
    } else if (path === '/api/public/bookings/availability') {
      response = { apartmentId: APARTMENT_ID, apartmentName: apartment.name,
        available: true, nights: 3, nightlyRate: 90, totalAmount: 270 };
    } else if (path === '/api/public/bookings' && request.method() === 'POST') {
      response = confirmation;
    } else if (path === '/api/public/payments/providers') {
      response = []; // AZUL deliberately unavailable in this isolated test.
    } else if (path === '/api/public/payments/status') {
      response = { reservationId: RESERVATION_ID, confirmationCode: confirmation.confirmationCode,
        reservationStatus: 1, paymentState, amount: 270, currency: 'USD',
        checkedAtUtc: '2026-11-13T00:00:00Z' };
    } else {
      await route.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ title: 'Not found in isolated E2E mock' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(response) });
  });
}
