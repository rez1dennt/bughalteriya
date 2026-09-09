(() => {
  'use strict';
  const normalizePhone=value=>{let digits=value.replace(/\D/g,'');if(digits.length===11&&digits[0]==='8')digits='7'+digits.slice(1);return digits};
  function attachPhoneMask(input){
    const digits=value=>value.replace(/\D/g,'');
    function parse(value){
      const all=digits(value);
      const prefix=/^\s*\+7/.test(value)||((all.length===11||all.length===1)&&/^[78]/.test(all));
      return {national:(prefix?all.slice(1):all).slice(0,10),prefix};
    }
    function format(national){
      if(!national)return '';
      let value='+7 ('+national.slice(0,3);
      if(national.length>=3)value+=')';
      if(national.length>3)value+=' '+national.slice(3,6);
      if(national.length>6)value+='-'+national.slice(6,8);
      if(national.length>8)value+='-'+national.slice(8,10);
      return value;
    }
    function positions(value){return [...value.matchAll(/\d/g)].slice(value.startsWith('+7')?1:0).map(match=>match.index)}
    function render(national,index,prefixOnly=false){
      input.value=prefixOnly?'+7':format(national);
      const offsets=positions(input.value);
      const caret=index>0&&offsets.length?offsets[Math.min(index,offsets.length)-1]+1:input.value.startsWith('+7 (')?4:input.value.length;
      input.setSelectionRange(caret,caret);
    }
    let pendingDeletion=null;
    function erase(value,start,end,type){
      const national=parse(value).national,offsets=positions(value);
      let left=offsets.filter(pos=>pos<start).length,right=offsets.filter(pos=>pos<end).length;
      if(start===end){
        if(type==='deleteContentBackward')left=Math.max(0,left-1);
        else right=Math.min(national.length,right+1);
      }
      render(national.slice(0,left)+national.slice(right),left);
    }
    input.addEventListener('beforeinput',event=>{
      pendingDeletion=null;
      if(event.isComposing||!['deleteContentBackward','deleteContentForward'].includes(event.inputType))return;
      const saved={value:input.value,start:input.selectionStart||0,end:input.selectionEnd||0,type:event.inputType};
      if(!event.cancelable){pendingDeletion=saved;return}
      event.preventDefault();erase(saved.value,saved.start,saved.end,saved.type);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    });
    input.addEventListener('input',event=>{
      if(event.isComposing)return;
      if(pendingDeletion){const saved=pendingDeletion;pendingDeletion=null;erase(saved.value,saved.start,saved.end,saved.type);return}
      const value=input.value,caret=input.selectionStart||0,parsed=parse(value);
      const count=Math.max(0,digits(value.slice(0,caret)).length-(parsed.prefix?1:0));
      render(parsed.national,count,parsed.prefix&&!parsed.national&&digits(value).length===1);
    });
    input.addEventListener('blur',()=>{if(!parse(input.value).national)input.value=''});
  }
  document.querySelectorAll('[data-contact-form]').forEach(form=>{
    attachPhoneMask(form.elements.phone);
    let pending=false;
    const status=form.querySelector('.form-status'),button=form.querySelector('[type=submit]');
    form.addEventListener('input',e=>{const field=e.target;field.removeAttribute('aria-invalid');const error=form.querySelector(`[data-error="${field.name}"]`);if(error)error.textContent=''});
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(pending)return;
      status.textContent='';form.querySelectorAll('.field-error').forEach(e=>e.textContent='');
      const data=new FormData(form),phone=normalizePhone(String(data.get('phone')||''));
      const errors={};
      if(!phone)errors.phone='Укажите телефон для обратной связи.';
      else if(phone.length!==11||!phone.startsWith('7'))errors.phone='Введите российский номер: +7 и ещё 10 цифр.';
      if(!form.elements.consent.checked)errors.consent='Чтобы отправить заявку, нужно отдельное согласие.';
      if(Object.keys(errors).length){for(const [name,text] of Object.entries(errors)){form.querySelector(`[data-error="${name}"]`).textContent=text;form.elements[name].setAttribute('aria-invalid','true')}form.elements[Object.keys(errors)[0]].focus();return}
      pending=true;button.disabled=true;button.textContent='Отправляем…';form.setAttribute('aria-busy','true');
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
      try{
        const tokenResponse=await fetch(SiteConfig.endpoint,{headers:{Accept:'application/json'},credentials:'same-origin',signal:controller.signal});
        const session=await tokenResponse.json();
        if(!tokenResponse.ok||!session.token)throw new Error(session.message||'Не удалось подготовить отправку. Попробуйте ещё раз.');
        if(!session.configured)throw new Error('Онлайн-отправка пока не подключена. Позвоните +7 (906) 750-06-00 или напишите на smv001@yandex.ru.');
        const payload={name:String(data.get('name')||'').trim(),phone:'+'+phone,comment:String(data.get('comment')||'').trim(),consent:true,website:String(data.get('website')||''),consentVersion:SiteConfig.consentVersion,source:form.requestData?.source||form.dataset.source,calculation:form.requestData?.calculation||null};
        const response=await fetch(SiteConfig.endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session.token,Accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});
        const result=await response.json();
        if(!response.ok||result.ok!==true)throw new Error(result.message||'Не удалось отправить заявку. Попробуйте позже или свяжитесь напрямую.');
        status.textContent='Заявка отправлена. Спасибо! Свяжусь с вами по указанному телефону.';form.reset();
      }catch(error){status.textContent=error instanceof TypeError||error.name==='AbortError'?'Нет ответа от сервера. Проверьте соединение и попробуйте снова. Введённые данные сохранены в форме.':error instanceof SyntaxError?'Отправка на этом сервере недоступна. Позвоните +7 (906) 750-06-00 или напишите на smv001@yandex.ru.':error.message;
      }finally{clearTimeout(timeout);pending=false;button.disabled=false;button.textContent='Получить консультацию';form.removeAttribute('aria-busy')}
    });
  });
})();
