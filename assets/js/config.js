/* Публичные настройки. Секреты SMTP хранятся только на сервере. */
globalThis.SiteConfig = Object.freeze({
  name: 'Михаил Ситников', company: 'ИП Ситников Михаил Викторович',
  phone: '+7 (906) 750-06-00', phoneHref: 'tel:+79067500600', email: 'smv001@yandex.ru',
  endpoint: 'api/contact.php', consentVersion: '2026-09-09',
  pricing: {
    source: 'https://knopka.com/price', checked: '2026-09-09',
    taxes: {income:'УСН — доходы',expense:'УСН — доходы минус расходы',general:'ОСНО',automated:'АУСН'},
    activities: {service:'Услуги / IT',trade:'Торговля',production:'Производство / стройка',restaurant:'Общепит'},
    plans: {
      zero:{name:'Нулевая отчётность',base:3500,limit:0,rate:0,staff:0,staffPrice:0,theme:'lavender',company:1.357},
      startup:{name:'Стартап',base:7000,limit:0,rate:0,staff:1,staffPrice:0,theme:'blue',industry:[1,1.2857,1.2857,1.2857]},
      lite:{name:'Лайт',base:9000,limit:500000,rate:0.005,staff:3,staffPrice:1000,theme:'slate',company:1.3,tax:[1,1.3,1.4,1],industry:[1,1.3,1.4,1.2]},
      smart:{name:'Смарт',base:19000,fixed:1500,limit:2000000,rate:0.0035,staff:10,staffPrice:700,theme:'wine',company:1.1,tax:[1,1.1,1.2,1],industry:[1,1.2,1.3,1.1]},
      plus:{name:'Плюс',base:39000,limit:5000000,rate:0.0025,staff:30,staffPrice:500,theme:'graphite',company:1.1},
      free:{name:'Свободный',base:12000,limit:null,rate:0,staff:3,staffPrice:1000,theme:'berry',company:1.25},
      optim:{name:'АУСН Оптимальный',base:4000,limit:60000000,rate:0.001,staff:0,staffPrice:5000,theme:'blue'},
      complex:{name:'АУСН Комплексный',base:8000,limit:60000000,rate:0.001,staff:5,staffPrice:5000,theme:'slate'},
      ups:{name:'Индивидуальный расчёт',base:10000,limit:null,rate:0,staff:0,staffPrice:0,theme:'graphite',individual:true},
      upsTrade:{name:'Индивидуальный расчёт',base:10000,limit:null,rate:0,staff:0,staffPrice:0,theme:'graphite',individual:true}
    }
  }
});
