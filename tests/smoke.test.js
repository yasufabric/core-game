import { test, expect } from 'playwright/test';

test.describe('CORE smoke', () => {
  // Test 1: tap-to-reposition must not set core to NaN
  // (caught the bug where `c` resolved to window.c = canvas element)
  test('core position stays finite after canvas tap', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/');
    await page.click('#start');
    await page.waitForFunction(() => window.__CORE?.()?.running === true);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    // reposLastAt starts at -reposCooldown so CD is ready from t=0
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await page.waitForTimeout(1000); // let slide complete

    const core = await page.evaluate(() => {
      const G = window.__CORE?.();
      return G ? { x: G.core.x, y: G.core.y } : null;
    });

    expect(errors).toHaveLength(0);
    expect(core).not.toBeNull();
    expect(Number.isFinite(core.x)).toBe(true);
    expect(Number.isFinite(core.y)).toBe(true);
  });

  // Test 2: passive skills must not produce skill bar buttons
  // (caught the bug where thorns/overload appeared as tappable buttons with NaN CD)
  test('passive skills produce no skill bar buttons', async ({ page }) => {
    await page.goto('/');
    await page.click('#start');
    await page.waitForFunction(() => window.__CORE?.()?.running === true);

    await page.evaluate(() => {
      const G = window.__CORE?.();
      if (!G) return;
      if (!G.unlocked.includes('thorns'))   G.unlocked.push('thorns');
      if (!G.unlocked.includes('overload')) G.unlocked.push('overload');
      window.__renderSkillBar?.();
    });
    await page.waitForTimeout(50);

    await expect(page.locator('#skills .skill[data-id="thorns"]')).toHaveCount(0);
    await expect(page.locator('#skills .skill[data-id="overload"]')).toHaveCount(0);
  });

  // Test 3: no JS exceptions during first 3s of play
  test('no JS errors during 3s of play', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/');
    await page.click('#start');
    await page.waitForTimeout(3000);

    expect(errors, `JS errors: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
