const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const routes=['index.html','privacy.html','consent.html','cookies.html','404.html'];
for(const route of routes)test(`${route}: local links, assets and metadata`,()=>{
 const html=fs.readFileSync(route,'utf8');assert.match(html,/<html lang="ru">/);assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.match(html,/<meta name="description"/);assert.match(html,/noindex, nofollow/);assert.doesNotMatch(html,/example\.com|\[УКАЖИТЕ|100\+ клиентов|98%|5\+ лет/);
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)(?:#[^"]*)?"/g)){const ref=match[1];if(/^(https?:|tel:|mailto:|data:)/.test(ref))continue;assert(fs.existsSync(path.resolve(ref)),`${route}: missing ${ref}`)}
 for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/g))assert.doesNotThrow(()=>JSON.parse(match[1]));
 assert.doesNotMatch(html,/name="consent"[^>]*\bchecked\b/);
});
test('fonts are actual WOFF2 files',()=>{for(const font of ['golos-text','inter','caveat'])assert.equal(fs.readFileSync(`assets/fonts/${font}.woff2`).subarray(0,4).toString(),'wOF2')});
test('all images and variants exist',()=>{for(const name of ['hero','bookkeeping','tax','reporting','documents','payroll','consulting','specialist','form','contact'])for(const suffix of ['.webp','-480.webp','.jpg'])assert(fs.statSync(`assets/images/${name}${suffix}`).size>1000)});
test('frontend secrets are absent',()=>{for(const file of fs.readdirSync('assets/js')){const content=fs.readFileSync(`assets/js/${file}`,'utf8');assert.doesNotMatch(content,/SMTP_PASSWORD\s*[:=]\s*["'][^"']+/)}});
