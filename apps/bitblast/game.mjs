export const width = 960, height = 540;
export const ground = x => 411 + 30*Math.sin(x/82) + 20*Math.cos(x/47);
export const weapons = ['Standard','Cluster','Sticky Bomb','Rain','Bounce'];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const tank = x => ({x,y:ground(x)-12,hp:100,fuel:100,angle:40,power:65,weapon:0,ammo:[null,3,3,2,3],jump:0});
export const match = () => ({tanks:[tank(135),tank(825)],turn:0,winner:null,shots:[],blasts:[],delay:0});

export function act(state, seat, key) {
    if(seat!==state.turn || state.winner!==null || state.shots.length || state.delay) return;
    const p=state.tanks[seat], enemy=state.tanks[1-seat];
    switch(key) {
        case 'a': case 'd': {
            const x=clamp(p.x+(key==='a'?-5:5),22,width-22);
            if (p.fuel && Math.abs(x-enemy.x)>36) {p.x=x;p.fuel--;}
            break;
        }
        case 'w': case 's': p.angle=clamp(p.angle+(key==='w'?2:-2),8,85); break;
        case 'q': case 'e': p.power=clamp(p.power+(key==='e'?2:-2),20,100); break;
        case 'shift': if(p.fuel>=12 && p.jump===0){p.fuel-=12;p.jump=.6;} break;
        case ' ': {
            if(p.ammo[p.weapon]===0) break;
            if(p.ammo[p.weapon]!==null) p.ammo[p.weapon]--;
            const angle=p.angle*Math.PI/180, speed=p.power*5.4, side=p.x<enemy.x?1:-1;
            state.shots.push({x:p.x+side*22,y:p.y-12,vx:side*Math.cos(angle)*speed,vy:-Math.sin(angle)*speed,weapon:p.weapon,age:0,bounces:0});
            break;
        }
        default: if(/^[1-5]$/.test(key)) p.weapon=Number(key)-1;
    }
}

export function step(state, physics, dt) {
    for(const p of state.tanks){
        p.jump=Math.max(0,p.jump-dt);
        p.y=ground(p.x)-12-58*Math.sin(p.jump/.6*Math.PI);
    }
    for(const blast of state.blasts) blast.life-=dt;
    state.blasts=state.blasts.filter(blast=>blast.life>0);
    if(state.delay){
        state.delay=Math.max(0,state.delay-dt);
        if(!state.delay){state.turn=1-state.turn;state.tanks[state.turn].fuel=100;}
    }
    if(!state.shots.length || state.winner!==null) return;
    const next=[];
    for(const s of state.shots){
        s.age+=dt;
        s.x=physics.advance_x(s.x,s.vx,dt);
        s.y=physics.advance_y(s.y,s.vy,dt);
        s.vy=physics.advance_vy(s.vy,dt);
        if(s.age>12 || s.x < -30 || s.x > width+30 || s.y > height+20) continue;
        const hit=s.age>.14 && state.tanks.some(p=>Math.abs(p.x-s.x)<17 && Math.abs(p.y-s.y)<13);
        if(!hit && s.y<ground(s.x)){next.push(s);continue;}
        if(!hit && s.weapon===4 && s.bounces<2){
            s.bounces++;s.y=ground(s.x)-3;s.vy=-Math.max(65,Math.abs(s.vy)*.55);s.vx*=.84;next.push(s);continue;
        }
        if(s.weapon===1 || s.weapon===3){
            const rain=s.weapon===3;
            for(const offset of [-35,0,35]) next.push({...s,x:clamp(s.x+offset,5,width-5),y:s.y-(rain?160:40),vx:rain?0:offset*1.45,vy:rain?95:-82,weapon:5,age:0});
            continue;
        }
        const radius=s.weapon===2?98:73;
        state.blasts.push({x:s.x,y:s.y,radius,life:.36});
        for(const p of state.tanks){
            const damage=physics.blast_damage(p.x-s.x,p.y-s.y,radius,s.weapon===5?23:s.weapon===2?57:49);
            p.hp=Math.max(0,p.hp-Math.round(damage));
        }
    }
    state.shots=next;
    if(state.tanks.some(p=>p.hp===0)){
        state.winner=state.tanks.every(p=>p.hp===0)?'draw':state.tanks[0].hp?0:1;
        state.shots=[];
    }else if(!next.length) state.delay=.65;
}
