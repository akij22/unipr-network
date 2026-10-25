import {expect,test} from '@playwright/test';
import {addDevice} from '../helpers/ui';
test('saves a named configuration and reopens it with clean state',async({page})=>{
 await page.goto('/');await addDevice(page,'host');await page.getByLabel('IPv4 address',{exact:true}).fill('192.168.1.10');await page.getByRole('button',{name:'Apply settings',exact:true}).click();
 await page.getByRole('button',{name:'Save network',exact:true}).click();await page.getByLabel('Network name',{exact:true}).fill('My first lab');await page.getByRole('button',{name:'Save configuration',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Save network',exact:true})).not.toBeVisible();
 await page.reload();await page.getByRole('button',{name:'My networks',exact:true}).click();await page.getByRole('button',{name:'Open My first lab',exact:true}).click();
 await expect(page.getByRole('button',{name:'Select Host 1',exact:true})).toBeVisible();await page.getByRole('button',{name:'Select Host 1',exact:true}).click();await expect(page.getByLabel('IPv4 address',{exact:true})).toHaveValue('192.168.1.10');
 await expect(page.locator('[data-sim-status]')).toHaveAttribute('data-sim-status','idle');
});
test('explains a failed save while retaining the editable network',async({page})=>{
 await page.addInitScript(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='documents')throw new DOMException('quota','QuotaExceededError');return put.apply(this,args);};});
 await page.goto('/');await addDevice(page,'host');await page.getByRole('button',{name:'Save network',exact:true}).click();await page.getByLabel('Network name',{exact:true}).fill('Keep this network');await page.getByRole('button',{name:'Save configuration',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Save network'}).getByRole('alert')).toContainText('Browser storage is full');await page.getByRole('button',{name:'Close save dialog',exact:true}).click();await expect(page.getByRole('button',{name:'Select Host 1',exact:true})).toBeVisible();
});
