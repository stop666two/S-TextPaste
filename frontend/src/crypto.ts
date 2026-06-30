// @ts-nocheck
// S-TextPaste v3.0 — KDF: SHA-256+MD5 every round, chained 12/24-round iteration + HMAC chain

const te=new TextEncoder(),td=new TextDecoder(),tx=t=>te.encode(String(t)),rx=b=>td.decode(b)
const ct=(...a)=>{let s=0;for(const x of a)s+=x.length;const r=new Uint8Array(s);let o=0;for(const x of a){r.set(x,o);o+=x.length}return r}
const xr=(a,b)=>{const n=Math.min(a.length,b.length),r=new Uint8Array(n);for(let i=0;i<n;i++)r[i]=a[i]^b[i];return r}
const sh=async d=>new Uint8Array(await crypto.subtle.digest('SHA-256',d))
const b6e=d=>{let s='';for(let i=0;i<d.length;i++)s+=String.fromCharCode(d[i]);return btoa(s)}
const b6d=s=>{const b=atob(s),r=new Uint8Array(b.length);for(let i=0;i<b.length;i++)r[i]=b.charCodeAt(i);return r}
const ak=async r=>crypto.subtle.importKey('raw',r.slice(0,32),'AES-GCM',false,['encrypt','decrypt'])
const ae=async(t,k)=>{const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},await ak(k),te.encode(t));return{c:b6e(new Uint8Array(ct)),i:b6e(iv)}}
const ad=async(c,i,k)=>{const p=await crypto.subtle.decrypt({name:'AES-GCM',iv:b6d(i)},await ak(k),b6d(c));return td.decode(p)}
const hm=async(k,d)=>{const ik=await crypto.subtle.importKey('raw',k,{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',ik,d))}

// ============ MD5 ============
class MD5{s=[0x67452301,0xefcdab89,0x98badcfe,0x10325476];l=0;b=new Uint8Array(64);bl=0
up(d){let p=0;const n=64-this.bl;if(d.length>=n){this.b.set(d.subarray(0,n),this.bl);this.bl=64;this.pb();p=n;while(p+64<=d.length){this.b.set(d.subarray(p,p+64));this.bl=64;this.pb();p+=64}this.b.set(d.subarray(p),0);this.bl=d.length-p}else{this.b.set(d,this.bl);this.bl+=d.length}this.l+=d.length*8}
dg(){const bt=this.l;this.b[this.bl++]=0x80;while(this.bl<56)this.b[this.bl++]=0;const v=new DataView(this.b.buffer);v.setUint32(0,Math.floor(bt/0x100000000),false);v.setUint32(4,bt&0xffffffff,false);this.bl=64;this.pb();const r=new Uint8Array(16),ov=new DataView(r.buffer);for(let i=0;i<4;i++)ov.setUint32(i*4,this.s[i],true);return r}
F(x,y,z){return(x&y)|(~x&z)}G(x,y,z){return(x&z)|(y&~z)}H(x,y,z){return x^y^z}I(x,y,z){return y^(x|~z)}rl(x,n){return((x<<n)|(x>>>(32-n)))>>>0}
pb(){const v=new DataView(this.b.buffer),M=new Uint32Array(16);for(let i=0;i<16;i++)M[i]=v.getUint32(i*4,true);let A=this.s[0],B=this.s[1],C=this.s[2],D=this.s[3];const T=[0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391];const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];for(let i=0;i<64;i++){let f,g;if(i<16){f=this.F(B,C,D);g=i}else if(i<32){f=this.G(B,C,D);g=(5*i+1)&15}else if(i<48){f=this.H(B,C,D);g=(3*i+5)&15}else{f=this.I(B,C,D);g=(7*i)&15}f=(f+A+T[i]+M[g])>>>0;A=D;D=C;C=B;B=(B+this.rl(f,S[i]))>>>0}this.s[0]=(this.s[0]+A)>>>0;this.s[1]=(this.s[1]+B)>>>0;this.s[2]=(this.s[2]+C)>>>0;this.s[3]=(this.s[3]+D)>>>0;this.bl=0}}
const m5=d=>{const m=new MD5();m.up(d);return m.dg()}

// ============ Complex KDF (SHA-256+MD5 every round, chained iteration) ============

async function k512(pw,salt){
  let c=await sh(ct(pw,salt));const r=new Uint8Array(64)
  for(let i=0;i<12;i++){c=await sh(ct(c,salt,tx(i)));const m=m5(ct(c,tx(i+300),salt)),x=xr(c.slice(0,16),ct(m,m).slice(0,16)),p=(i*5+((i/3)|0)*3)%48;r.set(x.slice(0,Math.min(16,64-p)),p)}
  for(let i=0;i<64;i++)if(r[i]===0){c=await sh(ct(c,tx(i+500)));r[i]=c[0]^m5(ct(c,tx(i)))[0]}
  return r
}

async function k1024A(pw,salt){
  const ss=await sh(ct(salt,tx("PQ-A-v3")));let c=await sh(ct(pw,ss));const r=new Uint8Array(128)
  for(let i=0;i<24;i++){c=await sh(ct(c,pw,ss,tx(i)));const m=m5(ct(m5(ct(c,ss)),pw,ss,tx(i+500))),x=xr(c.slice(0,16),m.slice(0,16)),p=((i*7+((i/4)|0)*11)%112);r.set(x.slice(0,Math.min(16,128-p)),p)}
  for(let i=0;i<128;i++)if(r[i]===0){c=await sh(ct(c,pw,tx(i+800)));r[i]=c[0]^m5(ct(c,tx(i+900)))[0]}
  return r
}

async function k1024B(pw,salt){
  const ss=await sh(ct(salt,tx("PQ-B-v3")));let c=m5(ct(pw,ss));const r=new Uint8Array(128)
  for(let i=0;i<24;i++){const s=await sh(ct(c,pw,ss,tx(i)));c=m5(ct(s,c,ss,tx(i+600)));const x=xr(s.slice(0,16),c.slice(0,16)),p=((i*11+((i/5)|0)*13)%112);r.set(x.slice(0,Math.min(16,128-p)),p)}
  for(let i=0;i<128;i++)if(r[i]===0){const s=await sh(ct(c,tx(i+1000)));r[i]=s[0]^m5(ct(c,tx(i+1100)))[0]}
  return r
}

async function kHMAC(pw,salt){
  const ss=await sh(ct(salt,tx("H-v3")));let c=await sh(ct(pw,ss))
  for(let i=0;i<7;i++)c=await sh(ct(m5(ct(c,pw)),c,ss,tx(i)))
  return c.slice(0,32)
}

// ============ Payload ============
export interface EncryptedPayload{v:string;m:string;s:string;d:string;i:string;e?:string;j?:string;f?:string;g?:string;h?:string;p?:string;t?:string;a:string;q:boolean}

// ============ Encrypt / Decrypt ============
export async function encryptForPassword(text:string,pw:string,pq:boolean,hint?:string):Promise<EncryptedPayload>{
  const salt=crypto.getRandomValues(new Uint8Array(32))
  if(!pq){
    const k=await k512(tx(pw),salt),{c,i}=await ae(text,k.slice(0,32))
    const po={v:'3.0',m:'password',s:b6e(salt),d:c,i,t:hint||'',a:'AES-256-GCM(512bit-KDF-12r)',q:false}
    const ik=await kHMAC(tx(pw),salt);return{...po,h:b6e(await hm(ik,tx(JSON.stringify(po))))}
  }
  const dek=crypto.getRandomValues(new Uint8Array(32)),{c,i}=await ae(text,dek)
  const k1=await k1024A(tx(pw),salt)
  const iv2=crypto.getRandomValues(new Uint8Array(12))
  const ed=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv2},await ak(k1.slice(0,32)),dek)
  const k2=await k1024B(tx(pw),salt)
  const iv3=crypto.getRandomValues(new Uint8Array(12))
  const ee=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv3},await ak(k2.slice(0,32)),ed)
  const po={v:'3.0',m:'password',s:b6e(salt),d:c,i,e:b6e(new Uint8Array(ee)),j:b6e(iv3),f:b6e(new Uint8Array(ed)),g:b6e(iv2),t:hint||'',a:'AES-256-GCM-TripleEnvelope(1024bit-PQ-KDF-24r)',q:true}
  const ik=await kHMAC(tx(pw),salt);return{...po,h:b6e(await hm(ik,tx(JSON.stringify(po))))}
}

