/* VIKTOR LEGEND 2 — sys.js: виживання, погода, ГУЛЯНКА, «5 Г», артефакти, квести, економіка, сейв */

/* ---------- DOM-хелпери ---------- */
const $=id=>document.getElementById(id);
IB.$=$;
IB.toast=(txt,cls)=>{const l=$('log');if(!l)return;const d=document.createElement('div');d.className='log-line '+(cls||'');d.textContent=txt;l.appendChild(d);while(l.children.length>5)l.removeChild(l.firstChild);setTimeout(()=>{if(d.parentNode)d.parentNode.removeChild(d);},4100);};
IB.logLine=(txt,cls)=>IB.toast(txt,cls);
IB.banner=(txt)=>{const b=$('banner');b.textContent=txt;b.classList.remove('hidden');clearTimeout(IB._bt);IB._bt=setTimeout(()=>b.classList.add('hidden'),2700);};
IB.alertBox=(txt,cls)=>{const a=$('hud-alert');if(!txt){a.classList.add('hidden');return;}a.textContent=txt;a.className=cls||'';a.classList.remove('hidden');};
IB.floatMsgs=[];
IB.floatMsg=(x,y,txt)=>{IB.floatMsgs.push({x,y,txt,t:0});};

/* ---------- СТАН ---------- */
IB.G={mode:'boot',t:8,day:1,money:25,
  inv:{wood:2,berries:1,mush:0,herb:0,fishraw:0,potato:0,water:2,
       bread:1,brinza:0,canned:0,eggs:0,yushka:0,banosh:0,kulesh:0,cookfish:0,
       nalyva:0,beer:1,wine:0,vodka:0,rozsol:0,kava:0,trip5:0},
  quests:{done:[],active:'q1',side:{}},
  arts:[],journal:[],album:[],
  camps:{},   /* c1..c5 → {fire,fuel,tent,well,farm:{built,stage,planted,ready},table,dry} */
  party:{active:false,t:0,hour:0,scenes:0,at:null},
  trip:{active:false,t:0,hour:0,at:null},
  hangover:0,vision:0,axetier:1,
  flags:{},stats:{fish:0,wood:0,berries:0,parties:0,arts:0,gulyankaStories:0,trips:0,photos:0},
  wx:{type:'sun',t:90},evT:40,freezeEvt:0,touristDone:false,storyT:0,
  spawn:{x:66,y:118},slot:0,autoT:0};

IB.SYS={};
IB.G.nearCamp=IB.nearCamp;   /* аліас (ents.js визначає IB.nearCamp) */
for(const c of IB.W.CAMPS){IB.G.camps[c.id]={fire:false,fuel:0,tent:false,well:false,table:false,dry:false,
  farm:{built:false,stage:0,planted:false,ready:false,grow:0}};}

/* ---------- ПОГОДА: сонце/хмара/вітер/туман/дощ/град/сніг/ХУРТОВИНА ---------- */
IB.WX={type:'sun',t:90};
IB.WX_TYPES={
  sun:{label:'СОНЦЕ',cls:'wxs',sight:1,spd:1,cold:0,fun:1},
  cloud:{label:'ХМАРНІСТЬ',cls:'wxc',sight:1,spd:1,cold:0.2,fun:0.9},
  wind:{label:'ВІТЕР',cls:'wxw',sight:1,spd:0.92,cold:0.6,fun:0.85},
  fog:{label:'ТУМАН',cls:'wxf',sight:0.55,spd:0.9,cold:0.4,fun:0.8},
  rain:{label:'ДОЩ',cls:'wxr',sight:0.75,spd:0.85,cold:1,fun:0.7},
  hail:{label:'ГРАД',cls:'wxh',sight:0.65,spd:0.75,cold:1.4,fun:0.5},
  snow:{label:'СНІГ',cls:'wxn',sight:0.7,spd:0.8,cold:1.6,fun:0.75},
  blizzard:{label:'ХУРТОВИНА',cls:'wxb',sight:0.4,spd:0.62,cold:2.6,fun:0.4},
};
IB.WX.next=function(){
  const r=IB.M.random();
  let nx='sun';
  if(r<0.30)nx='sun';else if(r<0.45)nx='cloud';else if(r<0.55)nx='wind';
  else if(r<0.65)nx='fog';else if(r<0.78)nx='rain';else if(r<0.83)nx='hail';
  else if(r<0.93)nx='snow';else nx='blizzard';
  if(nx!==IB.G.wx.type){
    IB.G.wx.type=nx;
    const w=IB.WX_TYPES[nx];
    if(nx==='blizzard'){IB.banner('ХУРТОВИНА! Сховайся біля вогню!');IB.SFX.alert();}
    else IB.toast('ПОГОДА: '+w.label,'gold');
    if(nx==='snow'||nx==='blizzard')IB.logLine('Сніжить... Герої мерзнуть без вогню','red');
  }
  IB.G.wx.t=IB.rnd(90,220);
};
IB.WX.cur=()=>IB.WX_TYPES[IB.G.wx.type];

/* ---------- ЖУРНАЛ ---------- */
IB.journalAdd=(icon,txt)=>{IB.G.journal.unshift({d:IB.G.day,t:IB.clockStr(),icon,txt});if(IB.G.journal.length>60)IB.G.journal.pop();};

/* ---------- ТЕМПЕРАТУРА/ХОЛОД ---------- */
IB.coldRate=(h)=>{
  const w=IB.WX.cur();
  let r=0.5+w.cold*0.9;
  const nf=IB.nightFactor();
  r+=nf*1.6;
  const e=IB.W.elevAt(h.x,h.y);
  if(e>4)r+=1.2;if(e>6)r+=1.5;
  const c=IB.G.nearCamp(h.x,h.y,7);
  if(c&&IB.G.camps[c.id].fire&&IB.G.camps[c.id].fuel>0)r-=2.8;
  if(h.swim)r+=3;
  return IB.M.max(0.1,r);
};

