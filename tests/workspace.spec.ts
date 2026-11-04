import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

async function enter(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir mi espacio de trabajo' }).click();
  await page.getByTitle('Saltar tutorial').click();
  await expect(page.getByTitle('Saltar tutorial')).toBeHidden();
}

async function createText(page: Page) {
  await page.getByText('Doble clic para escribir texto...').dblclick();
  await page.getByPlaceholder('Escribe tu texto aquí...').fill('Bienvenidos a casa\n\nCelebramos juntos');
  await page.getByRole('button', { name: /agregar a lista/i }).click();
  await expect(page.getByText('Texto Manual', { exact: true }).first()).toBeVisible();
  await page.getByTitle('Guardar', { exact: true }).click();
}

test('project, manual content, keyboard editing and persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await enter(page);
  await page.getByRole('button', { name: /Sin Proyecto/ }).click();
  await page.getByRole('button', { name: 'Crear Nuevo Proyecto' }).click();
  await page.getByPlaceholder('Nombre del proyecto (ej: Domingo 19 Enero)').fill('Domingo de prueba');
  await page.getByRole('button', { name: 'Crear Proyecto', exact: true }).click();
  await createText(page);
  await page.reload();
  await expect(page.locator('.workspace-project')).toContainText('Domingo de prueba');
  await expect(page.getByText('Texto Manual', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('P opens one projector; real fullscreen survives sync and PDF/PPTX import', async ({ page, context }) => {
  await enter(page);
  await createText(page);
  await page.getByTitle('Transmitir en vivo').first().click();
  await page.getByRole('heading', { name: 'Organizar', exact: true }).click();
  const popup = page.waitForEvent('popup');
  await page.keyboard.press('p');
  const projector = await popup;
  await expect(projector.getByRole('button', { name: 'Pantalla completa' })).toBeVisible();
  await projector.keyboard.press('p');
  await expect.poll(() => projector.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await expect(projector.getByRole('button', { name: 'Pantalla completa' })).toBeHidden();
  await expect(projector.locator('body')).toContainText('Bienvenidos a casa');
  await projector.keyboard.press('p');
  expect(await projector.evaluate(() => !!document.fullscreenElement)).toBe(true);

  for (const extension of ['pdf', 'pptx']) {
    await page.bringToFront();
    const chooser = page.waitForEvent('filechooser');
    await page.getByTitle('Agregar PDF o PowerPoint').click();
    await (await chooser).setFiles(path.resolve(`tests/fixtures/servicio.${extension}`));
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('flujo_playlist_v2') || '[]').length), {timeout: 25000}).toBe(extension === 'pdf' ? 2 : 3);
    expect(await projector.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await expect(projector.locator('body')).toContainText('Bienvenidos a casa');
  }
  await page.getByRole('button', { name: 'Cerrar aviso' }).click();
  await page.getByRole('heading', { name: 'Organizar', exact: true }).click();
  await page.keyboard.press('p');
  expect(context.pages()).toHaveLength(2);
  await projector.evaluate(() => document.exitFullscreen());
  await expect(projector.getByRole('button', { name: 'Pantalla completa' })).toBeVisible();
  await projector.getByRole('button', { name: 'Pantalla completa' }).click();
  await expect.poll(() => projector.evaluate(() => !!document.fullscreenElement)).toBe(true);
});

test('offline reload retains local content, styles and Bible lookup', async ({ page, context }) => {
  await enter(page);
  await createText(page);
  await expect(page.getByText('Disponible sin conexión', { exact: true })).toBeVisible({ timeout: 30000 });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.workspace-header')).toBeVisible();
  await expect(page.getByText('Sin conexión', { exact: true })).toBeVisible();
  await expect(page.getByText('Texto Manual', { exact: true }).first()).toBeVisible();
  expect(await page.locator('.workspace-header').evaluate(el => getComputedStyle(el).height)).toBe('78px');
  await page.getByRole('button', { name: 'Biblia', exact: true }).click();
  await page.getByPlaceholder('Ej: Juan 3:16').fill('Juan 3:16');
  await page.getByPlaceholder('Ej: Juan 3:16').press('Escape');
  await page.getByRole('button', { name: /agregar a lista/i }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('flujo_playlist_v2') || '[]').length)).toBe(2);
});

test('workspace fullscreen and recovery after a picker interruption', async ({ page }) => {
  await enter(page);
  await page.getByRole('button', { name: 'Ampliar escritorio', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  const chooser = page.waitForEvent('filechooser');
  await page.getByTitle('Agregar PDF o PowerPoint').click();
  const file = await chooser;
  // Simulate browsers/OS configurations that exit fullscreen while a native picker is open.
  await page.evaluate(() => document.exitFullscreen());
  await file.setFiles(path.resolve('tests/fixtures/servicio.pdf'));
  await expect.poll(async () => (await page.evaluate(() => !!document.fullscreenElement)) || (await page.getByRole('button', { name: 'Volver a pantalla completa' }).isVisible())).toBe(true);
  if (!(await page.evaluate(() => !!document.fullscreenElement))) {
    await page.getByRole('button', { name: 'Volver a pantalla completa' }).click();
  }
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
});

test('mobile navigation and tutorial stay inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir mi espacio de trabajo' }).click();
  const skip = page.getByTitle('Saltar tutorial');
  await expect(skip).toBeVisible();
  const box = await skip.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await skip.click();
  await expect(skip).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: /Proyectar/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Proyección', exact: true }).click();
  await expect(page.locator('#live-preview-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Programa', exact: true }).last().click();
  await expect(page.locator('#playlist-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Preparar', exact: true }).click();
  await expect(page.locator('#control-panel')).toBeVisible();
});
