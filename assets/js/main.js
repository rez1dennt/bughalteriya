(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = new Intl.NumberFormat('ru-RU');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let activeDialog=null, opener=null, scrollPosition=0, bodyStyle='', closeTimer=null, closePromise=null, finishClosing=null;
  const cookie=$('.cookie-banner');
  function closeDialog(immediate=false){
    if(!activeDialog)return Promise.resolve();
    if(closePromise){if(immediate)finishClosing?.();return closePromise||Promise.resolve();}
    const previous=opener;
    const closing=activeDialog;
    const finish=()=>{
    clearTimeout(closeTimer);closing.removeEventListener('animationend',onEnd);
    closing.classList.remove('closing');closing.close();activeDialog=null;closeTimer=null;closePromise=null;finishClosing=null;
    document.body.style.cssText=bodyStyle;
    document.documentElement.style.scrollBehavior='auto';
    window.scrollTo(0,scrollPosition);
    previous?.focus({preventScroll:true});
    document.documentElement.style.removeProperty('scroll-behavior');
    $$('[data-open]').forEach(b=>{if(b.hasAttribute('aria-expanded'))b.setAttribute('aria-expanded','false')});
    cookie.style.visibility='';
    };
    let resolveClose=()=>{};
    const complete=()=>{finish();resolveClose()};
    const onEnd=e=>{if(e.target===closing)complete()};
    if(immediate||reduced.matches){finish();return Promise.resolve()}
    closePromise=new Promise(resolve=>{resolveClose=resolve});finishClosing=complete;
    closing.addEventListener('animationend',onEnd);closing.classList.add('closing');
    const duration=closing.id==='menu-dialog'?parseFloat(getComputedStyle(closing).getPropertyValue('--menu-close'))||340:200;
    closeTimer=setTimeout(complete,duration+80);return closePromise;
  }
  function openDialog(dialog,trigger){
    if(!dialog)return;
    const rootTrigger=activeDialog?.contains(trigger)?opener:trigger;
    if(closePromise)finishClosing?.();
    const switching=Boolean(activeDialog);
    if(switching){activeDialog.close();activeDialog=null;}
    opener=rootTrigger||document.activeElement;
    if(!switching){scrollPosition=window.scrollY;bodyStyle=document.body.style.cssText;
    // Stable gutter is reserved on html. No second scrollbar padding compensation.
    document.body.style.position='fixed';document.body.style.top=`-${scrollPosition}px`;
    document.body.style.width='100%';document.body.style.left='0';}
    activeDialog=dialog;cookie.style.visibility='hidden';dialog.showModal();
    trigger?.setAttribute('aria-expanded',trigger.hasAttribute('aria-expanded')?'true':null);
    if(trigger&&!trigger.hasAttribute('aria-controls'))trigger.removeAttribute('aria-expanded');
    const target=$('input:not([type=hidden]):not([type=checkbox]), button[data-close]',dialog);target?.focus({preventScroll:true});
  }
  $$('dialog').forEach(d=>{
    d.addEventListener('cancel',e=>{e.preventDefault();closeDialog()});
    d.addEventListener('close',()=>{if(activeDialog===d&&!d.open){if(finishClosing)finishClosing();else closeDialog(true)}});
    d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog()});
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeDialog){e.preventDefault();e.stopPropagation();closeDialog()}},true);
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-close]');if(close){closeDialog();return}
    const open=e.target.closest('[data-open]');if(open){openDialog(document.getElementById(open.dataset.open),open);return}
    const request=e.target.closest('[data-request]');if(request){openRequest(request.dataset.request,null,request);return}
    const service=e.target.closest('[data-service]');if(service){$('#service-title').textContent=service.dataset.title;$('#service-description').textContent=service.dataset.description;$('#service-request').dataset.request=`Услуга: ${service.dataset.title}`;openDialog($('#service-dialog'),service);return}
    const link=e.target.closest('a');
    if(link&&activeDialog&&activeDialog.contains(link)&&!link.target){e.preventDefault();const href=link.href;closeDialog().then(()=>{location.href=href})}
  });
  matchMedia('(min-width: 1151px)').addEventListener('change',e=>{if(e.matches&&activeDialog?.id==='menu-dialog')closeDialog(true)});
  function openRequest(source,calculation,trigger){
    const form=$('#request-dialog form');
    form.requestData={source,calculation};
    const context=$('.request-context');
    context.hidden=source==='Консультация'&&!calculation;
    context.textContent=calculation?`${source}\n${calculation.summary}`:source;
    $('.form-status',form).textContent='';
    openDialog($('#request-dialog'),trigger);
  }
  const calculator=$('#calculator-form');
  let state={business:'ip',tax:'income',employees:0,turnover:0,activities:['service']};
  function updateCalculator(focusedInput){
    state=Pricing.normalize(state);
    if(calculator.elements.employees!==focusedInput||focusedInput?.value!=='')calculator.elements.employees.value=state.employees;
    if(calculator.elements.turnover!==focusedInput)calculator.elements.turnover.value=money.format(state.turnover);
    const quote=Pricing.quote(state),card=$('.result-card');
    card.dataset.theme=quote.theme;card.classList.toggle('is-individual',quote.price===null);
    $('#calculated-plan').textContent=quote.name;
    $('#calculated-price').textContent=quote.price===null?'Обсудим задачи':money.format(quote.price);
    $('.price-unit').hidden=quote.price===null;
    $('#calculated-summary').textContent=quote.plan==='zero'?'Для бизнеса без оборота и сотрудников':`${state.business==='ip'?'ИП':'ООО'} · ${money.format(state.turnover)} ₽ оборота в месяц · сотрудников: ${state.employees}`;
    const items=[`База: ${money.format(quote.base)} ₽`];
    if(quote.employeeCharge)items.push(`сотрудники сверх включённых: +${money.format(quote.employeeCharge)} ₽`);
    if(quote.turnoverCharge)items.push(`оборот сверх включённого: +${money.format(quote.turnoverCharge)} ₽`);
    $('#price-breakdown').textContent=quote.price===null?'Для такого сочетания параметров обсудим объём работ и подготовим индивидуальное предложение.':items.join(' · ');
  }
  if(calculator){
    calculator.addEventListener('submit',e=>e.preventDefault());
    calculator.addEventListener('input',e=>{
      const {name,type,value,checked}=e.target;
      if(name==='activities')state.activities=$$('[name=activities]:checked',calculator).map(el=>el.value);
      else if(name==='turnover'){
        const digits=value.replace(/\D/g,'');state.turnover=digits;
        const caret=e.target.selectionStart;const before=value.slice(0,caret).replace(/\D/g,'').length;
        if(digits){const formatted=money.format(Pricing.integer(digits));e.target.value=formatted;let seen=0,pos=0;while(pos<formatted.length&&seen<before){if(/\d/.test(formatted[pos]))seen++;pos++}e.target.setSelectionRange(pos,pos)}
      }else if(name in state)state[name]=type==='checkbox'?checked:value;
      updateCalculator(e.target);
    });
    calculator.addEventListener('focusout',e=>{if(['employees','turnover'].includes(e.target.name))updateCalculator()});
    $$('[data-step]').forEach(b=>b.addEventListener('click',()=>{state[b.dataset.step]=Number(state[b.dataset.step])+Number(b.dataset.delta);updateCalculator()}));
    $('[data-calculator-request]').addEventListener('click',e=>{
      const quote=Pricing.quote(state),settings=SiteConfig.pricing;
      const summary=`Тариф: ${quote.name}\n${state.business==='ip'?'ИП':'ООО'} · ${settings.taxes[state.tax]}\nСотрудников: ${state.employees}; оборот: ${money.format(state.turnover)} ₽/мес.\nДеятельность: ${state.activities.map(k=>settings.activities[k]).join(', ')||'не указана'}\n${quote.price===null?'Индивидуальный расчёт':`Предварительно: ${money.format(quote.price)} ₽ / месяц`}`;
      openRequest('Расчёт стоимости',{...state,plan:quote.plan,estimate:quote.price,summary},e.currentTarget);
    });
    updateCalculator();
  }
  $$('[data-tariff-price]').forEach(el=>{const plan=SiteConfig.pricing.plans[el.dataset.tariffPrice];el.textContent=money.format(plan.base+(plan.fixed||0))});
  $$('.faq-question').forEach(b=>{document.getElementById(b.getAttribute('aria-controls')).inert=true;b.addEventListener('click',()=>{const expanded=b.getAttribute('aria-expanded')!=='true';b.setAttribute('aria-expanded',String(expanded));b.closest('.faq-item').classList.toggle('open',expanded);document.getElementById(b.getAttribute('aria-controls')).inert=!expanded})});
  // With JavaScript disabled, the generated HTML is made readable by a noscript stylesheet.
  const storageKey='sitnikov-storage-choice';
  try{cookie.hidden=JSON.parse(localStorage.getItem(storageKey)||'null')?.version==='2026-09-09'}catch{cookie.hidden=false}
  $('[data-cookie-accept]').addEventListener('click',()=>{try{localStorage.setItem(storageKey,JSON.stringify({accepted:true,version:'2026-09-09'}))}catch{}cookie.classList.add('leaving');setTimeout(()=>{cookie.hidden=true;cookie.classList.remove('leaving')},reduced.matches?0:200)});
  $$('[data-cookie-settings]').forEach(b=>b.addEventListener('click',()=>{cookie.hidden=false;cookie.classList.remove('leaving');$('[data-cookie-accept]').focus({preventScroll:true})}));
  const searchEntries=[...$$('.desktop-nav a')].map(a=>({title:a.textContent,url:a.getAttribute('href')}));
  $$('[data-service]').forEach(s=>searchEntries.push({title:s.dataset.title,url:'#services'}));
  searchEntries.push({title:'Калькулятор стоимости',url:calculator?'#calculator':'index.html#calculator'});
  const search=$('#site-search'), results=$('.search-results');
  function renderSearch(){const q=search.value.trim().toLocaleLowerCase('ru');results.replaceChildren();const matches=searchEntries.filter(x=>x.title.toLocaleLowerCase('ru').includes(q));if(!matches.length){const p=document.createElement('p');p.textContent='Ничего не найдено. Попробуйте «услуги» или «стоимость».';results.append(p)}for(const item of matches){const a=document.createElement('a');a.textContent=item.title;a.href=item.url;results.append(a)}}
  search.addEventListener('input',renderSearch);renderSearch();
  $$('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
  $$('[data-contact]').forEach(e=>{const kind=e.dataset.contact,phone=kind.startsWith('phone');e.href=phone?SiteConfig.phoneHref:`mailto:${SiteConfig.email}`;if(!kind.endsWith('action')){const span=$('span',e);if(span)span.textContent=phone?SiteConfig.phone:SiteConfig.email;else if(!$('svg',e))e.textContent=phone?SiteConfig.phone:SiteConfig.email}});
  if('IntersectionObserver' in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('is-pending');observer.unobserve(entry.target)}}),{threshold:.06});$$('.reveal').forEach(el=>{if(el.getBoundingClientRect().top>innerHeight){el.classList.add('is-pending');observer.observe(el)}})}
})();
