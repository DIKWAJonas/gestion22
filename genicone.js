const z=require('zlib'),fs=require('fs');
function png(s){const w=s*4+1,r=Buffer.alloc(w*s);
for(let y=0;y<s;y++)for(let x=0;x<s;x++){const d=Math.hypot(x-s/2+.5,y-s/2+.5)/s,k=d>.2&&d<.32,o=y*w+1+x*4;
r[o]=k?255:31;r[o+1]=k?255:58;r[o+2]=k?255:95;r[o+3]=255}
const c=(t,b)=>{const l=Buffer.alloc(4),q=Buffer.alloc(4),d=Buffer.concat([Buffer.from(t),b]);l.writeUInt32BE(b.length);q.writeUInt32BE(z.crc32(d));return Buffer.concat([l,d,q])};
const h=Buffer.alloc(13);h.writeUInt32BE(s,0);h.writeUInt32BE(s,4);h[8]=8;h[9]=6;
return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),c('IHDR',h),c('IDAT',z.deflateSync(r)),c('IEND',Buffer.alloc(0))])}
fs.writeFileSync('public/icone-192.png',png(192));fs.writeFileSync('public/icone-512.png',png(512));
console.log('Icônes créées');