/* ---------- ОНОВЛЕННЯ ВИЖИВАННЯ (dt сек реального часу) ---------- */
IB.survTick=(dt)=>{
  const party=IB.G.party.active,trip=IB.G.trip.active;
  for(const h of IB.E.team){
    if(party||trip){
      /* під час гулянки/тріпу час йде швидко, стан теж */
      h.food=IB.clamp(h.food-dt*0.9,0,100);
      h.water=IB.clamp(h.water-dt*0.8,0,100);
      continue;
    }
    const slow=h.food<=0||h.water<=0;
    const spd=slow?0.55:1;
    h.slowed=slow;
    h.food=IB.clamp(h.food-dt*0.85*spd,0,100);
    h.water=IB.clamp(h.water-dt*1.05*spd,0,100);
    const running=h.running&&h.id==='viktor';
    let hpD=0;
    if(h.food<=0)hpD+=dt*1.1;
    if(h.water<=0)hpD+=dt*1.6;
    /* холод */
    const cr=IB.coldRate(h);
    const fireProx=(()=>{const c=IB.G.nearCamp(h.x,h.y,4);return c&&IB.G.camps[c.id].fire&&IB.G.camps[c.id].fuel>0;})();
    if(cr>1.5&&!fireProx)h.cold=IB.clamp(h.cold+dt*cr*1.4,0,100);
    else h.cold=IB.clamp(h.cold-dt*4,0,100);
    if(h.cold>=100)hpD+=dt*1.5;
    h.hp=IB.clamp(h.hp-dt*hpD+(hpD===0?dt*0.6:0),0,100);
    /* настрій */
    let mD=-dt*0.25;
    if(IB.G.wx.type==='sun'&&IB.nightFactor()<0.2)mD+=dt*0.1;
    if(slow)mD-=dt*0.3;
    h.mood=IB.clamp(h.mood+mD,0,100);
    if(running)h.hp=IB.clamp(h.hp-dt*0.5,0,100);
    /* похмілля минає */
  }
  /* вогонь догорає */
  for(const cid in IB.G.camps){
    const c=IB.G.camps[cid];
    if(c.fire&&c.fuel>0){c.fuel-=dt*0.12;if(c.fuel<=0){c.fuel=0;c.fire=false;
      const camp=IB.W.CAMPS.find(k=>k.id===cid);
      IB.toast('Вогнище в «'+camp.name+'» догоріло','red');}}
  }
  /* ферми ростуть */
  for(const cid in IB.G.camps){
    const f=IB.G.camps[cid].farm;
    if(f.built&&f.planted&&!f.ready){f.grow+=dt*0.02; /* ~2.2 хв реального = 1 стадія */
      f.stage=IB.M.min(3,IB.M.floor(f.grow));
      if(f.grow>=4)f.ready=true;}
  }
};

/* ---------- ЇСТЬ/ПИТИ ---------- */
IB.FOODS={
  berries:{n:'Ягоди',food:12,water:6,fun:3},
  mush:{n:'Гриби (свіжі)',food:10,water:2,fun:0},
  cookfish:{n:'Смажена риба',food:24,water:0,fun:6},
  yushka:{n:'Юшка',food:36,water:24,fun:8},
  banosh:{n:'Банош з бринзою',food:42,water:4,fun:10},
  kulesh:{n:'Куліш',food:34,water:16,fun:7},
  bread:{n:'Хліб',food:26,water:0,fun:2},
  brinza:{n:'Бринза',food:20,water:0,fun:5},
  eggs:{n:'Яйця',food:14,water:0,fun:2},
  canned:{n:'Консерви',food:30,water:0,fun:1},
  potato:{n:'Картопля',food:16,water:0,fun:2},
  fishraw:{n:'Сира риба',food:8,water:2,fun:-3},
};
IB.DRINKS={
  water:{n:'Вода',water:35,alc:0,fun:0},
  beer:{n:'Пиво',water:14,alc:1,fun:8,food:4},
  wine:{n:'Вино',water:10,alc:2,fun:12,food:3},
  vodka:{n:'Горілка',water:6,alc:3,fun:16,food:0},
  nalyva:{n:'Наливка',water:9,alc:2,fun:14,food:4},
  rozsol:{n:'Розсіл',water:26,alc:0,fun:8,cure:true},
  kava:{n:'Кава',water:8,alc:0,fun:6,energy:22},
};
IB.eat=(h,kind)=>{
  const f=IB.FOODS[kind];
  if(!f||!IB.G.inv[kind])return false;
  IB.G.inv[kind]--;
  let mult=1;
  if(h.id==='andriy')mult=1.3;
  h.food=IB.clamp(h.food+f.food*mult,0,100);
  h.water=IB.clamp(h.water+(f.water||0),0,100);
  h.mood=IB.clamp(h.mood+(f.fun||0),0,100);
  IB.SFX.eat();
  IB.floatMsg(h.x,h.y,'+'+IB.M.round(f.food*mult)+'🍲');
  return true;
};
IB.drink=(h,kind)=>{
  const d=IB.DRINKS[kind];
  if(!d||!IB.G.inv[kind]&&kind!=='water')return false;
  if(kind!=='water')IB.G.inv[kind]--;
  h.water=IB.clamp(h.water+d.water,0,100);
  if(d.food)h.food=IB.clamp(h.food+d.food,0,100);
  if(d.energy)h.hp=IB.clamp(h.hp+d.energy,0,100);
  h.mood=IB.clamp(h.mood+(d.fun||0),0,100);
  if(d.alc){h.alc=IB.clamp(h.alc+d.alc,0,6);IB.toast(h.name+' вживає '+d.n,'fun');}
  if(d.cure&&IB.G.hangover>0){IB.G.hangover=0;IB.toast('Розсіл врятував! Похмілля минулося','gold');}
  IB.SFX.drink();
  return true;
};

/* ---------- СПАТИ/ВІДПОЧИТИ ---------- */
IB.sleepTillMorning=(inTent)=>{
  const h=IB.M.floor(IB.G.t);
  let hrs=(24-h)+7;
  if(hrs<=0||hrs>18)hrs=8;
  IB.G.t=(IB.G.t+hrs)%24;
  if(IB.G.t<7)IB.G.day++;
  const L=IB.E.team[0];
  for(const m of IB.E.team){
    m.hp=inTent?IB.M.min(100,m.hp+55):IB.M.min(100,m.hp+30);
    m.food=IB.M.max(0,m.food-hrs*2.4);
    m.water=IB.M.max(0,m.water-hrs*2.8);
    m.cold=IB.M.max(0,m.cold-40);
    if(IB.G.hangover>0){IB.G.hangover-=IB.M.floor(hrs*0.5);}
  }
  IB.SYS.onNewHours(hrs);
  IB.banner('РАНОК. ДЕНЬ '+IB.G.day+' • '+IB.clockStr());
  IB.journalAdd('🌙','Ніч у таборі'+(inTent?' (у наметі)':' (під зорями)')+'. Відпочили'+(inTent?' як слід':'.'));
};

