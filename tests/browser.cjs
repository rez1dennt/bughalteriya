const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const url=process.env.TEST_URL||'http://127.0.0.1:8080';
const widths=[320,360,390,430,768,1024,1280,1440,1920];
const routes=['index.html','privacy.html','consent.html','cookies.html','404.html'];
const report={viewports:[],checks:[],errors:[]};
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/bahti/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true});
try{
const context=await browser.newContext();const page=await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('/api/'))report.errors.push(`${r.status()} ${r.url()}`)});
async function loaded(){await page.evaluate(async()=>{await document.fonts.ready;document.documentElement.style.scrollBehavior='auto';for(let y=0;y<document.body.scrollHeight;y+=450){scrollTo(0,y);await new Promise(r=>setTimeout(r,45))}scrollTo(0,0)});await page.waitForTimeout(500)}
for(const route of routes){for(const width of widths){await page.setViewportSize({width,height:900});await page.goto(`${url}/${route}`);await loaded();const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,h1:document.querySelectorAll('h1').length,images:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),pending:document.querySelectorAll('.is-pending').length}));assert(metrics.scroll<=width,`${route}@${width}: overflow ${metrics.scroll}`);assert.equal(metrics.h1,1);assert.deepEqual(metrics.images,[]);assert.equal(metrics.pending,0);report.viewports.push(`${route}@${width}`);if(route==='index.html'&&[320,390,768,1440].includes(width)){if(await page.locator('.cookie-banner').isVisible()){await page.locator('[data-cookie-accept]').click();await page.waitForTimeout(230)}await page.screenshot({path:`docs/qa/home-${width}.png`,fullPage:true})}}}
report.checks.push('45 route/viewport layouts; all images load; one H1; no horizontal overflow');
await page.setViewportSize({width:1440,height:1000});await page.goto(url);await loaded();
const price=page.locator('#calculated-price');
async function priceIs(n){await expect(price).toHaveText(new RegExp(String(n).split('').join('[\\s\\u00a0]*')))}
await priceIs(3500);await page.locator('[name=business][value=ooo]').check();await priceIs(4750);await page.locator('[name=business][value=ip]').check();await priceIs(3500);
await page.locator('#turnover').fill('200000');await priceIs(7000);await page.locator('#employees').fill('2');await priceIs(9000);
for(const [tax,n] of [['expense',11700],['general',12600],['automated',8000],['income',9000]]){await page.locator('[name=tax][value='+tax+']').check();await priceIs(n)}
await page.locator('[name=activities][value=production]').check();await priceIs(12000);await page.locator('[name=activities][value=production]').uncheck();
await page.locator('#employees').fill('4');await page.locator('#turnover').fill('500001');await priceIs(10001);
await page.locator('[data-step=employees][data-delta="-1"]').click();await priceIs(9001);await page.locator('[data-step=employees][data-delta="1"]').click();await priceIs(10001);
await page.locator('[data-calculator-request]').click();await expect(page.locator('.request-context')).toContainText('10 001');await expect(page.locator('.request-context')).toContainText('500 001');await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);
await page.locator('#turnover').fill('');await page.locator('#employees').focus();await expect(page.locator('#turnover')).toHaveValue('0');
await page.locator('#employees').fill('-3');await expect(page.locator('#employees')).toHaveValue('0');await page.locator('#employees').fill('1.9');await expect(page.locator('#employees')).toHaveValue('1');
report.checks.push('New calculator: reference prices, all taxes, turnover formatting, multiple activities, employee stepper, boundary rounding, request snapshot');
for(const card of await page.locator('[data-service]').all()){await card.click();await expect(page.locator('#service-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0)}
for(const cta of await page.locator('[data-request]').all()){if(await cta.isVisible()){await cta.click();await expect(page.locator('#request-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0)}}
await page.locator('.search-toggle').click();await page.locator('#site-search').fill('отчёт');await expect(page.locator('.search-results')).toContainText('отчётности');await page.locator('.search-results a').first().click();await expect(page.locator('#search-dialog')).not.toBeVisible();
for(const faq of await page.locator('.faq-question').all()){await faq.click();await expect(faq).toHaveAttribute('aria-expanded','true');await faq.click();await expect(faq).toHaveAttribute('aria-expanded','false')}
report.checks.push('All service cards and visible CTAs, search, all FAQ');
await page.setViewportSize({width:390,height:700});await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,1200)});
const before=await page.evaluate(()=>({y:scrollY,x:document.querySelector('.menu-toggle').getBoundingClientRect().x}));await page.locator('.menu-toggle').click();const lockedX=await page.locator('.menu-toggle').evaluate(e=>e.getBoundingClientRect().x);assert(Math.abs(lockedX-before.x)<1,'header horizontal shift');await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);assert(Math.abs(await page.evaluate(()=>scrollY)-before.y)<1,'scroll restoration');await expect(page.locator('.menu-toggle')).toBeFocused();
await page.locator('.menu-toggle').click();await page.setViewportSize({width:1280,height:800});await expect(page.locator('#menu-dialog')).not.toBeVisible();assert.notEqual(await page.evaluate(()=>document.body.style.position),'fixed');
await page.setViewportSize({width:320,height:480});await page.locator('.menu-toggle').click();await page.locator('#menu-dialog a[href="#faq"]').click();await expect(page.locator('#menu-dialog')).not.toBeVisible();assert((await page.locator('#faq').boundingBox()).y>=60);
await page.locator('.menu-toggle').click();await page.locator('#menu-dialog [data-request]').click();await expect(page.locator('#request-dialog')).toBeVisible();await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('#request-dialog').contains(document.activeElement)));await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);
report.checks.push('Menu/dialog: 320x480 and 390x700, scrolled open/close, stable header, Escape, focus return, focus containment, anchor, desktop resize');
const form=page.locator('#consultation form');await form.locator('[type=submit]').click();await expect(form.locator('[data-error=phone]')).not.toBeEmpty();await form.locator('[name=phone]').fill('123');await form.locator('[type=submit]').click();await expect(form.locator('[data-error=phone]')).toContainText('Введите');await form.locator('[name=phone]').fill('+7 (900) 000-00-00');await form.locator('[type=submit]').click();await expect(form.locator('[data-error=consent]')).not.toBeEmpty();await form.locator('[name=consent]').check();await form.locator('[type=submit]').click();await expect(form.locator('.form-status')).toContainText('пока не подключена');await expect(form.locator('[name=phone]')).toHaveValue('+7 (900) 000-00-00');
await page.route('**/api/contact.php',route=>route.abort());await form.locator('[type=submit]').click();await expect(form.locator('.form-status')).toContainText('соединение');await page.unroute('**/api/contact.php');
let posted=0;await page.route('**/api/contact.php',async route=>{if(route.request().method()==='GET')return route.fulfill({json:{token:'test-token',configured:true}});posted++;await new Promise(r=>setTimeout(r,500));return route.fulfill({status:502,json:{message:'Тестовая ошибка сервера'}})});
await form.locator('[type=submit]').click();await expect(form.locator('[type=submit]')).toBeDisabled();await form.evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await expect(form.locator('.form-status')).toContainText('Тестовая ошибка сервера');assert.equal(posted,1);await page.unroute('**/api/contact.php');
report.checks.push('Forms: required/invalid phone, consent, actual unconfigured backend, retained inputs; simulated network/server error; duplicate blocked (one POST)');
await page.locator('[data-cookie-settings]').click();await expect(page.locator('.cookie-banner')).toBeVisible();await page.locator('[data-cookie-accept]').click();await page.reload();await expect(page.locator('.cookie-banner')).not.toBeVisible();await page.goto(`${url}/cookies.html`);await expect(page.locator('.cookie-banner')).not.toBeVisible();
const noStorage=await browser.newContext();await noStorage.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('denied')}})});const storagePage=await noStorage.newPage();await storagePage.goto(url);await storagePage.locator('[data-cookie-accept]').click();await expect(storagePage.locator('.cookie-banner')).not.toBeVisible();await noStorage.close();
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);await loaded();assert.equal(await page.locator('.is-pending').count(),0);report.checks.push('Cookie accept/reopen/reload/cross-page, denied localStorage, reduced motion');
assert.deepEqual(report.errors,[],'Browser resource or console errors');
fs.writeFileSync('docs/qa/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
})().catch(e=>{console.error(e);fs.writeFileSync('docs/qa/browser-failure.txt',String(e.stack));process.exit(1)});
