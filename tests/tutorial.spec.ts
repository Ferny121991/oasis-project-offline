import { test, expect } from '@playwright/test';

test('tutorial explains searchable icons, locates sections, restores focus and resumes progress', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Abrir mi espacio de trabajo'}).click();
  const guide = page.getByRole('dialog');
  await expect(guide.getByRole('heading',{name:'Conoce tu escritorio'})).toBeVisible();
  await guide.getByRole('button',{name:/Diccionario de iconos/}).click();
  await guide.getByRole('textbox',{name:'Buscar iconos'}).fill('pantalla');
  await guide.getByRole('button',{name:/Ampliar proyector/}).click();
  await expect(guide.getByText(/Ampliar escritorio agranda el escritorio/)).toBeVisible();
  await guide.getByRole('textbox',{name:'Buscar iconos'}).fill('zzzz');
  await expect(guide.getByRole('status')).toContainText('No encontramos');
  await guide.getByRole('button',{name:/02 Prepara el contenido/}).click();
  await guide.getByRole('button',{name:'Ubicar esta sección'}).click();
  await expect(guide.getByRole('heading',{name:'Preparar',exact:true})).toBeVisible();
  await guide.getByRole('button',{name:'Volver a la guía'}).click();
  await guide.getByRole('button',{name:'Cerrar tutorial'}).click();
  await expect(guide).toBeHidden();
  await page.getByRole('button',{name:'Ver Tutorial',exact:true}).click();
  await expect(guide.getByRole('heading',{name:'Prepara el contenido'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).toBeHidden();
  await expect(page.getByRole('button',{name:'Ver Tutorial',exact:true})).toBeFocused();
});

test('practice controls never modify live presentation or create projector windows', async ({page,context}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Abrir mi espacio de trabajo'}).click();
  const guide = page.getByRole('dialog');
  await guide.getByRole('button',{name:/07 Ensaya los controles/}).click();
  const simulator = guide.getByRole('region',{name:'Simulador de proyección'});
  for (const name of ['Negro','Sin texto','Sin fondo','Logo']) {
    const button = simulator.getByRole('button',{name,exact:true});
    await button.click(); await expect(button).toHaveAttribute('aria-pressed','true');
    await button.click(); await expect(button).toHaveAttribute('aria-pressed','false');
  }
  await simulator.getByRole('button',{name:'Negro',exact:true}).click();
  await expect(page.getByTestId('tutorial-preview')).toHaveAttribute('aria-label','Pantalla negra de práctica');
  await simulator.getByRole('button',{name:'Reiniciar práctica'}).click();
  await expect(page.getByTestId('tutorial-preview')).toHaveAttribute('aria-label','Texto y fondo de práctica');
  await page.keyboard.press('p');
  expect(context.pages()).toHaveLength(1);
  await guide.getByRole('button',{name:'Cerrar tutorial'}).click();
  await expect(page.getByTitle('Limpia texto y fondo (Pantalla a negro) [F9 o B]')).not.toHaveClass(/bg-red-600/);
});

test('Spanish narration plays, pauses, shows transcript and remains available offline', async ({page,context}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Abrir mi espacio de trabajo'}).click();
  const guide=page.getByRole('dialog');
  expect(await guide.locator('audio').evaluate((el: HTMLAudioElement)=>el.paused)).toBe(true);
  await guide.getByRole('button',{name:'Escuchar narración en español'}).click();
  await expect.poll(()=>guide.locator('audio').evaluate((el: HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0);
  await guide.getByRole('button',{name:'Pausar narración'}).click();
  expect(await guide.locator('audio').evaluate((el: HTMLAudioElement)=>el.paused)).toBe(true);
  await guide.getByRole('button',{name:'Texto',exact:true}).click();
  await expect(guide.locator('.guide-transcript')).toContainText('Bienvenido a Flujo Eclesial');
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('dialog').getByRole('button',{name:'Escuchar narración en español'}).click();
  await expect.poll(()=>page.locator('.guide-audio audio').evaluate((el: HTMLAudioElement)=>el.currentTime)).toBeGreaterThan(0);
  const audioElement = await page.locator('.guide-audio audio').elementHandle();
  await page.getByRole('button',{name:'Cerrar tutorial'}).click();
  expect(await audioElement!.evaluate((el: HTMLAudioElement)=>el.paused)).toBe(true);
});

test('tutorial fits small mobile screens and contains keyboard focus',async ({page})=>{
  await page.setViewportSize({width:360,height:640});
  await page.goto('/');
  await page.getByRole('button',{name:'Abrir mi espacio de trabajo'}).click();
  const guide=page.getByRole('dialog');
  const box=await guide.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(360);
  expect(box!.y+box!.height).toBeLessThanOrEqual(640);
  await expect(guide.getByRole('button',{name:'Cerrar tutorial'})).toBeInViewport();
  await expect(guide.getByRole('button',{name:'Siguiente'})).toBeInViewport();
  await guide.getByRole('button',{name:'Siguiente'}).focus();
  await page.keyboard.press('Tab');
  await expect(guide.getByRole('button',{name:'Cerrar tutorial'})).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(guide.getByRole('button',{name:'Siguiente'})).toBeFocused();
  for(let i=0;i<7;i++) await guide.getByRole('button',{name:'Siguiente'}).click();
  await guide.getByRole('button',{name:'Terminar tutorial'}).click();
  await expect(guide).toBeHidden();
});