/* ---------- ГУЛЯНКА (8 ігрових годин) ---------- */
IB.PARTY_SCENES=[
  {i:'🍻',t:'ТОСТ ЛЕГЕНДИ',x:'Лєгенда підняв кружку: «За тих, хто в місті! За нову дорогу!» Група гуркнула кружками так, що сполохали зграї в смереках.'},
  {i:'🎸',t:'ПІСНЯ PABLO',x:'PABLO заспівав коломийку про те, як він рибалив у Черемоші й витягнув не форель, а старий черевик. ROCK падав зі сміху.'},
  {i:'🔥',t:'СТРИБКИ КРІЗЬ ВОГОНЬ',x:"ROCK почав стрибати через вогнище. DIIN крикнув «Ти з глузду з'їхав!» — і стрибнув першим."},
  {i:'🍖',t:'БАНОШ TOXIC',x:'TOXIC сварився, що казан підвісили криво, але банош вийшов такий, що навіть пес прийшов з корчми.'},
  {i:'🃏',t:'КАРТИ ВІД ДІДА',x:'Грали в «дурня» на бринзу. PABLO програв три шматки і обіцяв перевірити, чи не підмінені карти. DIIN чихав у рукав.'},
  {i:'💃',t:'ТАНЕЦІ ПОЛОНИНОЮ',x:'ROCK танцював гопака навколо намету, поки не заплутався у шнурівках. Заразом усі плакали від сміху.'},
  {i:'👻',t:'СТРАШНИКИ DIIN',x:'DIIN розповідав про Довбуша і скрізь його скарби. Вітер раптом затих — усі озирнулися. ROCK запропонував ще горілки.'},
  {i:'⭐',t:'ЗОРЯНЕ НЕБО',x:'Лягли на траву дивитися зорі. Лєгенда показав Великий Воз. PABLO сказав, що звідти теж видно Черемош.'},
  {i:'🪵',t:'ПЕРЕТЯГУВАННЯ КОЛИНИ',x:'TOXIC проти ROCK. Колина скриппнула, обидва в траві. Нічия, як завжди.'},
  {i:'🎻',t:'СКРИПКА ВІТРУ',x:'Вітер заграв у щілинах скель, ніби скрипка. «Це Легінь грає», — сказав дід Гриць мимохідь. Хтось тут же підспівував.'},
  {i:'🧅',t:'РОЗІГРАШ ІВАСЯ',x:'ROCK підклав сиру картоплю в казан TOXIC. TOXIC пів години чекав, поки звариться. Помста була солодкою.'},
  {i:'🎒',t:'БАГАЖ НАОБОРОТ',x:'Грали «правду чи дію». Віктор вибрав правду і розповів, як у Києві прийняв останній сигнал. Стало тихо. Потім Віктор випив і стало весело.'},
  {i:'🏔️',t:'МІСТОК У ХМАРАХ',x:"Високо вгорі з'явився літак. «Дивіться, як низько», — сказав DIIN. «Це не літак, це хмара», — відповів PABLO. Спір тривав до третьої кружки."},
  {i:'🍺',t:'КОНКУРС «ХТО БІЛЬШЕ»',x:'Дід Гриць виявився несподівано тримким. Пішов додому на своїх, а група ще довго свистіла йому вслід.'},
  {i:'🐺',t:'ВОЛКИ ДАЛЕКО',x:'Десь завили волки. Пес з корчми завив у відповідь. ROCK запевнив, що це було по-дружньому.'},
  {i:'🌅',t:'СВІТАНКОВА ТИША',x:'До самого світу говорили про все. Про Київ. Про гори. Про те, що найкраща дорога — та, що веде до вогнища.'},
];
IB.canParty=()=>{
  const L=IB.E.team[0];
  const hour=IB.hStr();
  const c=IB.G.nearCamp(L.x,L.y,7);
  if(!c)return {ok:false,why:'Треба бути в таборі (кемпінг) з вогнищем'};
  const cc=IB.G.camps[c.id];
  if(!cc.fire||cc.fuel<=0)return {ok:false,why:'Вогнище не палає — потрібне живе вогнище з дровами'};
  if(hour<17)return {ok:false,why:'Гулянку починають увечері (після 17:00). Зараз '+IB.clockStr()};
  /* вся група поруч */
  for(const m of IB.E.team)if(IB.dist(m.x,m.y,L.x,L.y)>8)return {ok:false,why:'Не вся група зібрана ('+m.name+' десь далеко)'};
  const drinks=(IB.G.inv.beer||0)+(IB.G.inv.wine||0)+(IB.G.inv.vodka||0)+(IB.G.inv.nalyva||0);
  if(drinks<6)return {ok:false,why:'Треба мінімум 6 напиток на групу (є '+drinks+') — крамниця/корчма/наливка'};
  const food=(IB.G.inv.yushka||0)+(IB.G.inv.banosh||0)+(IB.G.inv.kulesh||0)+(IB.G.inv.cookfish||0)+(IB.G.inv.berries||0)*2+(IB.G.inv.bread||0)+(IB.G.inv.brinza||0);
  if(food<4)return {ok:false,why:'Замало закуски (нужно 4 порції) — зготуй або зірви'};
  return {ok:true,camp:c};
};
IB.startParty=()=>{
  const chk=IB.canParty();
  if(!chk.ok){IB.toast(chk.why,'red');IB.SFX.alert();return;}
  const p=IB.G.party;
  p.active=true;p.t=0;p.hour=0;p.at=chk.camp.id;p.scenes=[];
  const L=IB.E.team[0];
  /* витрати */
  let d=0;
  const order=['vodka','wine','nalyva','beer'];
  for(const k of order){while(IB.G.inv[k]>0&&d<8){IB.G.inv[k]--;d++;}}
  while(d<8&&(IB.G.inv.berries>0)){IB.G.inv.berries--;d++;}
  let f=0;
  const foods=['yushka','banosh','kulesh','cookfish','bread','brinza','canned','eggs','potato'];
  for(const k of foods){while(IB.G.inv[k]>0&&f<6){IB.G.inv[k]--;f++;}}
  IB.MUSIC.gulyanka();
  IB.banner('🔥 ГУЛЯНКА ПОЧАЛАСЬ! 🔥');
  IB.journalAdd('🔥','ГУЛЯНКА №'+(IB.G.stats.parties+1)+' у «'+chk.camp.name+'» — почалася о '+IB.clockStr()+'.');
  IB.alertBox('ГУЛЯНКА: '+p.t.toFixed(0)+' / 8 ГОД','al-fun');
  IB.G.stats.parties++;
};
IB.partyTick=(dt)=>{
  const p=IB.G.party;
  p.t+=dt*0.05; /* 1 ігрова година = 20 c → 8 год = 160 c реального */
  const hourN=IB.M.floor(p.t);
  if(hourN>p.hour){
    p.hour=hourN;
    const sc=IB.PARTY_SCENES[IB.ri(0,IB.PARTY_SCENES.length-1)];
    p.scenes.push(sc);
    IB.journalAdd(sc.i,sc.t+' — '+sc.x);
    IB.showScene(sc.i,sc.t,sc.x);
    IB.SFX.toast();
    for(const h of IB.E.team){
      h.mood=IB.clamp(h.mood+8,0,100);
      h.alc=IB.clamp(h.alc+0.6,0,6);
      h.food=IB.clamp(h.food+6,0,100);
      h.water=IB.clamp(h.water-2,0,100);
    }
    /* бонус веселунця */
    const mx=IB.E.team.find(h=>h.id==='maksym');
    if(mx&&IB.M.random()<0.4){mx.mood=100;IB.toast('ROCK розганяє гулянку! Настрій групи — 100','fun');}
  }
  if(p.t>=8){
    p.active=false;p.t=0;
    IB.G.hangover=6; /* до 12:00 */
    IB.MUSIC.day();
    IB.banner('ГУЛЯНКА ЗАВЕРШИЛАСЯ. ПОХМІЛЛЯ ДО 12:00...');
    IB.journalAdd('😵','Гулянка скінчилася о '+IB.clockStr()+'. Зранку — похмілля: вода, їжа або розсіл.');
    IB.alertBox('');
    IB.questCheck();
    /* сон групи трохи */
    for(const h of IB.E.team){h.hp=IB.clamp(h.hp-10,0,100);h.cold=0;}
  }
};

