const {contextBridge,ipcRenderer:ipc}=require('electron');
contextBridge.exposeInMainWorld('api',{
 getState:()=>ipc.invoke('state:get'),setOn:v=>ipc.invoke('state:on',v),
 stt:b=>ipc.invoke('stt',b),chat:o=>ipc.invoke('chat',o),tts:(t,l)=>ipc.invoke('tts',t,l),
 dragStart:()=>ipc.send('dragStart'),drag:(x,y)=>ipc.send('drag',x,y),dragEnd:()=>ipc.send('dragEnd'),
 on:(ch,fn)=>ipc.on(ch,(e,...a)=>fn(...a)),quit:()=>ipc.send('quit')});
