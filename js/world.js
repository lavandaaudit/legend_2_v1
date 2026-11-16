/* VIKTOR LEGEND 2 — world.js: генерація Карпат. Гори Говерла і Піп-Іван, Черемош, озеро,
   три села, кемпінги, скелі Довбуша, Ліс Моли, хата Мольфара, артефакти */
(function(){
const W=240,H=220;
IB.W={W,H,elev:null,terr:null,grid:new Map(),props:[],buildings:[],camps:[],pois:[],riverside:[],built:0};
const WA=IB.W;

/* ---------- значеневий шум ---------- */
function vnoise(x,y,s){
  const xi=IB.M.floor(x),yi=IB.M.floor(y),xf=x-xi,yf=y-yi;
  const a=IB.hsh(xi,yi,s),b=IB.hsh(xi+1,yi,s),c=IB.hsh(xi,yi+1,s),d=IB.hsh(xi+1,yi+1,s);
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return IB.lerp(IB.lerp(a,b,u),IB.lerp(c,d,u),v);
}
function noise2(x,y,s){return vnoise(x,y,s)*0.62+vnoise(x*2.1,y*2.1,s+11)*0.26+vnoise(x*4.3,y*4.3,s+29)*0.12;}

const PEAKS=[
  {x:60,y:40,r:30,h:7.2,name:'ГОВЕРЛА'},
  {x:192,y:28,r:26,h:6.4,name:'ПІП-ІВАН'},
  {x:118,y:196,r:20,h:4.6,name:'ГРЕБІНЬ'},
];
const LAKE={x:170,y:92,r:11,name:'ОЗЕРО ЛАЗУРНЕ'};
/* v1.2 — РЕАЛЬНІ КАРПАТИ: озера Чорногори й Ґорґан */
const LAKES2=[
  {x:184,y:42,r:5, name:'ОЗЕРО НЕСАМОВИТЕ'},   /* під Піп-Іваном, карове */
  {x:126,y:52,r:6, name:'ЯЙКО ІЛЕМЕНСЬКЕ'},    /* Ґорґани */
  {x:104,y:34,r:7, name:'ОЗЕРО СИНЕВИР'},      /* ліс, Ґорґани */
];
const ROCKS={x:112,y:148,r:12,name:'СКЕЛІ ДОВБУША'};

/* села */
const VILLAGES=[
  {id:'tustan',name:'ТУСТАНЬ',x:40,y:105,w:24,h:16,
   houses:[
    {dx:3,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ'},
    {dx:12,dy:2,w:5,d:4,type:'bar',label:'КОРЧМА «ЧЕРЕМОШ»'},
    {dx:19,dy:8,w:4,d:4,type:'house'},
    {dx:4,dy:10,w:4,d:4,type:'house'},
    {dx:10,dy:10,w:4,d:3,type:'chapel',label:'КАПЛИЦЯ'},
   ]},
  {id:'verh',name:'ВЕРХОВИНКА',x:54,y:148,w:26,h:18,
   houses:[
    {dx:3,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ'},
    {dx:11,dy:2,w:6,d:5,type:'bar',label:'КОРЧМА «ВЕСЕЛИЙ ГУЦУЛ»'},
    {dx:20,dy:2,w:5,d:4,type:'farm',label:'САДИБА'},
    {dx:4,dy:11,w:4,d:4,type:'house'},
    {dx:11,dy:11,w:4,d:4,type:'house'},
    {dx:17,dy:11,w:4,d:4,type:'barn',label:'СТАЙНЯ'},
   ]},
  {id:'krivo',name:'КРИВОРІВНЯ',x:148,y:172,w:24,h:16,
   houses:[
    {dx:3,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ МАЛА'},
    {dx:12,dy:2,w:5,d:4,type:'forge',label:'КОВАЛЬНЯ'},
    {dx:4,dy:10,w:4,d:4,type:'house'},
    {dx:12,dy:10,w:4,d:4,type:'house'},
    {dx:18,dy:10,w:4,d:4,type:'house'},
   ]},
];

/* кемпінги — рівні галявини біля води і доріг */
const CAMPS=[
  {id:'c1',name:'СТАРЕ ВОГНИЩЕ',x:66,y:118,r:6,start:true},
  {id:'c2',name:'ЧЕРЕМОСЬКИЙ КРЯЖ',x:88,y:158,r:6},
  {id:'c3',name:'ОЗЕРНИЙ МИС',x:158,y:100,r:6},
  {id:'c4',name:'ПІД КРИВОРІВНЕЮ',x:142,y:160,r:6},
  {id:'c5',name:'ПОЛОНИНА ВІТРІВ',x:82,y:58,r:6},
];
/* v1.2 — РЕАЛЬНІ ВЕРШИНИ: Чорногора і Мармароські Альпи */
PEAKS.push(
  {x:86,y:30,r:22,h:6.6,name:'ПЕТРОС'},                    /* 2020 м, сусід Говерли */
  {x:204,y:182,r:24,h:5.9,name:'ПІП-ІВАН МАРМАРОСЬКИЙ'},   /* 1936 м, Мармароси */
  {x:150,y:74,r:18,h:4.4,name:'СВИДОВЕЦЬ'}                 /* хребет Свидовець */
);
/* v1.2 — НОВІ СЕЛА: Ясіня, Бистриця, Ділове (кордон) */
VILLAGES.push(
 {id:'ysinya',name:'ЯСІНЯ',x:186,y:118,w:22,h:15,
   houses:[
    {dx:3,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ'},
    {dx:11,dy:2,w:6,d:4,type:'bar',label:'КОРЧМА «ГІРСЬКА КРАВЛЯ»'},
    {dx:5,dy:9,w:5,d:5,type:'church',label:'ЦЕРКВА РІЗДВА'},
    {dx:13,dy:9,w:4,d:4,type:'house'},
    {dx:17,dy:3,w:4,d:4,type:'house'},
   ]},
 {id:'byst',name:'БИСТРИЦЯ',x:12,y:94,w:20,h:14,
   houses:[
    {dx:3,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ ЛІСНИЦТВА'},
    {dx:11,dy:2,w:5,d:5,type:'church',label:'ЦЕРКВА СВ. МИКОЛИ'},
    {dx:4,dy:10,w:4,d:3,type:'house'},
    {dx:13,dy:10,w:4,d:3,type:'house'},
   ]},
 {id:'dilove',name:'ДІЛОВЕ',x:196,y:198,w:18,h:12,
   houses:[
    {dx:2,dy:2,w:5,d:4,type:'shop',label:'КРАМНИЦЯ «ТІРЛИК»'},
    {dx:9,dy:2,w:5,d:4,type:'bar',label:'КОРЧМА «ТРИ МОСТИ»'},
    {dx:3,dy:8,w:4,d:3,type:'house'},
    {dx:12,dy:8,w:5,d:3,type:'border',label:'КПП ДІЛОВЕ — РУМУНІЯ'},
   ]}
);
/* церкви у старих селах */
VILLAGES.find(v=>v.id==='verh').houses.push({dx:2,dy:6,w:5,d:5,type:'church',label:'ЦЕРКВА ПРЕЧИСТОЇ'});
VILLAGES.find(v=>v.id==='krivo').houses.push({dx:18,dy:2,w:4,d:4,type:'house'},{dx:8,dy:8,w:4,d:4,type:'house'});
VILLAGES.find(v=>v.id==='tustan').houses.push({dx:16,dy:2,w:4,d:4,type:'house'});
/* кордон Молдова — стела на сході */
VILLAGES.push({id:'krasno',name:'КРАСНОІЛЬСЬК — КОРДОН',x:226,y:146,w:10,h:8,
   houses:[
    {dx:3,dy:3,w:4,d:3,type:'border',label:'КОРДОН МОЛДОВА'}
   ]});
/* v1.3 — ХУТОРИ: одиночі хати з першої частини вздовж доріг */
VILLAGES.push(
 {id:'hutprut',name:'ХУТІР НА ПРУТІ',x:92,y:90,w:7,h:6,
   houses:[
    {dx:2,dy:1,w:4,d:3,type:'house'},
    {dx:5,dy:3,w:3,d:2,type:'barn',label:'СТОДОЛА'}
   ]},
 {id:'huttysa',name:'ХУТІР НА ТИСІ',x:208,y:170,w:7,h:6,
   houses:[
    {dx:2,dy:1,w:4,d:3,type:'house'},
    {dx:4,dy:4,w:3,d:2,type:'house'}
   ]}
);
/* v1.2 — КЕМПІНГИ-БАЗИ ВЕРШИН */
CAMPS.push(
  {id:'c6',name:'ЗАРОСЛЯК',x:50,y:58,r:6},    /* база Говерли і Петроса */
  {id:'c7',name:'КРИВОПІЛЛЯ',x:188,y:52,r:6}, /* база Піп-Івана, Несамовитого */
  {id:'c8',name:'МІЖГІРЯ МАРМАРОС',x:192,y:190,r:6} /* база Мармарос */
);
/* кордон-стела Молдови поза селом? — село krasno є; стела Румунії — в Діловому */

const MOLFAR={x:96,y:74,name:'ХАТА МОЛЬФАРА'};
const OBS={x:192,y:26,name:'РУЇНИ ОБСЕРВАТОРІЇ'};

/* ---------- ГЕНЕРАЦІЯ ---------- */
function genElev(){
  const elev=new Float32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let e=noise2(x*0.045,y*0.045,1)*3.4;
    /* підняття до гір на півночі */
    e+=(1-y/H)*1.4;
    for(const p of PEAKS){
      const d=IB.dist(x,y,p.x,p.y);
      e+=p.h*IB.M.exp(-(d*d)/(2*p.r*p.r*0.55));
    }
    /* долина Черемоша — низька смуга по діагоналі */
    const rv=IB.M.abs(y-(120+IB.M.sin(x*0.02)*26+IB.M.sin(x*0.07)*7));
    e-=IB.M.max(0,1-rv/16)*2.2;
    /* озерна западина */
    const dl=IB.dist(x,y,LAKE.x,LAKE.y);
    e-=IB.M.max(0,1-dl/(LAKE.r+6))*2.4;
    elev[y*W+x]=IB.clamp(e,0,9.9);
  }
  return elev;
}
function carveRiver(elev){
  /* Черемош: від заходу (0,132) звивисто до озера → виходить на південь */
  let x=-2,y=132;
  for(let i=0;i<300;i++){
    x+=0.9;
    y=132+IB.M.sin(x*0.032)*24+IB.M.sin(x*0.09)*6;
    if(x>W+2)break;
    const wdt=2.2+IB.M.sin(x*0.05)*0.9;
    for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
      const px=IB.M.round(x+dx),py=IB.M.round(y+dy);
      if(px<0||py<0||px>=W||py>=H)continue;
      const d=IB.M.hypot(dx,dy);
      if(d<=wdt){elev[py*W+px]=IB.M.min(elev[py*W+px],0.25);}
      else if(d<=wdt+1.3){elev[py*W+px]=IB.M.min(elev[py*W+px],0.75);}
    }
  }
  /* притока з говерли до озера */
  for(let t=0;t<40;t++){
    const px=IB.M.round(IB.lerp(62,168,t/39)),py=IB.M.round(IB.lerp(48,90,t/39)+IB.M.sin(t*0.4)*4);
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const qx=px+dx,qy=py+dy;
      if(qx<0||qy<0||qx>=W||qy>=H)continue;
      if(IB.M.hypot(dx,dy)<=1.6)elev[qy*W+qx]=IB.M.min(elev[qy*W+qx],0.3);
    }
  }
}
function carveLake(elev){
  for(let y=LAKE.y-LAKE.r-3;y<=LAKE.y+LAKE.r+3;y++)for(let x=LAKE.x-LAKE.r-3;x<=LAKE.x+LAKE.r+3;x++){
    const d=IB.dist(x,y,LAKE.x,LAKE.y);
    if(x<0||y<0||x>=W||y>=H)continue;
    if(d<=LAKE.r*0.82)elev[y*W+x]=0.1;
    else if(d<=LAKE.r)elev[y*W+x]=IB.M.min(elev[y*W+x],0.5);
    else if(d<=LAKE.r+2)elev[y*W+x]=IB.M.min(elev[y*W+x],1.1);
  }
  /* острів з артефактом «Око озера» */
  for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
    if(IB.M.hypot(x,y)<=2.2)elev[(LAKE.y+1+y)*W+(LAKE.x-2+x)]=1.6;
  }
}
function quantize(elev){
  /* тераси: сходинки по 1 — усі схили прохідні */
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)elev[y*W+x]=IB.M.round(elev[y*W+x]*1.05)/1.05;
  for(let pass=0;pass<6;pass++){
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      let m=elev[y*W+x];
      if(x>0)m=IB.M.min(m,elev[y*W+x-1]);if(x<W-1)m=IB.M.min(m,elev[y*W+x+1]);
      if(y>0)m=IB.M.min(m,elev[(y-1)*W+x]);if(y<H-1)m=IB.M.min(m,elev[(y+1)*W+x]);
      if(elev[y*W+x]-m>1.01)elev[y*W+x]=m+1;
    }
  }
}
function assignTerr(elev){
  const terr=new Uint8Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const e=elev[y*W+x],n=noise2(x*0.09,y*0.09,7),i=y*W+x;
    if(e<0.45)terr[i]=0;                     /* вода */
    else if(e<0.85)terr[i]=1;                /* пісок/берег */
    else if(e>=6.3)terr[i]=5;                /* сніг */
    else if(e>=4.4&&n>0.42)terr[i]=4;        /* скеля */
    else if(e>=3.1&&n<0.45)terr[i]=2;        /* полонина */
    else if(n<0.52)terr[i]=3;                /* ліс */
    else terr[i]=2;                          /* луга */
  }
  return terr;
}
function flattenRect(x0,y0,w,h,elev,to){
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){
    if(x<1||y<1||x>=W-1||y>=H-1)continue;
    elev[y*W+x]=to;
  }
}
function buildVillages(elev,terr){
  for(const v of VILLAGES){
    flattenRect(v.x,v.y,v.w,v.h,elev,1.3);
    /* головна вулиця по горизонталі посередині */
    const my=v.y+(v.h>>1);
    for(let x=v.x;x<v.x+v.w;x++){terr[my*W+x]=9;if(my+1<v.y+v.h)terr[(my+1)*W+x]=9;} /* 9 — дорога (широка) */
    /* провулок вертикальний */
    const mx=v.x+(v.w>>1);
    for(let y=v.y;y<v.y+v.h;y++){if(terr[y*W+mx]!==9)terr[y*W+mx]=9;if(mx+1<v.x+v.w&&terr[y*W+mx+1]!==9)terr[y*W+mx+1]=9;}
    for(const hs of v.houses){
      const hx=v.x+hs.dx,hy=v.y+hs.dy;
      for(let y=hy;y<hy+hs.d;y++)for(let x=hx;x<hx+hs.w;x++)terr[y*W+x]=10; /* 10 — забудова */
      const b={x:hx,y:hy,w:hs.w,h:hs.d,type:hs.type,label:hs.label||'',village:v.id,name:hs.label||'ХАТА',
        door:{x:hx+(hs.w>>1),y:hy+hs.d},vx:v.x,vy:v.y};
      /* двері на південній стіні, перед ними — вільна плитка */
      WA.buildings.push(b);
      if(hs.type==='farm'||hs.type==='barn'){
        /* загін для овець поруч */
        for(let y=hy-3;y<hy;y++)for(let x=hx;x<hx+hs.w;x++)terr[y*W+x]=8; /* 8 — загін */
      }
    }
  }
}
function carveCamps(elev,terr){
  for(const c of CAMPS){
    for(let y=c.y-c.r;y<=c.y+c.r;y++)for(let x=c.x-c.r;x<=c.x+c.r;x++){
      if(x<1||y<1||x>=W-1||y>=H-1)continue;
      const d=IB.dist(x,y,c.x,c.y);
      if(d<=c.r){elev[y*W+x]=IB.M.round(elev[y*W+x]);terr[y*W+x]=2;}
      else if(d<=c.r+2){terr[y*W+x]=IB.M.min(terr[y*W+x],2);}
    }
    /* стежка до найближчої дороги села не потрібна — пройде по лугах */
  }
  /* стежки між ключовими точками: кемпінг↔села, село↔село */
  const roads=[[66,118,52,113],[54,156,88,158],[88,158,64,148],[158,100,150,124],[148,180,158,104],[54,148,40,113],[66,118,82,62],[96,74,66,118],[112,148,88,158],[148,180,186,140],[52,113,50,60],[50,60,60,42],[60,42,86,32],[60,42,104,36],[104,36,126,52],[188,52,192,30],[188,52,184,44],[188,52,186,120],[186,120,230,150],[148,180,196,198],[196,198,204,184],[40,113,24,96],[88,158,186,120],[112,148,126,54],[66,118,50,60]];
  for(const [ax,ay,bx,by] of roads){
    const steps=IB.M.ceil(IB.dist(ax,ay,bx,by)*1.4);
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const px=IB.M.round(IB.lerp(ax,bx,t)+IB.M.sin(t*9)*1.5),py=IB.M.round(IB.lerp(ay,by,t)+IB.M.sin(t*7)*1.5);
      if(px<1||py<1||px>=W-1||py>=H-1)continue;
      const ti=py*W+px;
      if(terr[ti]!==0&&terr[ti]!==10)terr[ti]=7; /* 7 — стежка */
      /* v1.2: широка тропа — сусідні клітинки теж стежка */
      const nbs=[[px+1,py],[px,py+1]];
      for(const [qx,qy] of nbs){
        if(qx<1||qy<1||qx>=W-1||qy>=H-1)continue;
        const qi=qy*W+qx;
        if(terr[qi]!==0&&terr[qi]!==10&&terr[qi]!==8&&IB.hsh(qx,qy,77)<0.9)terr[qi]=7;
      }
      if(elev[ti]>0.9)elev[ti]=IB.M.min(elev[ti],(IB.M.floor(elev[ti]*2)/2));
    }
    /* стежка не має стрибати висотою >1: згладжуємо */
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      const px=IB.M.round(IB.lerp(ax,bx,t)+IB.M.sin(t*9)*1.5),py=IB.M.round(IB.lerp(ay,by,t)+IB.M.sin(t*7)*1.5);
      if(px<1||py<1||px>=W-1||py>=H-1)continue;
      /* беремо min сусідів по периметру — вже зроблено квантизацією пізніше */
    }
  }
}
function scatter(elev,terr){
  const P=IB.W.props;
  for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
    const i=y*W+x,t=terr[i],e=elev[i],h=IB.hsh(x,y,5);
    if(t===10||t===0)continue;
    const inCamp=CAMPS.some(c=>IB.dist(x,y,c.x,c.y)<=c.r+1);
    const inVill=VILLAGES.some(v=>x>=v.x&&x<v.x+v.w&&y>=v.y&&y<v.y+v.h);
    if(inCamp||inVill)continue;
    if(t===3){
      /* v1.3: ГУСТИЙ РІЗНОВИСОКИЙ ЛІС — ялинка/смерека/мішані широкі/берези */
      if(h<0.30)P.push({x,y,type:'spruce',seed:IB.hsh(x,y,8)});
      else if(h<0.38)P.push({x,y,type:'spruce2',seed:IB.hsh(x,y,8)});
      else if(h<0.47)P.push({x,y,type:'spruce3',seed:IB.hsh(x,y,8)});
      else if(h<0.56)P.push({x,y,type:'oak',seed:IB.hsh(x,y,8)});
      else if(h<0.62)P.push({x,y,type:'tree2',seed:IB.hsh(x,y,8)});
      else if(h<0.66)P.push({x,y,type:'birch',seed:IB.hsh(x,y,8)});
      else if(h<0.72)P.push({x,y,type:'bush',seed:IB.hsh(x,y,8),berries:true});
      else if(h<0.75)P.push({x,y,type:'herb',seed:IB.hsh(x,y,8),amt:1});
      else if(h<0.77)P.push({x,y,type:'mush',seed:IB.hsh(x,y,8),amt:1});
      else if(h<0.79)P.push({x,y,type:'wood',seed:IB.hsh(x,y,8),amt:2+(IB.hsh(x,y,14)<0.5?1:0)});
    }else if(t===2){
      if(h<0.045)P.push({x,y,type:'bush',seed:IB.hsh(x,y,8),berries:true});
      else if(h<0.075)P.push({x,y,type:'herb',seed:IB.hsh(x,y,8),amt:1});
      else if(h<0.095)P.push({x,y,type:'mush',seed:IB.hsh(x,y,8),amt:1});
      else if(h<0.11)P.push({x,y,type:'flower',seed:IB.hsh(x,y,8)});
      else if(h<0.13)P.push({x,y,type:'rock',seed:IB.hsh(x,y,8)});
      else if(h<0.14)P.push({x,y,type:'oak',seed:IB.hsh(x,y,8)});   /* одиночний мішаний дуб */
      else if(h<0.148)P.push({x,y,type:'wood',seed:IB.hsh(x,y,8),amt:1+(IB.hsh(x,y,15)<0.5?1:0)});
    }else if(t===4||t===5){
      if(h<0.12)P.push({x,y,type:'rock',seed:IB.hsh(x,y,8)});
      else if(h<0.20)P.push({x,y,type:'mrock',seed:IB.hsh(x,y,8)});  /* валуни з v5 */
      else if(h<0.26&&t===4)P.push({x,y,type:'pine',seed:IB.hsh(x,y,8)});
    }else if(t===1){
      if(h<0.03)P.push({x,y,type:'wood',seed:IB.hsh(x,y,8),amt:1});
    }
  }
  /* v1.3 — ЛІХТАРІ в селах (вздовж головної вулиці) + ПАРКАНИ біля загонів */
  for(const v of VILLAGES){
    const my=v.y+(v.h>>1);
    for(let lx=v.x+1;lx<v.x+v.w-1;lx+=4){
      for(const ly of [my-1,my+2]){
        const ti=ly*W+lx;
        if(ly<1||lx<1||lx>=W-1||ly>=H-1)continue;
        if(terr[ti]!==9&&terr[ti]!==10&&terr[ti]!==0&&!WA.grid.has(ti))
          P.push({x:lx,y:ly,type:'lamp',seed:IB.hsh(lx,ly,88)});
      }
    }
    for(const hs of v.houses){
      if(hs.type!=='farm'&&hs.type!=='barn')continue;
      const hx=v.x+hs.dx,hy=v.y+hs.dy;
      for(let fx=hx-1;fx<=hx+hs.w;fx+=2){
        const fy=hy-4;
        if(fx<1||fy<1||fx>=W-1||fy>=H-1)continue;
        const fi=fy*W+fx;
        if(terr[fi]!==0&&terr[fi]!==9&&terr[fi]!==10&&!WA.grid.has(fi))
          P.push({x:fx,y:fy,type:'fence',seed:IB.hsh(fx,fy,89)});
      }
    }
  }
  /* ЛІС МОЛИ — гущавина навколо хати Мольфара */
  for(let y=MOLFAR.y-14;y<=MOLFAR.y+14;y++)for(let x=MOLFAR.x-14;x<=MOLFAR.x+14;x++){
    const d=IB.dist(x,y,MOLFAR.x,MOLFAR.y);
    if(d>14||d<3)continue;
    const i=y*W+x;
    if(terr[i]===10||terr[i]===0||terr[i]===9||terr[i]===7)continue;
    if(IB.hsh(x,y,21)<0.55)P.push({x,y,type:'spruce3',seed:IB.hsh(x,y,22)});
    if(IB.hsh(x,y,23)<0.12)P.push({x,y,type:'mush',seed:IB.hsh(x,y,24),amt:1});
    if(IB.hsh(x,y,41)<0.03)P.push({x,y,type:'triph',seed:IB.hsh(x,y,42)}); /* рідкий гриб «5 г» */
  }
  /* скелі Довбуша — піки каміння */
  for(let i=0;i<26;i++){
    const a=IB.hsh(i,3,31)*6.28,rr=IB.hsh(i,5,32)*ROCKS.r;
    const px=IB.M.round(ROCKS.x+IB.M.cos(a)*rr),py=IB.M.round(ROCKS.y+IB.M.sin(a)*rr*0.8);
    const j=py*W+px;
    if(terr[j]!==0)P.push({x:px,y:py,type:'tower',seed:IB.hsh(i,9,33)});
  }
}
function gridProps(){
  WA.grid.clear();
  for(const p of WA.props)WA.grid.set(p.y*W+p.x,p);
}
function buildExtra(){
  /* хата Мольфара */
  WA.buildings.push({x:MOLFAR.x-2,y:MOLFAR.y-2,w:4,h:3,type:'molfar',label:'ХАТА МОЛЬФАРА',name:'ХАТА МОЛЬФАРА',village:null,door:{x:MOLFAR.x,y:MOLFAR.y+1}});
  /* руїни обсерваторії на Піп-Івані */
  WA.buildings.push({x:OBS.x-2,y:OBS.y-2,w:6,h:4,type:'ruin',label:'РУЇНИ ОБСЕРВАТОРІЇ',name:'РУЇНИ ОБСЕРВАТОРІЇ',village:null,door:{x:OBS.x+1,y:OBS.y+2}});
  /* колодязі в селах */
  for(const v of VILLAGES)WA.buildings.push({x:v.x+(v.w>>1)-1,y:v.y+(v.h>>1)-2,w:2,h:2,type:'well',label:'КОЛОДЯЗЬ',name:'КОЛОДЯЗЬ',village:v.id,door:{x:v.x+(v.w>>1),y:v.y+(v.h>>1)}});
}
function computeBlock(){
  for(const b of WA.buildings){
    for(let y=b.y-1;y<b.y+b.h+1;y++)for(let x=b.x-1;x<b.x+b.w+1;x++)WA.block[y*W+x]=1;
  }
}
function pois(){
  const P=[];
  for(const v of VILLAGES)P.push({x:v.x+v.w/2,y:v.y+v.h/2,name:v.name,kind:'village'});
  for(const c of CAMPS)P.push({x:c.x,y:c.y,name:c.name,kind:'camp'});
  P.push({x:LAKE.x,y:LAKE.y,name:LAKE.name,kind:'water'});
  P.push({x:60,y:40,name:'ГОВЕРЛА — 2061 м',kind:'peak'});
  P.push({x:192,y:28,name:'ПІП-ІВАН — 2028 м',kind:'peak'});
  P.push({x:ROCKS.x,y:ROCKS.y,name:ROCKS.name,kind:'rocks'});
  P.push({x:MOLFAR.x,y:MOLFAR.y,name:MOLFAR.name,kind:'molfar'});
  P.push({x:OBS.x,y:OBS.y,name:OBS.name,kind:'ruin'});
  for(const ep of EXTRA_POIS)P.push(ep);
  WA.pois=P;
}
/* зони для назви локації в HUD */
function zoneAt(x,y){
  for(const v of VILLAGES)if(x>=v.x-2&&x<v.x+v.w+2&&y>=v.y-2&&y<v.y+v.h+2)return v.name;
  for(const c of CAMPS)if(IB.dist(x,y,c.x,c.y)<=c.r+2)return c.name;
  if(IB.dist(x,y,LAKE.x,LAKE.y)<=LAKE.r+3)return LAKE.name;
  if(IB.dist(x,y,MOLFAR.x,MOLFAR.y)<=8)return 'ЛІС МОЛИ';
  if(IB.dist(x,y,ROCKS.x,ROCKS.y)<=ROCKS.r+2)return ROCKS.name;
  if(IB.dist(x,y,OBS.x,OBS.y)<=8)return OBS.name;
  /* v1.2: реальні вершини, озера, річка, кордони */
  for(const p of PEAKS2)if(IB.dist(x,y,p.x,p.y)<=p.r*0.8)return p.name+' — '+p.alt+' М';
  for(const L of LAKES2)if(IB.dist(x,y,L.x,L.y)<=L.r+3)return L.name;
  for(const b of BORDER_SIGNS)if(IB.dist(x,y,b.x,b.y)<=6)return b.name;
  {
    const dR=IB.M.abs(x-(44-(y-52)*0.15));
    if(y>50&&y<140&&dR<5)return 'РІЧКА БИСТРИЦЯ';
  }
  if(y>=H-9)return 'КОРДОН З РУМУНІЄЮ — ДІЛОВЕ';
  if(x>=W-11&&y>100&&y<180)return 'КОРДОН З МОЛДОВОЮ — КРАСНОІЛЬСЬК';
  const e=WA.elev[(y|0)*W+(x|0)]||0;
  if(e>=6.3)return 'СНІЖНИКИ';
  if(e>=4.2)return "КАМ'ЯНІ СХИЛИ";
  if(e>=3.0)return 'ПОЛОНИНА';
  const t=WA.terr[(y|0)*W+(x|0)];
  if(t===0)return 'ЧЕРЕМОШ';
  if(t===3)return 'ЯЛИНОВИЙ ЛІС';
  if(t===7)return 'СТАРОДАВНЯ СТЕЖКА';
  return 'КАРПАТСЬКІ ЛУГИ';
}
WA.zoneAt=zoneAt;
WA.PEAKS=PEAKS;WA.LAKE=LAKE;WA.VILLAGES=VILLAGES;WA.CAMPS=CAMPS;WA.MOLFAR=MOLFAR;WA.OBS=OBS;WA.ROCKS=ROCKS;
WA.LAKES2=LAKES2;

