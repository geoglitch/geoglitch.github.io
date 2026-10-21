import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { deflateRawSync } from 'node:zlib';

// Portable ZIP writer; no command-line zip utility or additional package needed.
const root = resolve('dist'), local = [], central = [];
let offset = 0, count = 0;
const table = Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32 = data => {let crc=0xffffffff;for(const b of data)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
async function walk(dir) {
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const path=join(dir,entry.name);if(entry.isDirectory()){await walk(path);continue;}
    const name=Buffer.from(relative(root,path).replaceAll('\\','/')),data=await readFile(path),compressed=deflateRawSync(data),crc=crc32(data);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
    local.push(h,name,compressed);central.push(c,name);offset+=h.length+name.length+compressed.length;count++;
  }
}
await walk(root);
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const output=resolve('geometry-glitch-itch.zip');await writeFile(output,Buffer.concat([...local,directory,end]));console.log(`Created ${output} (${count} files; index.html at ZIP root)`);
