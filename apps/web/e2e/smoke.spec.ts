import { expect, test } from '@playwright/test';

test('renders the public home route with product positioning and core CTAs', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', {
      name: /Agenda, pagos, staff y crecimiento/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Software para barberias/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Marketplace de barberias/i }).first()).toBeVisible();
  await page.screenshot({
    path: 'test-results/marketplace-home.png',
    fullPage: true,
  });
});

test('filters the marketplace list down to a matching shop', async ({ page }) => {
  await page.goto('/shops', { waitUntil: 'domcontentloaded' });

  await page.getByRole('searchbox').first().fill('Pocitos');
  await page.getByRole('button', { name: 'Buscar' }).first().click();

  await expect(page.getByRole('heading', { name: 'Navaja Pocitos' }).first()).toBeVisible();
  await expect(
    page.locator('a[href="/book/navaja-pocitos"]').first(),
  ).toBeVisible();
});

test('renders the booking marketplace hub with deterministic mock data', async ({ page }) => {
  await page.goto('/book', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', {
      name: /Selecciona una barberia y entra a su agenda/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Agendar aqui' }).first()).toHaveAttribute(
    'href',
    '/book/navaja-centro',
  );
});

test('renders the marketplace jobs route with deterministic mock data', async ({ page }) => {
  await page.goto('/jobs', { waitUntil: 'domcontentloaded' });

  await expect(
    page.getByRole('heading', {
      name: /Postulate a una barberia o deja tu CV en la bolsa general/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Navaja Centro' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enviar CV directo' }).first()).toHaveAttribute(
    'href',
    '/jobs/navaja-centro',
  );
});

test('renders login mode transitions without depending on live auth', async ({ page }) => {
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();
  await page.getByTestId('auth-mode-recover').click();
  await expect(page.getByRole('heading', { name: 'Recuperar acceso' })).toBeVisible();
});

test('shows the empty search state for unmatched marketplace queries', async ({ page }) => {
  await page.goto('/shops', { waitUntil: 'domcontentloaded' });

  await page.getByRole('searchbox').first().fill('zzzz barberia inexistente');
  await page.getByRole('button', { name: 'Buscar' }).first().click();

  await expect(page.getByText(/No encontramos barberias (con ese nombre|para esa busqueda)/i).first()).toBeVisible();
});
