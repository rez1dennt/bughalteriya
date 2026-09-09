const fs=require('node:fs');
(async()=>{for(const [family,file,folder] of [['Manrope','manrope','manrope'],['Lora','lora','lora'],['Caveat','caveat','caveat']]){
 const url=`https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
 const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'}});if(!response.ok)throw new Error(`Font CSS ${response.status}`);
 const css=await response.text();
 // Request a single complete font for Cyrillic and Latin, avoiding remote requests at runtime.
 const full=await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@400..${family === 'Manrope' ? 800 : 700}&text=${encodeURIComponent('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя !?.,:;—–−-+₽%()«»/→×©@_')}`,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'}});
 const fullcss=await full.text();const source=fullcss.match(/url\(([^)]+)\)/)?.[1]||css.match(/url\(([^)]+)\)/)?.[1];if(!source)throw new Error(fullcss);
 const font=await fetch(source);if(!font.ok)throw new Error('Font download');fs.writeFileSync(`assets/fonts/${file}.woff2`,Buffer.from(await font.arrayBuffer()));
 const license=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/OFL.txt`);if(!license.ok)throw new Error('Font license');fs.writeFileSync(`assets/fonts/${file}-OFL.txt`,await license.text());console.log(family,'saved locally');
}})().catch(e=>{console.error(e);process.exit(1)});
