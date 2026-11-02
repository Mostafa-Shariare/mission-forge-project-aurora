export async function assemble(page,choices=[0,1,1,1,0,0,0,0,0]){
  for(let i=0;i<9;i++){
    await page.locator(`[data-slot="${i}"]`).click();
    await page.locator(`[data-part="${choices[i]??0}"]`).click();
  }
  await page.waitForTimeout(1500);
}
export async function launch(page){
  await page.locator('#launch-button').click();
  if(await page.locator('#commit-plan').isVisible())await page.locator('#commit-plan').click();
}
