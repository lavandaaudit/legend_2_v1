/* VIKTOR LEGEND 2 — main.js: цикл, керування, взаємодії, панелі, діалоги, HUD */
IB.showScene=(icon,title,text)=>{
  const sc={icon,title,text};
  if(IB._sceneOpen){(IB._sceneQueue=IB._sceneQueue||[]).push(sc);return;}
  IB._openScene(sc);
};
IB._openScene=(sc)=>{
  IB._sceneOpen=true;
  IB.$('scene-icon').textContent=sc.icon;
  IB.$('scene-title').textContent=sc.title;
  IB.$('scene-text').textContent=sc.text;
  IB.$('scene').classList.remove('hidden');
  IB.SFX.ui&&IB.SFX.ui();
};
IB.closeScene=()=>{
  IB._sceneOpen=false;
  IB.$('scene').classList.add('hidden');
  const q=IB._sceneQueue&&IB._sceneQueue.shift();
  if(q)IB._openScene(q);
};

IB.MAIN=(function(){
  let cv,g,last=0,acc=0,hudT=0,autoT=0;
  let mode='boot';
  let menuIdx=0,dlgIdx=0;
  let channel=null; /* рубка дров: {prop,t} */
  const KEY={KeyW:'w',ArrowUp:'up',KeyS:'s',ArrowDown:'down',KeyA:'a',ArrowLeft:'left',KeyD:'d',ArrowRight:'right',
    ShiftLeft:'shift',ShiftRight:'shift',KeyE:'e',KeyM:'m',KeyQ:'q',KeyI:'i',KeyV:'fs',KeyP:'p',KeyG:'grp',KeyJ:'jrnl',
    KeyT:'t',Tab:'tab',Escape:'esc',Enter:'enter',Space:'space',Digit1:'1',Digit2:'2',Digit3:'3',Digit4:'4'};
  const keys={},pressed={};

  window.addEventListener('keydown',ev=>{
    const k=KEY[ev.code];
    if(k){if(!keys[k])pressed[k]=true;keys[k]=true;
      if(['tab','esc','space','enter','e','m','q','1','2','3','4','up','down','left','right'].indexOf(k)>=0)ev.preventDefault();}
    IB.AUDIO.init();
  },{passive:false});
  window.addEventListener('keyup',ev=>{const k=KEY[ev.code];if(k)keys[k]=false;});
  window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
  /* BOOT: старт тапом/кліком (мобільні, вбудовані переглядачі) */
  window.addEventListener('pointerdown',()=>{if(mode==='boot'&&bootReady)toTitle();});

  /* сенсорне керування */
  function bindTouch(){
    const pad=IB.$('dpad');if(!pad)return;
    const knob=IB.$('dpad-knob');
    const btns={a:'e',h:'shift',c:'tab',d:'m',g:'grp',q:'q',t:'t'};
    document.querySelectorAll('[data-tk]').forEach(el=>{
      const k=btns[el.dataset.tk];
      const toggleMode=k==='shift';
      let lastPointerT=0;
      const on=ev=>{ev.preventDefault();lastPointerT=performance.now();
        if(toggleMode){keys[k]=!keys[k];el.classList.toggle('on',keys[k]);if(keys[k])pressed[k]=true;return;}
        if(!keys[k])pressed[k]=true;keys[k]=true;el.classList.add('on');};
      const off=ev=>{ev.preventDefault();keys[k]=false;el.classList.remove('on');};
      el.addEventListener('touchstart',on,{passive:false});
      el.addEventListener('touchend',off,{passive:false});
      el.addEventListener('touchcancel',off,{passive:false});
      el.addEventListener('mousedown',on);
      el.addEventListener('mouseup',off);
      el.addEventListener('mouseleave',off);
      /* fallback для синтетичних кліків (тест/деякі браузери) */
      el.addEventListener('click',ev=>{
        if(performance.now()-lastPointerT<500)return;
        on(ev);setTimeout(()=>off(ev),90);
      });
    });
    let cx=0,cy=0,pid=null;
    const setKnob=(dx,dy)=>{if(knob)knob.style.transform='translate('+(dx*24)+'px,'+(dy*24)+'px)';};
    const start=ev=>{ev.preventDefault();const t=ev.changedTouches?ev.changedTouches[0]:ev;const r=pad.getBoundingClientRect();
      cx=r.left+r.width/2;cy=r.top+r.height/2;touch.active=true;if(t.identifier!==undefined)pid=t.identifier;pad.classList.add('on');};
    const move=ev=>{
      if(!touch.active)return;ev.preventDefault();
      let t=null;
      if(ev.changedTouches){for(const tt of ev.changedTouches)if(tt.identifier===pid)t=tt;if(!t)return;}
      else t=ev;
      let dx=(t.clientX-cx)/38,dy=(t.clientY-cy)/38;
      const l=IB.M.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}
      touch.x=dx;touch.y=dy;
      keys.w=dy<-0.3;keys.up=keys.w;keys.s=dy>0.3;keys.down=keys.s;
      keys.a=dx<-0.3;keys.left=keys.a;keys.d=dx>0.3;keys.right=keys.d;
      setKnob(dx,dy);
    };
    const end=ev=>{ev.preventDefault();touch.active=false;touch.x=touch.y=0;pid=null;
      keys.w=keys.s=keys.a=keys.d=keys.up=keys.down=keys.left=keys.right=false;setKnob(0,0);pad.classList.remove('on');};
    pad.addEventListener('touchstart',start,{passive:false});
    pad.addEventListener('touchmove',move,{passive:false});
    pad.addEventListener('touchend',end,{passive:false});
    pad.addEventListener('touchcancel',end,{passive:false});
    pad.addEventListener('mousedown',start);
    window.addEventListener('mousemove',ev=>{if(touch.active&&pid===null)move(ev);});
    window.addEventListener('mouseup',ev=>{if(touch.active&&pid===null)end(ev);});
  }
  const touch={x:0,y:0,active:false};
  function moveVec(){
    let x=0,y=0;
    if(keys.a||keys.left)x-=1;if(keys.d||keys.right)x+=1;
    if(keys.w||keys.up)y-=1;if(keys.s||keys.down)y+=1;
    if(touch.active){x+=touch.x;y+=touch.y;}
    const l=IB.M.hypot(x,y);if(l>1){x/=l;y/=l;}
    return {x,y};
  }
  function consume(k){if(pressed[k]){pressed[k]=false;return true;}return false;}
  function clearP(){for(const k in pressed)pressed[k]=false;}

  /* ---------- BOOT ---------- */
  function bootSeq(){
    const b=IB.$('boot');
    const lines=['IBONARIUM MODEL IK-1601','16-BIT OK','RAM 128K OK','КАРТРИДЖ: VIKTOR LEGEND 2 — КАРПАТИ','ТАБІР SURVIVAL • ЧАСТИНА 2','','ГЕНЕРАЦІЯ КАРПАТ...'];
    b.innerHTML=lines.map(l=>'<div class="bline '+(l.includes('КАРТРИДЖ')?'gold':(l?'':'dim'))+'">'+l+'</div>').join('')+'<div class="bline dim blink">███</div>';
    setTimeout(()=>{
      try{IB.genWorld();}catch(e){console.error(e);b.innerHTML+='<div class="bline" style="color:red">ПОМИЛКА ГЕНЕРАЦІЇ: '+e.message+'</div>';return;}
      const fin=()=>{b.innerHTML+='<div class="bline gold">✓ ГОТОВО — ЖМИ БУДЬ-ЯКУ КЛАВІШУ</div>';bootReady=true;};
      /* v1.3: чекаємо декодування активів першої частини (макс 2.5с) */
      if(IB.IMG_READY)IB.IMG_READY.then(fin,fin);else fin();
    },700);
  }
  let bootReady=false;
  function toTitle(){
    mode='title';
    IB.$('boot').classList.add('hidden');
    IB.$('title').classList.remove('hidden');
    drawLogo();
    const items=[];
    if(IB.hasSave())items.push({t:'ПРОДОВЖИТИ ПОХІД',f:()=>{IB.genWorld();if(!IB.loadGame())newGame();startGame();}});
    items.push({t:'НОВА ГРА',f:()=>{newGame();startGame();}});
    items.push({t:'ПРО ГРУ ТА АСЕТИ',f:()=>{document.getElementById('about').scrollIntoView({behavior:'smooth'});}});
    buildMenu(items);
  }
  function buildMenu(items){
    const m=IB.$('menu');
    m.innerHTML='';
    items.forEach((it,i)=>{
      const d=document.createElement('div');
      d.className='mi'+(i===menuIdx?' sel':'');
      d.textContent=it.t;
      d.onclick=()=>{menuIdx=i;IB.SFX.ui();it.f();};
      m.appendChild(d);
    });
    IB._menuItems=items;
  }
  function drawLogo(){
    const c=IB.$('logo'),lg=c.getContext('2d');
    lg.imageSmoothingEnabled=false;
    lg.fillStyle='#0a140c';lg.fillRect(0,0,320,150);
    /* гори */
    const P=IB.PAL;
    lg.fillStyle='#16241a';lg.fillRect(0,0,320,150);
    for(let i=0;i<5;i++){
      const px=40+i*60,ph=50+((i*37)%40);
      lg.fillStyle=['#1e3526','#24402c','#2a4a32'][i%3];
      lg.beginPath();lg.moveTo(px-70,150);lg.lineTo(px,150-ph);lg.lineTo(px+70,150);lg.fill();
      lg.fillStyle='#c8d8e4';
      lg.beginPath();lg.moveTo(px-12,150-ph+26);lg.lineTo(px,150-ph);lg.lineTo(px+12,150-ph+26);lg.lineTo(px+5,150-ph+20);lg.lineTo(px-5,150-ph+24);lg.fill();
    }
    lg.font='16px monospace';lg.fillStyle='#f0d050';lg.textAlign='center';
    lg.fillText('VIKTOR LEGEND 2',160,40);
    lg.font='22px monospace';lg.fillStyle='#7ccc8e';lg.fillText('К А Р П А Т И',160,66);
    lg.font='8px monospace';lg.fillStyle='#d8e2d6';lg.fillText('ТАБІР • ГУЛЯНКИ • АРТЕФАКТИ • «5 Г»',160,84);
    lg.font='7px monospace';lg.fillStyle='#8fa292';
    lg.fillText('ЛЕГЕНДА • TOXIC • PABLO • DIIN • ROCK',160,100);
    lg.fillStyle='#4a3a20';lg.fillRect(60,118,18,10);lg.fillRect(70,112,10,8);
    lg.fillStyle='#e07038';lg.fillRect(64,116,4,4);
    lg.textAlign='left';
  }
  function newGame(){
    IB.genWorld();
    IB.spawnTeam(IB.W.CAMPS[0].x,IB.W.CAMPS[0].y);
    IB.spawnVillagers();IB.spawnAnimals();IB.spawnFishes();
    IB.G.mode='game';IB.G.t=8;IB.G.day=1;
    IB.journalAdd('🚐','Частина 2 почалася. Після Києва група дісталася Карпат. Перший кемпінг — «Старе Вогнище».');
    IB.journalAdd('👥','Група з Києва: ЛЕГЕНДА (лідер), TOXIC (кухар), PABLO (рибалка), DIIN (майстер), ROCK (весельчак).');
    IB.banner('КАРПАТИ. ДЕНЬ ПЕРШИЙ.');
    IB.toast('E — дія • M — багаж • TAB — карта • Q — гулянка','gold');
  }
  function startGame(){
    IB.$('title').classList.add('hidden');
    IB.$('hud').classList.remove('hidden');
    mode='game';
    IB.MUSIC.day();
    drawFaceOnce();
    IB.toast('Завдання: '+IB.questT(),'gold');
  }

  /* ---------- HUD ---------- */
  function drawFaceOnce(){
    const fc=IB.$('face');
    IB.drawFace(fc.getContext('2d'),IB.HERO_DEFS[0].look);
  }
  function updateHUD(){
    const L=IB.E.team[0];
    IB.$('bar-hp').style.width=L.hp+'%';
    IB.$('bar-hu').style.width=L.food+'%';
    IB.$('bar-wa').style.width=L.water+'%';
    IB.$('bar-mo').style.width=L.mood+'%';
    const tm=IB.$('hud-team');
    let html='';
    for(let i=1;i<IB.E.team.length;i++){
      const h=IB.E.team[i];
      const bad=h.food<20||h.water<20||h.cold>60||h.frozen;
      const stt=h.frozen?'❄ ЗАМЕРЗАЄ':(h.task==='follow'?'слідує':(IB.TASKS[h.task]?IB.TASKS[h.task].label:''));
      html+='<div class="tm-row'+(bad?' bad':'')+'"><span class="dot" style="background:'+h.look.jacket+'"></span>'+h.name+'<span class="stt">'+stt+'</span></div>';
    }
    tm.innerHTML=html;
    IB.$('hud-clock').textContent=IB.clockStr();
    IB.$('hud-day').firstChild.textContent='ДЕНЬ '+IB.G.day+' ';
    const wx=IB.WX.cur();
    const wxe=IB.$('hud-wx');
    wxe.textContent=wx.label;
    wxe.className='wxs '+wx.cls;
    IB.$('hud-money').textContent='₴'+IB.G.money;
    IB.$('hud-mtitle').textContent=IB.questT();
    IB.$('hud-mob').textContent=IB.W.zoneAt(L.x,L.y);
    if(IB.G.party.active)IB.alertBox('🔥 ГУЛЯНКА: '+IB.G.party.t.toFixed(1)+' / 8 ГОД','al-fun');
    else if(IB.G.trip.active)IB.alertBox('✦ ТРІП: '+IB.G.trip.t.toFixed(1)+' / 6 ГОД','al-fun');
    else if(IB.G.hangover>0)IB.alertBox('😵 ПОХМІЛЛЯ (до 12:00) — вода/їжа/розсіл','al-warn');
    else if(IB.G.frozenMate)IB.alertBox('❄ '+IB.G.frozenMate.name+' ЗАМЕРЗАЄ — СИНІЙ МАРКЕР!','al-red');
    else if(IB.G.wx.type==='blizzard')IB.alertBox('❄ ХУРТОВИНА — БУДЬ БІЛЯ ВОГНЮ','al-red');
    else IB.alertBox('');
    /* мінімапа кожні 0.2с */
    if(!updateHUD.mmC){updateHUD.mmC=IB.$('minimap').getContext('2d');}
    IB.drawMinimap(updateHUD.mmC);
  }

  /* ---------- РУХ ЛІДЕРА ---------- */
  function updateLeader(dt){
    const L=IB.E.team[0];
    if(IB.G.party.active||IB.G.trip.active||IB._sceneOpen||mode!=='game'){L.fr=0;return;}
    const mv=moveVec();
    L.running=!!keys.shift;
    const spd=IB.heroSpeed(L)*(mv.x||mv.y?1:0);
    if(channel){channel.t+=dt;promptChannel();
      if(channel.t>=channel.dur){finishChannel();}
      if(mv.x||mv.y){channel=null;}
      return;
    }
    if(mv.x||mv.y){
      const nx=L.x+mv.x*spd*dt, ny=L.y+mv.y*spd*dt;
      const inWater=IB.W.at(nx,ny)===0;
      const curH=IB.W.elevAt(L.x,L.y);
      let ok=true;
      if(!inWater){
        const dh=IB.W.elevAt(nx,ny)-curH;
        if(IB.M.abs(dh)>1.01)ok=false;
        if(!IB.walkable(nx,ny))ok=false;
      }else{
        if(IB.G.wx.type==='blizzard'){IB.toastOnce&&0;}
      }
      /* окремі осі */
      if(ok){L.x=nx;L.y=ny;}
      else{
        if(!inWater&&IB.walkable(nx,L.y)&&IB.M.abs(IB.W.elevAt(nx,L.y)-curH)<=1.01)L.x=nx;
        else if(!inWater&&IB.walkable(L.x,ny)&&IB.M.abs(IB.W.elevAt(L.x,ny)-curH)<=1.01)L.y=ny;
      }
      if(inWater&&!L.swim){L.swim=true;IB.SFX.splash();IB.toast('Ти у воді! Виходь на берег, інакше замерзнеш');}
      if(!inWater&&L.swim){L.swim=false;}
      if(inWater){L.hp=IB.clamp(L.hp-dt*0.8,0,100);L.cold=IB.clamp(L.cold+dt*2.5,0,100);
        if(wx&&IB.G.wx.type==='sun'&&IB.nightFactor()<0.2&&IB.hStr()>11&&IB.hStr()<16){L.mood=IB.clamp(L.mood+dt*2,0,100);
          if(IB.M.random()<dt*0.2)IB.floatMsg(L.x,L.y,'😊');}}
      if(mv.y>0)L.dir='d';else if(mv.y<0)L.dir='u';
      else if(mv.x>0)L.dir='r';else if(mv.x<0)L.dir='l';
      L.frT+=dt*(L.running?10:7);L.fr=1+((L.frT|0)%2);
      if(IB.M.random()<dt*2&&L.running)IB.SFX.step();
    }else{L.fr=0;L.frT=0;}
    /* персонажі не виходять за карту */
    L.x=IB.clamp(L.x,1,IB.W.W-2);L.y=IB.clamp(L.y,1,IB.W.H-2);
  }

  /* ---------- ВЗАЄМОДІЇ (E) ---------- */
  function interactTarget(){
    const L=IB.E.team[0];
    const tx=IB.M.floor(L.x),ty=IB.M.floor(L.y);
    /* NPC — найвищий пріоритет */
    let bestNpc=null,bnd=1e9;
    for(const n of IB.E.npcs){
      const dd=IB.dist(L.x,L.y,n.x,n.y);
      if(dd<1.6&&dd<bnd){bnd=dd;bestNpc=n;}
    }
    if(bestNpc)return {kind:'npc',n:bestNpc,label:'Говорити: '+bestNpc.name};
    if(IB.E.tourist&&!IB.E.tourist.follow&&IB.dist(L.x,L.y,IB.E.tourist.x,IB.E.tourist.y)<2)
      return {kind:'tourist',label:'Допомогти туристу'};
    /* пропси навколо */
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const p=IB.W.propAt(tx+dx,ty+dy);
      if(!p)continue;
      if(IB.dist(L.x,L.y,p.x+0.5,p.y+0.5)>1.7)continue;
      if(p.type==='bush'&&p.berries)return {kind:'bush',p,label:'Зірвати ягоди'};
      if(p.type==='mush'&&!p.taken)return {kind:'mush',p,label:'Зібрати гриби'};
      if(p.type==='triph')return {kind:'triph',p,label:'Знайти «5 г»?!'};
      if(p.type==='herb'&&!p.taken)return {kind:'herb',p,label:'Зібрати трави'};
      if(p.type==='wood'&&p.amt>0)return {kind:'wood',p,label:'Рубати дрова'};
      if(p.type==='flower')return {kind:'flower',p,label:'Нюхнути квітку'};
    }
    /* будівлі — двері */
    let bestDoor=null,bdd=1e9,blbl='';
    for(const b of IB.W.buildings){
      const dd=IB.dist(L.x,L.y,b.door.x,b.door.y+0.5);
      if(dd<1.6&&dd<bdd){bdd=dd;
        blbl=b.type==='shop'?'Крамниця':(b.type==='bar'?'Корчма':(b.type==='forge'?'Ковальня':(b.type==='farm'?'Садиба':(b.type==='chapel'?'Каплиця':(b.type==='molfar'?'Хата Мольфара':(b.type==='ruin'?'Руїни':'Зайти у хату'))))));
        bestDoor=b;}
    }
    if(bestDoor)return {kind:'door',b:bestDoor,label:blbl+' — увійти'};
    if(IB.E.tourist&&!IB.E.tourist.follow&&IB.dist(L.x,L.y,IB.E.tourist.x,IB.E.tourist.y)<2)
      return {kind:'tourist',label:'Допомогти туристу'};
    /* артефакти світу */
    for(const a of IB.ARTIFACTS){
      if(!a.world||IB.artHas(a.id))continue;
      if(a.hidden&&!(IB.G.vision>0||IB.G.trip.active||IB.G.flags.molfarKnown))continue;
      if(IB.dist(L.x,L.y,a.x,a.y)<1.7)return {kind:'art',a,label:'ВЗЯТИ: '+a.name};
    }
    /* вівця Івася */
    if(IB.G.quests.side.sheep&&!IB.G.flags.sheepFound){
      const a=IB.E.animals.find(a=>a.lost);
      if(a&&IB.dist(L.x,L.y,a.x,a.y)<1.8)return {kind:'sheep',a,label:'Вівця Івася! Втішити'};
    }
    /* вода поруч */
    if(!L.swim){
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(IB.W.at(tx+dx,ty+dy)===0)return {kind:'water',x:tx+dx,y:ty+dy,label:'Вода: пити / набрати / рибалка'};
      }
    }
    /* v1.2: фото-точки */
    let bph=null,bpd=1e9;
    for(const s of (IB.W.PHOTO_SPOTS||[])){
      if(!(s.x>0))continue;
      const dd=IB.dist(L.x,L.y,s.x,s.y);
      if(dd<3.4&&dd<bpd){bpd=dd;bph=s;}
    }
    if(bph&&!channel)return {kind:'photo',s:bph,label:'ФОТО ГРУПИ: '+bph.name};
  /* кемпінг-меню */
    const c=IB.G.nearCamp(L.x,L.y,6);
    if(c)return {kind:'camp',c,label:'Табір «'+c.name+'» — меню'};
    return null;
  }
  function promptText(){
    if(channel)return 'Рубаємо дрова... '+IB.M.round(channel.t/channel.dur*100)+'%';
    const t=interactTarget();
    if(!t){
      const L=IB.E.team[0];
      if(L.swim)return 'ПЛаваєш — пливи до берега';
      return null;
    }
    return '[E] '+t.label;
  }
  function promptChannel(){
    if(mode!=='game'||IB._sceneOpen){IB.$('prompt').classList.add('hidden');return;}
    const p=promptText();
    const el=IB.$('prompt');
    if(p){el.textContent=p;el.classList.remove('hidden');}
    else el.classList.add('hidden');
  }
  function doInteract(){
    const t=interactTarget();
    if(!t)return;
    const L=IB.E.team[0];
    switch(t.kind){
      case 'bush':{
        t.p.berries=false;IB.G.inv.berries++;IB.G.stats.berries++;
        IB.SFX.berry();IB.floatMsg(L.x,L.y,'+1🫐');
        IB.toast('Ягоди зірвано (усього: '+IB.G.inv.berries+')');
        setTimeout(()=>{t.p.berries=true;},90000);
        break;}
      case 'mush':{
        t.p.taken=true;IB.G.inv.mush++;
        IB.SFX.berry();IB.floatMsg(L.x,L.y,'+1🍄');
        IB.toast('Гриби зібрано (усього: '+IB.G.inv.mush+')');
        if(L.id&&IB.E.team.find(h=>h.id==='maksym')&&IB.M.random()<0.12){IB.G.inv.trip5++;IB.toast('ROCK знаходить пакетик «5 Г»?!','fun');IB.journalAdd('✦','ROCK знайшов «5 г» серед грибів.');}
        break;}
      case 'triph':{
        t.p.taken=true;IB.G.inv.trip5++;
        IB.SFX.find();IB.banner('ЗНАЙДЕНО «5 Г»!');
        IB.journalAdd('✦','Знайдено пакетик «5 г» — таємний гриб. Тепер можна провести Ніч П\'яти Зірок.');
        IB.toast('Використай у таборі ввечері зі всією групою','fun');
        break;}
      case 'herb':{
        t.p.taken=true;IB.G.inv.herb++;
        IB.SFX.berry();IB.floatMsg(L.x,L.y,'+1🌿');
        IB.toast('Трави зібрано (усього: '+IB.G.inv.herb+')');
        break;}
      case 'wood':{
        const dur=1.8/IB.G.axetier;
        channel={prop:t.p,t:0,dur,label:'wood'};
        break;}
      case 'flower':{
        L.mood=IB.clamp(L.mood+4,0,100);IB.SFX.bird();
        IB.floatMsg(L.x,L.y,'😊');break;}
      case 'door':openBuilding(t.b);break;
      case 'npc':openNpc(t.n);break;
      case 'tourist':{
        IB.E.tourist.follow=true;IB.E.tourist.found=true;
        IB.banner('ТУРИСТ СЛІДУЄ ЗА ТОБОЮ — ВЕДИ ДО КЕМПІНГУ');
        IB.toast('Введи його в будь-який кемпінг');
        break;}
      case 'art':{
        IB.pickArtifact(t.a);
        break;}
      case 'sheep':{
        t.a.found=true;IB.G.flags.sheepFound=true;
        IB.banner('ВІВЦЮ ЗНАЙДЕНО! Повернись до Івася');
        IB.journalAdd('🐑','Знайшли загублену вівцю Івася.');
        break;}
      case 'water':openWaterMenu(t);break;
      case 'camp':openCampMenu(t.c);break;
      case 'photo':IB.photoTaken(t.s);break;
    }
  }
  function finishChannel(){
    const ch=channel;channel=null;
    if(ch.label==='wood'&&ch.prop.amt>0){
      ch.prop.amt--;
      IB.G.inv.wood++;IB.G.stats.wood++;
      IB.SFX.chop();
      IB.floatMsg(IB.E.team[0].x,IB.E.team[0].y,'+1🌲');
      IB.toast('Дрова: '+IB.G.inv.wood);
      if(ch.prop.amt<=0){
        IB.W.props.splice(IB.W.props.indexOf(ch.prop),1);
        IB.W.grid.delete(ch.prop.y*IB.W.W+ch.prop.x);
      }
    }
  }

  /* ---------- ВОДА ---------- */
  function openWaterMenu(t){
    const opts=[
      {t:'Пити воду',f:()=>{const L=IB.E.team[0];L.water=IB.clamp(L.water+25,0,100);IB.SFX.drink();IB.floatMsg(L.x,L.y,'+💧');IB.toast('Напився з '+IB.W.zoneAt(t.x,t.y));closePanel();}},
      {t:'Набрати води в запас (+3)',f:()=>{IB.G.inv.water=IB.M.min((IB.G.inv.water||0)+3,10);IB.SFX.drink();IB.toast('Запас води: '+IB.G.inv.water);closePanel();}},
      {t:'Рибалка (E у момент клювання)',f:()=>{closePanel();IB.startFishing();}},
      {t:'Скупатися (енергія −, настрій + у спеку)',f:()=>{const L=IB.E.team[0];L.swim=true;IB.SFX.splash();closePanel();
        IB.toast('Плыви! Вода холодна — не затримуйся');}},
      {t:'Сушити волосся на сонці',f:()=>{const L=IB.E.team[0];L.mood=IB.clamp(L.mood+6,0,100);closePanel();IB.toast('Настрій +6','fun');}},
    ];
    openPanel('ВОДА — '+IB.W.zoneAt(t.x,t.y),panelList(opts));
  }

  /* ---------- КЕМПІНГ-МЕНЮ ---------- */
  const BUILD_COSTS={fire:{wood:5,n:'Вогнище'},tent:{wood:8,n:'Намет'},well:{wood:6,n:'Колодязь'},
    farm:{wood:4,n:'Грядка (ферма)'},table:{wood:3,n:'Стіл + казан'},dry:{wood:3,n:'Сушилка'}};
  function cost(k){const c=BUILD_COSTS[k].wood;const hasMaster=IB.E.team.some(h=>h.id==='petro');return hasMaster?IB.M.ceil(c*0.75):c;}
  function openCampMenu(c){
    const cc=IB.G.camps[c.id];
    const opts=[];
    /* будівництво */
    for(const k in BUILD_COSTS){
      if(k==='fire'&&(cc.fire)){continue;}
      if(cc[k]&&k!=='fire'){continue;}
      opts.push({t:'Збудувати: '+BUILD_COSTS[k].n+' ('+cost(k)+' дерева)'+(IB.E.team.some(h=>h.id==='petro')?' [DIIN: −25%]':''),
        f:()=>{
          if(IB.G.inv.wood<cost(k)){IB.toast('Треба '+cost(k)+' дерева','red');return;}
          IB.G.inv.wood-=cost(k);
          if(k==='fire'){cc.fire=true;cc.fuel=40;}
          else if(k==='farm'){cc.farm.built=true;cc[k]=true;}
          else cc[k]=true;
          IB.SFX.build();IB.banner('ЗБУДОВАНО: '+BUILD_COSTS[k].n);
          IB.journalAdd('🔨','У «'+c.name+'» збудовано: '+BUILD_COSTS[k].n);
          IB.SYS.questCheck&&0;
          IB.questCheck();
          openCampMenu(c);
        }});
    }
    /* користування */
    if(cc.fire){
      opts.push({t:'Підкинути дров у вогонь (+40 палива) [є: '+IB.G.inv.wood+']',
        f:()=>{if(IB.G.inv.wood<1){IB.toast('Немає дров','red');return;}IB.G.inv.wood--;cc.fuel+=40;IB.SFX.fire();
          IB.toast('Вогонь розгорівся');IB.questCheck();openCampMenu(c);}});
    }
    if(cc.farm.built){
      if(!cc.farm.planted)opts.push({t:'Посадити картоплю (1 шт) [є: '+IB.G.inv.potato+']',
        f:()=>{if(IB.G.inv.potato<1){IB.toast('Немає картоплі — купи в садибі або зірви з грядки іншого табору','red');return;}
          IB.G.inv.potato--;cc.farm.planted=true;cc.farm.grow=0;cc.farm.ready=false;
          IB.toast('Посаджено! Дозріє за ~1.5 доби (або доручення «ферма» прискорює)');openCampMenu(c);}});
      else if(cc.farm.ready)opts.push({t:'ЗІБРАТИ ВРОЖАЙ!',f:()=>{
        const n=4+IB.ri(0,2);IB.G.inv.potato+=n;cc.farm.planted=false;cc.farm.ready=false;cc.farm.grow=0;
        IB.G.flags.harvest=true;IB.SFX.done();IB.banner('ВРОЖАЙ КАРТОПЛІ: +'+n);
        IB.journalAdd('🥔','Зібрали врожай картоплі (+'+n+'). Грядка Карпат працює.');
        IB.questCheck();openCampMenu(c);}});
      else opts.push({t:'Грядка росте: стадія '+cc.farm.stage+'/3 (доручення «ферма» прискорює)',f:null});
    }
    if(cc.table)opts.push({t:'Готувати їжу (казан)',f:()=>openCookMenu(c)});
    if(cc.tent)opts.push({t:'Спати до ранку (3)',f:()=>{closePanel();IB.sleepTillMorning(true);IB.saveGame();}});
    if(cc.well)opts.push({t:'Набрати води з колодязя (+5)',f:()=>{IB.G.inv.water=IB.M.min((IB.G.inv.water||0)+5,10);IB.SFX.drink();IB.toast('Запас води: '+IB.G.inv.water);openCampMenu(c);}});
    if(cc.dry)opts.push({t:'Підвісити рибу для сушки (1 риба → смакота)',f:()=>{if(IB.G.inv.fishraw<1){IB.toast('Немає сирої риби','red');return;}
      IB.G.inv.fishraw--;IB.G.inv.cookfish++;IB.SFX.fire();IB.toast('Сушена риба готова!');openCampMenu(c);}});
    opts.push({t:'Гулянка тут (Q)',f:()=>{closePanel();IB.startParty();}});
    if(IB.G.inv.trip5>0)opts.push({t:'✦ Ніч П\'яти Зірок («5 г» є!)',f:()=>{closePanel();IB.startTrip();}});
    openPanel('ТАБІР «'+c.name+'»',panelList(opts));
  }
  function openCookMenu(c){
    let html='<div class="prow head"><span class="nm">РЕЦЕПТИ (потрібне живе вогнище)</span></div>';
    IB.RECIPES.forEach((r,i)=>{
      const have=Object.keys(r.need).every(k=>(IB.G.inv[k]||0)>=r.need[k]);
      const need=Object.keys(r.need).map(k=>k+' ×'+r.need[k]).join(', ');
      html+='<div class="prow click" data-cook="'+i+'"><span class="nm">'+r.n+'</span><span class="ds">'+need+'</span><span class="'+(have?'ok':'no')+'">'+(have?'Готуємо!':'мало')+'</span></div>';
    });
    openPanel('ГОТУВАННЯ (табір «'+c.name+'»)',html);
    bindCook(c);
  }
  function bindCook(c){
    IB.$('panel-body').querySelectorAll('[data-cook]').forEach(el=>{
      el.onclick=()=>{if(IB.cook(+el.dataset.cook))openCookMenu(c);};
    });
  }

  /* ---------- БУДІВЛІ СЕЛ ---------- */
  const SHOP_BUY=[['bread','Хліб',8],['brinza','Бринза',12],['eggs','Яйця',4],['canned','Консерви',15],
    ['beer','Пиво',7],['wine','Вино',12],['vodka','Горілка',15],['nalyva','Наливка',10],['rozsol','Розсіл',6],['kava','Кава',10]];
  const SHOP_SELL=[['berries','Ягоди',3],['mush','Гриби',6],['herb','Трави',4],['fishraw','Риба (сира)',7],['potato','Картопля',2]];
  function openBuilding(b){
    if(['house','church','shop','bar','forge','farm','border'].indexOf(b.type)>=0){
      return enterInterior(b);
    }
    if(b.type==='house'){
      const lines=['Господиня: «Ой, легендарні гості з міста! Заходьте, тільки обід наш — свій.»',
        'Дід: «У Києві тепер тихо? А в горах завжди так. Дерева, вода і вони — усі живі.»',
        'Хлопець: «Кажуть, у Лісі Моли Мольфар живе. Хто з ним заговорить — той скарби бачитиме.»',
        'Пані: «Як хуртовина замете — сидіть біля вогню. Гори не прощають гордих.»'];
      const line=IB.pick(lines,b.x*7+b.y);
      openPanel('ХАТА — РОЗМОВА', '<div class="pcard"><div class="ds">'+line+'</div></div>');
      const L=IB.E.team[0];L.mood=IB.clamp(L.mood+3,0,100);
      return;
    }
    if(b.type==='chapel'){
      if(IB.G.flags['pray'+IB.G.day]){openPanel('КАПЛИЦЯ','<div class="pcard"><div class="ds">Ви вже молилися сьогодні. Свічка тихо тріщить.</div></div>');return;}
      IB.G.flags['pray'+IB.G.day]=true;
      for(const h of IB.E.team)h.mood=IB.clamp(h.mood+10,0,100);
      IB.SFX.bell();
      openPanel('КАПЛИЦЯ','<div class="pcard"><div class="ds">Дзвін каплиці гуде над долиною. Настрій групи +10. Гори чують.</div></div>');
      return;
    }
    if(b.type==='shop')return openShop(b);
    if(b.type==='bar')return openBar(b);
    if(b.type==='forge')return openForge(b);
    if(b.type==='farm')return openFarmstead(b);
  }
  function shopRows(){
    let html='<div class="prow head"><span class="nm">КУПИТИ</span><span class="ds">ціна</span><span class="ok">₴'+IB.G.money+'</span></div>';
    SHOP_BUY.forEach(([k,n,p],i)=>{
      html+='<div class="prow click" data-buy="'+k+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(IB.G.money>=p?'ok':'no')+'">'+(IB.G.money>=p?'☑':'мало ₴')+'</span></div>';
    });
    html+='<div class="prow head"><span class="nm">ПРОДАТИ</span><span class="ds">ціна</span><span class="ok">в наявності</span></div>';
    SHOP_SELL.forEach(([k,n,p])=>{
      const q=IB.G.inv[k]||0;
      html+='<div class="prow click'+(q?'':' cant')+'" data-sell="'+k+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(q?'ok':'no')+'">×'+q+'</span></div>';
    });
    return html;
  }
  function openShop(b){
    openPanel('КРАМНИЦЯ'+(b.village?' • '+b.label:''),shopRows());
    bindShop();
  }
  function bindShop(){
    IB.$('panel-body').querySelectorAll('[data-buy]').forEach(el=>{
      el.onclick=()=>{
        const [k,n,p]=SHOP_BUY.find(x=>x[0]===el.dataset.buy);
        if(IB.G.money<p){IB.toast('Не вистачає ₴','red');return;}
        IB.G.money-=p;IB.G.inv[k]=(IB.G.inv[k]||0)+1;
        if(k==='bread')IB.G.flags.boughtBread=true;
        IB.SFX.coin();IB.toast('Куплено: '+n);
        openPanel('КРАМНИЦЯ',shopRows());bindShop();
      };
    });
    IB.$('panel-body').querySelectorAll('[data-sell]').forEach(el=>{
      el.onclick=()=>{
        const [k,n,p]=SHOP_SELL.find(x=>x[0]===el.dataset.sell);
        if(!(IB.G.inv[k]>0))return;
        IB.G.inv[k]--;IB.G.money+=p;
        IB.SFX.coin();IB.toast('Продано: '+n+' +₴'+p);
        openPanel('КРАМНИЦЯ',shopRows());bindShop();
      };
    });
  }
  const BAR_BUY=[['yushka','Гаряча юшка (їжа)',18],['banosh','Банош (їжа)',16],['rozsol','Розсіл',6],
    ['beer','Пиво',7],['wine','Вино',12],['vodka','Горілка',15],['nalyva','Наливка домашня',10]];
  function openBar(b){
    let html='<div class="prow head"><span class="nm">МЕНЮ КОРЧМИ</span><span class="ds">«'+b.label+'»</span><span class="ok">₴'+IB.G.money+'</span></div>';
    BAR_BUY.forEach(([k,n,p])=>{
      html+='<div class="prow click" data-buy="'+k+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(IB.G.money>=p?'ok':'no')+'">'+(IB.G.money>=p?'☑':'мало ₴')+'</span></div>';
    });
    html+='<div class="prow head"><span class="nm">ПРОДАТИ ВЛОВЛЕНЕ/ЗІБРАНЕ</span></div>';
    SHOP_SELL.forEach(([k,n,p])=>{
      const q=IB.G.inv[k]||0;
      html+='<div class="prow click'+(q?'':' cant')+'" data-sell="'+k+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(q?'ok':'no')+'">×'+q+'</span></div>';
    });
    html+='<div class="pcard"><b>Бармен Юрко:</b> <span class="ds">«Гулянку починайте у себе в таборі — але напитки беріть тут! Накупив на 8 монет — розкажу про Скрипку Легеня» (куплено на '+(IB.G.flags.barSpent||0)+')</span></div>';
    openPanel('КОРЧМА',html);
    IB.$('panel-body').querySelectorAll('[data-buy]').forEach(el=>{
      el.onclick=()=>{
        const [k,n,p]=BAR_BUY.find(x=>x[0]===el.dataset.buy);
        if(IB.G.money<p){IB.toast('Не вистачає ₴','red');return;}
        IB.G.money-=p;
        if(k==='yushka'||k==='banosh'){IB.G.inv[k]++;}
        else IB.G.inv[k]=(IB.G.inv[k]||0)+1;
        IB.G.flags.barSpent=(IB.G.flags.barSpent||0)+p;
        IB.SFX.coin();IB.toast('Куплено: '+n);
        IB.SYS_Q.questCheck();
        if(IB.SIDES.violin.need()&&!IB.G.flags.violinGiven){IB.G.flags.violinGiven=true;IB.SIDES.violin.give();}
        openBar(b);
      };
    });
    IB.$('panel-body').querySelectorAll('[data-sell]').forEach(el=>{
      el.onclick=()=>{
        const [k,n,p]=SHOP_SELL.find(x=>x[0]===el.dataset.sell);
        if(!(IB.G.inv[k]>0))return;
        IB.G.inv[k]--;IB.G.money+=p;IB.SFX.coin();IB.toast('Продано: '+n+' +₴'+p);
        openBar(b);
      };
    });
  }
  function openForge(b){
    const disc=IB.G.flags.forgeDiscount?0.5:1;
    let html='<div class="prow head"><span class="nm">КОВАЛЬНЯ ДМИТРА</span><span class="ok">₴'+IB.G.money+'</span></div>';
    if(IB.G.axetier===1)html+='<div class="prow click" data-axe="2"><span class="nm">Сокира-«двійка»</span><span class="ds">рубка ×2 швидше • ₴'+IB.M.round(40*disc)+'</span><span class="'+(IB.G.money>=40*disc?'ok':'no')+'"></span></div>';
    if(IB.G.axetier===2)html+='<div class="prow click" data-axe="3"><span class="nm">Сокира-«трійка» ЛЕГЕНДА</span><span class="ds">рубка ×3 • ₴'+IB.M.round(100*disc)+'</span><span class="'+(IB.G.money>=100*disc?'ok':'no')+'"></span></div>';
    if(IB.G.axetier>=3)html+='<div class="prow"><span class="nm">Топір в ідеалі</span><span class="ok">✔</span></div>';
    html+='<div class="pcard"><span class="ds">«Принеси мені 6 дров — зроблю знижку», — коваля Дмитра доручення (панель ГРУПА → побачиш «!» над ним).</span></div>';
    openPanel('КОВАЛЬНЯ',html);
    IB.$('panel-body').querySelectorAll('[data-axe]').forEach(el=>{
      el.onclick=()=>{
        const price=(+el.dataset.axe===2?40:100)*disc;
        if(IB.G.money<price){IB.toast('Не вистачає ₴','red');return;}
        IB.G.money-=price;IB.G.axetier=+el.dataset.axe;
        IB.SFX.build();IB.banner('СОКИРА ПРОПОЛЕНА: ТІР '+IB.G.axetier);
        IB.journalAdd('🪓','Куплено сокиру тіру '+IB.G.axetier+' у ковальні Криворівні.');
        openForge(b);
      };
    });
  }
  function openFarmstead(b){
    let html='<div class="prow head"><span class="nm">САДИБА (Верховинка)</span><span class="ok">₴'+IB.G.money+'</span></div>';
    [['brinza','Бринза домашня',12],['eggs','Яйця',4],['potato','Картопля на посадку',5]].forEach(([k,n,p])=>{
      html+='<div class="prow click" data-buy="'+k+'|'+p+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(IB.G.money>=p?'ok':'no')+'"></span></div>';
    });
    html+='<div class="prow head"><span class="nm">ПРОДАТИ</span></div>';
    [['berries','Ягоди',3],['mush','Гриби',6],['fishraw','Риба',7]].forEach(([k,n,p])=>{
      const q=IB.G.inv[k]||0;
      html+='<div class="prow click'+(q?'':' cant')+'" data-sell="'+k+'|'+p+'"><span class="nm">'+n+'</span><span class="ds">₴'+p+'</span><span class="'+(q?'ok':'no')+'">×'+q+'</span></div>';
    });
    html+='<div class="pcard"><span class="ds">Господиня Марічка: «Картоплю — на посадку. Пані будуть з помічників!»</span></div>';
    openPanel('САДИБА',html);
    IB.$('panel-body').querySelectorAll('[data-buy]').forEach(el=>{
      el.onclick=()=>{
        const [k,p]=el.dataset.buy.split('|');p=+p;
        if(IB.G.money<p){IB.toast('Не вистачає ₴','red');return;}
        IB.G.money-=p;IB.G.inv[k]=(IB.G.inv[k]||0)+1;IB.SFX.coin();openFarmstead(b);
      };
    });
    IB.$('panel-body').querySelectorAll('[data-sell]').forEach(el=>{
      el.onclick=()=>{
        const [k,p]=el.dataset.sell.split('|');p=+p;
        if(!(IB.G.inv[k]>0))return;
        IB.G.inv[k]--;IB.G.money+=p;IB.SFX.coin();openFarmstead(b);
      };
    });
  }

  /* ---------- NPC ДІАЛОГИ ---------- */
  function openNpc(n){
    if(n.role==='molfar')return openMolfar(n);
    const qk=n.quest;
    if(qk&&IB.SIDES[qk]){
      const sd=IB.SIDES[qk];
      const doneKey='side_'+qk+'_done';
      if(IB.G.flags[doneKey])return npcChatter(n,true);
      if(!IB.G.quests.side[qk]){
        return openDialog(n.name,'«'+sd.d+'»',[
          {t:'Беруся! ('+sd.t+')',f:()=>{
            IB.G.quests.side[qk]=true;
            if(qk==='sheep'){
              /* вівця губиться */
              const a=IB.E.animals.find(a=>a.type==='sheep'&&!a.lost);
              if(a){a.lost=true;a.dark=true;a.x=n.x+IB.rnd(-20,-8);a.y=n.y+IB.rnd(-14,10);a.pen=null;}
              IB.banner('ВІВЦЯ ЗАГУБИЛАСЬ ДЕСЬ НА ЛУГАХ (рожева крапка на карті)');
            }
            if(qk==='letter'){IB.G.flags.hasLetter=true;IB.toast('Отримано лист для пані Марічки','gold');}
            IB.journalAdd('📜','Доручення від '+n.name+': '+sd.t);
            closeDlg();
          }},
          {t:'Не зараз',f:closeDlg},
        ]);
      }
      if(sd.need()){
        return openDialog(n.name,'«Молодці! Тримай: '+sd.give()+'»',[
          {t:'Дякую!',f:()=>{
            IB.G.flags[doneKey]=true;
            IB.SFX.done();IB.banner('ДОРУЧЕННЯ ВИКОНАНО: '+sd.t);
            IB.journalAdd('✔','Доручення виконано: '+sd.t);
            for(const h of IB.E.team)h.mood=IB.clamp(h.mood+6,0,100);
            if(qk==='letter')IB.G.flags.letterDone=true;
            closeDlg();
          }},
        ]);
      }
      return openDialog(n.name,'«Ще не все зроблено. '+sd.d+'»',[{t:'Зрозуміло',f:closeDlg}]);
    }
    npcChatter(n,false);
  }
  const CHATTER=['«Карпати годують тих, хто ходить. Хто лежить — той голодний.»',
    '«Бачили вгорі золоту постать? Це Легінь. Добрий, тільки п\'яний від сонця.»',
    '«Дощ пройде — гриби пойдуть. Знай, де ліс.»',
    '«Хуртовина в горах — це серйозно. Вогонь і дах. І ніякої самовпевненості.»',
    '«Бринза з овечого молока. Заради неї варто жити в горах.»',
    '«Як знайдеш «5 г» — не смійся один. Це доля для всієї групи.»'];
  function npcChatter(n,done){
    const line=IB.pick(CHATTER,(n.x*13+n.y*7)|0);
    const extra=done?' (Доручення виконано — дякуємо, легендарні!)':'';
    openDialog(n.name,'«'+line+'»'+extra,[{t:'Бувай!',f:closeDlg}]);
  }
  function openMolfar(n){
    const sd=IB.SIDES.molfar;
    if(!IB.artHas('a6')){
      if(!IB.G.quests.side.molfar){
        return openDialog('МОЛЬФАР','«Я чув про вас, легендо з міста. Принеси мені 5 трав і 5 ягід — дам тобі те, чого не купиш у жодній крамниці.»',[
          {t:'Беруся! (трави ×'+IB.G.inv.herb+', ягоди ×'+IB.G.inv.berries+')',f:()=>{
            IB.G.quests.side.molfar=true;
            IB.journalAdd('🌿','Доручення МОЛЬФАРА: принести 5 трав і 5 ягід.');
            closeDlg();}},
          {t:'Не зараз',f:closeDlg}]);
      }
      if(sd.need()){
        return openDialog('МОЛЬФАР','«Молодці, легендарні. Тримай: мій амулет — він відводить холод. І ось пакетик «5 г»... поділите на п\'ять. Рівно.»',[
          {t:'Прийняти дари',f:()=>{
            IB.G.flags['side_molfar_done']=true;
            sd.give();
            closeDlg();}}]);
      }
      return openDialog('МОЛЬФАР','«Трави і ягоди, я казав. Трави ×'+IB.G.inv.herb+' з 5, ягоди ×'+IB.G.inv.berries+' з 5. Ліс дає — тільки попроси.»',[{t:'Піду збирати',f:closeDlg}]);
    }
    if(!IB.G.flags.molfarKnown){
      return openDialog('МОЛЬФАР','«Амулет твій. А тепер слухай: у Лісі Моли росте ГРИБ-СВІЧКА — світиться тільки для тих, хто п\'яний на «5 г». Знайдеш — зрозумієш, де всі скарби Карпат.»',[{t:'Дякую, старий',f:()=>{
        IB.G.flags.molfarKnown=true;
        IB.toast('Мольфарський амулет: герої мерзнуть вдвічі повільніше','gold');
        closeDlg();
      }}]);
    }
    openDialog('МОЛЬФАР','«Хуртовина прийде — вогонь тримай. Артефакти шукай на вершинах і в скелях. А коли вся група п\'яна на «5 г» — я подивлюся на вас з-під смерек і засміюся. Тоді бачитимете все.»',[{t:'Бувай, Мольфару',f:closeDlg}]);
  }

  /* ---------- ДІАЛОГ ---------- */
  function openDialog(name,text,opts){
    mode='dialog';dlgIdx=0;
    IB.$('dlg').classList.remove('hidden');
    IB.$('dlg-name').textContent=name;
    IB.$('dlg-text').textContent=text;
    const box=IB.$('dlg-opts');box.innerHTML='';
    opts.forEach((o,i)=>{
      const d=document.createElement('div');
      d.className='dopt'+(i===0?' sel':'');
      d.textContent=(i+1)+'. '+o.t;
      d.onclick=()=>o.f();
      box.appendChild(d);
    });
    IB._dlgOpts=opts;
  }
  function closeDlg(){IB.$('dlg').classList.add('hidden');mode=IB._inInterior?'interior':'game';IB._dlgOpts=null;}
  function dlgKey(){
    const n=(IB._dlgOpts||[]).length;
    for(let i=0;i<n;i++)if(consume(''+(i+1))){IB._dlgOpts[i].f();return;}
    if(consume('e')||consume('enter')||consume('space')){
      if(IB._dlgOpts)IB._dlgOpts[dlgIdx<IB._dlgOpts.length?dlgIdx:0].f();
    }
    if(consume('w')||consume('up')){dlgIdx=IB.M.max(0,dlgIdx-1);dlgSel();}
    if(consume('s')||consume('down')){dlgIdx=IB.M.min((IB._dlgOpts||[]).length-1,dlgIdx+1);dlgSel();}
    if(consume('esc'))closeDlg();
  }
  function dlgSel(){
    IB.$('dlg-opts').querySelectorAll('.dopt').forEach((el,i)=>el.classList.toggle('sel',i===dlgIdx));
  }

  /* ---------- ПАНЕЛІ ---------- */
  function openPanel(title,html){
    mode='panel';
    IB.$('panel').classList.remove('hidden');
    IB.$('panel-title').textContent=title;
    IB.$('panel-body').innerHTML=html;
    IB.$('panel-body').scrollTop=0;
  }
  function closePanel(){IB.$('panel').classList.add('hidden');mode=IB._inInterior?'interior':'game';IB._panelKey=null;}
  function panelList(opts){
    let html='';
    opts.forEach((o,i)=>{
      html+='<div class="prow click" data-oi="'+i+'"><span class="nm">'+o.t+'</span></div>';
    });
    setTimeout(()=>{
      IB.$('panel-body').querySelectorAll('[data-oi]').forEach(el=>{
        el.onclick=()=>{const o=opts[+el.dataset.oi];if(o.f)o.f();};
      });
    },0);
    return html;
  }

  /* ГРУПА: герої + доручення */
  function openGroupPanel(){
    let html='';
    IB.E.team.forEach((h,i)=>{
      const task=h.task==='leader'?'—':(IB.TASKS[h.task]?IB.TASKS[h.task].label:'слідує');
      html+='<div class="pcard"><b>'+(i+1)+'. '+h.name+'</b> <span class="ds">['+h.def.talent+' — '+h.def.tdesc+']</span>'+
        '<div class="ds">Сили '+IB.M.round(h.hp)+'% • Їжа '+IB.M.round(h.food)+'% • Вода '+IB.M.round(h.water)+'% • Настрій '+IB.M.round(h.mood)+'%'+(h.cold>30?' • ❄ ХОЛОД '+IB.M.round(h.cold)+'%':'')+(h.alc>=1?' • 🍺':'')+'</div>'+
        (i>0?'<div class="ds">Доручення: '+task+'</div>':'<div class="ds">Лідер — керуєш ти</div>')+
        (i>0?['follow','wood','water','fish','farm','cook','rest'].map(tk=>'<div class="prow click" data-task="'+i+'|'+tk+'"><span class="nm">'+(tk==='follow'?'Йти зі мною':(IB.TASKS[tk]?IB.TASKS[tk].label:'Відпочивати'))+'</span><span class="'+(h.task===tk?'ok':'no')+'">'+(h.task===tk?'✔ поточне':'')+'</span></div>').join(''):'')+
        '</div>';
    });
    html+='<div class="pcard"><b>ГУЛЯНКА (Q):</b><span class="ds"> ввечері (після 17:00), вся група біля живого вогнища, ≥6 напиток і ≥4 закуски. Вранці — похмілля до 12:00.</span></div>';
    html+='<div class="pcard"><b>✦ «5 Г»:</b><span class="ds"> у тебе пакетиків: '+IB.G.inv.trip5+'. Ніч П\'яти Зірок — у темряві, зі всією групою.</span></div>';
    openPanel('ГРУПА — ЛЕГЕНДАРНА П\'ЯТІРКА',html);
    IB.$('panel-body').querySelectorAll('[data-task]').forEach(el=>{
      el.onclick=()=>{
        const [i,tk]=el.dataset.task.split('|');
        const h=IB.E.team[+i];
        h.task=tk;h.target=null;h.taskT=0;
        IB.toast(h.name+': '+((tk==='follow')?'йде за тобою':(IB.TASKS[tk]?IB.TASKS[tk].label:'відпочиває')));
        openGroupPanel();
      };
    });
  }

  /* ЖУРНАЛ: квести + події + артефакти */
  function openJournal(){
    let html='<div class="prow head"><span class="nm">КВЕСТИ</span></div>';
    const active=IB.QUESTS.find(q=>q.id===IB.G.quests.active);
    if(active)html+='<div class="pcard"><b>► '+active.t+'</b><div class="ds">'+active.d+'</div></div>';
    IB.QUESTS.forEach(q=>{
      if(IB.G.quests.done.includes(q.id))html+='<div class="prow done"><span class="nm">✔ '+q.t+'</span></div>';
    });
    html+='<div class="prow head"><span class="nm">ДОРУЧЕННЯ СЕЛЯН</span></div>';
    for(const k in IB.SIDES){
      const sd=IB.SIDES[k];
      const st=IB.G.flags['side_'+k+'_done']?'✔ виконано':(IB.G.quests.side[k]?'► в роботі':'— не взято');
      html+='<div class="prow'+(IB.G.flags['side_'+k+'_done']?' done':'')+'"><span class="nm">'+sd.t+'</span><span class="ds">'+sd.npc+'</span><span class="'+(st.startsWith('✔')?'ok':'no')+'">'+st+'</span></div>';
    }
    html+='<div class="prow head"><span class="nm">АРТЕФАКТИ КАРПАТ ('+IB.G.arts.length+'/7)</span></div>';
    IB.ARTIFACTS.forEach(a=>{
      if(IB.artHas(a.id))html+='<div class="pcard"><b>🏺 '+a.name+'</b><div class="ds">'+a.lore+'</div></div>';
      else html+='<div class="prow"><span class="nm">??? </span><span class="ds">'+(a.world?'прихований у горах':'нагорода за квест')+'</span></div>';
    });
    html+='<div class="prow head"><span class="nm">ПОДІЇ І СЦЕНИ</span></div>';
    IB.G.journal.forEach(j=>{
      html+='<div class="prow"><span class="q">'+j.icon+'</span><span class="nm" style="font-size:7px">Д'+j.d+' '+j.t+' — '+j.txt+'</span></div>';
    });
    openPanel('ЖУРНАЛ ПОХОДУ',html);
  }

  /* БАГАЖ */
  function openBag(){
    let html='<div class="prow head"><span class="nm">РЕСУРСИ</span><span class="ds"></span><span class="ok">₴'+IB.G.money+'</span></div>';
    const inv=IB.G.inv;
    const names={wood:'Дерево',berries:'Ягоди',mush:'Гриби',herb:'Трави',fishraw:'Риба (сира)',potato:'Картопля',water:'Запас води',
      bread:'Хліб',brinza:'Бринза',canned:'Консерви',eggs:'Яйця',cookfish:'Смажена риба',yushka:'Юшка',banosh:'Банош',kulesh:'Куліш',
      nalyva:'Наливка',beer:'Пиво',wine:'Вино',vodka:'Горілка',rozsol:'Розсіл',kava:'Кава',trip5:'✦ «5 г»'};
    for(const k in names){
      if(!inv[k])continue;
      html+='<div class="prow"><span class="nm">'+names[k]+'</span><span class="q">×'+inv[k]+'</span></div>';
    }
    html+='<div class="prow head"><span class="nm">ЇСТИ (1)</span></div>';
    const foods=Object.keys(IB.FOODS).filter(k=>inv[k]>0);
    foods.forEach(k=>{
      html+='<div class="prow click" data-eat="'+k+'"><span class="nm">'+IB.FOODS[k].n+'</span><span class="ds">+'+IB.FOODS[k].food+' їжі</span><span class="q">×'+inv[k]+'</span></div>';
    });
    if(!foods.length)html+='<div class="prow"><span class="no">Немає їжі — збирай/купуй/готуй</span></div>';
    html+='<div class="prow head"><span class="nm">ПИТИ (2)</span></div>';
    const drinks=Object.keys(IB.DRINKS).filter(k=>k==='water'?inv.water>0:inv[k]>0);
    drinks.forEach(k=>{
      const nm=IB.DRINKS[k].n+(k==='water'?' (запас)':'');
      html+='<div class="prow click" data-drink="'+k+'"><span class="nm">'+nm+'</span><span class="ds">+'+IB.DRINKS[k].water+' води'+(IB.DRINKS[k].alc?' • алкоголь ×'+IB.DRINKS[k].alc:'')+'</span><span class="q">×'+(k==='water'?inv.water:inv[k])+'</span></div>';
    });
    html+='<div class="prow head"><span class="nm">ГОТУВАННЯ</span></div>';
    IB.RECIPES.forEach((r,i)=>{
      const need=Object.keys(r.need).map(k=>k+' ×'+r.need[k]).join(', ');
      html+='<div class="prow click" data-cook="'+i+'"><span class="nm">'+r.n+'</span><span class="ds">'+need+' (біля вогню)</span></div>';
    });
    openPanel('БАГАЖ ГРУПИ',html);
    IB.$('panel-body').querySelectorAll('[data-eat]').forEach(el=>{el.onclick=()=>{if(IB.eat(IB.E.team[0],el.dataset.eat))openBag();};});
    IB.$('panel-body').querySelectorAll('[data-drink]').forEach(el=>{el.onclick=()=>{if(IB.drink(IB.E.team[0],el.dataset.drink))openBag();};});
    IB.$('panel-body').querySelectorAll('[data-cook]').forEach(el=>{el.onclick=()=>{IB.cook(+el.dataset.cook);openBag();};});
  }

  /* КАРТА */
  function openMap(){
    mode='map';
    openPanel('КАРТА КАРПАТ — КЛІК = МАРШРУТ','');
    const body=IB.$('panel-body');
    body.innerHTML='<div id="map-row"><canvas id="mapc" width="470" height="430"></canvas><div id="map-side"></div></div>';
    const c=IB.$('mapc');
    IB.drawBigMap(c);
    /* список локацій */
    const side=IB.$('map-side');
    let h='<div class="map-it" data-x="'+IB.W.CAMPS[0].x+'" data-y="'+IB.W.CAMPS[0].y+'"><b>СТАРЕ ВОГНИЩЕ</b><small>твій перший табір</small></div>';
    IB.W.VILLAGES.forEach(v=>{h+='<div class="map-it" data-x="'+(v.x+v.w/2)+'" data-y="'+(v.y+v.h/2)+'"><b>'+v.name+'</b><small>село: крамниця, корчма</small></div>';});
    h+='<div class="map-it" data-x="60" data-y="40"><b>ГОВЕРЛА</b><small>2061 м — фінальна гулянка</small></div>';
    h+='<div class="map-it" data-x="192" data-y="28"><b>ПІП-ІВАН</b><small>руїни обсерваторії</small></div>';
    h+='<div class="map-it" data-x="170" data-y="92"><b>ОЗЕРО ЛАЗУРНЕ</b><small>рибалка, плавання, острів</small></div>';
    h+='<div class="map-it" data-x="112" data-y="148"><b>СКЕЛІ ДОВБУША</b><small>артефакт</small></div>';
    h+='<div class="map-it" data-x="96" data-y="74"><b>ХАТА МОЛЬФАРА</b><small>Ліс Моли</small></div>';
    h+='<div class="map-it" data-trav="1"><b>МАНДРІВКИ — ВСІ МАРШРУТИ</b><small>вершини, озера, кордони, Шацькі озера (клавіша T)</small></div>';
    side.innerHTML=h;
    const setRoute=(x,y)=>{IB.G.route={x,y};IB.toast('Маршрут прокладено — стрілка веде','gold');IB.SFX.ui();};
    side.querySelectorAll('.map-it').forEach(el=>{el.onclick=()=>setRoute(+el.dataset.x,+el.dataset.y);});
    const trv=side.querySelector('.map-it[data-trav]');
    if(trv)trv.onclick=()=>openTravels();
    c.onclick=(ev)=>{
      const r=c.getBoundingClientRect();
      const x=(ev.clientX-r.left)/r.width*IB.W.W;
      const y=(ev.clientY-r.top)/r.height*IB.W.H;
      if(x<44&&y<30){openTravels();return;}
      setRoute(IB.M.round(x),IB.M.round(y));
      IB.drawBigMap(c);
    };
  }

  /* ---------- ГОТ-БАР 1-4 ---------- */
  function hotbar(k){
    const L=IB.E.team[0];
    if(k==='1'){
      const foods=Object.keys(IB.FOODS).filter(x=>IB.G.inv[x]>0);
      if(!foods.length){IB.toast('Немає їжі! Збирай ягоди, рибаль, купуй','red');return;}
      foods.sort((a,b)=>IB.FOODS[b].food-IB.FOODS[a].food);
      IB.eat(L,foods[0]);
    }else if(k==='2'){
      if(IB.G.inv.water>0&&IB.DRINKS.water){IB.drink(L,'water');IB.G.inv.water--;IB.toast('Напився з запасу');return;}
      const drinks=['rozsol','kava','beer','nalyva','wine','vodka'].filter(x=>IB.G.inv[x]>0);
      if(!drinks.length){IB.toast('Немає напиток — E біля води','red');return;}
      IB.drink(L,drinks[0]);
    }else if(k==='3'){
      const c=IB.G.nearCamp(L.x,L.y,7);
      const tent=c&&IB.G.camps[c.id].tent;
      IB.sleepTillMorning(!!tent);
      IB.saveGame();
    }else if(k==='4'){
      IB.G.t=(IB.G.t+1)%24;
      for(const h of IB.E.team){h.hp=IB.clamp(h.hp+8,0,100);h.mood=IB.clamp(h.mood+2,0,100);}
      IB.toast('Година відпочинку: сили відновлено трохи');
    }
  }

  /* ---------- КЛЮЧІ ---------- */
  function handleKeys(dt){
    if(mode==='boot'){
      if(bootReady&&(Object.keys(pressed).some(k=>pressed[k]))){clearP();toTitle();}
      return;
    }
    if(mode==='title'){
      if(consume('w')||consume('up')){menuIdx=(menuIdx-1+(IB._menuItems||[]).length)%(IB._menuItems||[]).length;buildMenu(IB._menuItems);}
      if(consume('s')||consume('down')){menuIdx=(menuIdx+1)%(IB._menuItems||[]).length;buildMenu(IB._menuItems);}
      if(consume('e')||consume('enter')||consume('space')){const it=(IB._menuItems||[])[menuIdx];if(it)it.f();}
      clearP();return;
    }
    if(IB._sceneOpen){
      if(consume('e')||consume('enter')||consume('space'))IB.closeScene();
      clearP();return;
    }
    if(mode==='dialog'){dlgKey();clearP();return;}
    if(mode==='panel'||mode==='map'){
      if(consume('esc')||consume('tab')||consume('m'))closePanel();
      clearP();return;
    }
    if(mode==='climb'){
      if(consume('esc')){IB.TRAVEL_ABORT();clearP();return;}
      if(consume('e')||consume('enter')||consume('space'))climbStep();
      clearP();return;
    }
    if(mode==='interior'){
      if(consume('esc')){exitInterior();clearP();return;}
      if(consume('e')||consume('enter'))interiorInteract();
      clearP();return;
    }
    if(mode!=='game'){clearP();return;}
    /* game mode */
    if(consume('e')){
      if(IB.fishing.active){
        if(!IB.fishCatch()){IB.toast('Риба ще не клює...');}
      } else doInteract();
    }
    if(consume('m'))openBag();
    if(consume('i'))openBag();
    if(consume('grp'))openGroupPanel();
    if(consume('jrnl'))openJournal();
    if(consume('t'))openTravels();
    if(consume('tab'))openMap();
    if(consume('q'))IB.startParty();
    if(consume('1'))hotbar('1');
    if(consume('2'))hotbar('2');
    if(consume('3'))hotbar('3');
    if(consume('4'))hotbar('4');
    if(consume('fs'))toggleFullscreen();
    if(consume('esc')){IB.saveGame();IB.toast('Гру збережено (ESC)','gold');}
    clearP();
  }

  /* ---------- ФУЛЛСКРІН ---------- */
  function isFs(){return !!(document.fullscreenElement||document.webkitFullscreenElement||document.body.classList.contains('fakefs'));}
  function fakeFs(){document.body.classList.add('fakefs');}
  function toggleFullscreen(){
    if(isFs()&&!document.body.classList.contains('fakefs')){
      (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);return;
    }
    if(document.body.classList.contains('fakefs')){document.body.classList.remove('fakefs');return;}
    const el=IB.$('crt');
    const rq=el.requestFullscreen||el.webkitRequestFullscreen;
    if(rq){try{const p=rq.call(el);if(p&&p.catch)p.catch(()=>fakeFs());}catch(e){fakeFs();}
      setTimeout(()=>{if(!document.fullscreenElement&&!document.webkitFullscreenElement)fakeFs();},350);}
    else fakeFs();
  }

  /* ---------- ЦИКЛ ---------- */
  function loop(ts){
    requestAnimationFrame(loop);
    const dt=IB.M.min(0.05,(ts-last)/1000||0.016);last=ts;
    if(mode==='boot'||mode==='title'){
      if(mode==='title'){/* лого вже намальовано */}
      handleKeys(dt);
      return;
    }
    /* оновлення світу */
    if(IB.G.mode==='game'){
      handleKeys(dt);
      if(mode==='climb'||mode==='interior'){
        /* світ на паузі: час іде кроками сходження, у інтер'єрі — живий рух */
        if(mode==='interior'&&IB._intMove)IB._intMove(dt);
      }else{
      updateLeader(dt);
      if(!IB.G.party.active&&!IB.G.trip.active){
        IB.updateNpcs(dt);IB.updateAnimals(dt);IB.updateTourist(dt);IB.updateTeam(dt);IB.updateCars(dt);
        IB.eventsTick(dt);IB.fishTick(dt);
      }
      IB.timeTick(dt);
      IB.survTick(dt);
      if(IB.G.party.active)IB.partyTick(dt);
      if(IB.G.trip.active)IB.tripTick(dt);
      IB.updateFx(dt);
      /* віза оновлення HUD */
      hudT+=dt;if(hudT>0.2){hudT=0;updateHUD();promptChannel();}
      autoT+=dt;if(autoT>120){autoT=0;IB.saveGame();}
      }
    }
    if(mode==='climb')IB.drawAscent(g,dt);
    else if(mode==='interior')IB.drawInterior(g,dt);
    else IB.renderWorld(g,dt);
    /* fps */
    acc+=dt;
    if(acc>1){const f=IB.$('fps');if(f)f.textContent=IB.M.round(1/dt)+' FPS';acc=0;}
  }

  /* ---------- КНОПКИ КОНСОЛІ ---------- */
  function bindConsole(){
    const bp=IB.$('btn-power');
    if(bp)bp.onclick=()=>{bp.classList.toggle('active');IB.toast(bp.classList.contains('active')?'ЖИВЛЕННЯ: УВІМКНЕНО':'ЖИВЛЕННЯ: ВИМКНЕНО (сумнівно)');};
    const br=IB.$('btn-reset');
    if(br)br.onclick=()=>location.reload();
    const fs=IB.$('btn-fs-crt');
    if(fs)fs.onclick=toggleFullscreen;
    cv.addEventListener('dblclick',toggleFullscreen);
    IB.$('scene').addEventListener('click',()=>IB.closeScene());
    /* журнал — клік по панелі квесту в HUD */
    const hm=IB.$('hud-mission');
    if(hm){hm.style.pointerEvents='auto';hm.style.cursor='pointer';hm.title='ЖУРНАЛ (J)';
      hm.addEventListener('click',()=>{if(mode==='game')openJournal();});}
    /* тест тріп-фільтра на канвасі (CSS) */
  }

  /* ============ v1.2: МАНДРІВКИ / СХОДЖЕННЯ / ІНТЕР'ЄРИ / АЛЬБОМ ============ */
  IB.canTravel=(r)=>{
    const L=IB.E.team[0];
    if(r.kind==='peak'&&L.hp<30)return {ok:false,why:'лідер знесилений'};
    if(r.kind==='peak'||r.kind==='lake'||r.kind==='border'){
      if(IB.G.wx.type==='blizzard')return {ok:false,why:'хуртовина'};
      if(IB.G.wx.type==='hail')return {ok:false,why:'град'};
    }
    if(r.kind==='expedition'&&IB.G.money<10)return {ok:false,why:'потрібно ₴10 на пальне'};
    const totFood=(IB.G.inv.bread||0)+(IB.G.inv.berries||0)+(IB.G.inv.canned||0)+(IB.G.inv.yushka||0)+(IB.G.inv.banosh||0);
    if(r.kind==='peak'&&totFood<2)return {ok:false,why:'жодної закуски в рюкзаках'};
    if((r.kind==='peak')&&!(IB.G.inv.water>0||IB.G.inv.beer>0))return {ok:false,why:'нема води в рюкзаках'};
    return {ok:true};
  };

  function placeTeam(x,y){
    IB.E.team.forEach((h,i)=>{h.x=x+(i-2)*0.6;h.y=y+0.4+i*0.12;h.tx=h.x;h.ty=h.y;h.target=null;h.fr=0;});
  }

  function openTravels(){
    const rs=IB.W.ROUTES||[];
    let h='<div class="pcard"><div class="ds">КУРТОЧНИЙ ВІДДІЛ «КАРПАТИ-ТУР»: реальні маршрути — Чорногора, Ґорґани, Мармароси, кордони і Шацькі озера. На кожній вершині група робить ФІО — полароїди летять у альбом.</div></div>';
    rs.forEach((r,i)=>{
      const c=IB.canTravel(r);
      h+='<div class="prow click" data-rv="'+i+'"><span class="nm">'+r.name+'</span><span class="ds">'+r.from+' • '+r.hours+' год • '+r.diff+'</span><span class="'+(c.ok?'ok':'no')+'">'+(c.ok?'ЙТИ ▶':'✖ '+c.why)+'</span></div>';
    });
    h+='<div class="prow head"><span class="nm">ФОТОАЛЬБОМ</span><span class="ds">кадрів: '+(IB.G.album?IB.G.album.length:0)+'</span><span class="ok">📷</span></div>';
    h+='<div class="prow click" data-alb="1"><span class="nm">Відкрити ФОТОАЛЬБОМ</span><span class="ds">полароїди групи</span><span class="ok">📷</span></div>';
    openPanel('МАНДРІВКИ ТА ВЕРШИНИ КАРПАТ',h);
    IB.$('panel-body').querySelectorAll('[data-rv]').forEach(el=>{
      el.onclick=()=>{
        const r=rs[+el.dataset.rv];
        const c=IB.canTravel(r);
        if(!c.ok){IB.toast(c.why,'red');IB.SFX.alert();return;}
        startTravel(r);
      };
    });
    const alb=IB.$('panel-body').querySelector('[data-alb]');
    if(alb)alb.onclick=()=>openAlbum();
  }

  function startTravel(r){
    closePanel();
    if(r.kind==='expedition'){
      IB.G.money-=10;
      IB.toast('₴10 на пальне — білий ван гуде','gold');
    }
    IB.G.route={x:r.x,y:r.y};
    if(r.kind==='walk'){
      const hrs=r.hours;
      IB.G.t+=hrs;if(IB.G.t>=24){IB.G.t-=24;IB.G.day++;}
      placeTeam(r.x,r.y);
      IB.G.stats.trips=(IB.G.stats.trips||0)+1;
      IB.banner('ДОБРАЛИСЬ: '+r.name);
      IB.journalAdd('🚐','Автостопом до «'+r.name+'» — '+(r.hours)+' год дороги. Трясло, але весело.');
      for(const h of IB.E.team)h.mood=IB.clamp(h.mood+4,0,100);
      IB.SFX.coin();
      IB.saveGame();
      return;
    }
    IB.TRAVEL_CUR={route:r,prog:0};
    IB.$('hud').classList.add('hidden');
    mode='climb';
    IB.banner('МАРШРУТ: '+r.name);
    IB.toast('E / клік — крок угору • ESC — повернути назад');
  }

  function climbStep(){
    const C=IB.TRAVEL_CUR;if(!C)return;
    const r=C.route;
    C.prog=IB.clamp(C.prog+8+IB.rnd(0,6),0,100);
    IB.G.t+=0.8+IB.rnd(0,0.4);
    if(IB.G.t>=24){IB.G.t-=24;IB.G.day++;IB.banner('ДЕНЬ '+IB.G.day+' — на маршруті');}
    const hard=r.diff==='★★★'?1.2:1;
    const w=r.kind==='expedition'?0.4:1;
    for(const h of IB.E.team){
      h.hp=IB.clamp(h.hp-(h.id==='viktor'?1.3:1.8)*hard*w,0,100);
      h.food=IB.clamp(h.food-1.1*w,0,100);
      h.water=IB.clamp(h.water-1.4*w,0,100);
      const wxk=IB.G.wx.type;
      if((wxk==='snow'||wxk==='blizzard')&&r.kind!=='expedition')h.cold=IB.clamp(h.cold+7,0,100);
      else h.cold=IB.clamp(h.cold-3,0,100);
    }
    IB.SFX.step();
    if(IB.M.random()<0.22){
      const evts={
        peak:['Тріска встрягла — TOXIC розповідав про Київ. Настрій +4',
              'Табір туристів з Івано-Франківська поділився кавою: вода +5',
              'Крутий схил! DIIN підсадив усіх. Сили −4, але сміх на всю полонину'],
        lake:['У озері мелькає риба-синьопірка — PABLO в захваті',
              'Пахне смолою і чистою водою. Настрій +3'],
        border:['Прикордонник махнув долонею: «Слава легендам з міста!»',
              'Дорогою запах баклажану і кави з сусіднього села. Настрій +4'],
        expedition:['Ван хитає на волинських вибоїнах — ROCK співає зірками',
              'Придорожні черешні: купили кілограм. ₴−5, настрій +6'],
      };
      const pool=evts[r.kind]||evts.peak;
      const txt=pool[IB.ri(0,pool.length-1)];
      IB.toast(txt,'gold');
      for(const h of IB.E.team)h.mood=IB.clamp(h.mood+3,0,100);
      if(txt.indexOf('−4')>=0)for(const h of IB.E.team)h.hp=IB.clamp(h.hp-4,0,100);
      if(txt.indexOf('вода +5')>=0)for(const h of IB.E.team)h.water=IB.clamp(h.water+5,0,100);
      if(txt.indexOf('₴−5')>=0)IB.G.money=IB.M.max(0,IB.G.money-5);
    }
    if(C.prog>=100)finishTravel(false);
  }

  function finishTravel(){
    const C=IB.TRAVEL_CUR;if(!C)return;
    const r=C.route;
    IB.TRAVEL_CUR=null;mode='game';
    IB.$('hud').classList.remove('hidden');
    IB.G.stats.trips=(IB.G.stats.trips||0)+1;
    IB.G.t+=r.hours*0.35;
    if(IB.G.t>=24){IB.G.t-=24;IB.G.day++;}
    const campAt=n=>IB.W.CAMPS.find(c=>c.name===n);
    const vilAt=n=>IB.W.VILLAGES.find(v=>v.name===n);
    const f=campAt(r.from)||vilAt(r.from);
    if(f)placeTeam(f.x+(f.w?f.w/2:0),f.y+(f.h?f.h/2:0));
    IB.banner(r.name+' — МАРШРУТ ПРОЙДЕНО!');
    IB.journalAdd('🥾','Мандрівка «'+r.name+'»: група повернулась у «'+r.from+'». '+
      (r.kind==='peak'?'Вершина взята — фіо в альбомі!':''));
    if(r.kind==='expedition'){
      const spot=(IB.W.PHOTO_SPOTS||[]).find(s=>s.kind==='shatsk');
      if(spot)IB.photoTaken(spot);
      for(const h of IB.E.team){h.mood=IB.clamp(h.mood+15,0,100);h.cold=0;}
      IB.toast('Світязь! Пісок, сосни, купання — Волинь дарує спокій','gold');
    }else{
      const spot=(IB.W.PHOTO_SPOTS||[]).find(s=>s.x>0&&IB.dist(s.x,s.y,r.x,r.y)<6);
      if(spot&&!IB.G.album.some(a=>a.spot===spot.id&&a.day===IB.G.day))IB.photoTaken(spot);
    }
    if(r.kind==='peak'){
      const a=IB.ARTIFACTS.find(q=>q.world&&!q.hidden&&!IB.artHas(q.id)&&IB.dist(q.x,q.y,r.x,r.y)<14);
      if(a)IB.toast('На вершині щось БЛИСКАЄ серед каміння — пошукай (E)','gold');
    }
    for(const h of IB.E.team)h.mood=IB.clamp(h.mood+12,0,100);
    IB.saveGame();
    IB.G.route=null;
  }

  IB.TRAVEL_ABORT=()=>{
    const C=IB.TRAVEL_CUR;if(!C)return;
    const r=C.route;
    IB.TRAVEL_CUR=null;mode='game';
    IB.$('hud').classList.remove('hidden');
    IB.G.t+=r.hours*0.4*C.prog/100;
    if(IB.G.t>=24){IB.G.t-=24;IB.G.day++;}
    const campAt=n=>IB.W.CAMPS.find(c=>c.name===n);
    const vilAt=n=>IB.W.VILLAGES.find(v=>v.name===n);
    const f=campAt(r.from)||vilAt(r.from);
    if(f)placeTeam(f.x+(f.w?f.w/2:0),f.y+(f.h?f.h/2:0));
    IB.toast('Повернулись з маршруту «'+r.name+'» — пройдено '+IB.M.round(C.prog)+'%');
    IB.G.route=null;
    IB.saveGame();
  };

  /* ---------- ІНТЕР'ЄРИ ---------- */
  function enterInterior(b){
    const def=IB.INT_DEFS[b.type];
    if(!def)return;
    IB._inInterior=true;
    IB.INT_CUR={b:b,def:def,hero:{x:def.w/2,y:def.h-1.5,dir:'u',fr:0,frT:0},
      entry:{x:def.w/2,y:def.h-1.5},hi:null};
    mode='interior';
    IB.$('prompt').classList.add('hidden');
    IB.SFX.ui();
    IB.toast(def.title+' — WASD рух • E — до об\'єктів • ESC — вийти');
  }
  function exitInterior(){
    if(!IB.INT_CUR)return;
    const b=IB.INT_CUR.b;
    IB.INT_CUR=null;IB._inInterior=false;
    mode='game';
    const d=b.door;
    IB.E.team.forEach((h,i)=>{h.x=d.x+0.5+(i-2)*0.7;h.y=d.y+1.2;h.tx=h.x;h.ty=h.y;h.target=null;h.fr=0;});
    IB.toast('Вийшли на вулицю');
  }
  function interiorMove(dt){
    const C=IB.INT_CUR;if(!C)return;
    const v=moveVec(),L=C.hero,D=C.def,sp=2.6;
    let nx=IB.clamp(L.x+v.x*sp*dt,0.8,D.w-0.8),ny=IB.clamp(L.y+v.y*sp*dt,0.9,D.h-0.6);
    for(const it of D.items){
      if(it.k==='host'||it.k==='priest'||it.k==='guard'||it.k==='farmw')continue;
      if(IB.dist(nx,ny,it.x,it.y)<1.05){nx=L.x;ny=L.y;break;}
    }
    if(v.x||v.y){
      L.x=nx;L.y=ny;
      L.dir=v.y>0.1?'d':(v.y<-0.1?'u':(v.x>0.1?'r':'l'));
      L.frT+=dt*8;L.fr=1+((L.frT|0)%2);
    }else L.fr=0;
    let best=null,bd=1.35;
    for(const it of D.items){const dd=IB.dist(L.x,L.y,it.x,it.y);if(dd<bd){bd=dd;best=it;}}
    C.hi=best;
  }
  function interiorInteract(){
    const C=IB.INT_CUR;if(!C||!C.hi)return;
    const it=C.hi,b=C.b,L=IB.E.team[0];
    switch(it.k){
      case 'pech':
        for(const h of IB.E.team){h.cold=0;h.mood=IB.clamp(h.mood+5,0,100);}
        IB.SFX.fire();IB.toast('ПІЧ ГУДЕ — вся група відігрілась','gold');break;
      case 'table':{
        const foods=Object.keys(IB.FOODS).filter(k=>IB.G.inv[k]>0);
        if(!foods.length){IB.toast('На столі порожньо...','red');break;}
        const opts=foods.slice(0,6).map(k=>({t:IB.FOODS[k].n+' ×'+IB.G.inv[k],f:()=>{IB.eat(L,k);closeDlg();}}));
        opts.push({t:'Нічого, дякую',f:closeDlg});
        openDialog('СТІЛ','Що їмо?',opts);break;}
      case 'host':{
        const lines=['«Ой, легендарні гості з міста! Сідайте, сметана на печі сама проситься.»',
          '«У Києві тепер тихо? А в горах завжди так: дерева, вода і вони — живі.»',
          '«Мольфар у Лісі Моли п\'ять трав знає на кожну хворобу. А шосту — на тугу.»',
          '«Як хуртовина замете — сидіть біля вогню. Гори не прощають гордих.»'];
        const line=IB.pick(lines,b.x*7+b.y);
        openDialog('ХАТА',line,[
          {t:'Посмакувати сметану (+настрій)',f:()=>{for(const h of IB.E.team)h.mood=IB.clamp(h.mood+6,0,100);IB.toast('Сметана з печі — благословення','gold');closeDlg();}},
          {t:'Покамість',f:closeDlg}]);break;}
      case 'pray':
        if(IB.G.flags['pray'+IB.G.day]){IB.toast('Ви вже молилися сьогодні — свічка тихо тріщить');break;}
        IB.G.flags['pray'+IB.G.day]=true;
        for(const h of IB.E.team)h.mood=IB.clamp(h.mood+10,0,100);
        IB.SFX.bell();IB.toast('МОЛЕБЕНЬ: настрій групи +10. Гори чують.','gold');break;
      case 'icons':
        for(const h of IB.E.team)h.mood=IB.clamp(h.mood+3,0,100);
        IB.toast('Ікони дивляться тепло');break;
      case 'priest':
        openDialog('ОТЕЦЬ ПАВЛО','«Мольфар у Лісі Моли — не сатана, а подвижник. А ще на Говерлі лежить ЗІРКА: хто дивиться з любов\'ю — побачить.»',
          [{t:'Амінь',f:closeDlg},{t:'Добрити',f:()=>{for(const h of IB.E.team)h.mood=IB.clamp(h.mood+4,0,100);closeDlg();}}]);break;
      case 'counter':openShop(b);break;
      case 'barkeep':openBar(b);break;
      case 'anvil':openForge(b);break;
      case 'farmw':openFarmstead(b);break;
      case 'guitar':
        for(const h of IB.E.team)h.mood=IB.clamp(h.mood+10,0,100);
        IB.SFX.trip();IB.toast('БАНДУРА! ROCK підспівує — корчма гуде','fun');break;
      case 'shelf':IB.toast('Полиця: бринза, мед, яблука, хліб');break;
      case 'bed':
        IB.G.t=(IB.G.t+1)%24;
        for(const h of IB.E.team)h.hp=IB.clamp(h.hp+10,0,100);
        IB.toast('Годинка на лежанку: сили +10');break;
      case 'guard':
        if(!IB.G.flags.stamped){
          IB.G.flags.stamped=true;IB.G.money+=10;
          openDialog('ПОГРАНИЧНИК','«Легенди з Києва, кажете? Штамп поставив. Ось ₴10 — за гарний настрій. Молдова близько, але повертайтесь: у вас тут гулянка.»',
            [{t:'Слава Україні!',f:closeDlg}]);
        }else openDialog('ПОГРАНИЧНИК','«Порядок на кордоні. Легендам — завжди раді.»',[{t:'Дякуємо!',f:closeDlg}]);
        break;
      case 'stella':{
        const spot=(IB.W.PHOTO_SPOTS||[]).find(s=>s.kind==='border'&&IB.dist(s.x,s.y,b.door.x,b.door.y)<10)||(IB.W.PHOTO_SPOTS||[]).find(s=>s.kind==='border');
        if(spot)IB.photoTaken(spot);break;}
      case 'fire':
        for(const h of IB.E.team)h.cold=IB.clamp(h.cold-30,0,100);
        IB.toast('Горн пашить — тепла');break;
    }
  }
  IB._intMove=interiorMove;

  /* ---------- ФОТОАЛЬБОМ ---------- */
  function openAlbum(){
    const alb=IB.G.album||[];
    let h='<div class="pcard"><div class="ds">ФОТОАЛЬБОМ «КАРПАТИ-ЛЕГЕНДА»: '+alb.length+' кадрів. Зберігається разом з грою (ESC/автосейв). Клік — збільшити.</div></div>';
    if(!alb.length){
      h+='<div class="prow"><span class="nm">Поки порожньо. МАНДРІВКИ (T) — Говерла, Петрос, Піп-Іван, озера, кордони — всюди група фотосесію влаштує.</span></div>';
    }else{
      h+='<div id="album-grid">';
      alb.forEach((p,i)=>{h+='<div class="alb-it" data-ai="'+i+'"><canvas width="96" height="76" data-ac="'+i+'"></canvas></div>';});
      h+='</div><div id="album-big"><canvas id="alb-big" width="240" height="190"></canvas></div>';
    }
    openPanel('ФОТОАЛЬБОМ — '+alb.length+' КАДРІВ',h);
    if(alb.length){
      IB.$('panel-body').querySelectorAll('canvas[data-ac]').forEach(cv=>{
        const idx=+cv.dataset.ac;
        IB.drawAlbumPhotoSmall(cv,alb[idx]);
        cv.parentNode.onclick=()=>{
          const big=IB.$('alb-big');
          if(big)IB.renderPhoto(big.getContext('2d'),alb[idx],0,0,240,190,false);
          IB.SFX.ui();
        };
      });
      const big=IB.$('alb-big');
      if(big)IB.renderPhoto(big.getContext('2d'),alb[alb.length-1],0,0,240,190,false);
    }
  }

  function start(){
    cv=IB.$('game');g=cv.getContext('2d');
    g.imageSmoothingEnabled=false;
    bindTouch();bindConsole();
    bootSeq();
    requestAnimationFrame(loop);
  }
  document.addEventListener('DOMContentLoaded',start);
  if(document.readyState==='loading'){}else start();
  return {start,getMode:()=>mode,debug:{openPanel,closePanel,openGroupPanel,openJournal,openBag,openMap}};
})();
