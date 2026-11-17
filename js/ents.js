/* VIKTOR LEGEND 2 — ents.js: група 5 героїв, селяни, тварини, риба, подійні NPC */
IB.E={team:[],npcs:[],animals:[],fishes:[],tourist:null,fishesSpawnT:0};

/* ---------- ГЕРОЇ v1.3 — п'ятірка з ПЕРШОЇ ЧАСТИНИ ----------
   Той самий персонаж (спрайт v5), тільки по кольору різні; імена світяться над головами. */
IB.HERO_DEFS=[
  {id:'viktor',name:'ЛЕГЕНДА',full:'ЛЕГЕНДА — ЛІДЕР ГРУПИ',talent:'ЛІДЕР',tdesc:'йде першим, веде групу',
   nameColor:'#f0d050',
   look:{skin:'#f0a482',hair:'#3e3220',hat:'none',jacket:'#66723e',pants:'#2a3e5c',pack:true,scarf:'#c83828'}},
  {id:'andriy',name:'TOXIC',full:'TOXIC — КУХАР',talent:'КУХАР',tdesc:'готування дає +50% ситості',
   nameColor:'#6ee04a',
   look:{skin:'#e0a878',hair:'#241a10',hat:'none',jacket:'#3e8a2e',pants:'#2e323a',pack:true}},
  {id:'taras',name:'PABLO',full:'PABLO — РИБАЛКА',talent:'РИБАЛКА',tdesc:'риба клює вдвічі частіше',
   nameColor:'#58a0ff',
   look:{skin:'#d89868',hair:'#1a120a',hat:'none',jacket:'#2a6ac8',pants:'#3e4038',pack:true,beard:true}},
  {id:'petro',name:'DIIN',full:'DIIN — МАЙСТЕР',talent:'МАЙСТЕР',tdesc:'будівництво табору дешевше на 25%',
   nameColor:'#f0c050',
   look:{skin:'#f0b48c',hair:'#2a1e12',hat:'none',jacket:'#d8a028',pants:'#3a3e4c',pack:true}},
  {id:'maksym',name:'ROCK',full:'ROCK — ВЕСЕЛЬЧАК',talent:'ВЕСЕЛЬЧАК',tdesc:'гулянки дужчі, знаходить «5 Г» частіше',
   nameColor:'#ff7a8a',
   look:{skin:'#e8ac80',hair:'#1e1610',hat:'none',jacket:'#b83848',pants:'#2e3238',pack:true}},
];
IB.mkHero=(def,x,y)=>{
  return {id:def.id,name:def.name,def,look:def.look,x,y,dir:'d',fr:0,frT:0,
    hp:100,food:80,water:80,mood:70,alc:0,cold:0,swim:false,
    task:'follow',taskT:0,target:null,speed:3.4,sayT:0};
};
IB.spawnTeam=(x,y)=>{
  IB.E.team=[];
  const offs=[[0,0],[-1,0.7],[1,0.8],[-1.6,-0.5],[1.7,-0.3]];
  IB.HERO_DEFS.forEach((d,i)=>{
    const h=IB.mkHero(d,x+offs[i][0],y+offs[i][1]);
    if(i===0){h.task='leader';}
    IB.E.team.push(h);
  });
};

/* ---------- СЕЛЯНИ ---------- */
const VIL_NAMES=['дід Гриць','пані Оксана','бармен Юрко','пані Марічка','малий Івась','коваль Дмитро','дід Мирослав','пані Гафія','дядько Левко','пані Соломія'];
IB.spawnCars=()=>{
  IB.E.cars=[];
  /* v1.3: справжні авто з першої частини — ВАЗ/Lanos/SUV/Truck (PNG v5) */
  const CAR_MODELS=['vaz','vaz','lanos','suv','vaz','lanos','truck'];
  let ci=0;
  for(const v of IB.W.VILLAGES){
    const my=v.y+(v.h>>1);
    IB.E.cars.push({type:'car',model:CAR_MODELS[ci%CAR_MODELS.length],x:v.x+3,y:my+0.5,dir:'r',v:1.1,
      a:v.x+2,b:v.x+v.w-3,c:'#b83a30',honkT:0});
    ci++;
    /* припарковане авто біля крамниці/корчми */
    IB.E.cars.push({type:'car',model:CAR_MODELS[(ci+3)%CAR_MODELS.length],x:v.x+8+IB.hsh(ci,3,44)*4,y:my+1.6,dir:'r',v:0,
      a:0,b:0,c:'#3a62b8',honkT:0});
  }
  /* білий фургон групи — спогад про Київ, стоїть у «Старому Вогнищі» */
  IB.E.cars.push({type:'van',x:IB.W.CAMPS[0].x+4.5,y:IB.W.CAMPS[0].y+3.5,dir:'r',v:0,
    a:0,b:0,c:'#e8e8e2',honkT:0});
};

