import {chromium,expect} from '@playwright/test';
import {Simulation} from '../src/simulation.js';
import {makeCampaign} from '../src/campaign.js';

const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const sim=new Simulation({campaign:makeCampaign('reserve')});sim.stage=2;sim.setupStage();
await page.addInitScript(checkpoint=>{
  localStorage.setItem('odyssey-checkpoint',JSON.stringify(checkpoint));
  localStorage.setItem('odyssey-settings',JSON.stringify({voice:false,quality:false,muted:true}));
  const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>cb(t*8));
},sim.serialize());
try{
  await page.goto('http://127.0.0.1:4174');await page.locator('#loading').waitFor({state:'hidden'});
  await page.locator('#resume-button').click();await page.locator('#begin-stage').click();await page.keyboard.press('g');
  for(let i=0;i<3;i++){
    await expect.poll(async()=>parseInt(await page.locator('#range-value').innerText()),{timeout:30000}).toBeLessThan(100);
    await page.keyboard.press('e');
    await expect(page.locator('#ack-clue')).toBeVisible({timeout:30000});await page.locator('#ack-clue').click();
  }
  await expect(page.locator('#survey-confirm')).toBeDisabled();
  await page.locator('#band-tuner').focus();await page.keyboard.press('Home');await expect(page.locator('#band-tuner')).toHaveValue('1.8');
  await page.keyboard.press('ArrowRight');await expect(page.locator('#band-tuner')).toHaveValue('1.81');
  for(let i=0;i<39;i++)await page.keyboard.press('ArrowRight');await expect(page.locator('#band-tuner')).toHaveValue('2.2');
  await page.locator('[data-tune="2.20"]').click();await expect(page.locator('#band-value')).toHaveText('2.20 μm');await page.locator('#acquire-band').click();
  await expect(page.locator('[data-tune="2.20"]')).toHaveClass(/acquired/);await expect(page.locator('#survey-confirm')).toBeDisabled();
  await page.locator('[data-tune="2.40"]').click();await page.locator('#acquire-band').click();await page.locator('[data-site="basin"]').click();
  await expect(page.locator('#survey-confirm')).toBeEnabled();await page.locator('#survey-confirm').click();await expect(page.locator('#begin-stage')).toBeVisible();
  expect(errors).toEqual([]);console.log('SINGLE_PRESS_INTERACTION_AND_GUIDED_SURVEY_OK');
}finally{await browser.close();}