/* ---------- «5 Г» — ТРІП-НІЧЬ (6 год) ---------- */
IB.TRIP_EFFECTS={
  viktor:'Лєгенда бачить ЗОЛОТОГО ЛЕГЕНЯ — той скликає його до скарбів Карпат',
  andriy:'TOXIC: небо стало БАНОШЕМ. З хмар капає сметана. Він сміється і плаче одночасно',
  taras:'PABLO: риби в Черемоші співають коломийки. Він упевнений, що вивчив їхні імена',
  petro:'DIIN: світ склався в ГЕОМЕТРІЮ — лінії стежок сходяться до артефактів, він «бачить» карту скарбів',
  maksym:'ROCK: тіні смерек сміються з його жартів, а потім показують, де росте «той самий» гриб',
};
IB.canTrip=()=>{
  const chk=IB.canParty();
  if(!chk.ok&&!(chk.why||'').includes('напиток'))return {ok:false,why:chk.why};
  if(!(IB.G.inv.trip5>0))return {ok:false,why:'Немає «5 г» — рідкий гриб з грибних галявин або нагорода Мольфара'};
  const hour=IB.hStr();
  if(hour<18&&hour>4)return {ok:false,why:'«5 г» кладуть тільки у темнуву (після 18:00)'};
  return {ok:true,camp:chk.camp||IB.G.nearCamp(IB.E.team[0].x,IB.E.team[0].y,7)};
};
IB.startTrip=()=>{
  const chk=IB.canTrip();
  if(!chk.ok){IB.toast(chk.why,'red');IB.SFX.alert();return;}
  if(!chk.camp){IB.toast('Треба бути в таборі з вогнищем','red');return;}
  const cc=IB.G.camps[chk.camp.id];
  if(!cc.fire||cc.fuel<=0){IB.toast('Вогнище не палає','red');return;}
  IB.G.trip5used=(IB.G.trip5used||0);
  IB.G.inv.trip5--;
  const p=IB.G.trip;
  p.active=true;p.t=0;p.hour=0;p.at=chk.camp.id;
  IB.MUSIC.trip();
  IB.banner('✦ 5 Г — НІЧ П\'ЯТИ ЗІРОК ✦');
  IB.journalAdd('✦','НІЧ П\'ЯТИ ЗІРОК: група поділила «5 г» біля вогнища у «'+chk.camp.name+'».');
  IB.alertBox('ТРІП: '+p.t.toFixed(0)+' / 6 ГОД','al-fun');
};
IB.tripTick=(dt)=>{
  const p=IB.G.trip;
  p.t+=dt*0.05;
  const hourN=IB.M.floor(p.t);
  if(hourN>p.hour){
    p.hour=hourN;
    /* ефект одного героя за годину */
    const idx=(p.hour-1)%5;
    const h=IB.E.team[idx];
    const txt=IB.TRIP_EFFECTS[h.id];
    IB.journalAdd('✦',h.name+': '+txt);
    IB.showScene('✦',h.name+' ЛОВИТЬ ХВИЛЮ',txt);
    IB.SFX.trip();
    h.mood=100;
  }
  if(p.t>=6){
    p.active=false;
    IB.G.vision=IB.DAY_LEN; /* бачення на цілий день: артефакти світяться на карті */
    IB.MUSIC.day();
    IB.banner('ЗОРЯНЕ БАЧЕННЯ: АРТЕФАКТИ СВІТЯТЬСЯ НА КАРТІ (1 ДЕНЬ)');
    IB.journalAdd('👁','Зоряне бачення: протягом дня всі артефакти Карпат світяться на карті.');
    IB.alertBox('');
    IB.questCheck();
  }
};