/* ================= v1.2: РЕАЛЬНІ КАРПАТИ — МАНДРІВКИ ================= */
/* вершини, на які можна піднятися (сходження) */
const PEAKS2=[
  {id:'gov', name:'ГОВЕРЛА',  alt:2061, x:60,  y:40, from:'ЗАРОСЛЯК'},
  {id:'petr',name:'ПЕТРОС',   alt:2020, x:86,  y:30, from:'ЗАРОСЛЯК'},
  {id:'pip', name:'ПІП-ІВАН', alt:2028, x:192, y:28, from:'КРИВОПІЛЛЯ'},
  {id:'marm',name:'ПІП-ІВАН МАРМАРОСЬКИЙ', alt:1936, x:204, y:182, from:'МІЖГІРЯ МАРМАРОС'},
  {id:'greb',name:'ГРЕБІНЬ',  alt:1472, x:118, y:196, from:'ПІД КРИВОРІВНЕЮ'},
];
const BORDER_SIGNS=[
  {id:'bd_ru',name:'КПП ДІЛОВЕ — РУМУНІЯ',        x:206,y:206},
  {id:'bd_md',name:'КОРДОН МОЛДОВА — КРАСНОІЛЬСЬК',x:230,y:150},
];
const EXTRA_POIS=[];
for(const p of PEAKS2)EXTRA_POIS.push({x:p.x,y:p.y,name:p.name+' — '+p.alt+' м',kind:'peak'});
for(const L of LAKES2)EXTRA_POIS.push({x:L.x,y:L.y,name:L.name,kind:'water'});
for(const b of BORDER_SIGNS)EXTRA_POIS.push({x:b.x,y:b.y,name:b.name,kind:'border'});
EXTRA_POIS.push({x:14,y:12,name:'ШАЦЬКІ ОЗЕРА →',kind:'shatsk'});

