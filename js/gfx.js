/* VIKTOR LEGEND 2 — gfx.js: ізо-рендер світу, погода, ніч/вогонь, тріп-фх, мінімапа і велика карта */
IB.GFX={cam:{x:66,y:118},shake:0};
IB.tripFx=[];
IB.weatherP=[];

const T_COL={};
function terrCols(){
  const P=IB.PAL;
  T_COL[0]=[P.a2,P.a3,P.a4];           /* вода */
  T_COL[1]=[P.sa1,P.sa2,P.sa3];        /* берег */
  T_COL[2]=[P.g4,P.g5,P.g3];           /* луга */
  T_COL[3]=[P.f2,P.f3,P.f1];           /* ліс */
  T_COL[4]=[P.c2,P.c3,P.c1];           /* скеля */
  T_COL[5]=[P.sn1,P.sn2,P.sn3];        /* сніг */
  T_COL[7]=[P.r2,P.r3,P.r1];           /* стежка */
  T_COL[8]=[P.g2,P.g3,P.g4];           /* загін */
  T_COL[9]=[P.r3,P.r4,P.r2];           /* вулиця */
  T_COL[10]=[P.g3,P.g4,P.g2];          /* під забудовою */
}
terrCols();

function tileScreen(tx,ty){
  return {x:(tx-ty)*16, y:(tx+ty)*8};
}

/* ---------- ГОЛОВНИЙ РЕНДЕР СВІТУ ---------- */
IB.renderWorld=(g,dt)=>{
  const W=IB.W,cam=IB.GFX.cam;
  const L=IB.E.team[0];
  /* камера за лідером */
  cam.x=IB.lerp(cam.x,L.x,IB.M.min(1,dt*4));
  cam.y=IB.lerp(cam.y,L.y,IB.M.min(1,dt*4));
  const cx=(cam.x-cam.y)*16, cy=(cam.x+cam.y)*8-(cam.h||0)*10;
  const ox=240-cx, oy=168-cy-20;

  g.fillStyle='#0a0f0a';g.fillRect(0,0,480,336);

  /* видимий діапазон тайлів */
  const tx0=IB.M.max(0,IB.M.floor(cam.x-22)),tx1=IB.M.min(W.W-1,IB.M.ceil(cam.x+22));
  const ty0=IB.M.max(0,IB.M.floor(cam.y-24)),ty1=IB.M.min(W.H-1,IB.M.ceil(cam.y+24));

  const nf=IB.nightFactor();
  const snowCap=IB.G.wx.type==='snow'||IB.G.wx.type==='blizzard';

  /* земля */
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
    const t=W.at(tx,ty),h=W.elevAt(tx,ty);
    const s=tileScreen(tx,ty);
    const sx=s.x+ox, sy=s.y+oy-h*10;
    if(sx<-40||sx>520||sy<-60||sy>380)continue;
    const cc=T_COL[t]||T_COL[2];
    const v=IB.hsh(tx,ty,3);
    let col=cc[v<0.4?0:(v<0.75?1:2)];
    IB.rhomb(g,sx,sy,32,16,col);
    /* дрібні деталі */
    if(t===2||t===3){if(v>0.9)IB.P(g,sx+14+IB.hsh(tx,ty,4)*6,sy+6+IB.hsh(ty,tx,5)*4,2,1,IB.PAL.g6);}
    if(t===5&&v>0.8)IB.P(g,sx+10,sy+7,3,1,'#ffffff88');
    if(t===7){IB.P(g,sx+12,sy+6,8,2,IB.shade(col,-0.15));}
    /* вода: хвильки */
    if(t===0){
      const wv=IB.M.sin(IB.G.t*3+tx*0.8+ty*0.5);
      if(wv>0.55)IB.P(g,sx+8+IB.hsh(tx,ty,6)*12,sy+6,7,1,'#7ac8d866');
      if(wv<-0.6)IB.P(g,sx+14,sy+9,6,1,'#a8e0ec55');
    }
    /* кліфи: сусід нижче */
    const eL=W.elevAt(tx-1,ty),eR=W.elevAt(tx,ty+1);
    const hh=10;
    if(eL<h-0.01){
      const dh=IB.M.round((h-eL)*10);
      IB.PA(g,[[sx,sy+8],[sx+16,sy+16],[sx+16,sy+16+dh],[sx,sy+8+dh]],IB.shade(IB.shade(col,-0.28),0));
    }
    if(eR<h-0.01){
      const dh=IB.M.round((h-eR)*10);
      IB.PA(g,[[sx+16,sy+16],[sx+32,sy+8],[sx+32,sy+8+dh],[sx+16,sy+16+dh]],IB.shade(IB.shade(col,-0.16),0));
    }
    /* сніг на вершинах при погоді */
    if(snowCap&&h>4&&v>0.3){IB.PA(g,[[sx,sy+8],[sx+16,sy],[sx+32,sy+8],[sx+16,sy+16]],'#dce8f055');}
  }

  /* ---------- об'єкти+будівлі+сутності: сортування за глибиною ---------- */
  const draws=[];
  for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
    const p=W.propAt(tx,ty);
    if(p)draws.push({d:p.x+p.y,f:drawProp,a:p});
  }
  for(const b of W.buildings){
    if(b.x+b.w<tx0||b.x>tx1||b.y+b.h<ty0||b.y>ty1)continue;
    draws.push({d:(b.x+b.w/2)+(b.y+b.h/2),f:drawBuilding,a:b});
  }
  /* структури кемпінгів */
  for(const c of W.CAMPS){
    const cc=IB.G.camps[c.id];
    if(!cc)continue;
    if(IB.dist(c.x,c.y,cam.x,cam.y)>30)continue;
    if(cc.fire)draws.push({d:c.x+c.y-0.6,f:drawFire,a:{x:c.x,y:c.y,fuel:cc.fuel}});
    if(cc.tent)draws.push({d:c.x+c.y+1.5,f:drawTent,a:{x:c.x-3,y:c.y-2}});
    if(cc.well)draws.push({d:c.x+c.y+1.6,f:drawCampWell,a:{x:c.x+3,y:c.y-2}});
    if(cc.table)draws.push({d:c.x+c.y+1.8,f:drawTable,a:{x:c.x-2,y:c.y+3}});
    if(cc.dry)draws.push({d:c.x+c.y+2,f:drawDry,a:{x:c.x+2.5,y:c.y+3}});
    if(cc.farm.built)draws.push({d:c.x+c.y+2.2,f:drawFarm,a:{x:c.x+3,y:c.y+2,stage:cc.farm.stage,ready:cc.farm.ready,planted:cc.farm.planted}});
  }
  for(const e of IB.E.team)draws.push({d:e.x+e.y+0.3,f:drawHero,a:e});
  for(const n of IB.E.npcs)draws.push({d:n.x+n.y,f:drawNpc,a:n});
  for(const a of IB.E.animals)draws.push({d:a.x+a.y,f:drawAnimal,a});
  if(IB.E.tourist)draws.push({d:IB.E.tourist.x+IB.E.tourist.y,f:drawTourist,a:IB.E.tourist});
  for(const f of IB.E.fishes)draws.push({d:f.x+f.y,f:drawFishShadow,a:f});
  for(const c of (IB.E.cars||[]))draws.push({d:c.x+c.y+0.25,f:drawCar,a:c});
  for(const fx of IB.tripFx)draws.push({d:fx.x+fx.y,f:drawTripFx,a:fx});
  draws.sort((a,b)=>a.d-b.d);
  for(const dr of draws)dr.f(g,dr.a,ox,oy,dt);

  /* ---------- плаваючі повідомлення ---------- */
  for(const m of IB.floatMsgs){
    const s=tileScreen(m.x,m.y);
    g.font='8px monospace';g.fillStyle='#ffffffcc';
    g.fillText(m.txt,s.x+ox-4,s.y+oy-26-m.t*12);
    m.t+=dt;
  }
  for(let i=IB.floatMsgs.length-1;i>=0;i--)if(IB.floatMsgs[i].t>1.2)IB.floatMsgs.splice(i,1);

  /* ---------- тріп-хвилі ---------- */
  if(IB.G.trip.active){
    const hue=(IB.G.t*137+performance.now()*0.03)%360;
    g.fillStyle='hsla('+hue+',70%,50%,0.14)';g.fillRect(0,0,480,336);
    g.fillStyle='hsla('+((hue+120)%360)+',80%,60%,0.08)';g.fillRect(0,0,480,336);
    for(let i=0;i<5;i++){
      const ph=performance.now()*0.001+i;
      g.strokeStyle='hsla('+((hue+i*60)%360)+',85%,70%,0.35)';g.lineWidth=1.5;
      g.beginPath();
      for(let x=0;x<=480;x+=12)g.lineTo(x,168+IB.M.sin(x*0.02+ph*2+i)*60);
      g.stroke();
    }
  }

  /* ---------- ніч/вогонь світло ---------- */
  if(nf>0.05){
    g.fillStyle='rgba(8,14,26,'+(nf*0.55)+')';g.fillRect(0,0,480,336);
    /* світло вогнів */
    for(const c of W.CAMPS){
      const cc=IB.G.camps[c.id];
      if(cc&&cc.fire&&cc.fuel>0){
        const s=tileScreen(c.x,c.y);
        const fx=s.x+ox,fy=s.y+oy-6;
        const fl=0.75+IB.M.sin(performance.now()*0.01)*0.15;
        const gr=g.createRadialGradient(fx,fy,4,fx,fy,80*fl);
        gr.addColorStop(0,'rgba(240,180,60,'+(0.5*nf)+')');
        gr.addColorStop(0.5,'rgba(220,120,40,'+(0.22*nf)+')');
        gr.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=gr;g.beginPath();g.arc(fx,fy,80*fl,0,7);g.fill();
      }
    }
    /* місяць/зорі */
    if(nf>0.6){
      g.fillStyle='#ffffff99';
      for(let i=0;i<40;i++){
        const sx=IB.hsh(i,1,50)*480,sy=IB.hsh(i,2,51)*140;
        if(IB.hsh(i,3,52)>0.5)g.fillRect(sx,sy,1,1);
      }
    }
  }

  /* ---------- погода ---------- */
  drawWeather(g,dt);

  /* туман */
  if(IB.G.wx.type==='fog'){
    g.fillStyle='rgba(160,175,190,0.30)';g.fillRect(0,0,480,336);
    g.fillStyle='rgba(160,175,190,0.18)';
    const t=performance.now()*0.0004;
    for(let i=0;i<3;i++)g.fillRect(0,(i*120+t*30)%336,480,40);
  }
  /* хуртовина: біла завіса по краях */
  if(IB.G.wx.type==='blizzard'){
    const gr=g.createRadialGradient(240,168,80,240,168,300);
    gr.addColorStop(0,'rgba(230,240,250,0.05)');
    gr.addColorStop(1,'rgba(220,235,248,0.5)');
    g.fillStyle=gr;g.fillRect(0,0,480,336);
  }

  /* GPS-маркер */
  if(IB.G.route){
    const s=tileScreen(IB.G.route.x,IB.G.route.y);
    const fx=s.x+ox,fy=s.y+oy-14;
    const bob=IB.M.sin(performance.now()*0.004)*3;
    IB.PA(g,[[fx,fy-14+bob],[fx-5,fy-6+bob],[fx+5,fy-6+bob]],'#e05a8a');
    IB.P(g,fx-1,fy-6+bob,2,4,'#c84870');
    const d=IB.dist(IB.E.team[0].x,IB.E.team[0].y,IB.G.route.x,IB.G.route.y);
    g.font='7px monospace';g.fillStyle='#e05a8a';g.fillText(IB.M.round(d*3)+' м',fx-8,fy-18+bob);
  }

  /* сповіщення про тріп-бачення артефактів у світі */
  if(IB.G.vision>0||IB.G.trip.active){
    for(const a of IB.ARTIFACTS){
      if(!a.world||IB.artHas(a.id))continue;
      const s=tileScreen(a.x,a.y);
      const fx=s.x+ox,fy=s.y+oy-8;
      const pl=0.5+IB.M.sin(performance.now()*0.005)*0.3;
      g.strokeStyle='rgba(176,106,224,'+pl+')';g.lineWidth=2;
      g.beginPath();g.arc(fx,fy,8,0,7);g.stroke();
      g.fillStyle='rgba(176,106,224,'+pl+')';g.fillRect(fx-2,fy-10,4,4);
    }
  }
};