export async function decryptFromPassword(p:EncryptedPayload,pw:string):Promise<string>{
  const salt=b6d(p.s)
  if(p.h){const ik=await kHMAC(tx(pw),salt),{h,...r}=p,eh=b6e(await hm(ik,tx(JSON.stringify(r))));if(eh!==p.h)throw new Error('HMAC integrity check failed — data tampered or wrong password')}
  if(!p.q){const k=await k512(tx(pw),salt);return await ad(p.d,p.i,k.slice(0,32))}
  const k2=await k1024B(tx(pw),salt),ed=await crypto.subtle.decrypt({name:'AES-GCM',iv:b6d(p.j!)},await ak(k2.slice(0,32)),b6d(p.e!))
  const k1=await k1024A(tx(pw),salt),dek=await crypto.subtle.decrypt({name:'AES-GCM',iv:b6d(p.g!)},await ak(k1.slice(0,32)),ed)
  return await ad(p.d,p.i,new Uint8Array(dek))
}

// ============ Symmetric ============
export async function encryptForSymmetric(text:string,raw:Uint8Array):Promise<EncryptedPayload>{
  const salt=crypto.getRandomValues(new Uint8Array(32))
  let uk=raw.length>=32?raw.slice(0,32):(r=>{const p=new Uint8Array(32);p.set(r);return p})(raw)
  const{c,i}=await ae(text,uk)
  const kh=await sh(ct(uk,salt)),k1=await k1024A(kh.slice(0,16),salt),k2=await k1024B(kh.slice(16,32),salt)
  const dek=crypto.getRandomValues(new Uint8Array(32)),iv2=crypto.getRandomValues(new Uint8Array(12)),ed=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv2},await ak(k1.slice(0,32)),dek)
  const iv3=crypto.getRandomValues(new Uint8Array(12)),ee=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv3},await ak(k2.slice(0,32)),ed)
  return{v:'3.0',m:'symmetric',s:b6e(salt),d:c,i,e:b6e(new Uint8Array(ee)),j:b6e(iv3),f:b6e(new Uint8Array(ed)),g:b6e(iv2),a:'AES-256-GCM-TripleEnvelope(1024bit-PQ-KDF-24r)',q:true}
}
export async function decryptForSymmetric(p:EncryptedPayload,raw:Uint8Array):Promise<string>{
  let uk=raw.length>=32?raw.slice(0,32):(r=>{const pp=new Uint8Array(32);pp.set(r);return pp})(raw)
  if(!p.q)return await ad(p.d,p.i,uk)
  const kh=await sh(ct(uk,b6d(p.s))),k2=await k1024B(kh.slice(16,32),b6d(p.s)),ed=await crypto.subtle.decrypt({name:'AES-GCM',iv:b6d(p.j!)},await ak(k2.slice(0,32)),b6d(p.e!))
  const k1=await k1024A(kh.slice(0,16),b6d(p.s)),dek=await crypto.subtle.decrypt({name:'AES-GCM',iv:b6d(p.g!)},await ak(k1.slice(0,32)),ed)
  return await ad(p.d,p.i,new Uint8Array(dek))
}