IB.updateCars=(dt)=>{
  if(!IB.E.cars)return;
  const L=IB.E.team[0];
  for(const c of IB.E.cars){
    if(c.honkT>0)c.honkT-=dt;
    if(c.v<=0)continue;
    c.x+=c.dir==='r'?c.v*dt:-c.v*dt;
    if(c.x>c.b){c.x=c.b;c.dir='l';}
    if(c.x<c.a){c.x=c.a;c.dir='r';}
    if(L&&IB.dist(c.x,c.y,L.x,L.y)<2.2&&c.honkT<=0){
      c.honkT=7;IB.toast('БІП-БІП!','fun');
    }
  }
};

IB.spawnVillagers=()=>{
  IB.spawnCars();
  IB.E.npcs=[];
  const spots=[];
  for(const v of IB.W.VILLAGES){
    spots.push({x:v.x+2,y:v.y+4,v:v.id,role:'walk'});
    spots.push({x:v.x+v.w-3,y:v.y+v.h-3,v:v.id,role:'walk'});
  }
  spots.push({x:IB.W.VILLAGES[0].x+5,y:IB.W.VILLAGES[0].y+7,v:'tustan',role:'quest',name:'дід Гриць',quest:'wood'});
  spots.push({x:IB.W.VILLAGES[1].x+15,y:IB.W.VILLAGES[1].y+6,v:'verh',role:'quest',name:'пані Марічка',quest:'fish'});
  spots.push({x:IB.W.VILLAGES[1].x+8,y:IB.W.VILLAGES[1].y+15,v:'verh',role:'quest',name:'малий Івась',quest:'sheep'});
  spots.push({x:IB.W.VILLAGES[2].x+14,y:IB.W.VILLAGES[2].y+7,v:'krivo',role:'quest',name:'коваль Дмитро',quest:'forge'});
  spots.push({x:IB.W.VILLAGES[2].x+6,y:IB.W.VILLAGES[2].y+14,v:'krivo',role:'quest',name:'дід Мирослав',quest:'letter'});
  let si=0;
  for(const s of spots){
    const seed=si*17+3;si++;
    IB.E.npcs.push({
      x:s.x,y:s.y,dir:'d',fr:0,frT:0,
      look:IB.lookBySeed(seed),
      name:s.name||VIL_NAMES[si%VIL_NAMES.length],
      role:s.role||'walk',quest:s.quest||null,v:s.v,
      hx:s.x,hy:s.y,wt:0,tx:s.x,ty:s.y,talked:0
    });
  }
  /* Мольфар */
  IB.E.npcs.push({x:IB.W.MOLFAR.x,y:IB.W.MOLFAR.y+2,dir:'d',fr:0,frT:0,
    look:{skin:'#d8b090',hair:'#3a3230',hat:'molfar',jacket:'#2a2438',pants:'#2a2438',beard:true},
    name:'МОЛЬФАР',role:'molfar',quest:'molfar',hx:IB.W.MOLFAR.x,hy:IB.W.MOLFAR.y+2,wt:0,tx:0,ty:0,talked:0});
};

/* ---------- ТВАРИНИ ---------- */
IB.spawnAnimals=()=>{
  IB.E.animals=[];
  /* отари овець біля садиби і стайні */
  for(const v of IB.W.VILLAGES){
    const n=4+IB.ri(0,3);
    for(let i=0;i<n;i++){
      IB.E.animals.push({type:'sheep',x:v.x+6+IB.rnd(-3,8),y:v.y+4+IB.rnd(-2,3),dir:'d',fr:0,frT:0,wt:0,tx:0,ty:0,pen:v.id});
    }
  }
  /* кози на полонинах */
  for(let i=0;i<6;i++){
    IB.E.animals.push({type:'goat',x:82+IB.rnd(-12,12),y:58+IB.rnd(-10,10),dir:'d',fr:0,frT:0,wt:0,tx:0,ty:0});
  }
  /* пес біля корчми Верховинки */
  IB.E.animals.push({type:'dog',x:IB.W.VILLAGES[1].x+13,y:IB.W.VILLAGES[1].y+9,dir:'d',fr:0,frT:0,wt:0,tx:0,ty:0});
  /* ведмідь — глибокий ліс */
  IB.E.animals.push({type:'bear',x:130,y:66,dir:'d',fr:0,frT:0,wt:0,tx:0,ty:0});
};
IB.spawnFishes=()=>{
  IB.E.fishes=[];
  const L=IB.W.LAKE;
  for(let i=0;i<10;i++){
    const a=IB.rnd(0,6.28),r=IB.rnd(2,L.r-2.5);
    IB.E.fishes.push({x:L.x+IB.M.cos(a)*r,y:L.y+IB.M.sin(a)*r,t:IB.rnd(0,3)});
  }
  for(let i=0;i<8;i++)IB.E.fishes.push({x:IB.rnd(6,230),y:132+IB.M.sin(IB.rnd(0,200)*0.032)*20,t:IB.rnd(0,3)});
};

