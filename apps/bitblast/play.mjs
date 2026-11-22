import {act,step,match,width,height,ground,weapons} from './game.mjs';

const $=id=>document.getElementById(id);
const canvas=$('arena'), ctx=canvas.getContext('2d');
const colors=['#79dac4','#f6a47a'];
const keys=new Set(['a','d','w','s','q','e','shift',' ','1','2','3','4','5']);
let physics, state, mode='', peer, channel, busy=false, connectionVersion=0;
let status='';
const report=message=>{$('connection').textContent=message;};

function send(message){
    if(channel?.readyState==='open' && channel.bufferedAmount<65536) channel.send(JSON.stringify(message));
}
function resetConnection(){
    connectionVersion++;
    channel?.close();peer?.close();
    channel=undefined;peer=undefined;mode='';state=undefined;
    $('code').value='';$('response').value='';
}
function startLocal(){
    resetConnection(); mode='local';state=match();report('Local two-player match. Share this keyboard.');canvas.focus();
}
function configureChannel(next, version){
    channel=next;
    next.onopen=()=>{
        if(version!==connectionVersion) return;
        if(mode==='host'){state=match();send({state});}
        report('Connected. Click the game to use the keyboard.');
    };
    next.onclose=()=>{
        if(version!==connectionVersion) return;
        state=undefined;report('Player disconnected. Start a new connection to play again.');
    };
    next.onmessage=event=>{
        if(version!==connectionVersion || typeof event.data!=='string' || event.data.length>65536) return;
        try {
            const msg=JSON.parse(event.data);
            if(mode==='host' && state && keys.has(msg.key)) act(state,1,msg.key);
            if(mode==='join' && msg.state?.tanks?.length===2 && Array.isArray(msg.state.shots) && Array.isArray(msg.state.blasts)) state=msg.state;
        } catch { /* Ignore invalid peer messages. */ }
    };
}
function makePeer(role){
    resetConnection();mode=role;
    peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    const version=connectionVersion;
    peer.onconnectionstatechange=()=>{
        if(version===connectionVersion && peer.connectionState==='failed'){
            state=undefined;report('Connection failed. Try again on a network that allows direct WebRTC connections.');
        }
    };
    return version;
}
function waitForIce(connection){
    if(connection.iceGatheringState==='complete') return Promise.resolve();
    return new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>finish(new Error('Candidate gathering timed out. Try again.')),12000);
        function finish(error){
            clearTimeout(timeout);
            connection.removeEventListener('icegatheringstatechange',check);
            error?reject(error):resolve();
        }
        function check(){if(connection.iceGatheringState==='complete') finish();}
        connection.addEventListener('icegatheringstatechange',check);
    });
}
function description(text,type){
    if(text.length>50000) throw new Error('Connection code is too long.');
    let data;
    try{data=JSON.parse(text);}catch{throw new Error('Paste the full connection code.');}
    if(data?.type!==type || typeof data.sdp!=='string') throw new Error('This is not the expected '+type+' code.');
    return {type,sdp:data.sdp};
}
async function connect(action){
    if(busy || !physics) return;
    busy=true;
    for(const button of document.querySelectorAll('[data-mode]')) button.disabled=true;
    try{
        if(action==='host'){
            const version=makePeer('host');
            configureChannel(peer.createDataChannel('bitblast'),version);
            await peer.setLocalDescription(await peer.createOffer());
            await waitForIce(peer);
            $('code').value=JSON.stringify(peer.localDescription);
            report('Send your offer to Player 2, then paste their answer here.');
        }else if(action==='join'){
            const offer=description($('response').value.trim(),'offer');
            const version=makePeer('join');
            peer.ondatachannel=e=>configureChannel(e.channel,version);
            await peer.setRemoteDescription(offer);
            await peer.setLocalDescription(await peer.createAnswer());
            await waitForIce(peer);
            $('code').value=JSON.stringify(peer.localDescription);
            report('Send your answer back to Player 1.');
        }else{
            if(mode!=='host' || !peer || peer.signalingState!=='have-local-offer') throw new Error('Create an offer first.');
            await peer.setRemoteDescription(description($('response').value.trim(),'answer'));
            report('Connecting to Player 2…');
        }
    }catch(error){report(error.message);}
    finally{
        busy=false;
        for(const button of document.querySelectorAll('[data-mode]')) button.disabled=false;
    }
}
for(const button of document.querySelectorAll('[data-mode]')){
    button.onclick=()=>button.dataset.mode==='local'?startLocal():connect(button.dataset.mode);
}
$('copy-code').onclick=async()=>{
    if(!$('code').value) return;
    try {await navigator.clipboard.writeText($('code').value);report('Connection code copied.');}
    catch {$('code').select();report('Copy the selected connection code.');}
};
function input(key){
    if(!state) return;
    if(mode==='join') send({key});
    else act(state, mode==='host'?0:state.turn,key);
}
canvas.addEventListener('keydown',event=>{
    const key=event.key.toLowerCase();
    if(!keys.has(key)) return;
    event.preventDefault();
    if(!event.repeat || ![' ','shift','1','2','3','4','5'].includes(key)) input(key);
});
for(const button of document.querySelectorAll('[data-key]')) button.onclick=()=>input(button.dataset.key);
$('restart').onclick=()=>{
    if(mode==='local') startLocal();
    if(mode==='host' && channel?.readyState==='open'){state=match();send({state});canvas.focus();}
};
function draw(){
    const sky=ctx.createLinearGradient(0,0,0,height);
    sky.addColorStop(0,'#171e2c');sky.addColorStop(1,'#46596a');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    ctx.beginPath();ctx.moveTo(0,height);
    for(let x=0;x<=width;x+=4) ctx.lineTo(x,ground(x));
    ctx.lineTo(width,height);ctx.closePath();ctx.fillStyle='#314946';ctx.fill();ctx.strokeStyle='#82a49b';ctx.stroke();
    if(!state){
        ctx.fillStyle='#fff';ctx.textAlign='center'; ctx.font='bold 46px system-ui';ctx.fillText('BITBLAST',width/2,233);
        ctx.font='18px system-ui';ctx.fillText('Choose a game mode to begin',width/2,268);return;
    }
    state.tanks.forEach((p,i)=>{
        const side=p.x<state.tanks[1-i].x?1:-1, angle=p.angle*Math.PI/180;
        ctx.fillStyle=colors[i];ctx.fillRect(p.x-18,p.y-7,36,17);
        ctx.beginPath();ctx.arc(p.x,p.y-8,9,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x+side*Math.cos(angle)*25,p.y-8-Math.sin(angle)*25);
        ctx.lineWidth=4;ctx.strokeStyle=colors[i];ctx.stroke();ctx.lineWidth=1;
        ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 15px system-ui';ctx.fillText('P'+(i+1)+' · '+p.hp+' HP',p.x,p.y-44);
    });
    for(const shot of state.shots){ctx.beginPath();ctx.arc(shot.x,shot.y,4,0,Math.PI*2);ctx.fillStyle='#fff5be';ctx.fill();}
    for(const blast of state.blasts){
        ctx.beginPath();ctx.arc(blast.x,blast.y,Math.max(5,blast.radius*(1-blast.life/.42)),0,Math.PI*2);
        ctx.fillStyle='rgba(255,171,85,'+(blast.life/.5)+')';ctx.fill();
    }
    const p=state.tanks[state.turn];
    const text=state.winner==='draw'?'Draw':state.winner!==null?'Player '+(state.winner+1)+' wins':
        'Player '+(state.turn+1)+' · '+weapons[p.weapon]+' · '+(p.ammo[p.weapon]??'∞')+' ammo · '+p.angle+'° · '+p.power+' power · '+p.fuel+' fuel';
    if(status!==text){status=text;$('turn').textContent=text;}
}
let previous, accumulator=0, lastSend=0;
function frame(now){
    accumulator=Math.min(.15,accumulator+(previous===undefined?0:(now-previous)/1000));previous=now;
    while(accumulator>=1/60){
        if(state && mode!=='join') step(state,physics,1/60);
        accumulator-=1/60;
    }
    if(state && mode==='host' && now-lastSend>=50){send({state});lastSend=now;}
    if(!state && status){status='';$('turn').textContent='';}
    $('restart').hidden=!state || mode==='join';
    draw();requestAnimationFrame(frame);
}

try{
    const file=await fetch('./physics.wasm');
    if(!file.ok) throw new Error('Physics module unavailable.');
    physics=(await WebAssembly.instantiate(await file.arrayBuffer())).instance.exports;
    for(const button of document.querySelectorAll('[data-mode]')) button.disabled=false;
    report('Choose local or online multiplayer.');
    requestAnimationFrame(frame);
}catch(error){report('BitBlast could not start: '+error.message);}
