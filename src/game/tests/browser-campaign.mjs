import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
await mkdir('previews',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 localStorage.setItem('odyssey-settings',JSON.stringify({voice:false,quality:false,muted:true}));
 const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>cb(t*8));
});
try{
 await page.goto('http://127.0.0.1:4174');await page.locator('#loading').waitFor({state:'hidden'});
 await page.locator('#design-button').click();await expect(page.locator('#launch-button')).toBeDisabled();
 for(let i=0;i<9;i++){await page.locator(`[data-slot="${i}"]`).click();await page.locator(`[data-part="${[0,1,1,1,0,0,0,0,0][i]}"]`).click();}
 await expect(page.locator('#launch-button')).toBeEnabled({timeout:15000});await page.screenshot({path:'previews/hangar-complete.png'});
 await page.locator('[data-hangar="explode"]').click();await page.waitForTimeout(500);await page.screenshot({path:'previews/hangar-exploded.png'});
 await page.locator('#launch-button').click();await page.locator('[data-plan="reserve"]').click();await page.screenshot({path:'previews/mission-planning.png'});await page.locator('#commit-plan').click();
 const deadline=Date.now()+300000,seen=new Set();let completed=false;
 while(Date.now()<deadline){
  if(await page.locator('#begin-stage').isVisible()){
   const chapter=await page.locator('#flight-chapter').textContent();console.log('PLAYING',chapter);seen.add(chapter);await page.locator('#begin-stage').click();
   if((await page.locator('#assist-button').innerText()).includes('OFF'))await page.keyboard.press('g');
   await page.keyboard.press('Digit2');await page.keyboard.up('e');await page.keyboard.down('e');
  }
  if(await page.locator('#repair-confirm').isVisible()){
   await page.screenshot({path:'previews/power-failure.png'});await page.locator('[data-circuit="2"]').click();await expect(page.locator('#repair-confirm')).toBeDisabled();
   for(let i=0;i<3;i++)await page.locator(`[data-circuit="${i}"]`).click();await page.locator('#repair-confirm').click();await page.keyboard.down('e');
  }
  if(await page.locator('#ack-clue').isVisible()){await page.locator('#ack-clue').click();await page.keyboard.up('e');await page.keyboard.down('e');}
  if(await page.locator('#survey-confirm').isVisible()){
   await page.locator('#band-tuner').focus();await page.keyboard.press('Home');for(let i=0;i<40;i++)await page.keyboard.press('ArrowRight');await page.locator('#acquire-band').click();
   await page.locator('#band-tuner').focus();for(let i=0;i<20;i++)await page.keyboard.press('ArrowRight');await page.locator('#acquire-band').click();
   await page.locator('[data-site="boundary"]').click();await expect(page.locator('#survey-confirm')).toBeEnabled();await page.screenshot({path:'previews/mineral-investigation.png'});await page.locator('#survey-confirm').click();
  }
  if(await page.locator('#analysis-confirm').isVisible()){
   await page.locator('[data-claim="life"]').click();await expect(page.locator('#operation-feedback')).toContainText('cannot establish');await page.locator('[data-claim="water"]').click();await page.screenshot({path:'previews/evidence-review.png'});await page.locator('#analysis-confirm').click();
  }
  if(!(await page.locator('#modal-layer').isVisible())&&await page.locator('#rover-depart').isVisible()&&await page.locator('#rover-depart').isEnabled()&&await page.locator('#objective-fraction').textContent()==='03 / 03'){await page.locator('#rover-depart').click();}
  if(await page.locator('[data-effect]').first().isVisible()){await page.locator('[data-effect]').first().click();await page.keyboard.up('e');await page.keyboard.down('e');}
  if(await page.locator('#export-button').isVisible()){completed=true;await expect(page.locator('.engineering-debrief')).toContainText('A DEFENSIBLE DISCOVERY');await page.screenshot({path:'previews/campaign-debrief.png'});console.log('COMPLETE',await page.locator('.debrief-stats').innerText());break;}
  if(await page.locator('#retry-button').isVisible())throw new Error('Mission failed: '+await page.locator('#dialog-title').textContent());
  await page.waitForTimeout(250);
 }
 expect(completed).toBe(true);expect(seen.size).toBe(6);expect(errors).toEqual([]);console.log('CAMPAIGN_BROWSER_OK',JSON.stringify({chapters:seen.size,errors}));
}catch(e){await page.screenshot({path:'previews/campaign-error.png'});console.error('PAGE_ERRORS',errors);throw e;}finally{await browser.close();}
