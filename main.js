const {app,BrowserWindow,ipcMain,screen,desktopCapturer,session,systemPreferences}=require('electron');
const fs=require('fs'),path=require('path');
try{fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);if(m)process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')})}catch{}
const KEY=()=>{if(!process.env.GROQ_API_KEY)throw new Error('Falta GROQ_API_KEY no arquivo .env (chave grátis em console.groq.com)');return process.env.GROQ_API_KEY};
const {MsEdgeTTS,OUTPUT_FORMAT}=require('msedge-tts');const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const W=340,H=380;let win,file,st={on:false,hist:[],topic:''},dragging=false;
const persist=()=>{try{fs.writeFileSync(file,JSON.stringify({on:st.on,hist:st.hist.slice(-40),topic:st.topic}))}catch{}};
const SYS=`Você é Slimo, um slime simpático e tutor de inglês com voz masculina. O aluno é brasileiro e fala português e inglês; o texto vem de reconhecimento de voz e pode ter erros. Se ele falou em inglês, corrija gramática e naturalidade e continue a conversa em inglês simples, com explicação curta em português. Se falou em português, ajude com a tradução para o inglês e peça que ele repita em inglês. Se pedir tradução, traduza. Se houver imagem da tela, diga o que vê, leia e traduza o texto pedido (ex.: o meio da tela) e ajude com termos em inglês. Respostas curtas (máx. 3 frases). Responda SOMENTE JSON: {"said":"frase incorreta do aluno ou vazio","fix":"forma mais natural em inglês ou vazio","why":"dica curta em português do porquê ou vazio","topic":"assunto atual em poucas palavras, em português","seg":[{"l":"en" ou "pt","t":"texto a falar, um único idioma por item"}]}. Sem markdown.`;
async function shot(){win.hide();await new Promise(r=>setTimeout(r,250));
 try{const d=screen.getPrimaryDisplay(),s=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1600,height:900}});
 const src=s.find(x=>x.display_id==String(d.id))||s[0];return 'data:image/jpeg;base64,'+src.thumbnail.toJPEG(70).toString('base64')}catch{return null}finally{win.show()}}
ipcMain.handle('state:get',()=>st);
ipcMain.handle('state:on',(e,v)=>{st.on=v;persist()});
ipcMain.handle('stt',async(e,buf)=>{const fd=new FormData();fd.append('file',new Blob([buf],{type:'audio/webm'}),'a.webm');
 fd.append('model',process.env.STT_MODEL||'whisper-large-v3-turbo');fd.append('response_format','verbose_json');fd.append('prompt','Conversa entre um brasileiro e seu tutor de inglês. Português e English.');
 const r=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+KEY()},body:fd}),j=await r.json();
 if(!r.ok)throw new Error(j.error?.message||'Erro no Whisper');return{text:j.text||'',lang:j.language||''}});
ipcMain.handle('chat',async(e,{text,lang,sys,screen:sc})=>{
 const messages=[{role:'system',content:SYS}];st.hist.slice(-14).forEach(h=>messages.push({role:h.r==='u'?'user':'assistant',content:h.t}));
 const txt=sys?text:`(idioma detectado: ${lang}) ${text}`;let content=txt,img=null;
 if(sc)img=await shot();if(img)content=[{type:'text',text:txt},{type:'image_url',image_url:{url:img}}];
 messages.push({role:'user',content});
 const MODEL=img?(process.env.VISION_MODEL||'qwen/qwen3.6-27b'):(process.env.CHAT_MODEL||'qwen/qwen3.6-27b');
 const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+KEY(),'Content-Type':'application/json'},
  body:JSON.stringify({model:MODEL,messages,reasoning_effort:/gpt-oss/.test(MODEL)?'low':'none'})}),d=await r.json();
 if(!r.ok)throw new Error(d.error?.message||'Erro no chat');
 const mm=String(d.choices[0].message.content).match(/\{[\s\S]*\}/),j=JSON.parse(mm?mm[0]:'{}');j.seg=(j.seg||[]).filter(s=>s&&s.t);if(!j.seg.length)j.seg=[{l:'pt',t:'Não entendi, pode repetir?'}];
 if(!sys)st.hist.push({r:'u',t:text});st.hist.push({r:'a',t:j.seg.map(s=>s.t).join(' ')});if(j.topic)st.topic=j.topic;persist();return j});
ipcMain.handle('tts',async(e,input,l)=>{
 const voice=l==='pt'?(process.env.TTS_VOICE_PT||'pt-BR-AntonioNeural'):(process.env.TTS_VOICE_EN||'en-US-GuyNeural');
 const tts=new MsEdgeTTS();await tts.setMetadata(voice,OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
 const r=tts.toStream(esc(input)),s=r.audioStream||r,chunks=[];
 return await new Promise((res,rej)=>{let ok=false;const fin=()=>{if(!ok){ok=true;chunks.length?res(Buffer.concat(chunks)):rej(new Error('sem áudio'))}};
  s.on('data',d=>chunks.push(d));s.on('end',fin);s.on('close',fin);s.on('error',rej)})});
ipcMain.on('dragStart',()=>{dragging=true});ipcMain.on('drag',(e,x,y)=>win.setPosition(Math.round(x),Math.round(y)));
ipcMain.on('dragEnd',()=>{dragging=false;wait=8000});ipcMain.on('quit',()=>app.quit());
let tx=0,ty=0,wait=0,walking=false;
function setW(v,dir){if(v!==walking||v){walking=v;win.webContents.send('walk',v?dir:0)}}
app.whenReady().then(async()=>{
 file=path.join(app.getPath('userData'),'state.json');try{st={...st,...JSON.parse(fs.readFileSync(file,'utf8'))}}catch{}
 if(process.platform==='darwin')await systemPreferences.askForMediaAccess('microphone');
 const wa=screen.getPrimaryDisplay().workArea;
 win=new BrowserWindow({width:W,height:H,x:wa.x+100,y:wa.y+wa.height-H-40,transparent:true,frame:false,alwaysOnTop:true,hasShadow:false,resizable:false,
  webPreferences:{preload:path.join(__dirname,'preload.js'),autoplayPolicy:'no-user-gesture-required'}});
 win.setAlwaysOnTop(true,'screen-saver');win.setVisibleOnAllWorkspaces(true);win.loadFile('index.html');
 session.defaultSession.setPermissionRequestHandler((wc,p,cb)=>cb(p==='media'));
 setInterval(()=>{const c=screen.getCursorScreenPoint(),[x,y]=win.getPosition();win.webContents.send('cursor',{x:c.x-x,y:c.y-y})},100);
 setInterval(()=>{if(!st.on||dragging){if(walking)setW(false);return}
  if(wait>0){wait-=40;if(walking)setW(false);return}
  const [x,y]=win.getPosition(),dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy);
  if(d<4){const w=screen.getDisplayNearestPoint({x,y}).workArea;tx=w.x+Math.random()*(w.width-W);ty=w.y+Math.random()*(w.height-H);wait=3000+Math.random()*5000;return}
  setW(true,dx>0?1:-1);win.setPosition(Math.round(x+dx/d*3),Math.round(y+dy/d*3))},40);
});
app.on('window-all-closed',()=>app.quit());