/* ---------- ЗАГУБЛЕНИЙ ТУРИСТ (подія) ---------- */
IB.spawnTourist=()=>{
  if(IB.E.tourist)return;
  const c=IB.W.CAMPS[IB.ri(0,IB.W.CAMPS.length-1)];
  let tx,ty,tries=0;
  do{tx=c.x+IB.rnd(-26,26);ty=c.y+IB.rnd(-26,26);tries++;}
  while(tries<40&&(IB.W.at(tx,ty)===0||IB.W.elevAt(tx,ty)>=6));
  IB.E.tourist={x:tx,y:ty,dir:'d',fr:0,frT:0,
    look:{skin:'#e0a878',hair:'#241a10',hat:'cap',hatc:'#e07038',jacket:'#e07038',pants:'#3a3a44'},
    name:'ЗАГУБЛЕНИЙ ТУРИСТ',found:false,follow:false};
  IB.logLine('СЛУХ: десь у лісі хтось кричить «ДОПОМОЖІТЬ!»','gold');
};

/* ---------- РУХ/ШІ ---------- */
function walkable(x,y){
  const t=IB.W.at(x,y);
  if(t===0)return false;
  if(IB.W.block[(y|0)*IB.W.W+(x|0)])return false;
  const p=IB.W.propAt(x,y);
  if(p&&(p.type==='spruce'||p.type==='spruce2'||p.type==='spruce3'||p.type==='birch'||p.type==='pine'||p.type==='oak'||p.type==='tree2'||p.type==='tower'||p.type==='rock'||p.type==='mrock'||p.type==='deadtree'||p.type==='bench'||p.type==='barrels'||p.type==='crate'||p.type==='busstop'||p.type==='swing'||p.type==='slide'))return false;
  return true;
}
IB.walkable=walkable;

function moveEnt(e,dt,speed){
  if(e.tx===undefined)return false;
  const dx=e.tx-e.x,dy=e.ty-e.y,d=IB.M.hypot(dx,dy);
  if(d<0.15){e.x=e.tx;e.y=e.ty;return true;}
  const st=Math.min(d,speed*dt);
  let nx=e.x+dx/d*st,ny=e.y+dy/d*st;
  /* висота: не стрибаємо >1 */
  const de=IB.W.elevAt(nx,ny)-IB.W.elevAt(e.x,e.y);
  if(IB.M.abs(de)<=1.01&&walkable(nx,ny)){e.x=nx;e.y=ny;}
  else if(walkable(nx,e.y)&&IB.M.abs(IB.W.elevAt(nx,e.y)-IB.W.elevAt(e.x,e.y))<=1.01){e.x=nx;}
  else if(walkable(e.x,ny)&&IB.M.abs(IB.W.elevAt(e.x,ny)-IB.W.elevAt(e.x,e.y))<=1.01){e.y=ny;}
  if(IB.M.abs(dx)>0.1)e.dir=dx>0?'r':'l';else if(IB.M.abs(dy)>0.1)e.dir=dy>0?'d':'u';
  e.frT+=dt*8;e.fr=1+((e.frT|0)%2);
  return false;
}
function idleAnim(e,dt){e.fr=0;e.frT=0;}

function pickWander(e,r){
  for(let i=0;i<8;i++){
    const nx=e.hx+IB.rnd(-r,r),ny=e.hy+IB.rnd(-r,r);
    if(walkable(nx,ny)){e.tx=nx;e.ty=ny;return true;}
  }
  return false;
}

