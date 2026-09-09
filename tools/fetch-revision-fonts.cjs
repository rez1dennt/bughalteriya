const fs=require('node:fs');
(async()=>{const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
for(const [family,file,folder] of [['Golos Text','golos-text','golostext'],['Inter','inter','inter']]){
const characters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя !?.,:;—–−-+₽%()«»/→×©@_';
const css=await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g,'+')}:wght@400..800&text=${encodeURIComponent(characters)}`,{headers:{'User-Agent':ua}})).text();
const source=css.match(/url\(([^)]+)\)/)?.[1];if(!source)throw Error(css);const r=await fetch(source);if(!r.ok)throw Error(r.status);const bytes=Buffer.from(await r.arrayBuffer());if(bytes.subarray(0,4).toString()!=='wOF2')throw Error('Expected WOFF2');fs.writeFileSync(`assets/fonts/${file}.woff2`,bytes);
const license=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/OFL.txt`);if(!license.ok)throw Error('License missing');fs.writeFileSync(`assets/fonts/${file}-OFL.txt`,await license.text());console.log(family,bytes.length,'bytes, local OFL saved');
}})().catch(e=>{console.error(e);process.exit(1)});