/* ---------- АРТЕФАКТИ ---------- */
IB.ARTIFACTS=[
  {id:'a1',name:'ТОПІРЕЦЬ ДОВБУША',x:112,y:148,world:true,
   lore:'Топірець опришка. Скажуть: Довбуш ним не рубав деревину — рубав дороги для тих, хто тікав від панів.'},
  {id:'a2',name:'ДЗВІН ПІП-ІВАНА',x:192,y:28,world:true,
   lore:'Дзвін зі старої обсерваторії. Кажуть, дзвонить сам, коли на вершину піднімається той, хто нічого не боїться.'},
  {id:'a3',name:'ЗІРКА ГОВЕРЛИ',x:60,y:40,world:true,
   lore:'Метеорит у камені на вершині. Уночі вона тепла, як хліб з печі.'},
  {id:'a4',name:'ОКО ОЗЕРА',x:168,y:93,world:true,
   lore:'Крижалина, що ніколи не тане. Плаває по Лазурному і дивиться на тих, хто плаває поруч.'},
  {id:'a5',name:'ГРИБ-СВІЧКА',x:107,y:70,world:true,hidden:true,
   lore:'Світиться тільки для тих, хто п\'яний на «5 г». Мольфар каже: це ключ від усіх грибних троп.'},
  {id:'a6',name:'МОЛЬФАРСЬКИЙ АМУЛЕТ',world:false,
   lore:'Нагорода Мольфара за трави й ягоди. Відводить холод: у бурю і в ніч герої мерзнуть вдвічі повільніше.'},
  {id:'a7',name:'СКРИПКА ЛЕГЕНЯ',world:false,
   lore:'Скрипка з корчми «Веселий Гуцул». Бармен віддає тому, хто нагодує весілля. Музика з неї — як гулянка на 8 годин.'},
];
IB.artHas=(id)=>IB.G.arts.includes(id);
IB.pickArtifact=(a)=>{
  if(IB.artHas(a.id))return;
  IB.G.arts.push(a.id);
  IB.G.stats.arts++;
  IB.SFX.find();
  IB.banner('АРТЕФАКТ: '+a.name);
  IB.journalAdd('🏺',a.name+' — '+a.lore);
  IB.toast('АРТЕФАКТ ЗНАЙДЕНО: '+a.name,'gold');
  if(a.id==='a6')IB.G.flags.amulet=true;
  if(a.id==='a7')IB.G.flags.violin=true;
  IB.questCheck();
};

/* ---------- КВЕСТИ ---------- */
IB.QUESTS=[
  {id:'q1',t:'НОВА ДОРОГА',d:'Дійди до кемпінгу «Старе Вогнище» і розпали перше вогнище (E біля місця для вогнища → «Вогнище»).',
   chk:()=>{for(const c of IB.W.CAMPS){if(IB.G.camps[c.id].fire)return true;}return false;},loc:()=>IB.W.CAMPS[0]},
  {id:'q2',t:'ПЕРШИЙ ТАБІР',d:'Постав намет у кемпінгу (E → «Намет»), щоб зустріти ніч як слід.',
   chk:()=>{for(const c of IB.W.CAMPS){if(IB.G.camps[c.id].tent)return true;}return false;},loc:()=>IB.W.CAMPS[0]},
  {id:'q3',t:'ДЕРЕВА І ВОДА',d:'Через панель ГРУПА дай доручення: двом рубати дрова (10) і одному носити воду (4).',
   chk:()=>IB.G.inv.wood>=10&&IB.G.inv.water>=4,loc:()=>IB.W.CAMPS[0]},
  {id:'q4',t:'ВЕРХОВИНКА ГОСТИННА',d:'Дійди до села ВЕРХОВИНКА і купи хліб у крамниці (E на дверях).',
   chk:()=>IB.G.flags.boughtBread,loc:()=>IB.W.VILLAGES[1]},
  {id:'q5',t:'РИБАЛЬСЬКА МРІЯ',d:'Спіймай 3 риби: E біля води → «Рибалка». доручення PABLO «рибалити» теж рахуються.',
   chk:()=>IB.G.stats.fish>=3,loc:()=>IB.W.LAKE},
  {id:'q6',t:'ГРЯДКА КАРПАТ',d:'Збудуй грядку в таборі (E → «Грядка»), посади картоплю і зібери врожай.',
   chk:()=>IB.G.flags.harvest,loc:()=>IB.W.CAMPS[0]},
  {id:'q7',t:'ГУЛЯНКА ЗА ЗДОРОВ\'Я',d:'Купи напитки (крамниця/корчма/зготуй наливку), збери групу біля вогню після 17:00 і жми Q.',
   chk:()=>IB.G.stats.parties>=1,loc:()=>IB.W.VILLAGES[1]},
  {id:'q8',t:'ЛЕГЕНДА ПРО МОЛЬФАРА',d:'Знайди хату МОЛЬФАРА в Лісі Моли (за стежкою на північний захід) і принеси йому 5 трав і 5 ягід.',
   chk:()=>IB.artHas('a6'),loc:()=>IB.W.MOLFAR},
  {id:'q9',t:'СКАРБИ КАРПАТ',d:'Знайди 3 артефакти світу: скелі Довбуша, вершини, острів озера. Після тріпу вони світяться на карті.',
   chk:()=>['a1','a2','a3','a4','a5'].filter(id=>IB.artHas(id)).length>=3,loc:()=>IB.W.ROCKS},
  {id:'q10',t:'НІЧ П\'ЯТИ ЗІРОК',d:'Знайди «5 г» (рідкий гриб у Лісі Моли або від Мольфара) і проведи тріп-ніч зі всією групою.',
   chk:()=>IB.G.flags.tripDone,loc:()=>IB.W.MOLFAR},
  {id:'q11',t:'ХУРТОВИНА',d:'Переживи хуртовину: будь у таборі біля живого вогню, поки йде буря.',
   chk:()=>IB.G.flags.blizzardSurvived,loc:()=>IB.W.CAMPS[0]},
  {id:'q12',t:'ВЕЛИКА ГУЛЯНКА НА ГОВЕРЛІ',d:'Піднімись на ГОВЕРЛУ з напитками (6+) і закускою, розпали вогонь на вершині... і гулянка над хмарами.',
   chk:()=>IB.G.flags.legendDone,loc:()=>{return {x:60,y:40,name:'ГОВЕРЛА'};}},
  {id:'q13',t:'ФОТОЛЕТОПИС КАРПАТ',d:'Сфотографуй групу на ТРЬОХ вершинах: Говерла, Петрос, Піп-Іван (мандрівки — T / кнопка ТРЕКИ, або E на вершині).',
   chk:()=>{let n=0;for(const p of IB.G.album){if(p.kind==='peak')n++;}return n>=3;},
   loc:()=>IB.W.CAMPS[5]||IB.W.CAMPS[0]},
];
IB.SYS_Q=IB.QUESTS;
IB.questCheck=()=>{
  const q=IB.QUESTS.find(q=>q.id===IB.G.quests.active);
  if(!q)return;
  if(q.chk()){
    IB.G.quests.done.push(q.id);
    IB.SFX.done();
    IB.banner('КВЕСТ ВИКОНАНО: '+q.t);
    IB.journalAdd('✔','Квест виконано: '+q.t);
    IB.G.money+=30;
    IB.toast('+₴30 винагорода','gold');
    const next=IB.QUESTS.find(x=>!IB.G.quests.done.includes(x.id)&&x.id!==q.id);
    if(next){IB.G.quests.active=next.id;
      if(next.id==='q12')IB.banner('ФІНАЛ: '+next.t);
    } else {IB.G.quests.active=null;
      if(!IB.G.flags.legendDone){IB.G.flags.legendReady=true;}
    }
    if(q.id==='q12'){
      IB.G.flags.legendDone=true;
      IB.journalAdd('🏆','ЛЕГЕНДА КАРПАТ: група ЛЕГЕНДИ згуртувала всі села однією гулянкою на Говерлі.');
    }
  }
};
/* v1.2: фото на вершині — бонус і журнал */
IB.photoTaken=(spot)=>{
  IB.G.album.push({spot:spot.id,name:spot.name,kind:spot.kind,alt:spot.alt||0,
    day:IB.G.day,time:IB.clockStr(),wx:IB.G.wx.type,seed:IB.G.day*17+IB.G.album.length});
  IB.G.stats.photos++;
  IB.SFX.find();
  IB.banner('ФІОТО: '+spot.name);
  IB.journalAdd('📷','Фотокартка «'+spot.name+'» — '+IB.clockStr()+', день '+IB.G.day+'. '+
    (spot.alt?('Висота '+spot.alt+' м. '):'')+'Група сміється — останній кадр м\'явся TOXIC.');
  if(spot.kind==='peak'){IB.G.money+=20;IB.toast('+₴20 — редактор «Карпатського Тижня» купує кадр','gold');}
  IB.toast('Фото в альбомі (група → ФОТОАЛЬБОМ)','gold');
  IB.saveGame();
  IB.questCheck();
};