/* оновлення NPC-селян */
IB.updateNpcs=(dt)=>{
  for(const n of IB.E.npcs){
    if(n.role==='molfar'){idleAnim(n,dt);continue;}
    n.wt-=dt;
    if(n.tx!==n.x||n.ty!==n.y){moveEnt(n,dt,1.1);if(n.x===n.tx&&n.y===n.ty)n.wt=IB.rnd(2,6);}
    else if(n.wt<=0){if(!pickWander(n,4))n.wt=2;}
    else idleAnim(n,dt);
  }
};
IB.updateAnimals=(dt)=>{
  for(const a of IB.E.animals){
    a.wt-=dt;
    if(a.tx!==a.x||a.ty!==a.y){moveEnt(a,dt,a.type==='bear'?1.6:1.2);if(a.x===a.tx&&a.y===a.ty)a.wt=IB.rnd(3,8);}
    else if(a.wt<=0){if(!pickWander(a,a.type==='bear'?6:3))a.wt=3;}
    else idleAnim(a,dt);
    /* ведмідь: наблизився — герой зоряє */
    if(a.type==='bear'&&IB.G.mode==='game'&&!IB.G.scene){
      const h=IB.E.team[0];
      if(IB.dist(a.x,a.y,h.x,h.y)<4&&a.scareT===undefined){
        a.scareT=1;
        IB.logLine('ВЕДМІДЬ! Рятуйся, біжи! (SHIFT)','red');
        IB.SFX.alert();
        h.mood=IB.clamp(h.mood-10,0,100);
        a.tx=a.x+IB.rnd(-10,10);a.ty=a.y+IB.rnd(-10,10);
      }
      if(a.scareT!==undefined){a.scareT-=dt;if(a.scareT<=0)delete a.scareT;}
    }
  }
  /* риби кружляють */
  for(const f of IB.E.fishes){
    f.t+=dt;
    const s=IB.M.sin(f.t*0.7)*0.35,c=IB.M.cos(f.t*0.5)*0.3;
    if(IB.W.at(f.x+s,f.y+c)===0){f.x+=s*dt*0.6;f.y+=c*dt*0.6;}
  }
};
IB.updateTourist=(dt)=>{
  const t=IB.E.tourist;
  if(!t)return;
  if(t.follow){
    const h=IB.E.team[0];
    const d=IB.dist(t.x,t.y,h.x,h.y);
    if(d>2){t.tx=h.x;t.ty=h.y;moveEnt(t,dt,3.2);}
    else{idleAnim(t,dt);
      /* привів у кемпінг? */
      const c=IB.G.nearCamp(h.x,h.y,7);
      if(c){IB.SYS.touristRescued(c);}}
  }else{
    idleAnim(t,dt);
    t.frT+=dt*2;t.fr=(t.frT|0)%2?1:0;
  }
};

/* ---------- ЗАВДАННЯ ГЕРОЇВ (дерева/вода/риба/готування/ферма) ---------- */
IB.findNode=(type,ax,ay,r)=>{
  let best=null,bd=1e9;
  for(const p of IB.W.props){
    if(p.type!==type)continue;
    if(type==='bush'&&!p.berries)continue;
    if(type==='mush'&&p.taken)continue;
    if(type==='herb'&&p.taken)continue;
    const d=IB.dist(p.x,p.y,ax,ay);
    if(d<r&&d<bd){bd=d;best=p;}
  }
  return best;
};
IB.nodeUsed=new Set();

