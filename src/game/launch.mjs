import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'};
try{await stat(resolve(root,'index.html'));}catch{console.error('Production build missing. Run npm install, then npm run build.');process.exit(1);}
const server=http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403);res.end('Forbidden');return;}
    const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found');}
});
let port=4173;server.on('error',error=>{if(error.code==='EADDRINUSE'&&port<4190){port++;server.listen(port,'127.0.0.1');}else{console.error(error.message);process.exit(1);}});
server.on('listening',()=>{
  const url=`http://127.0.0.1:${port}`;console.log(`\nMission Forge — The Last Transmission\n${url}\n\nKeep this window open while playing. Press Ctrl+C to stop.\n`);
  if(!process.argv.includes('--no-open')){
    const command=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['/c','start','',url]:[url];
    const child=spawn(command,args,{windowsHide:true,stdio:'ignore'});child.on('error',()=>console.log('Open the address above in your browser.'));child.unref();
  }
});server.listen(port,'127.0.0.1');
