import {expect,test} from '@playwright/test';
import {buildRouted,finishOperation} from '../helpers/ui';
test('keeps another tab history alive and cleans abandoned journals after it closes',async({page,context})=>{
 test.setTimeout(60000);await page.goto('/');await buildRouted(page);await page.getByLabel('Destination IPv4',{exact:true}).fill('192.168.2.10');await page.getByRole('button',{name:'Start ping',exact:true}).click();expect(await finishOperation(page)).toBe('completed');
 const count=()=>page.evaluate(()=>new Promise<number>((resolve,reject)=>{const req=indexedDB.open('uniprnetwork-v1');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,read=db.transaction('journalCheckpoints').objectStore('journalCheckpoints').count();read.onsuccess=()=>{resolve(read.result);db.close();};};}));
 expect(await count()).toBeGreaterThan(0);const other=await context.newPage();await other.goto('/');await expect(other.locator('[data-scene-ready="true"]')).toBeVisible();await expect.poll(count).toBeGreaterThan(0);
 await page.getByRole('button',{name:'Previous step',exact:true}).click();await expect(page.getByRole('button',{name:'Next step',exact:true})).toBeEnabled();await page.close();
 await other.reload();await expect.poll(()=>other.evaluate(()=>new Promise<number>(resolve=>{const r=indexedDB.open('uniprnetwork-v1');r.onsuccess=()=>{const db=r.result,c=db.transaction('journalCheckpoints').objectStore('journalCheckpoints').count();c.onsuccess=()=>{resolve(c.result);db.close();};};}))).toBe(0);
});
