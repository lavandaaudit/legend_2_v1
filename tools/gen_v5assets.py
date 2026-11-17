#!/usr/bin/env python3
"""Генерує js/v5assets.js: PNG-активи з першої частини (legend_v5, Kenney CC0)
у base64 → IB.IMG_B64. PNG лежать у папці assets/ кореня репозиторія.
Запуск з кореня репозиторія:  python3 tools/gen_v5assets.py"""
import base64, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

SRC = ROOT / 'assets'
OUT = ROOT / 'js/v5assets.js'

FILES = [
    # будівлі (пропорції першої частини)
    'bld_dacha1_0','bld_dacha1_1','bld_dacha2_0','bld_dacha2_1','bld_dacha3_0',
    'bld_bhouse1_0','bld_bhouse2_0','bld_bhouse2_1','bld_garage_0','bld_shop1_0',
    # авто
    'car_vaz_se','car_vaz_sw','car_lanos_se','car_lanos_sw',
    'car_suv_se','car_suv_sw','car_truck_se',
    # дерева/реквізит
    'tree_o','tree_o2','pine','bush','fence','lamp',
    'mtn_rock','mtn_rock2','mtn_rock3',
    # v1.4: сільські котеджі з v5 (якорі — ax/ay у gfx.js V5_ANCH)
    'wood1','wood2','vill1','vill2','cottage_b',
    'hist2','hist2b','hist2c','hist3','shop2','admin3','khrus',
    # v1.4: вуличний реквізит сіл
    'bench','barrels','crate','busstop','swing','slide','dead',
]

entries = []
total = 0
for f in FILES:
    p = SRC / (f + '.png')
    assert p.is_file(), f'missing {p}'
    data = p.read_bytes()
    total += len(data)
    b64 = base64.b64encode(data).decode()
    entries.append(f"  {f}:'data:image/png;base64,{b64}'")

js = (
"/* v5assets.js: СПРАВЖНІ АКТИВИ З ПЕРШОЇ ЧАСТИНИ (legend_v5 — Kenney CC0).\n"
"   Будівлі-дачі, цегляні хати, крамниця, гараж, авто (ВАЗ/Lanos/SUV/Truck),\n"
"   дерева (дуб, тополя, сосна), кущі, паркани, ліхтарі, гірське каміння.\n"
"   v1.4: сільські котеджі (wood1/wood2/vill1/vill2/cottage_b), старі хати\n"
"   (hist2/2b/2c/hist3), крамниця shop2, лісництво admin3, сільрада khrus\n"
"   і вуличний реквізит (bench/barrels/crate/busstop/swing/slide/dead).\n"
"   Вбудовано base64 — працює у єдиному файлі без зовнішніх запитів. */\n"
"IB.IMG={};\n"
"IB.IMG_B64={\n" + ',\n'.join(entries) + "\n};\n"
"(function(){\n"
"  let left=0,doneF=null;\n"
"  for(const k in IB.IMG_B64){\n"
"    const im=new Image();left++;\n"
"    im.onload=im.onerror=()=>{left--;if(left<=0&&doneF)doneF();};\n"
"    im.src=IB.IMG_B64[k];IB.IMG[k]=im;\n"
"  }\n"
"  IB.IMG_READY=new Promise(res=>{doneF=res;setTimeout(res,2500);});\n"
"})();\n"
"IB.img=(n)=>{const im=IB.IMG[n];return (im&&im.complete&&im.naturalWidth>0)?im:null;};\n"
"IB._mir={};\n"
"IB.mirror=(n)=>{if(IB._mir[n])return IB._mir[n];const im=IB.img(n);if(!im)return null;\n"
"  const c=IB.mk(im.width,im.height);c.g.save();c.g.scale(-1,1);c.g.drawImage(im,-im.width,0);c.g.restore();\n"
"  IB._mir[n]=c;return c;};\n"
)
OUT.write_text(js, encoding='utf-8')
print(f'OK v5assets.js: {OUT} ({OUT.stat().st_size} bytes; PNG raw {total} bytes; {len(FILES)} assets)')