IB.questT=()=>{const q=IB.QUESTS.find(q=>q.id===IB.G.quests.active);return q?q.t:'ВСЕ ЗРОБЛЕНО — ЛЕГЕНДА ЖИВЕ';};

/* ---------- ДОРОУЧЕННЯ СЕЛЯН (side) ---------- */
IB.SIDES={
  wood:{npc:'дід Гриць',t:'ДРОВА ДЛЯ ШКОЛИ',d:'Принести дідові Грицу 8 дров.',need:s=>s.wood>=8,
    give(){IB.G.inv.wood-=8;IB.G.money+=30;return '₴30';}},
  fish:{npc:'пані Марічка',t:'РИБА НА СВЯТО',d:'Принести пані Марічці 5 риб.',need:()=>IB.G.stats.fish>=5,
    give(){IB.G.stats.fish-=5;IB.G.inv.brinza+=3;IB.G.money+=20;return 'бринза ×3 + ₴20';}},
  sheep:{npc:'малий Івась',t:'ЗАГУБЛЕНА ВІВЦЯ',d:'Знайти вівцю Івася біля Верховинки (блукає лугами) і привести.',need:()=>IB.G.flags.sheepFound,
    give(){IB.G.money+=25;return '₴25';}},
  forge:{npc:'коваль Дмитро',t:'ДРОВА ДЛЯ ГОРНА',d:'Принести ковалю 6 дров — зробить сокиру-«двійку» за півціни.',need:()=>IB.G.inv.wood>=6,
    give(){IB.G.inv.wood-=6;IB.G.flags.forgeDiscount=true;return 'знижка на сокиру';}},
  letter:{npc:'дід Мирослав',t:'ЛИСТ У ВЕРХОВИНКУ',d:'Віднести лист від діда Мирослава пані Марічці у Верховинку.',need:()=>IB.G.flags.letterDone,
    give(){IB.G.money+=20;return '₴20';}},
  molfar:{npc:'МОЛЬФАР',t:'ЗБІР ДЛЯ МОЛЬФАРА',d:'Принести Мольфару 5 трав і 5 ягід.',need:()=>IB.G.inv.herb>=5&&IB.G.inv.berries>=5,
    give(){IB.G.inv.herb-=5;IB.G.inv.berries-=5;IB.pickArtifact(IB.ARTIFACTS[5]);
      if(IB.G.inv.trip5<1){IB.G.inv.trip5+=1;IB.toast('Мольфар дав вам пакетик «5 Г»','fun');}
      return 'Мольфарський амулет';}},
  violin:{npc:'бармен Юрко',t:'СКРИПКА ЛЕГЕНЯ',d:'Купити в Юрка напиток на 8 монет загалом (сума покупок у корчмі) — віддасть скрипку Легеня.',need:()=>(IB.G.flags.barSpent||0)>=8,
    give(){IB.pickArtifact(IB.ARTIFACTS[6]);return 'Скрипка Легеня';}},
};

/* ---------- ФЕРМА ---------- */
IB.SYS.farmTick=(h)=>{
  for(const cid in IB.G.camps){
    const f=IB.G.camps[cid].farm;
    if(f.built&&f.planted&&!f.ready){f.grow+=0.5;f.stage=IB.M.min(3,IB.M.floor(f.grow));
      IB.floatMsg(h.x,h.y,'🌱');IB.logLine(h.name+' доглядає грядку');}
    else IB.floatMsg(h.x,h.y,'🌱');
  }
};
IB.SYS.autoCook=(h)=>{
  const inv=IB.G.inv;
  /* кухар TOXIC: готує найкращий доступний рецепт */
  const c=IB.G.nearCamp(h.x,h.y,7);
  if(!c||!IB.G.camps[c.id].fire||IB.G.camps[c.id].fuel<=0)return;
  const rec=IB.RECIPES[0];
  if(inv.fishraw>=1&&inv.wood>=1){inv.fishraw--;inv.wood--;inv.cookfish++;IB.floatMsg(h.x,h.y,'🍲');IB.logLine(h.name+' готує смажену рибу');}
};
IB.RECIPES=[
  {id:'cookfish',n:'Смажена риба',need:{fishraw:1,wood:1},out:1},
  {id:'yushka',n:'Юшка',need:{fishraw:2,herb:1,wood:1},out:1},
  {id:'banosh',n:'Банош',need:{brinza:1,potato:1,wood:1},out:1},
  {id:'kulesh',n:'Куліш',need:{potato:2,herb:1,wood:1},out:1},
  {id:'nalyva',n:'Наливка (2 шт)',need:{berries:3,wood:1},out:2},
];
IB.cook=(idx)=>{
  const r=IB.RECIPES[idx];if(!r)return false;
  const L=IB.E.team[0];
  const c=IB.G.nearCamp(L.x,L.y,7);
  if(!c||!IB.G.camps[c.id].fire||IB.G.camps[c.id].fuel<=0){IB.toast('Треба вогнище з дровами в таборі','red');return false;}
  for(const k in r.need)if((IB.G.inv[k]||0)<r.need[k]){IB.toast('Не вистачає: '+k,'red');return false;}
  for(const k in r.need)IB.G.inv[k]-=r.need[k];
  IB.G.inv[r.id]=(IB.G.inv[r.id]||0)+r.out;
  IB.SFX.eat();
  IB.toast('ЗГОВАНО: '+r.n+(L&&IB.E.team.find(h=>h.id==='andriy'&&IB.dist(h.x,h.y,L.x,L.y)<12)?' (+TOXIC додав смаку)':''),'gold');
  IB.journalAdd('🍲','Зготовано: '+r.n);
  return true;
};

