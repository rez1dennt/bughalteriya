const fs=require('node:fs'),path=require('node:path');
const config=JSON.parse(fs.readFileSync('site.config.json','utf8'));
let siteUrl='';
if(config.siteUrl){const u=new URL(config.siteUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('Укажите HTTPS origin без пути, параметров и пароля.');siteUrl=u.origin;}
if(config.indexable&&!siteUrl)throw Error('Для индексации нужен реальный siteUrl.');
const out=path.resolve('dist');fs.mkdirSync(out,{recursive:true});
const routes=['index.html','privacy.html','consent.html','cookies.html','404.html'];
for(const route of routes){let html=fs.readFileSync(route,'utf8');const index=config.indexable&&route!=='404.html';html=html.replace('content="noindex, nofollow"',`content="${index?'index, follow':'noindex, nofollow'}"`);if(siteUrl&&route!=='404.html'){const url=siteUrl+'/'+(route==='index.html'?'':route);html=html.replace('</head>',`<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:image" content="${siteUrl}/assets/images/hero.jpg"></head>`)}fs.writeFileSync(path.join(out,route),html);}
function copyTree(source,target){fs.mkdirSync(target,{recursive:true});for(const item of fs.readdirSync(source,{withFileTypes:true})){const src=path.join(source,item.name),dst=path.join(target,item.name);if(item.isDirectory())copyTree(src,dst);else if(item.isFile())fs.copyFileSync(src,dst)}}
for(const folder of ['assets','api','vendor'])if(fs.existsSync(folder))copyTree(folder,path.join(out,folder));
fs.copyFileSync('.htaccess',path.join(out,'.htaccess'));
fs.writeFileSync(path.join(out,'robots.txt'),config.indexable?`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${siteUrl?routes.filter(x=>x!=='404.html').map(x=>`<url><loc>${siteUrl}/${x==='index.html'?'':x}</loc></url>`).join(''):''}</urlset>`);
if(fs.existsSync(path.join(out,'vendor')))fs.writeFileSync(path.join(out,'vendor','.htaccess'),'Require all denied\n');
console.log(`Prepared ${out}; indexable=${config.indexable}; domain=${siteUrl||'not set'}`);
