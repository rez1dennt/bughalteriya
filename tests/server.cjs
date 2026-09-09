const assert=require('node:assert/strict');
const url=(process.env.TEST_URL||'http://127.0.0.1:8080')+'/api/contact.php';
(async()=>{
const get=await fetch(url);const session=await get.json();assert.equal(get.status,200);assert.equal(session.configured,false);assert.equal(session.token.length,64);const cookie=get.headers.get('set-cookie').split(';')[0];
const valid={name:'Проверка',phone:'+79000000000',comment:'Технический тест, без отправки',consent:true,consentVersion:'2026-09-09',source:'Тест',website:''};
async function check(label,body,status,headers={}){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,'X-CSRF-Token':session.token,...headers},body:JSON.stringify(body)});assert.equal(r.status,status,label);console.log(label,status)}
await check('Missing CSRF',valid,403,{'X-CSRF-Token':''});
await check('Cross-site request',valid,403,{'Sec-Fetch-Site':'cross-site'});
await check('Consent rejected',{...valid,consent:false},422);
await check('Old consent rejected',{...valid,consentVersion:'old'},422);
await check('Bad phone',{...valid,phone:'123'},422);
await check('Honeypot',{...valid,website:'spam'},422);
await check('Long name',{...valid,name:'я'.repeat(81)},422);
await check('Header injection',{...valid,name:'a\r\nBcc: bad'},422);
await check('Unconfigured delivery',valid,503);
await check('Repeat attempt',valid,429);
const oversized=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(17000)});assert.equal(oversized.status,413);
console.log('11 backend checks passed. No SMTP message was sent.');
})().catch(e=>{console.error(e);process.exit(1)});