/* ---------- ПОДІЇ ---------- */
IB.eventsTick=(dt)=>{
  IB.G.evT-=dt;
  if(IB.G.evT<=0){
    IB.G.evT=IB.rnd(150,260);
    const r=IB.M.random();
    if(r<0.35&&!IB.E.tourist&&!IB.G.touristDone){IB.spawnTourist();}
    else if(r<0.55){
      /* нічні байки біля вогню */
      const L=IB.E.team[0];
      const c=IB.G.nearCamp(L.x,L.y,5);
      if(c&&IB.G.camps[c.id].fire&&IB.G.camps[c.id].fuel>0&&IB.nightFactor()>0.4){
        IB.toast('Нічні байки біля вогню — настрій групи піднято','fun');
        for(const h of IB.E.team)h.mood=IB.clamp(h.mood+10,0,100);
        IB.journalAdd('🌙','Нічні байки біля вогнища у «'+c.name+'».');
      }
    }
    else if(r<0.7){
      /* грибний дощ після дощу */
      if(IB.G.wx.type==='rain'||IB.G.wx.type==='hail'){
        const L=IB.E.team[0];
        let added=0;
        for(let i=0;i<10;i++){
          const nx=L.x+IB.rnd(-14,14),ny=L.y+IB.rnd(-14,14);
          const t=IB.W.at(nx,ny);
          if((t===2||t===3)&&!IB.W.propAt(nx,ny)&&IB.W.elevAt(nx,ny)>1&&IB.W.elevAt(nx,ny)<5){
            IB.W.props.push({x:nx,y:ny,type:'mush',seed:IB.M.random(),amt:1});
            added++;
          }
        }
        if(added){IB.W.gridPropsRegen&&IB.W.gridPropsRegen();IB.toast('Після дощу виросли гриби! (+,'+added+')','gold');}
      }
    }
    else if(r<0.85){
      IB.toast('Зграя птахів проноситься над полониною','');IB.SFX.bird();
    }
    else {
      /* дикий виноград/ягоди достигли: кущі наповнюються */
      for(const p of IB.W.props)if(p.type==='bush'&&!p.berries&&IB.M.random()<0.2)p.berries=true;
      IB.toast('Ягоди достигли на кущах','');
    }
  }
  /* хуртовина — квест q11 */
  if(IB.G.wx.type==='blizzard'){
    const L=IB.E.team[0];
    const c=IB.G.nearCamp(L.x,L.y,8);
    if(c&&IB.G.camps[c.id].fire&&IB.G.camps[c.id].fuel>0){
      IB.G.blizT=(IB.G.blizT||0)+dt;
      if(IB.G.blizT>25&&!IB.G.flags.blizzardSurvived){IB.G.flags.blizzardSurvived=true;
        IB.banner('ХУРТОВИНУ ПЕРЕЖИТО БІЛЯ ВОГНЮ');
        IB.journalAdd('❄','Пережили хуртовину біля вогнища у «'+c.name+'». Гори шанують сильних.');
        IB.questCheck();}
    } else IB.G.blizT=0;
  }
  /* замерзлий товариш: під час хуртовини один герой відбивається */
  if(IB.G.wx.type==='blizzard'&&!IB.G.frozenMate&&IB.M.random()<dt*0.01){
    const m=IB.E.team[1+IB.ri(0,3)];
    if(!m.frozen){
      m.frozen=true;m.frozenT=0;
      m.x+=IB.rnd(-14,14);m.y+=IB.rnd(-14,14);
      IB.G.frozenMate=m;
      IB.banner(m.name+' ЗНИК У ХУРТОВИНІ! Йди на синій маркер!');
      IB.journalAdd('❄',m.name+' відбився в хуртовині — треба знайти!');
      IB.SFX.alert();
    }
  }
  if(IB.G.frozenMate){
    const m=IB.G.frozenMate,L=IB.E.team[0];
    m.frozenT+=dt;
    m.cold=IB.clamp(m.cold+dt*3,0,100);
    if(IB.dist(m.x,m.y,L.x,L.y)<6&&IB.G.nearCamp(L.x,L.y,8)&&IB.G.camps[IB.G.nearCamp(L.x,L.y,8).id].fire){
      m.frozen=false;m.cold=40;IB.G.frozenMate=null;
      IB.banner(m.name+' ВРЯТОВАНИЙ БІЛЯ ВОГНЮ');
      IB.journalAdd('🔥',m.name+' знайдено і зігріто біля вогнища.');
      IB.toast('+₴10 за порятунок','gold');IB.G.money+=10;
      for(const h of IB.E.team)h.mood=IB.clamp(h.mood+8,0,100);
    }
  }
  /* вівця Івася */
  if(!IB.G.flags.sheepFound&&IB.G.quests.side.sheep){
    const h=IB.E.team[0];
    for(const a of IB.E.animals){
      if(a.type==='sheep'&&a.lost&&IB.dist(a.x,a.y,h.x,h.y)<2){
        IB.G.flags.sheepFound=true;
        IB.banner('ВІВЦЮ ІВАСЯ ЗНАЙДЕНО!');
        IB.journalAdd('🐑','Знайшли загублену вівцю Івася.');
        a.lost=false;a.pen='verh';
      }
    }
  }
};

/* туриста врятовано */
IB.SYS.touristRescued=(camp)=>{
  const t=IB.E.tourist;
  IB.E.tourist=null;
  IB.G.money+=50;
  IB.G.touristDone=true;
  IB.SFX.done();
  IB.banner('ТУРИСТА ВРЯТОВАНО! +₴50');
  IB.journalAdd('🎒','Врятували загубленого туриста і привели у «'+camp.name+'».');
  IB.toast('+₴50 за порятунок','gold');
  for(const h of IB.E.team)h.mood=IB.clamp(h.mood+10,0,100);
};

/* ---------- ЧАС/ДНІ ---------- */
IB.SYS.onNewHours=(hrs)=>{
  /* по нових годинах: зміна погоди, події, зростання */
  for(let i=0;i<IB.M.ceil(hrs/3);i++)if(IB.M.random()<0.5)IB.WX.next();
};

