import {chromium,expect} from '@playwright/test';
import {DEFAULT_LOADOUT,designStats} from '../src/data.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('odyssey-settings',JSON.stringify({voice:false,quality:false,muted:true})));
try{
 await page.goto('http://127.0.0.1:4174');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('[data-destination="4"]').click();await page.locator('#design-button').click();await page.locator('[data-slot="1"]').click();
 await expect(page.locator('[data-part="0"]')).toContainText('0.67 kW');await page.locator('[data-part="0"]').click();
 const solar=[...DEFAULT_LOADOUT];solar[1]=0;expect(Number(await page.locator('[data-part="0"]').getAttribute('data-margin'))).toBeCloseTo(designStats(solar,'jupiter').powerMargin,10);
 await page.screenshot({path:'previews/component-power-comparison.png'});
 await page.locator('[data-hangar="suggested"]').click();await expect(page.locator('#launch-button')).toBeEnabled({timeout:15000});await expect(page.locator('.assembly-checklist')).toContainText('9/9');
 await page.locator('#launch-button').click();await page.locator('#begin-stage').click();
 await expect(page.locator('.flight-center-bottom #mission-guidance')).toHaveCount(0);
 await expect(page.locator('.objective-panel #mission-guidance')).toHaveCount(1);
 expect(await page.locator('#mission-guidance').evaluate(el=>el.open)).toBe(false);
 await expect(page.locator('#pilot-practice')).toBeHidden();
 await page.locator('#mission-guidance summary').click();await expect(page.locator('#pilot-practice')).toBeVisible();
 await page.keyboard.down('w');await page.waitForTimeout(1100);await page.keyboard.up('w');await expect(page.locator('#practice-title')).toContainText('2/3');
 await page.keyboard.down('s');await page.waitForTimeout(700);await page.keyboard.up('s');await expect(page.locator('#practice-title')).toContainText('3/3');
 await page.keyboard.down('a');await page.waitForTimeout(700);await page.keyboard.up('a');await expect(page.locator('#pilot-practice')).toBeHidden();
 await expect(page.locator('#guidance-detail')).toContainText('E is not required');
 await page.locator('#mission-guidance summary').click();await page.screenshot({path:'previews/mission-guidance.png'});
 await page.keyboard.press('h');await page.locator('#replay-practice').click();await expect(page.locator('#pilot-practice')).toBeVisible();await page.locator('#skip-practice').click();await expect(page.locator('#pilot-practice')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('odyssey-coach-complete')))).toBe(true);expect(errors).toEqual([]);console.log('COMPONENT_POWER_ALIGNMENT_SUGGESTED_BUILD_AND_PRACTICE_OK');
}finally{await browser.close();}