/* МАРШРУТИ — панель «МАНДРІВКИ» (T / кнопка ТРЕКИ) */
const ROUTES=[
 {id:'r_gov', kind:'peak', name:'ГОВЕРЛА — 2061 М',           x:60, y:40,  alt:2061, from:'ЗАРОСЛЯК',            hours:8, diff:'★★★',
  desc:'Вища точка України. Стежка від Заросляка: ліс → полонина → сніжники. На вершині — фото групи над хмарами.'},
 {id:'r_petr',kind:'peak', name:'ПЕТРОС — 2020 М',            x:86, y:30,  alt:2020, from:'ЗАРОСЛЯК',            hours:7, diff:'★★★',
  desc:'Крутий траверс з Говерли. Північний схил — каміння. Внизу дихає Прут.'},
 {id:'r_pip', kind:'peak', name:'ПІП-ІВАН — 2028 М',          x:192,y:28,  alt:2028, from:'КРИВОПІЛЛЯ',          hours:9, diff:'★★★',
  desc:'Чорногірський монарх. Нагорі — руїни обсерваторії «Білий Слон» і дзвін, що дзвонить сам.'},
 {id:'r_nes', kind:'lake', name:'ОЗЕРО НЕСАМОВИТЕ',           x:184,y:42,  alt:1530, from:'КРИВОПІЛЛЯ',          hours:6, diff:'★★',
  desc:'Карове озеро з камінням бажань. Кажуть, якщо кинути камінь — повернешся в Карпати ще раз.'},
 {id:'r_marm',kind:'peak', name:'МАРМАРОСИ — ПІП-ІВАН МАРМ.', x:204,y:182, alt:1936, from:'МІЖГІРЯ МАРМАРОС',    hours:8, diff:'★★★',
  desc:'Мармароські Альпи — за ними Румунія. З вершини видно Тису і кордон.'},
 {id:'r_yai', kind:'lake', name:'ЯЙКО ІЛЕМЕНСЬКЕ',            x:126,y:52,  alt:1580, from:'СТАРЕ ВОГНИЩЕ',       hours:6, diff:'★★',
  desc:'Яйце в кільці смерек. Місце, де Мольфар тримає рибу-ангела.'},
 {id:'r_sin', kind:'lake', name:'ОЗЕРО СИНЕВИР',              x:104,y:34,  alt:1520, from:'БИСТРИЦЯ',            hours:7, diff:'★★',
  desc:'Морське око Ґорґан. Лісник розповість про Семена Фабатку — але спершу дійди.'},
 {id:'r_dil', kind:'border',name:'ДІЛОВЕ — КОРДОН РУМУНІЯ',   x:206,y:206, alt:600,  from:'ПІД КРИВОРІВНЕЮ',     hours:5, diff:'★',
  desc:'Стара прикордонна стежка на Тису. Стела, штамп у пам\'яті і запах кави з Румунії.'},
 {id:'r_md',  kind:'border',name:'КОРДОН МОЛДОВА — КРАСНОІЛЬСЬК', x:230,y:150, alt:480, from:'ЯСІНЯ',            hours:6, diff:'★',
  desc:'Східний край карти. За стелою — Молдова: черешні, лелеки і далекі дзвони.'},
 {id:'r_byst',kind:'walk',  name:'АВТОСТОПОМ У БИСТРИЦЮ',     x:22, y:101, alt:700,  from:'СТАРЕ ВОГНИЩЕ',       hours:2, diff:'★',
  desc:'Сільський автобус-«богдан» трясе до лісового села Бистриця. Дешево і сердито.'},
 {id:'r_yas', kind:'walk',  name:'АВТОСТОПОМ У ЯСІНЮ',        x:197,y:126, alt:650,  from:'ЧЕРЕМОСЬКИЙ КРЯЖ',    hours:3, diff:'★',
  desc:'Дорога вздовж Черемоша до гуцульського крайку гір. Автостопом за ₴5.'},
 {id:'r_shat',kind:'expedition',name:'ШАЦЬКІ ОЗЕРА — СВІТЯЗЬ (АВТО)', x:0,y:0, alt:160, from:'ВЕРХОВИНКА',      hours:12, diff:'★★',
  desc:'АВТО-ЕКСПЕДИЦІЯ: з Верховинки волинськими дорогами — до Шацьких озер. Пісок, сосни, Світязь. На всю вдень.'},
];
const PHOTO_SPOTS=[
 ...PEAKS2.map(p=>({id:p.id,name:p.name+' • ВЕРШИНА',x:p.x,y:p.y,alt:p.alt,kind:'peak'})),
 {id:'sp_nes',name:'НЕСАМОВИТЕ',x:184,y:42,alt:1530,kind:'lake'},
 {id:'sp_yai',name:'ЯЙКО ІЛЕМЕНСЬКЕ',x:126,y:52,alt:1580,kind:'lake'},
 {id:'sp_sin',name:'СИНЕВИР',x:104,y:34,alt:1520,kind:'lake'},
 {id:'sp_laz',name:'ЛАЗУРНЕ • ОСТРІВ',x:170,y:92,alt:940,kind:'lake'},
 {id:'sp_ru', name:'КПП ДІЛОВЕ — РУМУНІЯ',x:206,y:206,alt:600,kind:'border'},
 {id:'sp_md', name:'КОРДОН МОЛДОВА',x:230,y:150,alt:480,kind:'border'},
 {id:'sp_dov',name:'СКЕЛІ ДОВБУША',x:112,y:148,alt:980,kind:'rocks'},
 {id:'sp_obs',name:'РУЇНИ ОБСЕРВАТОРІЇ',x:192,y:28,alt:2028,kind:'ruin'},
 {id:'sp_sha',name:'СВІТЯЗЬ — ШАЦЬКІ ОЗЕРА',x:0,y:0,alt:160,kind:'shatsk'},
];
WA.PEAKS2=PEAKS2;WA.BORDER_SIGNS=BORDER_SIGNS;WA.ROUTES=ROUTES;WA.PHOTO_SPOTS=PHOTO_SPOTS;