IB.timeTick=(dt)=>{
  const prevH=IB.hStr();
  IB.G.t+=dt*0.05; /* 1 ігрова година = 20 сек */
  if(IB.G.t>=24){IB.G.t-=24;IB.G.day++;
    IB.banner('ДЕНЬ '+IB.G.day+' • '+IB.WX.cur().label);
    IB.journalAdd('☀','Настав день '+IB.G.day+'. Погода: '+IB.WX.cur().label+'.');
  }
  if(IB.hStr()!==prevH){
    if(IB.M.random()<0.4)IB.WX.next();
    IB.questCheck();
    if(IB.G.hangover>0){IB.G.hangover--;
      if(IB.G.hangover===0){IB.toast('Похмілля минулося!','gold');IB.journalAdd('🌞','Похмілля минулося.');}}
    if(IB.G.vision>0){IB.G.vision-=IB.DAY_LEN/24*1;if(IB.G.vision<=0){IB.G.vision=0;IB.toast('Зоряне бачення згасло');}}
  }
};

/* ---------- ШВИДКІСТЬ ГЕРОЯ ---------- */
IB.heroSpeed=(h)=>{
  let s=h.swim?1.5:3.4;
  if(h.id==='viktor'&&h.running)s=h.swim?2.2:5.0;
  if(h.slowed)s*=0.55;
  if(IB.G.hangover>0&&IB.hStr()<12)s*=0.8;
  if(h.frozen)s*=0.5;
  s*=IB.WX.cur().spd;
  const w=IB.WX.cur();
  if(IB.G.wx.type==='blizzard'&&!(IB.G.nearCamp(h.x,h.y,8)&&IB.G.camps[IB.G.nearCamp(h.x,h.y,8).id].fire&&IB.G.camps[IB.G.nearCamp(h.x,h.y,8).id].fuel>0))s*=0.75;
  return s;
};

/* ---------- ЗБЕРЕЖЕННЯ ---------- */
IB.saveGame=()=>{
  try{
    const team=IB.E.team.map(h=>({id:h.id,x:h.x,y:h.y,hp:h.hp,food:h.food,water:h.water,mood:h.mood,alc:h.alc}));
    const data={v:1,day:IB.G.day,t:IB.G.t,money:IB.G.money,inv:IB.G.inv,quests:IB.G.quests,arts:IB.G.arts,
      camps:IB.G.camps,journal:IB.G.journal.slice(0,40),flags:IB.G.flags,stats:IB.G.stats,
      wx:IB.G.wx,hangover:IB.G.hangover,vision:IB.G.vision,axetier:IB.G.axetier,album:IB.G.album,team,
      spawn:{x:IB.E.team[0].x,y:IB.E.team[0].y},touristDone:IB.G.touristDone};
    localStorage.setItem('vlegend_karpaty',JSON.stringify(data));
    IB.toast('ГРУ ЗБЕРЕЖЕНО','gold');
  }catch(e){IB.toast('Помилка збереження','red');}
};
IB.loadGame=()=>{
  try{
    const raw=localStorage.getItem('vlegend_karpaty');
    if(!raw)return false;
    const d=JSON.parse(raw);
    Object.assign(IB.G,{day:d.day,t:d.t,money:d.money,inv:d.inv,quests:d.quests,arts:d.arts,camps:d.camps,
      journal:d.journal||[],flags:d.flags,stats:d.stats,wx:d.wx,album:d.album||[],hangover:d.hangover||0,vision:d.vision||0,
      axetier:d.axetier||1,touristDone:d.touristDone||false});
    IB.spawnTeam(d.spawn.x,d.spawn.y);
    for(const s of d.team||[]){const h=IB.E.team.find(x=>x.id===s.id);if(h){h.x=s.x;h.y=s.y;h.hp=s.hp;h.food=s.food;h.water=s.water;h.mood=s.mood;h.alc=s.alc;}}
    IB.spawnVillagers();IB.spawnAnimals();IB.spawnFishes();
    IB.G.mode='game'; /* v1.2 fix: продовження запускало цикл гри */
    return true;
  }catch(e){return false;}
};
IB.hasSave=()=>{try{return !!localStorage.getItem('vlegend_karpaty');}catch(e){return false;}};

/* ---------- РИБАЛКА ---------- */
IB.fishing={active:false,t:0,window:0,state:'idle'};
IB.startFishing=()=>{
  const f=IB.fishing;
  if(f.active)return;
  f.active=true;f.state='wait';f.t=0;
  f.window=IB.rnd(1.2,3.5);
  IB.toast('Кинули вудку... чекай на клювання (E у момент «!»)');
};
IB.fishTick=(dt)=>{
  const f=IB.fishing;
  if(!f.active)return;
  const lucky=IB.M.random();
  f.t+=dt;
  if(f.state==='wait'){
    const taras=IB.E.team.find(h=>h.id==='taras');
    const tarasNear=taras&&IB.dist(taras.x,taras.y,IB.E.team[0].x,IB.E.team[0].y)<8;
    const prob=tarasNear?0.75:0.45;
    if(f.t>f.window&&IB.M.random()<dt*prob){f.state='bite';f.t=0;IB.toast('КЛЮВАЄ! Жми E!','gold');IB.SFX.fish();}
    if(f.t>9){f.active=false;IB.toast('Риба не клює — спробуй інше місце','red');}
  }else if(f.state==='bite'){
    if(f.t>1.4){f.state='wait';f.t=0;f.window=IB.rnd(1.5,3.5);IB.toast('Проспав момент...','red');}
  }
};
IB.fishCatch=()=>{
  const f=IB.fishing;
  if(!f.active||f.state!=='bite')return false;
  f.active=false;f.state='idle';
  IB.G.inv.fishraw++;IB.G.stats.fish++;
  IB.SFX.fish();
  const kind=IB.pick(['форель','марену','головеня','золотого карася']);
  IB.floatMsg(IB.E.team[0].x,IB.E.team[0].y,'+1🐟');
  IB.toast('ВЛОВЛЕНО: '+kind+'! (усього риб: '+IB.G.stats.fish+')','gold');
  IB.questCheck();
  return true;
};

/* ---------- СИНІ МАРКЕРИ (врятовано/замерз/вівця) ---------- */
IB.blip=()=>{
  if(IB.G.frozenMate)return {x:IB.G.frozenMate.x,y:IB.G.frozenMate.y,kind:'frozen'};
  if(IB.E.tourist&&IB.E.tourist.found)return {x:IB.E.tourist.x,y:IB.E.tourist.y,kind:'tourist'};
  return null;
};
