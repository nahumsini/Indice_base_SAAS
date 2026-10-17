// Isolated local preview: no backend proxy, auth changes, or real accounts.
import { resolve } from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const root = resolve(import.meta.dirname, '..');
const server = await createServer({root,configFile:false,plugins:[{name:'email-preview',configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"message":"No backend in email preview"}');return;}if(req.url==='/')req.url='/tests/browser/email.html';next();});}},react(),tailwindcss()],resolve:{alias:{'@':resolve(root,'src')}},server:{host:'127.0.0.1',port:5198,strictPort:true}});
await server.listen();
console.log('Correo local: http://127.0.0.1:5198 · datos ficticios, sin envío real');
