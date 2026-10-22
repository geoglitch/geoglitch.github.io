import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

// Portable ZIP writer; no command-line zip utility or additional package needed.
const root = resolve('.'), local = [], central = [];
let offset = 0, count = 0;
const table = Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32 = data => {let crc=0xffffffff;for(const b of data)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
async function add(path) {
    const name=Buffer.from(relative(root,path).replaceAll('\\','/')),data=await readFile(path),compressed=deflateRawSync(data),crc=crc32(data);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
    local.push(h,name,compressed);central.push(c,name);offset+=h.length+name.length+compressed.length;count++;
}
async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else await add(path);
  }
}
for(const name of ['index.html','.nojekyll','README.md'])await add(join(root,name));
for(const name of ['src','vendor','public'])await walk(join(root,name));
function archive(){const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,directory,end]);}
await writeFile(resolve('geometry-glitch-itch.zip'),archive());console.log(`Created geometry-glitch-itch.zip (${count} static files; no build required)`);
for(const name of ['package.json','package-lock.json','.gitignore','.github/workflows/pages.yml','ART-ASSETS.md','DESIGN-RESEARCH.md','PLAYTEST-NOTES.md'])await add(join(root,name));
for(const name of ['scripts','tests'])await walk(join(root,name));
await writeFile(resolve('geometry-glitch-pages.zip'),archive());console.log(`Created geometry-glitch-pages.zip (${count} project files; no build required)`);
