import {chromium,expect} from '@playwright/test';
import {Simulation} from '../src/simulation.js';
import {makeCampaign} from '../src/campaign.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[];const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('odyssey-settings',JSON.stringify({voice:false,quality:false,muted:true})));
try{
 await page.goto('http://127.0.0.1:4174');await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#design-button').click();
 await expect(page.locator('[data-hangar="previous-section"]')).toBeDisabled();
 for(let i=0;i<8;i++)await page.locator('[data-hangar="next-section"]').click();
 await expect(page.locator('[data-slot="8"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-hangar="next-section"]')).toBeDisabled();
 expect(await page.locator('.hangar-slots').evaluate(el=>el.scrollLeft>0)).toBe(true);
 expect(await page.locator('.hangar-slots').evaluate(el=>new Set([...el.children].map(b=>b.offsetTop)).size)).toBe(1);
 await page.locator('[data-slot="8"]').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-slot="7"]')).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<9;i++){await page.keyboard.press('Digit'+(i+1));await page.locator(`[data-part="${[0,1,1,1,0,0,0,0,0][i]}"]`).focus();await page.keyboard.press('Enter');}
 await expect(page.locator('#launch-button')).toBeEnabled({timeout:12000});
 const craft=await page.locator('.hangar-stage').boundingBox(),part=await page.locator('[data-part="0"]').boundingBox(),footer=await page.locator('.hangar-footer').boundingBox();
 expect(craft.height).toBeGreaterThanOrEqual(160);expect(craft.y+craft.height).toBeLessThan(part.y);expect(part.y).toBeLessThan(footer.y);
 await page.locator('.hangar-catalog').evaluate(el=>el.scrollTop=el.scrollHeight);expect((await page.locator('.hangar-stage').boundingBox()).y).toBe(craft.y);await page.locator('.hangar-catalog').evaluate(el=>el.scrollTop=0);
 await page.locator('[data-hangar="reset"]').click();await page.locator('.hangar-layout').evaluate(el=>el.scrollTop=0);await page.screenshot({path:'previews/assembly-nine-systems.png'});
 await page.keyboard.press('Digit1');await page.locator('[data-part="1"]').click();await expect(page.locator('#launch-button')).toBeDisabled();await page.waitForTimeout(1600);await expect(page.locator('.assembly-checklist')).toContainText('Power deficit');
 await page.locator('[data-part="0"]').click();await page.waitForTimeout(1600);await expect(page.locator('#launch-button')).toBeEnabled();
 await page.locator('[data-hangar="remove"]').click();await expect(page.locator('#launch-button')).toBeDisabled();await expect(page.locator('#socket-0')).toHaveText('NEXT: SELECT A MODULE');await page.locator('[data-part="0"]').click();await page.waitForTimeout(1600);
 await page.keyboard.press('Escape');await page.locator('#design-button').click();await expect(page.locator('#launch-button')).toBeDisabled();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'previews/assembly-mobile.png'});
 await page.locator('[data-hangar="engineering"]').click();await expect(page.locator('.hangar-readiness')).toBeVisible();await page.locator('[data-hangar="engineering"]').click();await expect(page.locator('.hangar-readiness')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(let i=0;i<9;i++){await page.locator(`[data-slot="${i}"]`).click();await page.locator(`[data-part="${[0,1,1,1,0,0,0,0,0][i]}"]`).click();}
 await expect(page.locator('#launch-button')).toBeEnabled({timeout:12000});await page.locator('#launch-button').click();await page.locator('[data-plan="rapid"]').click();await page.locator('#commit-plan').click();await page.locator('#begin-stage').click();await page.keyboard.press('w');await page.keyboard.press('Escape');await expect(page.locator('#resume-flight')).toBeVisible();
 const checkpoint=new Simulation({campaign:makeCampaign('reserve')});checkpoint.campaign.repair='isolate';checkpoint.campaign.completed.repair=true;checkpoint.campaign.site='ridge';checkpoint.campaign.completed.survey=true;checkpoint.stage=4;checkpoint.setupStage();
 await page.evaluate(saved=>localStorage.setItem('odyssey-checkpoint',JSON.stringify(saved)),checkpoint.serialize());await page.reload();await page.locator('#loading').waitFor({state:'hidden'});await page.locator('#resume-button').click();await expect(page.locator('#flight-chapter')).toContainText('DISCOVERY');await expect(page.locator('#objective-list')).toContainText('SALT RIDGE');
 expect(errors).toEqual([]);console.log('ASSEMBLY_KEYBOARD_MOBILE_RESTORE_OK');
}finally{await browser.close();}
