globalThis.Pricing = (() => {
  const integer = (value, max = 1000000000000) => Math.min(max, Math.max(0, Math.floor(Number(String(value).replace(/\s/g,'')) || 0)));
  function normalize(input) {
    const employees = integer(input.employees, 1000);
    const activities=Array.isArray(input.activities)?[...new Set(input.activities.filter(k=>Object.hasOwn(SiteConfig.pricing.activities,k)))]:['service'];
    return {business:input.business==='ooo'?'ooo':'ip',tax:Object.hasOwn(SiteConfig.pricing.taxes,input.tax)?input.tax:'income',employees,turnover:integer(input.turnover),activities};
  }
  function planQuote(key,s){
    const p=SiteConfig.pricing.plans[key];
    const categories=Object.keys(SiteConfig.pricing.activities),taxes=Object.keys(SiteConfig.pricing.taxes);
    const industry=Math.max(1,...s.activities.map(k=>p.industry?.[categories.indexOf(k)]||1));
    const base=Math.round(p.base*(s.business==='ooo'?(p.company||1):1)*(p.tax?.[taxes.indexOf(s.tax)]||1)*industry)+(p.fixed||0);
    const employeeCharge=Math.max(0,s.employees-p.staff)*p.staffPrice;
    const turnoverCharge=p.limit===null?0:Math.max(0,s.turnover-p.limit)*p.rate;
    const total=Math.ceil(base+employeeCharge+turnoverCharge);
    return {plan:key,name:p.name,price:p.individual?null:total,comparisonPrice:total,base,employeeCharge,turnoverCharge:Math.ceil(turnoverCharge),includedEmployees:p.staff,includedTurnover:p.limit,theme:p.theme};
  }
  function quote(input){
    const s=normalize(input);let eligible;
    if(s.tax==='automated')eligible=s.business==='ooo'&&s.activities.includes('trade')?['upsTrade']:['optim','complex','ups'];
    else{
      eligible=['lite','smart','plus'];
      if(s.turnover===0&&s.employees===0)eligible.push('zero');
      if(s.turnover<=200000&&s.employees<=1)eligible.push('startup');
      if(['income','expense'].includes(s.tax)&&(s.business==='ip'||(s.activities.length===1&&s.activities[0]==='service')))eligible.push('free');
    }
    return eligible.map(key=>planQuote(key,s)).reduce((best,current)=>current.comparisonPrice<best.comparisonPrice?current:best);
  }
  return {normalize,quote,calculate:input=>quote(input).price,integer};
})();
