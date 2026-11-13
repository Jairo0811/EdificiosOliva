import { expect, test } from '@playwright/test';
import { APARTMENT_ID, confirmation, mockPublicApi } from './fixtures';

test('completes a public booking without pretending that payment was confirmed', async ({ page }) => {
  await mockPublicApi(page);
  let bookingRequests = 0;
  let idempotencyKey = '';
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/public/bookings' && request.method() === 'POST') {
      bookingRequests++;
      idempotencyKey = request.headers()['idempotency-key'] ?? '';
    }
  });

  await page.goto(`/reservar?apartmentId=${APARTMENT_ID}&checkIn=2030-01-10&checkOut=2030-01-13&guests=2`);
  await expect(page.locator('#step-heading')).toHaveText('Tu estadía');
  await expect(page.getByText('Disponible para estas fechas')).toBeVisible();
  await expect(page.locator('select[name="apartmentId"]')).toHaveValue(APARTMENT_ID);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Datos del huésped' })).toBeVisible();
  await page.locator('input[name="fullName"]').fill('Ana Pérez');
  await page.locator('input[name="email"]').fill('ana@example.test');
  await page.locator('input[name="phone"]').fill('8095551234');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Revisa tu reserva' })).toBeVisible();
  await expect(page.getByText('US$270.00').first()).toBeVisible();
  await page.locator('input[name="policiesAccepted"]').check();
  await page.getByRole('button', { name: 'Registrar reserva y continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Pago', exact: true })).toBeVisible();
  await expect(page.getByText(confirmation.confirmationCode)).toBeVisible();
  await expect(page.getByText('El pago en línea no está habilitado en este momento.', { exact: false })).toBeVisible();
  expect(bookingRequests).toBe(1);
  expect(idempotencyKey).toMatch(/^booking-[\w-]{8,100}$/);

  await page.getByRole('button', { name: 'Ver estado de la reserva' }).click();
  await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible();
  await expect(page.getByText('Pago confirmado', { exact: true })).toHaveCount(0);
});

test('forged payment=approved URL cannot mark a pending payment as confirmed', async ({ page }) => {
  await mockPublicApi(page, 1); // Backend reports Pending.
  await page.addInitScript((value) => {
    sessionStorage.setItem('edificiosOliva.pendingBooking', JSON.stringify(value));
  }, confirmation);
  let statusCalls = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/public/payments/status') statusCalls++;
  });
  await page.goto('/reservar?payment=approved&intent=not-authoritative');
  await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible();
  await expect.poll(() => statusCalls).toBeGreaterThan(0);
  await expect(page.getByText('Pago confirmado', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pagar ahora de forma segura' })).toHaveCount(0);
});