IB.updateTeam=(dt)=>{
  const leader=IB.E.team[0];
  const fire=IB.G.fireNear?IB.G.fireNear:null;
  for(let i=1;i<IB.E.team.length;i++){
    const h=IB.E.team[i];
    if(IB.G.party.active||IB.G.trip.active){idleAnim(h,dt);continue;}
    if(h.task==='follow'){
      const ang=i*1.35+IB.M.sin(IB.G.t*0.5+i)*0.2;
      const tx=leader.x-IB.M.cos(ang)*1.6,ty=leader.y-IB.M.sin(ang)*1.6;
      const d=IB.dist(h.x,h.y,tx,ty);
      if(d>1.6){h.tx=tx;h.ty=ty;moveEnt(h,dt,leader.running?4.6:3.4);}
      else{idleAnim(h,dt);}
      continue;
    }
    /* робота за дорученням */
    if(h.task==='rest'){idleAnim(h,dt);h.hp=IB.clamp(h.hp+dt*4,0,100);continue;}
    const need=IB.TASKS[h.task];
    if(!need)continue;
    if(!h.target){
      const n=IB.findNode(need.node,h.x,h.y,30);
      if(n&&!IB.nodeUsed.has(n)){h.target=n;IB.nodeUsed.add(n);}
      else if(need.at==='water'&&h.task==='water'){
        /* до води/колодязя */
        const w=IB.nearestWater(h.x,h.y,26);
        if(w){h.target={x:w.x,y:w.y,water:true};}
        else{h.task='follow';IB.logLine(h.name+' не знайшов воду поруч','red');continue;}
      }
      else{h.task='follow';continue;}
    }
    const tgt=h.target;
    const d=IB.dist(h.x,h.y,tgt.x,tgt.y);
    if(d>1.35){
      /* застряг біля перешкоди? — змінюємо ціль */
      if(h.lx===undefined){h.lx=h.x;h.ly=h.y;h.stuckT=0;}
      h.stuckT+=dt;
      if(IB.dist(h.x,h.y,h.lx,h.ly)<0.25){
        if(h.stuckT>2.5){IB.nodeUsed.delete(tgt);h.target=null;h.stuckT=0;h.lx=h.x;h.ly=h.y;continue;}
      }else{h.stuckT=0;h.lx=h.x;h.ly=h.y;}
      h.tx=tgt.x;h.ty=tgt.y;moveEnt(h,dt,2.8);
    }
    else{
      idleAnim(h,dt);
      h.taskT+=dt;
      if(h.taskT>=need.time){
        h.taskT=0;
        need.done(h,tgt);
        if(tgt.water){h.target=null;}
        else{
          /* вичерпаний ресурс? */
          if(tgt.type==='wood'&&tgt.amt<=0){IB.W.props.splice(IB.W.props.indexOf(tgt),1);IB.W.grid.delete(tgt.y*IB.W.W+tgt.x);IB.nodeUsed.delete(tgt);}
          if((tgt.type==='mush'||tgt.type==='herb')&&tgt.taken){IB.nodeUsed.delete(tgt);h.target=null;}
          if(tgt.type==='bush'&&!tgt.berries){IB.nodeUsed.delete(tgt);h.target=null;}
          if(h.target===tgt&&(tgt.type!=='wood'||tgt.amt<=0))h.target=null;
        }
      }
    }
  }
  IB.nodeUsedClearT=(IB.nodeUsedClearT||0)+dt;
  if(IB.nodeUsedClearT>30){IB.nodeUsedClearT=0;IB.nodeUsed.clear();}
};

IB.TASKS={
  wood:{node:'wood',time:6,at:'land',label:'рубати дрова',
    done(h,t){const n=Math.min(t.amt,1+IB.ri(0,1));t.amt-=n;IB.G.inv.wood+=n;IB.SFX.chop();
      IB.floatMsg(h.x,h.y,'+'+n+'🌲');IB.logLine(h.name+' наклав дров (+'+n+')');}},
  water:{node:null,time:4,at:'water',label:'носити воду',
    done(h,t){IB.G.inv.water=IB.M.min((IB.G.inv.water||0)+2,10);IB.SFX.drink();
      IB.floatMsg(h.x,h.y,'+2💧');IB.logLine(h.name+' приніс воду (+2)');}},
  fish:{node:null,time:9,at:'water',label:'рибалити',
    done(h,t){const lucky=h.id==='taras';const r=IB.M.random();
      if(r<(lucky?0.85:0.55)){IB.G.inv.fishraw+=1;IB.SFX.fish();IB.floatMsg(h.x,h.y,'+1🐟');
        IB.logLine(h.name+(lucky?' витягнув ЗОЛОТУ рибину!':' витягнув рибину!'));}
      else{IB.floatMsg(h.x,h.y,'мимо');}}},
  farm:{node:null,time:8,at:'camp',label:'доглядати грядку',
    done(h,t){IB.SYS.farmTick(h);}},
  cook:{node:null,time:10,at:'camp',label:'готувати їжу',
    done(h,t){IB.SYS.autoCook(h);}},
};
IB.nearestWater=(x,y,r)=>{
  let best=null,bd=1e9;
  for(let dy=-r;dy<=r;dy+=1)for(let dx=-r;dx<=r;dx+=1){
    if(IB.W.at(x+dx,y+dy)!==0)continue;
    const d=IB.M.hypot(dx,dy);
    if(d<bd){bd=d;best={x:x+dx,y:y+dy};}
  }
  return best;
};
IB.nearCamp=(x,y,r=4)=>{
  for(const c of IB.W.CAMPS)if(IB.dist(x,y,c.x,c.y)<=IB.M.max(r,c.r))return c;
  return null;
};