/* висота тайла для рендеру/руху */
WA.at=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return 9;return WA.terr[(y|0)*W+(x|0)];};
WA.elevAt=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return 9;return WA.elev[(y|0)*W+(x|0)]||0;};
WA.propAt=(x,y)=>WA.grid.get((y|0)*W+(x|0));
WA.block=new Uint8Array(W*H);

/* v1.2 — карвінг карових озер Чорногори/Ґорґан + річка Бистриця */
function carveExtraLakes(elev){
  for(const L of LAKES2){
    for(let y=L.y-L.r-3;y<=L.y+L.r+3;y++)for(let x=L.x-L.r-3;x<=L.x+L.r+3;x++){
      if(x<1||y<1||x>=W-1||y>=H-1)continue;
      const d=IB.dist(x,y,L.x,L.y);
      if(d<=L.r*0.8)elev[y*W+x]=0.12;
      else if(d<=L.r)elev[y*W+x]=IB.M.min(elev[y*W+x],0.6);
      else if(d<=L.r+2)elev[y*W+x]=IB.M.min(elev[y*W+x],1.4);
    }
  }
  /* РІЧКА БИСТРИЦЯ: від підніжжя Говерли на південь, впадає в Черемош */
  for(let t=0;t<46;t++){
    const x=44-t*0.30, y=52+t*2.0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
      const px=IB.M.round(x+dx),py=IB.M.round(y+dy);
      if(px<1||py<1||px>=W-1||py>=H-1)continue;
      if(IB.M.hypot(dx,dy)<=1.7)elev[py*W+px]=IB.M.min(elev[py*W+px],0.3);
      else if(IB.M.hypot(dx,dy)<=2.6)elev[py*W+px]=IB.M.min(elev[py*W+px],0.9);
    }
  }
}

