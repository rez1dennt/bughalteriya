const {chromium}=require('@playwright/test');const fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Users/bahti/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'});try{const p=await b.newPage();await p.goto('https://knopka.com/price',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.jQuery&&document.querySelector('.calc__input_count'));
await p.waitForTimeout(2000);
const results=await p.evaluate(()=>{
 const rows=[],activities=['service','trade','production','restaurant'];
 const points=[[0,0],[0,1],[1,200000],[1,200001],[2,200000],[3,500000],[4,500001],[5,1000000],[6,1000000],[10,2000000],[11,2000001],[30,5000000],[31,5000001],[50,10000000],[0,60000000],[0,60000001],[5,60000000],[6,60000001]];
 for(const business of ['ip','ooo'])for(const tax of ['usnd','usndr','osno','ausn'])for(let mask=1;mask<16;mask++)for(const [employees,turnover] of points){
  document.querySelector(`.calc__system input[value="${business}"]`).checked=true;
  document.querySelector(`.calc__form input[value="${tax}"]`).checked=true;
  activities.forEach((a,i)=>document.querySelector(`.calc__check[name="${a}"]`).checked=Boolean(mask&(1<<i)));
  document.querySelector('.calc__input_count').value=String(employees);
  const income=document.querySelector('.calc__input_oborot');income.value=String(turnover);income.dispatchEvent(new Event('input',{bubbles:true}));
  const cookies=Object.fromEntries(document.cookie.split('; ').map(s=>[s.slice(0,s.indexOf('=')),s.slice(s.indexOf('=')+1)]));
  const active=document.querySelector('.tarif__item_active');
  const id=active.className.match(/tarif_item_plan_(\w+)/)?.[1];
  rows.push({business,tax,activities:activities.filter((_,i)=>mask&(1<<i)),employees,turnover,plan:id,price:id?.startsWith('ups')?null:Number(cookies.KNOPKA_PRICE_Price)});
 }
 return rows;
});
fs.writeFileSync('docs/research/reference-prices.json',JSON.stringify({source:'https://knopka.com/price',checkedAt:new Date().toISOString(),method:'Live page inputs and active tariff; only calculator changed, no forms submitted',results},null,2));console.log('Checked',results.length,'live combinations. Plans:',[...new Set(results.map(r=>r.plan))]);console.log(results.filter(r=>r.business==='ip'&&r.tax==='usnd'&&r.activities.length===1&&r.activities[0]==='service').slice(0,14));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