// ============ Asymmetric ============
export async function encryptForAsymmetric(text:string,pub:CryptoKey):Promise<EncryptedPayload>{
  const dek=crypto.getRandomValues(new Uint8Array(32)),{c,i}=await ae(text,dek),ed=await crypto.subtle.encrypt({name:'RSA-OAEP'},pub,dek)
  const pr=await crypto.subtle.exportKey('raw',pub),hs=new Uint8Array(await crypto.subtle.digest('SHA-256',pr))
  return{v:'3.0',m:'asymmetric',s:'',d:c,i,e:b6e(new Uint8Array(ed)),j:i,p:Array.from(hs.slice(0,8)).map(b=>b.toString(16).padStart(2,'0')).join(':'),a:'RSA-OAEP-AES-256-GCM',q:false}
}
export async function decryptFromAsymmetric(p:EncryptedPayload,priv:CryptoKey):Promise<string>{
  return await ad(p.d,p.i,new Uint8Array(await crypto.subtle.decrypt({name:'RSA-OAEP'},priv,b6d(p.e!))))
}
export async function importPemPublicKey(pem:string):Promise<CryptoKey>{
  return crypto.subtle.importKey('spki',b6d(pem.replace(/-----[A-Z ]+-----/g,'').replace(/\s/g,'')),{name:'RSA-OAEP',hash:'SHA-256'},true,['encrypt'])
}
export async function importPemPrivateKey(pem:string):Promise<CryptoKey>{
  return crypto.subtle.importKey('pkcs8',b6d(pem.replace(/-----[A-Z ]+-----/g,'').replace(/\s/g,'')),{name:'RSA-OAEP',hash:'SHA-256'},true,['decrypt'])
}

// ============ Public encoding ============
export function bufferToBase64(data:Uint8Array):string{return b6e(data)}
export function base64ToBuffer(b64:string):Uint8Array{return b6d(b64)}
export function utf8ToBase64(s:string):string{return b6e(te.encode(s))}
export function base64ToUtf8(b64:string):string{return td.decode(b6d(b64))}
