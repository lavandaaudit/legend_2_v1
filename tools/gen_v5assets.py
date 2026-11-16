#!/usr/bin/env python3
"""Генерує js/v5assets.js: PNG-активи з першої частини (legend_v5, Kenney CC0)
з папки assets/ у base64 → IB.IMG_B64.
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
    "   Вбудовано base64 — працює у єдиному файлі без зовнішніх запитів.\n"
    "   Згенеровано tools/gen_v5assets.py з PNG у assets/. */\n"
    "IB.IMG={};\n"
    "IB.IMG_B64={\n" + ',\n'.join(entries) + "\n};\n"
    "IB._pending=Object.keys(IB.IMG_B64).length;\n"
    "IB._onAssets=[];\n"
    "for(const k in IB.IMG_B64){const im=new Image();\n"
    "  im.onload=()=>{IB.IMG[k]=im;if(--IB._pending===0)IB._onAssets.forEach(f=>f());};\n"
    "  im.onerror=()=>{if(--IB._pending===0)IB._onAssets.forEach(f=>f());};\n"
    "  im.src=IB.IMG_B64[k];IB.IMG[k]=im;\n"
    "};\n"
    "IB.img=(n)=>{const im=IB.IMG[n];return (im&&im.complete&&im.naturalWidth>0)?im:null;};\n"
)
OUT.write_text(js, encoding='utf-8')
print(f'OK: {OUT} written ({OUT.stat().st_size} bytes), {len(FILES)} png, raw {total} bytes')