/* ---------- ПРОПСИ (v1.3: дерева ВИЩІ й РІЗНІ — ялинка/смерека/мішані/PNG з v5) ---------- */
function drawProp(g,p,ox,oy,dt){
  const s=tileScreen(p.x,p.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  const P=IB.PAL,v=IB.hsh(p.x,p.y,p.seed*100|0);
  switch(p.type){
    case 'spruce':case 'spruce2':case 'spruce3':{
      /* ВИЩІ ялинки: 34-52px (було 20-26) + різноманіття розмірів */
      const tall=p.type==='spruce'?1:(p.type==='spruce2'?0.82:1.18);
      const hgt=(32+v*16)*tall;
      const wdt=(10-(tall<1?2:0))*(p.type==='spruce2'?0.85:1);
      IB.O(g,x+4,y,9,3.5,'#00000028');
      IB.P(g,x-1,y-5,2,6,P.b2);
      const lay=[['#16321e',0.5],['#1e4228',0.68],['#265232',0.84],['#2e623c',0.96]];
      for(let i=0;i<4;i++){
        const wy=y-7-(hgt-8)*(i+1)/4.6, wdw=wdt-i*2.2;
        IB.PA(g,[[x-wdw,wy],[x+wdw,wy],[x,wy-11]],lay[i][0]);
        IB.PA(g,[[x-wdw*0.5,wy-4],[x+wdw*0.5,wy-4],[x,wy-11]],IB.shade(lay[i][0],0.15));
      }
      IB.P(g,x-1,y-6-hgt,2,3,'#2e623c');
      /* сніжні шапки на верхніх ярусах */
      if(v>0.72)IB.PA(g,[[x-3,y-7-hgt+6],[x+3,y-7-hgt+6],[x,y-7-hgt-2]],'#dce8f0aa');
      break;}
    case 'oak':{
      /* МІШАНЕ широке дерево (PNG дуба з першої частини), масштаб 1.3-2.0 */
      const im=IB.img('tree_o');
      const sc=1.3+v*0.7;
      IB.O(g,x+5,y,11,4,'#00000030');
      if(im)g.drawImage(im,x-im.width*sc/2,y-im.height*sc+4,im.width*sc,im.height*sc);
      else{IB.P(g,x-2,y-18,4,18,'#4e3a20');IB.O(g,x,y-26,13,9,'#3e6a2e');IB.O(g,x-5,y-30,8,6,'#4e7a38');IB.O(g,x+6,y-28,7,5,'#548640');}
      break;}
    case 'tree2':{
      /* тополя/береза вища (PNG з v5), масштаб 1.2-1.7 */
      const im=IB.img('tree_o2');
      const sc=1.2+v*0.5;
      IB.O(g,x+4,y,8,3,'#00000028');
      if(im)g.drawImage(im,x-im.width*sc/2,y-im.height*sc+4,im.width*sc,im.height*sc);
      else{IB.P(g,x-1,y-16,2,16,'#d8d8cc');IB.O(g,x,y-22,8,6,'#5a8a3a');}
      break;}
    case 'pine':{
      /* альпійська сосна (PNG з v5), масштаб 1.1-1.6 */
      const im=IB.img('pine');
      const sc=1.1+v*0.5;
      IB.O(g,x+3,y,7,2.5,'#00000028');
      if(im)g.drawImage(im,x-im.width*sc/2,y-im.height*sc+3,im.width*sc,im.height*sc);
      else{IB.P(g,x-1,y-4,2,5,P.b2);IB.PA(g,[[x-7,y-8],[x+7,y-8],[x,y-20]],'#1e4228');IB.PA(g,[[x-5,y-14],[x+5,y-14],[x,y-24]],'#265232');}
      break;}
    case 'birch':{
      IB.O(g,x+3,y,6,2.5,'#00000028');
      IB.P(g,x-1,y-16,2,17,'#d8d8cc');
      IB.P(g,x-1,y-10,2,1,'#2a2a24');IB.P(g,x-1,y-6,2,1,'#2a2a24');
      IB.O(g,x,y-20,7,6,'#5a8a3a');IB.O(g,x-3,y-23,4,3.5,'#6a9a46');IB.O(g,x+4,y-21,4,3,'#6a9a46');
      break;}
    case 'mrock':{
      /* гірський валун (PNG з першої частини), масштаб 1.2-1.8 */
      const im=IB.img(v>0.66?'mtn_rock':(v>0.33?'mtn_rock2':'mtn_rock3'));
      const sc=1.2+v*0.6;
      IB.O(g,x+4,y,10,3.5,'#00000030');
      if(im)g.drawImage(im,x-im.width*sc/2,y-im.height*sc+3,im.width*sc,im.height*sc);
      else{IB.PA(g,[[x-8,y],[x-3,y-8],[x+4,y-9],[x+9,y-1]],'#58605a');}
      break;}
    case 'fence':{
      /* дерев'яний паркан (PNG з v5) — не блокує */
      const im=IB.img('fence');
      if(im)g.drawImage(im,x-im.width*0.9/2,y-im.height*0.9+2,im.width*0.9,im.height*0.9);
      else{IB.P(g,x-8,y-6,16,1,'#7a5e38');IB.P(g,x-6,y-6,2,6,'#5e4628');IB.P(g,x+4,y-6,2,6,'#5e4628');}
      break;}
    case 'lamp':{
      /* вуличний ліхтар (PNG з v5) — світить уночі */
      const im=IB.img('lamp');
      if(im)g.drawImage(im,x-im.width*0.9/2,y-im.height*0.9+3,im.width*0.9,im.height*0.9);
      else{IB.P(g,x-1,y-26,2,26,'#3a4048');IB.P(g,x-4,y-30,8,5,'#2a2e36');}
      const nf=IB.nightFactor();
      if(nf>0.3){
        const ly=y-(im?im.height*0.9-8:28);
        IB.O(g,x,ly,3,2.5,'#f8e8a0');
        const gr=g.createRadialGradient(x,ly,2,x,ly,26*nf);
        gr.addColorStop(0,'rgba(240,200,90,'+(0.4*nf)+')');gr.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=gr;g.beginPath();g.arc(x,ly,26*nf,0,7);g.fill();
      }
      break;}
    case 'bush':{
      IB.O(g,x+2,y,6,2.5,'#00000025');
      IB.O(g,x,y-4,6,5,'#38502c');IB.O(g,x-3,y-5,4,3,'#446035');IB.O(g,x+3,y-6,3.5,3,'#405a32');
      if(p.berries){IB.O(g,x-2,y-5,1.5,1.5,PALbe());IB.O(g,x+2,y-4,1.5,1.5,'#d84058');IB.O(g,x,y-7,1.4,1.4,PALbe());}
      break;}
    case 'mush':{
      IB.O(g,x,y-2,3.5,2,'#e8dcc8');IB.O(g,x-3,y-2,2.5,1.5,'#d8c8a8');
      IB.O(g,x-1,y-5,4,2.5,'#c85048');IB.O(g,x-4,y-4,2.5,1.5,'#b84038');
      IB.P(g,x-2,y-5,1,1,'#f0e8e0');IB.P(g,x+0,y-4,1,1,'#f0e8e0');
      break;}
    case 'triph':{
      const pl=0.5+IB.M.sin(performance.now()*0.006)*0.3;
      IB.O(g,x,y-2,3,2,'#e8d8f0');
      IB.O(g,x-1,y-6,4,3,'rgba(176,106,224,'+pl+')');
      IB.O(g,x-1,y-6,2,1.5,'rgba(240,200,255,'+pl+')');
      g.strokeStyle='rgba(176,106,224,'+pl*0.7+')';g.beginPath();g.arc(x,y-4,7,0,7);g.stroke();
      break;}
    case 'herb':{
      IB.P(g,x-1,y-4,1,4,'#3a6a3a');IB.P(g,x,y-6,1,3,'#3a6a3a');
      IB.O(g,x-2,y-5,1.5,1.5,'#e8d050');IB.O(g,x+1,y-6,1.5,1.5,'#e8d050');
      break;}
    case 'flower':{
      IB.P(g,x,y-3,1,3,'#3e5a32');
      IB.O(g,x,y-4,1.6,1.3,v<0.5?'#c85078':'#e8d050');
      break;}
    case 'rock':{
      IB.O(g,x+2,y,6,2.5,'#00000028');
      IB.PA(g,[[x-5,y],[x-2,y-5],[x+3,y-6],[x+6,y-1]],'#58605a');
      IB.PA(g,[[x-2,y-5],[x+3,y-6],[x+4,y-2],[x-1,y-1]],'#6e7872');
      break;}
    case 'tower':{
      IB.O(g,x+3,y,8,3,'#00000030');
      IB.PA(g,[[x-7,y],[x-3,y-16],[x+2,y-18],[x+7,y-2]],'#58605a');
      IB.PA(g,[[x-3,y-16],[x+2,y-18],[x+4,y-10],[x-1,y-9]],'#6e7872');
      IB.P(g,x-2,y-8,3,1,'#3e4440');
      break;}
    case 'wood':{
      if(p.amt>0){IB.P(g,x-6,y-2,12,3,'#7a5e38');IB.P(g,x-6,y-2,12,1,'#96784e');IB.O(g,x-6,y-1,1.5,1.5,'#5e4628');
        if(p.amt>1){IB.P(g,x-4,y-5,10,3,'#6a5230');IB.O(g,x+6,y-3.5,1.5,1.5,'#4e3a20');}}
      break;}
    default:break;
  }
}
function PALbe(){return IB.M.sin(performance.now()*0.001)>0?'#b82840':'#d84058';}

/* ---------- БУДІВЛІ (v1.3: справжні активи з ПЕРШОЇ ЧАСТИНИ — дачі, цегляні хати,
   крамниця, гараж; пропорції v5 1:1; процедурний фолбек) ---------- */
const BLD_IMG={
  house:['bld_dacha1_0','bld_dacha1_1','bld_dacha2_0','bld_dacha2_1','bld_dacha3_0'],
  brick:['bld_bhouse2_0','bld_bhouse2_1'],
  bar:['bld_bhouse1_0'],
  shop:['bld_shop1_0'],
  barn:['bld_garage_0'],
};
function bldPick(b){
  if(b.type==='shop')return 'bld_shop1_0';
  if(b.type==='bar')return 'bld_bhouse1_0';
  if(b.type==='barn')return 'bld_garage_0';
  if(b.type==='forge')return 'bld_bhouse2_0';
  if(b.type==='farm')return 'bld_bhouse2_1';
  if(b.type==='house')return BLD_IMG.house[(b.x*3+b.y*7)%BLD_IMG.house.length];
  return null;
}
function drawBuilding(g,b,ox,oy,dt){
  const s=tileScreen(b.x+b.w/2,b.y+b.h/2);
  const x=s.x+ox-16*b.w/2, y=s.y+oy-8*b.h/2;
  const P=IB.PAL;
  const wpx=b.w*16,dpx=b.h*16;
  const nf=IB.nightFactor();
  const lit=nf>0.4;
  const px=x+wpx/2, py=y+dpx;           /* південний кут footprint — анкер PNG */
  const name=bldPick(b);
  const im=name?IB.img(name):null;
  /* тінь */
  IB.O(g,px+6,py+2,wpx*0.62,dpx*0.5,'#00000030');
  if(b.type==='well'){
    IB.isoBox(g,x,y,20,14,8,P.c2,P.c1,P.c1);
    IB.PA(g,[[x+4,y+7],[x+10,y+2],[x+16,y+7],[x+10,y+12]],'#1a1418');
    IB.P(g,x+9,y-8,2,10,P.b2);IB.P(g,x+14,y-8,2,10,P.b2);
    IB.PA(g,[[x+6,y-8],[x+18,y-8],[x+12,y-13]],P.rf2);
    return;
  }
  if(b.type==='ruin'){
    IB.isoBox(g,x,y,wpx,dpx,5,P.c1,IB.shade(P.c1,-0.2),P.c2);
    IB.P(g,x+6,y-8,3,8,P.c2);IB.P(g,x+wpx-14,y-6,4,6,P.c1);
    IB.P(g,x+10,y+dpx/2-4,8,2,P.c2);
    return;
  }
  if(b.type==='church'){
    /* гуцульська дерев'яна церква: ВИЩА вежа + хрест (масштаб v5) */
    const cw=Math.max(wpx,36);
    IB.isoBox(g,x,y,cw,dpx,12,P.b2,P.w2,P.w3);
    IB.isoBox(g,x+cw/2-10,y-8,20,dpx*0.6,20,P.rf2,P.rf3,P.rf4);
    IB.PA(g,[[x+cw/2-8,y-26],[x+cw/2,y-40],[x+cw/2+8,y-26]],P.rf3);
    IB.P(g,x+cw/2-1,y-52,2,12,P.y2);IB.P(g,x+cw/2-5,y-48,10,2,P.y2);IB.P(g,x+cw/2-3,y-44,6,2,P.y2);
    IB.P(g,x+4,y+dpx/2-2,4,5,'#3a2a1a');
    /* вікна-свічки уночі */
    if(lit){IB.P(g,x+cw/2-8,y-14,3,4,'#f0c060');IB.P(g,x+cw/2+5,y-14,3,4,'#f0c060');
      IB.O(g,x+cw/2-6,y-12,6,7,'rgba(240,180,60,0.22)');IB.O(g,x+cw/2+7,y-12,6,7,'rgba(240,180,60,0.22)');}
    drawSign(g,b,px,py);
    return;
  }
  if(b.type==='border'){
    /* прикордонний КПП: стовпчик-смуга + шлагбаум + стела */
    IB.isoBox(g,x,y,26,dpx,10,P.w2,P.w3,P.b3);
    IB.P(g,x+2,y-18,3,16,P.be1);IB.P(g,x+5,y-18,3,16,P.wht);
    IB.P(g,x+8,y-18,3,16,P.be1);
    IB.P(g,x+2,y-20,12,2,P.y3);
    IB.P(g,x+15,y-11,12,2,P.y2); /* шлагбаум */
    IB.P(g,x+14,y-11,2,3,P.blk);
    drawSign(g,b,px,py);
    return;
  }
  /* ---------- ДАЧІ/ХАТИ/КРАМНИЦЯ/КОРЧМА — PNG ПЕРШОЇ ЧАСТИНИ (1:1, як v5) ---------- */
  if(im){
    g.drawImage(im,px-im.width/2,py-im.height+6);
    /* вікна світяться уночі — теплі плями на фасаді */
    if(lit){
      const wh=im.height;
      IB.P(g,px-20,py-wh*0.44,6,7,'#f0c060');
      IB.P(g,px+13,py-wh*0.44,6,7,'#f0c060');
      IB.O(g,px-17,py-wh*0.44+3,8,9,'rgba(240,180,60,0.20)');
      IB.O(g,px+16,py-wh*0.44+3,8,9,'rgba(240,180,60,0.20)');
    }
    /* димар з димом для хат */
    if(b.type==='house'&&IB.M.sin(performance.now()*0.0011+b.x)>0){
      const chy=py-im.height+10;
      g.fillStyle='rgba(200,205,210,0.25)';
      IB.O(g,px+20,chy-4-((performance.now()*0.008)%8),3,3,'rgba(200,205,210,0.22)');
      IB.O(g,px+22,chy-10-((performance.now()*0.006)%10),2.4,2.4,'rgba(200,205,210,0.16)');
    }
    /* тент крамниці + бочки біля корчми */
    if(b.type==='shop'){for(let i=0;i<7;i++)IB.P(g,px-24+i*7,py+2,7,4,i%2?'#c84838':'#e8e8e0');}
    if(b.type==='bar'){IB.O(g,px+26,py+4,4,3,'#6a5230');IB.O(g,px+18,py+5,4,3,'#5e4628');IB.O(g,px+34,py+5,3.5,2.6,'#5e4628');}
    drawSign(g,b,px,py);
    return;
  }
  /* ---------- ПРОЦЕДУРНИЙ ФОЛБЕК (якщо PNG не завантажився) ---------- */
  const hgt=b.type==='chapel'?26:16+(b.w>5?6:0);
  const wall=P.w1,wallD=P.w2;
  IB.isoBox(g,x,y,wpx,dpx,hgt,wallD,IB.shade(wall,-0.25),wall);
  const rh=hgt+7;
  IB.PA(g,[[x-2,y+dpx/2-4],[x+wpx/2,y+dpx/2-4-dpx/2-rh+6],[x+wpx+2,y+dpx/2-4],[x+wpx/2,y+dpx/2-4+rh]],P.rf2);
  IB.PA(g,[[x+wpx/2,y+dpx/2-4-rh],[x+wpx+2,y+dpx/2-4],[x+wpx/2,y+dpx/2-4+rh]],P.rf1);
  for(let i=1;i<4;i++){
    IB.P(g,x+2,y+dpx/2-4-rh+i*2, wpx-4, 1, IB.shade(P.rf2,-0.12));
  }
  const dx0=x+wpx/2-4,dy0=y+dpx-2;
  IB.P(g,dx0,dy0-9,8,9,'#3a2818');
  IB.P(g,dx0+1,dy0-8,6,7,'#4e3a20');
  IB.P(g,dx0+5,dy0-5,1,1,'#d8b050');
  IB.P(g,x+5,y+dpx/2-2,5,5,lit?'#f0c060':'#1a2430');IB.P(g,x+wpx-10,y+dpx/2-2,5,5,lit?'#f0c060':'#1a2430');
  IB.P(g,x+6,y+dpx/2-1,3,3,lit?'#f8e0a0':'#0e1620');
  drawSign(g,b,px,py);
  if(b.type==='chapel'){
    IB.P(g,x+wpx/2-1,y+dpx/2-4-hgt-8,2,8,'#d8d8cc');IB.P(g,x+wpx/2-3,y+dpx/2-4-hgt-6,6,1,'#d8d8cc');
  }
  if(b.type==='forge'){
    IB.O(g,x+wpx/2,y-6,3,2,'#3a4038');
  }
  if(b.type==='molfar'){
    const pl=0.5+IB.M.sin(performance.now()*0.004)*0.3;
    g.strokeStyle='rgba(112,240,224,'+pl+')';g.beginPath();g.arc(x+wpx/2,y+dpx/2-6,22,0,7);g.stroke();
    IB.O(g,x+wpx/2+14,y+dpx+6,2,3,'rgba(112,240,224,'+pl+')');
  }
}
/* вивіска будівлі — дошка з назвою над південним кутом */
function drawSign(g,b,px,py){
  if(!b.label)return;
  const w=b.label.length*4+10;
  IB.P(g,px-w/2,py+2,w,9,'#1a1a22');
  IB.P(g,px-w/2+1,py+3,w-2,7,'#2e3038');
  g.font='6px monospace';g.textAlign='center';
  g.fillStyle='#f0d050';g.fillText(b.label,px,py+8);
  g.textAlign='left';
}

/* ---------- СТРУКТУРИ ТАБОРУ ---------- */
function drawFire(g,f,ox,oy,dt){
  const s=tileScreen(f.x,f.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  IB.O(g,x,y,8,4,'#2a2a28');
  /* каміння по колу */
  for(let i=0;i<7;i++){const a=i/7*6.28;IB.O(g,x+IB.M.cos(a)*8,y+IB.M.sin(a)*4,2,1.5,'#58605a');}
  if(f.fuel>0){
    const fl=IB.M.sin(performance.now()*0.02)*0.3+1;
    IB.PA(g,[[x-3,y-2],[x,y-2-10*fl],[x+3,y-2]],'#e07038');
    IB.PA(g,[[x-2,y-2],[x,y-2-16*fl],[x+2,y-2]],'rgba(240,190,80,0.9)');
    IB.PA(g,[[x-1,y-2],[x,y-2-7*fl],[x+1,y-2]],'#f8e8a0');
    if(IB.M.random()<0.15)IB.floatMsgs.push({x:f.x+IB.rnd(-0.3,0.3),y:f.y,txt:'✦',t:0.9});
  }else{
    IB.P(g,x-2,y-4,4,4,'#1a1a18');
  }
  /* казан на вогні */
  if(IB.G.camps&&IB.G.camps[IB.G.nearCamp(f.x,f.y,1)?.id||'']?.table&&false){}
}
function drawTent(g,t,ox,oy){
  const s=tileScreen(t.x,t.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  IB.O(g,x,y+1,10,4,'#00000030');
  IB.PA(g,[[x-11,y],[x,y-14],[x+11,y]],'#3a6a4a');
  IB.PA(g,[[x-11,y],[x,y-14],[x-3,y]],IB.shade('#3a6a4a',-0.2));
  IB.PA(g,[[x-3,y],[x,y-7],[x+3,y]],'#1e4228');
  IB.P(g,x+9,y-13,1,3,'#b84838');
}
function drawCampWell(g,w,ox,oy){
  const s=tileScreen(w.x,w.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  IB.isoBox(g,x-8,y-6,16,10,7,IB.PAL.c2,IB.PAL.c1,IB.PAL.c1);
  IB.P(g,x-2,y-16,2,12,IB.PAL.b2);IB.P(g,x+4,y-16,2,12,IB.PAL.b2);
  IB.PA(g,[[x-5,y-16],[x+7,y-16],[x+1,y-21]],IB.PAL.rf2);
  IB.O(g,x+1,y-8,4,2,'#28565f');
}
function drawTable(g,t,ox,oy){
  const s=tileScreen(t.x,t.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  IB.P(g,x-7,y-4,14,3,'#8a6a42');IB.P(g,x-6,y-1,2,2,'#5e4628');IB.P(g,x+4,y-1,2,2,'#5e4628');
  IB.O(g,x-3,y-6,3,2,'#3a4038');IB.O(g,x+3,y-6,2.5,2,'#6a5230');
}
function drawDry(g,d,ox,oy){
  const s=tileScreen(d.x,d.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  IB.P(g,x-6,y-12,1,12,'#5e4628');IB.P(g,x+5,y-12,1,12,'#5e4628');IB.P(g,x-6,y-12,12,1,'#5e4628');
  for(let i=0;i<3;i++)IB.P(g,x-4+i*4,y-10,2,5,'#c85048');
}
function drawFarm(g,f,ox,oy){
  const s=tileScreen(f.x,f.y);
  const x=s.x+ox, y=s.y+oy;
  IB.P(g,x+4,y+2,26,12,'#5e4628');
  IB.P(g,x+6,y+4,22,8,'#4e3a20');
  for(let i=0;i<3;i++)IB.P(g,x+7+i*7,y+5,4,6,'#3a2c18');
  if(f.planted){
    for(let i=0;i<3;i++){
      const gh=f.stage*2+2;
      IB.P(g,x+8+i*7,y+8-gh,2,gh,'#486036');
      if(f.ready){IB.O(g,x+9+i*7,y+7,2,2,'#b89058');}
    }
  }
}

/* ---------- СУТНОСТІ ---------- */
function drawHero(g,h,ox,oy,dt){
  const s=tileScreen(h.x,h.y);
  const x=s.x+ox+16,y=s.y+oy+10-h.swim*4;
  IB.drawPerson(g,x,y,h.dir,h.fr,h.look);
  /* v1.3: ІМ'Я, ЩО СВІТИТЬСЯ над головою */
  const nc=h.def&&h.def.nameColor?h.def.nameColor:'#f0d050';
  const ny=y-36+IB.M.sin(performance.now()*0.003+h.x*1.7)*1.6;
  g.font='bold 7px monospace';g.textAlign='center';
  g.shadowColor=nc;g.shadowBlur=6;
  g.fillStyle=nc;g.fillText(h.name,x,ny);
  g.fillText(h.name,x,ny);
  g.shadowBlur=0;
  g.fillStyle='#ffffffcc';g.font='7px monospace';g.fillText(h.name,x,ny);
  g.textAlign='left';
  /* лідер — золотий шеврон над іменем */
  if(h.id==='viktor'){
    const bob2=IB.M.sin(performance.now()*0.004)*2;
    IB.PA(g,[[x,y-46+bob2],[x-4,y-40+bob2],[x+4,y-40+bob2]],'#f0d050');
  }
  if(h.frozen){
    g.fillStyle='#28565f';IB.O(g,x,y-14,9,14,'rgba(90,140,200,0.5)');
    g.font='11px monospace';g.fillStyle='#8ad0e0';g.fillText('❄',x-4,y-40);
  }
  if(h.alc>=3){
    const wob=IB.M.sin(performance.now()*0.008)*1.5;
    g.font='10px monospace';g.fillText('🥴',x+7+wob,y-32);
  }
  if(IB.G.party.active){
    const bob=IB.M.sin(performance.now()*0.006+h.x)*3;
    g.font='11px monospace';g.fillText(['🎵','🎶','💃','🍻'][IB.ri(0,3)],x-7,y-34+bob);
  }
}
function drawNpc(g,n,ox,oy){
  const s=tileScreen(n.x,n.y);
  const x=s.x+ox+16,y=s.y+oy+10;
  IB.drawPerson(g,x,y,n.dir,n.fr,n.look);
  if(n.quest&&!IB.G.flags['side_'+n.quest+'_done']){
    const bob=IB.M.sin(performance.now()*0.005)*2;
    g.font='10px monospace';g.fillStyle='#f0d050';g.fillText('!',x-1,y-36+bob);
  }
  if(n.role==='molfar'){
    const pl=0.4+IB.M.sin(performance.now()*0.005)*0.25;
    g.strokeStyle='rgba(112,240,224,'+pl+')';g.beginPath();g.arc(x,y-12,15,0,7);g.stroke();
  }
}
function drawTourist(g,t,ox,oy){
  const s=tileScreen(t.x,t.y);
  const x=s.x+ox+16,y=s.y+oy+10;
  IB.drawPerson(g,x,y,t.dir,t.fr,t.look);
  g.font='9px monospace';g.fillStyle='#e07038';
  g.fillText(t.follow?'...':'HELP',x-10,y-38);
}
function drawAnimal(g,a,ox,oy){
  const s=tileScreen(a.x,a.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  if(a.type==='sheep')IB.drawSheep(g,x,y,a.fr,a.dark);
  else if(a.type==='goat')IB.drawGoat(g,x,y,a.fr);
  else if(a.type==='dog')IB.drawDog(g,x,y,a.dir,a.fr);
  else if(a.type==='bear')IB.drawBear(g,x,y,a.fr,a.dir);
  if(a.lost){g.font='9px monospace';g.fillStyle='#e8a0d0';g.fillText('!',x,y-14);}
}
function drawFishShadow(g,f,ox,oy){
  if(IB.W.at(f.x,f.y)!==0)return;
  const s=tileScreen(f.x,f.y);
  const x=s.x+ox+16,y=s.y+oy+8;
  g.fillStyle='rgba(10,30,36,0.5)';
  IB.O(g,x,y,4,1.6,'rgba(8,26,32,0.55)');
  IB.PA(g,[[x+3,y],[x+6,y-1.5],[x+6,y+1.5]],'rgba(8,26,32,0.45)');
}
function drawTripFx(g,fx,ox,oy,dt){
  const s=tileScreen(fx.x,fx.y);
  const x=s.x+ox+16,y=s.y+oy+8-fx.z;
  g.save();g.globalAlpha=fx.a;
  if(fx.kind==='ghost'){IB.drawPerson(g,x,y,'d',0,{skin:'#f0d050',hair:'#f0d050',jacket:'#e0a830',pants:'#b87038',hat:'hat',hatc:'#e0a830'});}
  else if(fx.kind==='food'){g.font='12px monospace';g.fillText('🍲',x-6,y);}
  else if(fx.kind==='note'){g.font='12px monospace';g.fillText(['🎵','🎶'][fx.v%2],x-6,y);}
  else if(fx.kind==='eye'){g.strokeStyle=IB.PAL.mg1;g.beginPath();g.arc(x,y,6,0,7);g.stroke();IB.O(g,x,y,2.5,2.5,IB.PAL.mg3);}
  else if(fx.kind==='line'){g.strokeStyle='rgba(90,160,255,0.6)';g.beginPath();g.moveTo(x-10,y);g.lineTo(x+10,y-8);g.lineTo(x+16,y+4);g.stroke();}
  else if(fx.kind==='shadow'){IB.O(g,x,y,7,9,'rgba(20,16,40,0.7)');g.font='10px monospace';g.fillText('😈',x-5,y-10);}
  else if(fx.kind==='star'){g.font='12px monospace';g.fillText('✦',x-5,y);g.fillStyle='#ffe14e';}
  g.restore();
}

/* ---------- ПОГОДА-ЧАСТИНКИ ---------- */
function drawWeather(g,dt){
  const type=IB.G.wx.type;
  if(type==='sun'||type==='cloud'&&false)return;
  /* керування пулом частинок */
  const want={rain:90,hail:70,snow:80,blizzard:150,wind:30}[type]||0;
  while(IB.weatherP.length<want)IB.weatherP.push({x:IB.rnd(0,480),y:IB.rnd(-336,336),v:IB.rnd(60,140),d:IB.rnd(0.6,1.4)});
  if(!want)IB.weatherP.length=0;
  g.save();
  for(const p of IB.weatherP){
    if(type==='rain'){
      p.y+=p.v*2.2*dt;p.x-=p.v*0.3*dt;
      g.strokeStyle='rgba(120,170,220,0.5)';g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+1.5,p.y+7);g.stroke();
    }else if(type==='hail'){
      p.y+=p.v*3*dt;
      g.fillStyle='rgba(200,230,245,0.75)';g.fillRect(p.x,p.y,2,2);
    }else if(type==='snow'||type==='blizzard'){
      const spd=type==='blizzard'?2.6:1;
      p.y+=p.v*0.9*dt*spd;p.x+=(IB.M.sin(p.y*0.02+p.d*9)*14-30*spd)*dt;
      g.fillStyle=type==='blizzard'?'rgba(240,248,255,0.85)':'rgba(240,248,255,0.7)';
      g.fillRect(p.x,p.y,type==='blizzard'?2:1.6,type==='blizzard'?2:1.6);
    }else if(type==='wind'){
      p.x+=p.v*2.4*dt;p.y+=IB.M.sin(p.x*0.01)*0.4;
      g.strokeStyle='rgba(200,210,200,0.25)';g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x+9,p.y+1);g.stroke();
    }
    if(p.y>340){p.y=IB.rnd(-20,0);p.x=IB.rnd(0,480);}
    if(p.x<-10)p.x=490;if(p.x>490)p.x=-10;
  }
  g.restore();
  /* хмарність — тінь */
  if(type==='cloud'){
    g.fillStyle='rgba(60,70,80,0.22)';g.fillRect(0,0,480,336);
  }
}

/* ---------- МІНІКАРТА ---------- */
IB.drawMinimap=(g)=>{
  const W=IB.W,sc=120/W.W;
  g.fillStyle='#070d0a';g.fillRect(0,0,120,120);
  const step=2;
  for(let y=0;y<W.H;y+=step)for(let x=0;x<W.W;x+=step){
    const t=W.at(x,y),h=W.elevAt(x,y);
    let c='#101810';
    if(t===0)c='#1e4450';else if(t===1)c='#8a7444';else if(t===5)c='#d8e4ee';
    else if(t===4)c='#5e6a62';else if(t===3)c='#28512e';else if(t===2)c='#3f6a38';
    else if(t===9)c='#8a6038';else if(t===7)c='#6a5030';else if(t===10)c='#5e4628';
    if(h>5&&t!==0)c=IB.lerpCol?c:'#a8c0d0';
    g.fillStyle=c;g.fillRect(x*sc,y*sc*(120/W.H),step*sc+1,step*(120/W.H)+1);
  }
  /* артефакти при баченні */
  if(IB.G.vision>0||IB.G.trip.active){
    for(const a of IB.ARTIFACTS){
      if(!a.world||IB.artHas(a.id))continue;
      g.fillStyle='#b06ae0';g.fillRect(a.x*sc-1.5,a.y*sc*(120/W.H)-1.5,3,3);
    }
  }
  /* POI */
  for(const p of W.pois){
    g.fillStyle=p.kind==='village'?'#f0d050':(p.kind==='camp'?'#5cb878':'#c8d0d8');
    g.fillRect(p.x*sc-1,p.y*sc*(120/W.H)-1,2,2);
  }
  /* група */
  for(const h of IB.E.team){
    g.fillStyle=h.id==='viktor'?'#ffffff':'#c8d8c8';
    g.fillRect(h.x*sc-1,h.y*sc*(120/W.H)-1,h.id==='viktor'?3:2,h.id==='viktor'?3:2);
  }
  /* бліп порятунку */
  const bl=IB.blip();
  if(bl){g.fillStyle='#5aa0ff';g.fillRect(bl.x*sc-2,bl.y*sc*(120/W.H)-2,4,4);}
  /* маршрут */
  if(IB.G.route){
    const L=IB.E.team[0];
    g.strokeStyle='#e05a8a';g.setLineDash([2,2]);
    g.beginPath();g.moveTo(L.x*sc,L.y*sc*(120/W.H));g.lineTo(IB.G.route.x*sc,IB.G.route.y*sc*(120/W.H));g.stroke();
    g.setLineDash([]);
  }
};

/* ---------- ВЕЛИКА КАРТА (панель) ---------- */
IB.drawBigMapBase=(canvas)=>{
  const g=canvas.getContext('2d');
  const sc=canvas.width/IB.W.W, scY=canvas.height/IB.W.H;
  g.fillStyle='#070d0a';g.fillRect(0,0,canvas.width,canvas.height);
  const step=2;
  for(let y=0;y<IB.W.H;y+=step)for(let x=0;x<IB.W.W;x+=step){
    const t=IB.W.at(x,y),h=IB.W.elevAt(x,y);
    let c;
    if(t===0)c='#1e4450';else if(t===1)c='#8a7444';else if(t===5)c='#d8e4ee';
    else if(t===4)c='#5e6a62';else if(t===3)c='#28512e';else if(t===2)c='#3f6a38';
    else if(t===9)c='#9a7044';else if(t===7)c='#6a5030';else if(t===10)c='#5e4628';else if(t===8)c='#3e6a34';
    else c='#31502c';
    if(h>6&&t!==0)c='#a8c0d0';else if(h>4&&t!==0)c=IB.shade(c,0.1);
    g.fillStyle=c;g.fillRect(x*sc,y*scY,step*sc+0.5,step*scY+0.5);
  }
  g.font='7px monospace';
  for(const p of IB.W.pois){
    const px=p.x*sc,py=p.y*scY;
    g.fillStyle=p.kind==='village'?'#f0d050':(p.kind==='camp'?'#5cb878':(p.kind==='molfar'||p.kind==='ruin'?'#b06ae0':'#e8e8e8'));
    g.fillRect(px-2,py-2,4,4);
    g.fillStyle='#ffffffcc';g.fillText(p.name,px+4,py+2);
  }
  /* артефакти */
  for(const a of IB.ARTIFACTS){
    if(!a.world)continue;
    const found=IB.artHas(a.id);
    const show=found||(IB.G.vision>0&&!a.hidden)||(IB.G.trip.active)||(IB.G.flags.molfarKnown&&a.id==='a5');
    if(!show)continue;
    const px=a.x*sc,py=a.y*scY;
    g.fillStyle=found?'#8a8c94':'#b06ae0';
    g.beginPath();g.arc(px,py,4,0,7);g.fill();
    g.fillStyle='#ffffffcc';g.fillText(found?a.name:(IB.G.vision>0?a.name:'? ? ?'),px+5,py+3);
  }
  /* група + герої */
  for(const h of IB.E.team){
    const px=h.x*sc,py=h.y*scY;
    g.fillStyle=h.id==='viktor'?'#ffffff':'#b8c8ba';
    g.fillRect(px-1.5,py-1.5,3,3);
  }
  /* бліп */
  const bl=IB.blip();
  if(bl){g.fillStyle='#5aa0ff';g.beginPath();g.arc(bl.x*sc,bl.y*scY,5,0,7);g.stroke();}
  /* маршрут */
  if(IB.G.route){
    const L=IB.E.team[0];
    g.strokeStyle='#e05a8a';g.setLineDash([4,3]);g.lineWidth=1.5;
    g.beginPath();g.moveTo(L.x*sc,L.y*scY);g.lineTo(IB.G.route.x*sc,IB.G.route.y*scY);g.stroke();
    g.setLineDash([]);
  }
  /* вівця Івася */
  if(IB.G.quests.side.sheep&&!IB.G.flags.sheepFound){
    const a=IB.E.animals.find(a=>a.lost);
    if(a){g.fillStyle='#e8a0d0';g.fillRect(a.x*sc-2,a.y*scY-2,4,4);g.fillStyle='#e8a0d0';g.fillText('ВІВЦЯ',a.x*sc+4,a.y*scY);}
  }
};

/* ---------- ТРІП-ФХ ОНОВЛЕННЯ ---------- */
IB.updateFx=(dt)=>{
  /* спавн галюцинацій під час тріпу */
  if(IB.G.trip.active){
    const L=IB.E.team[0];
    if(IB.tripFx.length<26&&IB.M.random()<dt*4){
      const kinds={viktor:['ghost','star'],andriy:['food','star'],taras:['note','star'],petro:['line','eye'],maksym:['shadow','star']};
      const kk=kinds[L.id]||['star'];
      const a=IB.rnd(0,6.28),r=IB.rnd(3,12);
      IB.tripFx.push({x:L.x+IB.M.cos(a)*r,y:L.y+IB.M.sin(a)*r,z:IB.rnd(8,50),
        kind:kk[IB.ri(0,kk.length-1)],v:IB.ri(0,9),a:1,life:IB.rnd(3,7),t:0});
    }
  }
  for(let i=IB.tripFx.length-1;i>=0;i--){
    const fx=IB.tripFx[i];
    fx.t+=dt;fx.z+=IB.M.sin(fx.t*2)*dt*6;
    fx.x+=IB.M.sin(fx.t*0.8)*dt*0.7;fx.y+=IB.M.cos(fx.t*0.6)*dt*0.7;
    fx.a=IB.M.min(1,fx.life-fx.t);
    if(fx.t>=fx.life)IB.tripFx.splice(i,1);
  }
  if(!IB.G.trip.active&&IB.tripFx.length)IB.tripFx.length=IB.M.max(0,IB.tripFx.length-1);
};


/* ==================== v1.3: АВТО — справжні машини з ПЕРШОЇ ЧАСТИНИ ==================== */
function drawCar(g,c,ox,oy,dt){
  const s=tileScreen(c.x,c.y);
  const x=s.x+ox+16,y=s.y+oy+6;
  if(c.type==='van'){
    /* білий фургон групи (спогад про Київ) — процедурний */
    IB.O(g,x+4,y,20,8,'#00000035');
    IB.isoBox(g,x,y,30,16,9,c.c,IB.shade(c.c,-0.18),IB.shade(c.c,-0.3));
    IB.P(g,x+6,y-4,18,5,'#2a3e5c');
    IB.P(g,x+7,y-3,4,3,'#8ab8d8');IB.P(g,x+13,y-3,4,3,'#8ab8d8');IB.P(g,x+19,y-3,4,3,'#8ab8d8');
    IB.P(g,x+4,y+3,2,3,IB.shade(c.c,-0.35));IB.P(g,x+24,y+3,2,3,IB.shade(c.c,-0.35));
    IB.P(g,x+8,y+1,14,3,'#c83828');
    return;
  }
  const m=c.model&&IB.img('car_'+c.model+'_se')?c.model:null;
  const im=m?IB.img('car_'+m+'_se'):null;
  if(im){
    /* PNG-машини v5 (ВАЗ, Lanos, SUV, Truck) — вид SE, для лівого напрямку дзеркало */
    const sc=0.42;
    const src=(c.dir==='l')?(IB.mirror('car_'+m+'_se')||im):im;
    g.fillStyle='#00000035';g.beginPath();g.ellipse(x,y-1,im.width*sc*0.5,im.height*sc*0.28,0,0,7);g.fill();
    g.drawImage(src,x-im.width*sc/2,y-im.height*sc+4,im.width*sc,im.height*sc);
    /* фара/габарити вночі + БІП-БІП спалах */
    if(IB.nightFactor()>0.4){
      g.fillStyle='rgba(248,240,190,0.8)';
      IB.O(g,x+(c.dir==='l'?-14:14),y-3,1.6,1.6,'rgba(248,240,190,0.8)');
    }
    if(c.honkT>4.4){g.font='9px monospace';g.fillStyle='#f0d050';g.fillText('БІП!',x-8,y-14);}
    return;
  }
  /* фолбек — процедурний бокс */
  const dark=IB.shade(c.c,-0.35);
  IB.isoBox(g,x,y,26,14,7,c.c,IB.shade(c.c,-0.18),IB.shade(c.c,-0.3));
  IB.P(g,x+5,y-3,15,4,'#2a3e5c');
  IB.P(g,x+6,y-2,4,3,'#9ac4e0');IB.P(g,x+12,y-2,4,3,'#9ac4e0');
  IB.P(g,x+3,y+3,2,3,dark);IB.P(g,x+21,y+3,2,3,dark);
}

/* ==================== v1.2: СХОДЖЕННЯ (мандрівка) ==================== */
IB.ASC_STAGES={
  peak:['ПІДНІЖЖЯ — СТАРА СТЕЖКА','ГРАВІЙ І СМЕРЕКИ','ПОЛОНИНА — ВІТЕР З ХРЕБТА','СКЕЛЬНІ ВИХОДИ','СНІЖНИК — ОСТАННІЙ РИВОК','ВЕРШИНА'],
  lake:['ПІДНІЖЖЯ','ЯЛИНОВИЙ ЛІС','ПОЛОНИНА','БЕРЕГ ОЗЕРА'],
  border:['ДОЛИНА ТИСУ','ГРУНТОВА ДОРОГА','ПРИКОРДОННА СТЕЛА'],
  expedition:['ЗАВАНТАЖЕННЯ В БІЛИЙ ВАН','ВОЛИНСЬКА ТРАСА','ЗАЛІСІННЯ','ПЛЯЖ СВІТЯЗЯ'],
};
IB.TRAVEL_CUR=null;
IB.drawAscent=(g,dt)=>{
  const C=IB.TRAVEL_CUR;if(!C)return;
  const r=C.route;
  const stages=IB.ASC_STAGES[r.kind]||IB.ASC_STAGES.peak;
  const st=IB.M.min(stages.length-1,IB.M.floor(C.prog/100*stages.length));
  const wx=IB.G.wx.type,nf=IB.nightFactor();
  /* небо за висотою */
  const hh=IB.M.floor(168+ (C.prog/100)*90);
  const sky=g.createLinearGradient(0,0,0,336);
  sky.addColorStop(0,nf>0.5?'#0a1226':(r.kind==='expedition'?'#7ab2d8':'#28598c'));
  sky.addColorStop(1,nf>0.5?'#101830':'#a8c4d8');
  g.fillStyle=sky;g.fillRect(0,0,480,336);
  /* сонце/місяць */
  g.fillStyle=nf>0.5?'#e8e8d8':'#f8e8a0';
  g.beginPath();g.arc(400,60-r.kind==='expedition'?0:20,12,0,7);g.fill();
  /* хребти — рухаються вниз з висотою */
  const shift=C.prog*1.6;
  const rcols=nf>0.5?['#0e1a2a','#122236','#182e48']:['#2a4a5c','#3a6a74','#4a8a8c'];
  for(let i=0;i<3;i++){
    g.fillStyle=rcols[i];
    g.beginPath();g.moveTo(0,336);
    for(let x=0;x<=480;x+=16){
      const p=IB.hsh(i*100+(x/16|0),3,900+i);
      g.lineTo(x,110+i*46+shift*(0.6+i*0.35)-p*44);
    }
    g.lineTo(480,336);g.fill();
  }
  /* сніжники на верхніх стадіях */
  if(st>=4){g.fillStyle='rgba(240,248,255,0.75)';g.fillRect(0,336-(st-3)*26,480,(st-3)*26);}
  /* стежка вгору */
  g.strokeStyle='rgba(230,215,180,0.5)';g.lineWidth=4;
  g.beginPath();g.moveTo(60,336);g.quadraticCurveTo(240,240-C.prog*0.6,420,120-C.prog*0.4);g.stroke();
  /* група — лінією по стежці (v1.3: більші постаті, ширший лад) */
  const teamT=Math.sin(performance.now()*0.004)*4;
  for(let i=0;i<5;i++){
    const tx=64+i*42,ty=312-i*30-teamT*0.3+IB.hsh(i,4,910)*8;
    const h=IB.E.team[i];
    const px=IB.lerp(tx,tx+32,C.prog/140),py=IB.lerp(ty,ty-48,C.prog/140);
    IB.drawPerson(g,px,py,i%2?'r':'d',0,h.look);
  }
  /* експедиція: авто на стадії 0-2 */
  if(r.kind==='expedition'&&st<3){
    g.fillStyle='#e8e8e2';g.fillRect(150,250-st*20,64,20);
    g.fillStyle='#2a3e5c';g.fillRect(158,244-st*20,44,8);
    g.fillStyle='#1a1a1a';g.fillRect(156,268-st*20,12,6);g.fillRect(196,268-st*20,12,6);
  }
  /* погода-частинки прості */
  if(wx==='rain'||wx==='hail'){g.strokeStyle='rgba(160,200,230,0.5)';g.beginPath();
    for(let i=0;i<40;i++){const xx=IB.hsh(i,1,920)*480,yy=(IB.hsh(i,2,921)*336+performance.now()*0.25*(wx==='hail'?1.6:1))%336;
      g.moveTo(xx,yy);g.lineTo(xx-2,yy+8);}g.stroke();}
  if(wx==='snow'||wx==='blizzard'){g.fillStyle='rgba(240,248,255,0.8)';
    for(let i=0;i<60;i++){const xx=(IB.hsh(i,1,922)*480+performance.now()*0.02)%480,yy=(IB.hsh(i,2,923)*336+performance.now()*0.05)%336;
      g.fillRect(xx,yy,2,2);}}
  if(wx==='fog'){g.fillStyle='rgba(180,195,210,0.35)';g.fillRect(0,0,480,336);}
  /* темрява */
  if(nf>0.1){g.fillStyle='rgba(10,16,30,'+(nf*0.45)+')';g.fillRect(0,0,480,336);}
  /* ---------- HUD СХОДЖЕННЯ ---------- */
  g.fillStyle='rgba(6,12,10,0.78)';g.fillRect(6,6,468,34);
  g.font='9px monospace';g.fillStyle='#f0d050';g.fillText(r.name,12,20);
  g.fillStyle='#c8d8cc';g.font='7px monospace';
  g.fillText('ЗРАЗУ: '+r.from+' • СКЛАДНІСТЬ '+r.diff+' • '+r.hours+' ГОД',12,33);
  /* стадія */
  g.fillStyle='rgba(6,12,10,0.78)';g.fillRect(6,44,468,16);
  g.font='8px monospace';g.fillStyle='#7ccc8e';
  g.fillText('ЕТАП '+(st+1)+'/'+stages.length+': '+stages[st],12,56);
  /* бар прогресу */
  g.fillStyle='#1a241c';g.fillRect(6,64,468,10);
  g.fillStyle='#5cb878';g.fillRect(6,64,468*C.prog/100,10);
  g.font='7px monospace';g.fillStyle='#e8f0e8';
  g.fillText('ВИСОТА: '+IB.M.round((r.alt||600)*C.prog/100+((r.alt||600)>800?380:120))+' М',12,72);
  /* статус групи компактно (v1.3 — нові імена + кольори) */
  g.font='7px monospace';
  let sx=12;
  for(const h of IB.E.team){
    g.fillStyle=h.def&&h.def.nameColor?h.def.nameColor:'#c8d8cc';
    g.fillText(h.name+' '+IB.M.round(h.hp)+'%',sx,88);sx+=72;
  }
  /* підказка */
  g.fillStyle='rgba(6,12,10,0.78)';g.fillRect(120,306,240,22);
  g.font='9px monospace';g.fillStyle='#f0d050';
  g.fillText('E / КЛІК — КРОК УГОРУ • ESC — НАЗАД',130,320);
};

/* ==================== v1.2: ІНТЕР'ЄРИ ==================== */
IB.INT_CUR=null;
IB.INT_DEFS={
  house:{w:11,h:7,title:'ХАТА',owner:'ГОСПОДАР',
    items:[{k:'pech',x:2,y:1,label:'ПІЧ'},{k:'table',x:6,y:2,label:'СТІЛ'},{k:'host',x:8,y:4,label:'ГОСПОДАР'},{k:'bed',x:3,y:4,label:'ЛИЖКО'}]},
  church:{w:13,h:8,title:'ЦЕРКВА',owner:'ОТЕЦЬ ПАВЛО',
    items:[{k:'pray',x:5,y:1,label:'СВІЧКИ'},{k:'icons',x:9,y:1,label:'ІКОНОСТАС'},{k:'priest',x:7,y:4,label:'ОТЕЦЬ ПАВЛО'}]},
  shop:{w:12,h:7,title:'КРАМНИЦЯ',owner:'ПРОДАВЧИНЯ',
    items:[{k:'counter',x:5,y:2,label:'ПРИЛАВОК — ТОРГ'},{k:'host',x:8,y:4,label:'ПРОДАВЧИНЯ'},{k:'shelf',x:2,y:1,label:'ПОЛИЦІ'}]},
  bar:{w:13,h:8,title:'КОРЧМА',owner:'БАРМЕН',
    items:[{k:'barkeep',x:6,y:1,label:'БАРНА СТІЙКА'},{k:'table',x:3,y:4,label:'СТОЛИК'},{k:'guitar',x:10,y:3,label:'БАНДУРА'},{k:'host',x:8,y:5,label:'ГУЦУЛИ'}]},
  forge:{w:12,h:7,title:'КОВАЛЬНЯ',owner:'КОВАЛЬ',
    items:[{k:'anvil',x:5,y:2,label:'ГІРН — ТОРГ'},{k:'host',x:8,y:4,label:'КОВАЛЬ'},{k:'fire',x:2,y:1,label:'ГОРН'}]},
  farm:{w:12,h:7,title:'САДИБА',owner:'ГОСПОДИНЯ',
    items:[{k:'farmw',x:6,y:2,label:'ГОСПОДИНЯ — ТОРГ'},{k:'pech',x:2,y:1,label:'ПІЧ'},{k:'table',x:9,y:4,label:'СТІЛ'}]},
  border:{w:9,h:6,title:'ПРИКОРДОННИЙ КПП',owner:'ПОГРАНИЧНИК',
    items:[{k:'guard',x:4,y:2,label:'ПОГРАНИЧНИК'},{k:'stella',x:7,y:3,label:'СТЕЛА — ФОТО'}]},
};
IB.drawInterior=(g,dt)=>{
  const C=IB.INT_CUR;if(!C)return;
  const D=C.def,P=IB.PAL;
  const rw=D.w,rh=D.h;
  const OX=240-(rw-rh)*8,OY=64;
  g.fillStyle='#0b0d0b';g.fillRect(0,0,480,336);
  /* світно з вікна */
  const nf=IB.nightFactor();
  const wl=IB.G.wx.type;
  g.fillStyle=nf>0.5?'#0a1226':(wl==='rain'||wl==='blizzard'||wl==='snow'?'#4a5866':'#8ab2cc');
  g.fillRect(0,0,480,336);
  if(nf<=0.5&&wl==='sun'){g.fillStyle='#f8e8a0';g.beginPath();g.arc(400,60,14,0,7);g.fill();}
  /* підлога */
  for(let ty=0;ty<rh;ty++)for(let tx=0;tx<rw;tx++){
    const sx=(tx-ty)*16+OX,sy=(tx+ty)*8+OY;
    const v=IB.hsh(tx,ty,60);
    IB.rhomb(g,sx,sy,32,16,v>0.85?'#8a6a42':(v>0.5?'#7a5e38':'#6e5230'));
  }
  /* стіни: північно-східна і північно-західна грані */
  for(let i=0;i<rw;i++){
    const sx=(i-0)*16+OX,sy=i*8+OY;
    IB.PA(g,[[sx,sy+8],[sx+16,sy],[sx+32,sy+8],[sx+32,sy+30],[sx+16,sy+22],[sx,sy+30]],'#4e3a20');
    IB.P(g,sx+4,sy+9,24,2,'#5e4628');
  }
  for(let i=0;i<rh;i++){
    const sx=(0-i)*16+OX-32+16,sy=i*8+OY;
    IB.PA(g,[[sx,sy+8],[sx+16,sy],[sx+32,sy+8],[sx+32,sy+30],[sx+16,sy+22],[sx,sy+30]],'#443218');
  }
  /* вікно на пн-східній стіні */
  {
    const wi=IB.M.floor(rw/2);
    const sx=(wi)*16+OX,sy=wi*8+OY;
    IB.P(g,sx+6,sy+4,14,12,'#2a3e5c');
    g.fillStyle=nf>0.5?'#0a1226':(wl==='sun'?'#a8d0e8':'#5a6a78');
    g.fillRect(sx+7,sy+5,12,10);
    if(wl==='sun'&&nf<=0.5){g.fillStyle='#f8e8a0';g.fillRect(sx+9,sy+7,3,3);}
    IB.P(g,sx+12,sy+5,2,10,'#5e4628');IB.P(g,sx+7,sy+9,12,2,'#5e4628');
  }
  /* меблі/об'єкти */
  for(const it of D.items){
    const sx=(it.x-it.y)*16+OX,sy=(it.x+it.y)*8+OY;
    const hl=(C.hi===it);
    if(it.k==='pech'){IB.isoBox(g,sx-14,sy,30,22,16,'#d8d0c8','#c8bcb0','#b8a898');
      IB.O(g,sx+1,sy+2,7,4,'#2a2a2a');
      const fl=IB.M.sin(performance.now()*0.008)>0;
      IB.P(g,sx-2,sy+2,4,fl?3:2,'#e07038');}
    else if(it.k==='table'||it.k==='counter'){IB.isoBox(g,sx-12,sy,26,16,8,'#8a6a42','#6e5230','#5e4628');
      IB.P(g,sx-4,sy-2,8,3,'#e8d8b8');}
    else if(it.k==='bed'){IB.isoBox(g,sx-12,sy,26,14,6,'#c8b088','#b09868','#9a8058');}
    else if(it.k==='shelf'){IB.isoBox(g,sx-10,sy,22,12,12,'#7a5e38','#6e5230','#5e4628');
      IB.P(g,sx-6,sy-8,14,3,'#c8a028');IB.P(g,sx-4,sy-3,10,3,'#3a62b8');}
    else if(it.k==='barkeep'||it.k==='anvil'){IB.isoBox(g,sx-14,sy,30,18,10,'#5a4630','#4e3a26','#443218');
      if(it.k==='anvil'){IB.P(g,sx-6,sy-14,14,6,'#3e4440');IB.P(g,sx-2,sy-8,4,6,'#2e3230');}}
    else if(it.k==='pray'){IB.P(g,sx-2,sy-12,3,10,'#f0e8d0');IB.P(g,sx-5,sy-8,3,7,'#f0e8d0');IB.P(g,sx+2,sy-9,3,6,'#f0e8d0');
      const fl=IB.M.sin(performance.now()*0.01)*0.5+0.5;
      g.fillStyle='rgba(240,180,60,'+(0.25+fl*0.2)+')';g.beginPath();g.arc(sx,sy-4,14,0,7);g.fill();}
    else if(it.k==='icons'){IB.isoBox(g,sx-14,sy,30,8,18,'#d8c898','#c8b888','#b8a878');
      IB.P(g,sx-8,sy-14,18,10,'#c8a028');IB.P(g,sx-4,sy-11,10,4,'#b82840');}
    else if(it.k==='guitar'){IB.P(g,sx-2,sy-10,3,14,'#8a6038');IB.O(g,sx-1,sy-14,6,7,'#c8a050');
      IB.P(g,sx-6,sy-16,10,4,'#5e4628');}
    else if(it.k==='stella'){IB.P(g,sx-6,sy-22,12,20,'#e8e8e2');IB.P(g,sx-5,sy-20,10,4,'#b82840');
      IB.P(g,sx-5,sy-14,10,2,'#2a3e5c');}
    else if(it.k==='guard'){IB.drawPerson(g,sx,sy-6,'d',0,{skin:'#e0a878',hair:'#241a10',hat:'cap',hatc:'#3a5a3a',jacket:'#3a5a3a',pants:'#2e3a2e'});}
    else if(it.k==='host'||it.k==='priest'||it.k==='farmw'){
      IB.drawPerson(g,sx,sy-6,'d',0,IB.lookBySeed(it.x*7+it.y));}
    if(hl&&it.k!=='host'){g.strokeStyle='#f0d050';g.lineWidth=1;g.strokeRect(sx-16,sy-16,34,22);}
  }
  /* група */
  const leader=C.hero;
  IB.drawPerson(g,(leader.x-leader.y)*16+OX,(leader.x+leader.y)*8+OY-4,leader.dir,leader.fr,IB.E.team[0].look);
  for(let i=1;i<IB.E.team.length;i++){
    const h=IB.E.team[i];
    const mx=IB.clamp(C.entry.x-1-(i-1)*0.8,0.6,rw-1.6),my=IB.clamp(C.entry.y+0.3+(i%2)*0.5,0.6,rh-1);
    IB.drawPerson(g,(mx-my)*16+OX,(mx+my)*8+OY-4,h.dir||'d',0,h.look);
  }
  /* затемнення від стін + тепле світло */
  g.fillStyle='rgba(40,24,10,0.10)';g.fillRect(0,0,480,336);
  /* назва + підказка */
  g.fillStyle='rgba(6,12,10,0.82)';g.fillRect(6,6,468,18);
  g.font='9px monospace';g.fillStyle='#f0d050';g.fillText(D.title+' • '+(C.b.name||''),12,19);
  const it2=C.hi;
  g.fillStyle='rgba(6,12,10,0.82)';g.fillRect(110,306,260,22);
  g.font='9px monospace';g.fillStyle='#f0d050';
  g.fillText(it2?('[E] '+it2.label):('РУХ — WASD • E — ДО СТІНКИ • ESC — ВИЙТИ'),122,320);
};

/* ==================== v1.2: ФОТО-ПОЛАРОЇДИ ==================== */
IB.renderPhoto=(g,entry,X,Y,W,H,small)=>{
  const P=IB.PAL,seed=entry.seed||1;
  /* рамка полароїда */
  g.fillStyle='#ece8e0';g.fillRect(X-3,Y-3,W+6,H+6+ (small?0:14));
  /* небо за погодою */
  const wx=entry.wx||'sun';
  const sky=g.createLinearGradient(0,Y,0,Y+H);
  if(wx==='sun'){sky.addColorStop(0,'#28598c');sky.addColorStop(1,'#a8c4d8');}
  else if(wx==='snow'||wx==='blizzard'){sky.addColorStop(0,'#8aa4b8');sky.addColorStop(1,'#d8e4ee');}
  else if(wx==='rain'){sky.addColorStop(0,'#4a5866');sky.addColorStop(1,'#8a9aa8');}
  else {sky.addColorStop(0,'#5a6a7c');sky.addColorStop(1,'#b8c4cc');}
  g.fillStyle=sky;g.fillRect(X,Y,W,H);
  if(wx==='sun'){g.fillStyle='#f8e8a0';g.beginPath();g.arc(X+W-14,Y+10,7,0,7);g.fill();}
  /* хребти за seed */
  for(let i=0;i<3;i++){
    g.fillStyle=['#2a4a5c','#3a6a74','#4e7a5c'][i];
    g.beginPath();g.moveTo(X,Y+H);
    for(let px=0;px<=W;px+=8){
      const v=IB.hsh(seed*100+(px/8|0),i,700+i);
      g.lineTo(X+px,Y+H*0.45+i*H*0.16-v*H*0.24);
    }
    g.lineTo(X+W,Y+H);g.fill();
  }
  if(entry.kind==='peak'){
    /* вершина з прапорцем */
    const pkx=X+W/2,pky=Y+H*0.42-(IB.hsh(seed,9,702)*6);
    g.fillStyle='#e8eef2';IB.PA(g,[[pkx-16,Y+H*0.8],[pkx,pky],[pkx+16,Y+H*0.8]],'#e8eef2');
    IB.P(g,pkx-1,pky-8,2,10,'#3a3a3a');
    IB.PA(g,[[pkx+1,pky-8],[pkx+9,pky-5],[pkx+1,pky-2]],'#c83828');
  }else if(entry.kind==='lake'||entry.kind==='shatsk'){
    g.fillStyle='#28565f';g.fillRect(X,Y+H*0.62,W,H*0.38);
    g.fillStyle='rgba(160,220,235,0.4)';
    for(let i=0;i<6;i++)g.fillRect(X+4+IB.hsh(i,seed,705)*(W-16),Y+H*0.64+i*3,10,1);
    if(entry.kind==='shatsk'){g.fillStyle='#c8b888';g.fillRect(X,Y+H-6,W,6);g.fillStyle='#2e5230';
      IB.PA(g,[[X+10,Y+H-6],[X+14,Y+H-20],[X+18,Y+H-6]],'#2e5230');IB.PA(g,[[X+W-20,Y+H-6],[X+W-16,Y+H-18],[X+W-12,Y+H-6]],'#2e5230');}
  }else if(entry.kind==='border'){
    IB.P(g,X+W/2-7,Y+H*0.3,14,H*0.5,'#e8e8e2');
    IB.P(g,X+W/2-6,Y+H*0.34,12,4,'#b82840');
    IB.P(g,X+W/2-6,Y+H*0.5,12,3,'#2a3e5c');
  }else if(entry.kind==='rocks'){
    for(let i=0;i<4;i++)IB.isoBox(g,X+10+i*22,Y+H*0.55,20,10,10+IB.hsh(i,seed,708)*8,'#5e6a62','#4e5a54','#6e7872');
  }else if(entry.kind==='ruin'){
    IB.isoBox(g,X+W/2-18,Y+H*0.5,36,16,8,'#5e6a62','#4e5a54','#6e7872');
    IB.P(g,X+W/2-12,Y+H*0.5-8,6,8,'#5e6a62');
  }
  /* група — 5 постатей (справжні кольори героїв) */
  for(let i=0;i<5;i++){
    const px=X+W*0.5-26+i*13,py=Y+H*0.82;
    const look=IB.HERO_DEFS[i]?IB.HERO_DEFS[i].look:null;
    IB.drawPerson(g,px,py,'d',0,look||{skin:'#e0a878',hair:'#241a10',jacket:'#5a6a3a',pants:'#3a4030'},small?0.62:0.82);
  }
  if(!small){
    g.fillStyle='#1a1a1a';g.font='7px monospace';g.textAlign='center';
    g.fillText(entry.name,X+W/2,Y+H+11);
    g.fillStyle='#5a5a5a';
    g.fillText('ДЕНЬ '+entry.day+' • '+entry.time+(entry.alt?' • '+entry.alt+' М':''),X+W/2,Y+H+19);
    g.textAlign='left';
  }
};
IB.drawAlbumPhotoSmall=(cv,entry)=>{
  const g=cv.getContext('2d');
  g.imageSmoothingEnabled=false;
  g.clearRect(0,0,cv.width,cv.height);
  IB.renderPhoto(g,entry,0,0,cv.width,cv.height-6,true);
  g.fillStyle='#1a1a1a';g.font='6px monospace';g.textAlign='center';
  g.fillText(entry.name,cv.width/2,cv.height-1);
  g.textAlign='left';
};

/* ==================== v1.2: ВЕЛИКА КАРТА v2 (зверху базової) ==================== */
IB.drawBigMap=(canvas)=>{
  IB.drawBigMapBase(canvas);
  const g=canvas.getContext('2d');
  const sc=canvas.width/IB.W.W,scY=canvas.height/IB.W.H;
  const X=v=>v*sc,Y=v=>v*scY;
  /* хребти підписи */
  g.font='8px monospace';g.fillStyle='rgba(240,240,220,0.5)';
  g.fillText('Ч О Р Н О Г О Р А',X(78),Y(14));
  g.fillText('Ґ О Р Ґ А Н И',X(92),Y(60));
  g.fillText('СВИДОВЕЦЬ',X(142),Y(66));
  g.fillText('М А Р М А Р О С Ь К І  А Л Ь П И',X(158),Y(172));
  g.font='7px monospace';g.fillStyle='rgba(180,200,230,0.6)';
  g.fillText('р.ЧЕРЕМОШ',X(26),Y(146));
  g.fillText('р.ЧЕРЕМОШ',X(120),Y(134));
  g.fillText('р.ПРУТ',X(110),Y(62));
  g.fillText('р.БИСТРИЦЯ',X(36),Y(76));
  /* кордони */
  g.strokeStyle='#d84a4a';g.lineWidth=2;g.setLineDash([6,4]);
  g.beginPath();g.moveTo(X(0),Y(213));g.lineTo(X(239),Y(213));g.stroke();
  g.beginPath();g.moveTo(X(237),Y(88));g.lineTo(X(237),Y(212));g.stroke();
  g.setLineDash([]);
  g.font='8px monospace';g.fillStyle='#e8a0a0';
  g.fillText('К О Р Д О Н   З   Р У М У Н І Є Ю',X(56),Y(217.5));
  g.fillText('КОРДОН',X(238.5),Y(120));g.fillText('МОЛДОВА',X(238.5),Y(130));
  /* маршрути-мандрівки */
  const campAt=n=>IB.W.CAMPS.find(c=>c.name===n);
  const vilAt=n=>IB.W.VILLAGES.find(v=>v.name===n);
  for(const r of IB.W.ROUTES){
    if(r.kind==='expedition')continue;
    const f=campAt(r.from)||vilAt(r.from);
    if(!f)continue;
    const fx=(f.x+(f.w?f.w/2:0)),fy=(f.y+(f.h?f.h/2:0));
    g.strokeStyle='rgba(240,208,80,0.55)';g.lineWidth=1;g.setLineDash([3,3]);
    g.beginPath();g.moveTo(X(fx),Y(fy));g.lineTo(X(r.x),Y(r.y));g.stroke();
    g.setLineDash([]);
    g.fillStyle='#f0d050';
    IB.PA(g,[[X(r.x),Y(r.y)-6],[X(r.x)-4,Y(r.y)+2],[X(r.x)+4,Y(r.y)+2]],'#f0d050');
  }
  /* інсет ШАЦЬКІ ОЗЕРА */
  const IX=4,IY=4,IW=88,IH=56;
  g.fillStyle='rgba(8,14,12,0.85)';g.fillRect(IX,IY,IW,IH);
  g.strokeStyle='#5cb878';g.lineWidth=1;g.strokeRect(IX,IY,IW,IH);
  g.fillStyle='#28598c';g.fillRect(IX+4,IY+8,IW-8,26);
  g.fillStyle='#7ab2d8';g.beginPath();g.ellipse(IX+IW/2,IY+22,IW/2-10,10,0,0,7);g.fill();
  g.fillStyle='#c8b888';g.fillRect(IX+4,IY+34,IW-8,10);
  g.fillStyle='#2e5230';IB.PA(g,[[IX+12,IY+34],[IX+17,IY+20],[IX+22,IY+34]],'#2e5230');
  IB.PA(g,[[IX+IW-24,IY+34],[IX+IW-18,IY+18],[IX+IW-12,IY+34]],'#2e5230');
  g.fillStyle='#f0d050';g.font='7px monospace';
  g.fillText('ШАЦЬКІ ОЗЕРА',IX+10,IY+50);
  g.fillText('СВІТЯЗЬ • 6429 га',IX+12,IY+7);
  g.fillStyle='#e8e8e2';g.fillText('клік = авто-експедиція',IX+8,IY+44);
  /* підпис групи на маршруті */
  if(IB.G.route){
    const L=IB.E.team[0];
    g.fillStyle='#e05a8a';g.font='7px monospace';
    g.fillText('→ маршрут',X(L.x)+4,Y(L.y)-4);
  }
};