/* ---------- ЗАПУСК ГЕНЕРАЦІЇ ---------- */
IB.genWorld=function(){
  /* скидання попередньої генерації */
  WA.props.length=0;WA.buildings.length=0;WA.pois.length=0;
  WA.grid.clear();WA.block.fill(0);WA.built=0;
  const elev=genElev();
  carveRiver(elev);carveLake(elev);carveExtraLakes(elev);
  quantize(elev);
  /* мольфарська хата на лісовій галявині */
  flattenRect(MOLFAR.x-3,MOLFAR.y-3,6,5,elev,1.2);
  const terr=assignTerr(elev);
  buildVillages(elev,terr);
  carveCamps(elev,terr);
  /* пере-позначити дороги/забудову після assignTerr */
  for(const v of VILLAGES){
    const my=v.y+(v.h>>1),mx=v.x+(v.w>>1);
    for(let x=v.x;x<v.x+v.w;x++){terr[my*W+x]=9;if(my+1<v.y+v.h)terr[(my+1)*W+x]=9;}
    for(let y=v.y;y<v.y+v.h;y++){if(terr[y*W+mx]!==9)terr[y*W+mx]=9;if(mx+1<v.x+v.w&&terr[y*W+mx+1]!==9)terr[y*W+mx+1]=9;}
    for(const hs of v.houses){
      const hx=v.x+hs.dx,hy=v.y+hs.dy;
      for(let y=hy;y<hy+hs.d;y++)for(let x=hx;x<hx+hs.w;x++)terr[y*W+x]=10;
      if(hs.type==='farm'||hs.type==='barn')for(let y=hy-3;y<hy;y++)for(let x=hx;x<hx+hs.w;x++)terr[y*W+x]=8;
    }
  }
  for(const c of CAMPS)for(let y=c.y-c.r;y<=c.y+c.r;y++)for(let x=c.x-c.r;x<=c.x+c.r;x++){
    if(IB.dist(x,y,c.x,c.y)<=c.r&&x>0&&y>0&&x<W&&y<H)terr[y*W+x]=2;
  }
  /* стежки поверх */
  const roads=[[66,118,52,113],[54,156,88,158],[88,158,64,148],[158,100,150,124],[148,180,158,104],[54,148,40,113],[66,118,82,62],[96,74,66,118],[112,148,88,158],[148,180,186,140],[52,113,50,60],[50,60,60,42],[60,42,86,32],[60,42,104,36],[104,36,126,52],[188,52,192,30],[188,52,184,44],[188,52,186,120],[186,120,230,150],[148,180,196,198],[196,198,204,184],[40,113,24,96],[88,158,186,120],[112,148,126,54],[66,118,50,60]];
  for(const [ax,ay,bx,by] of roads){
    const steps=IB.M.ceil(IB.dist(ax,ay,bx,by)*1.4);
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const px=IB.M.round(IB.lerp(ax,bx,t)+IB.M.sin(t*9)*1.5),py=IB.M.round(IB.lerp(ay,by,t)+IB.M.sin(t*7)*1.5);
      if(px<1||py<1||px>=W-1||py>=H-1)continue;
      const ti=py*W+px;
      if(terr[ti]!==0&&terr[ti]!==10&&terr[ti]!==8)terr[ti]=7;
      const nbs2=[[px+1,py],[px,py+1]];
      for(const [qx,qy] of nbs2){
        if(qx<1||qy<1||qx>=W-1||qy>=H-1)continue;
        const qi=qy*W+qx;
        if(terr[qi]!==0&&terr[qi]!==10&&terr[qi]!==8)terr[qi]=7;
      }
    }
  }
  /* мольфар + підхід */
  for(let y=MOLFAR.y-3;y<=MOLFAR.y+3;y++)for(let x=MOLFAR.x-4;x<=MOLFAR.x+5;x++){
    if(x<1||y<1||x>=W-1||y>=H-1)continue;
    const i=y*W+x;
    if(terr[i]===3)terr[i]=2;
  }
  WA.elev=elev;WA.terr=terr;
  scatter(elev,terr);
  gridProps();
  buildExtra();
  computeBlock();
  pois();
  /* артефакти — на сухий прохідний тайл */
  for(const a of IB.ARTIFACTS){
    if(!a.world)continue;
    let best=null,bd=1e9;
    for(let r=0;r<12&&!best;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const x=a.x+dx,y=a.y+dy;
      if(x<2||y<2||x>=W-2||y>=H-2)continue;
      const t=terr[y*W+x];
      if(t===0||t===10||t===9)continue;
      if(WA.block[y*W+x])continue;
      const p=WA.propAt(x,y);
      if(p&&(p.type==='spruce'||p.type==='spruce2'||p.type==='spruce3'||p.type==='birch'||p.type==='pine'||p.type==='oak'||p.type==='tree2'||p.type==='mrock'||p.type==='tower'||p.type==='rock'))continue;
      const dd=dx*dx+dy*dy;
      if(dd<bd){bd=dd;best={x,y};}
    }
    if(best){a.x=best.x;a.y=best.y;}
  }
  WA.built=(WA.built||0)+1;
};
})();
