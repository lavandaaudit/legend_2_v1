#!/usr/bin/env python3
"""Перезбірка одиночного index.html зі style.css + js/ (з кореня репозиторія):
Result works from any preview (single-file), file:// and GitHub Pages.
v1.3: читає dev-джерело index.dev.html (9 модулів), пишє index.html."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / 'index.dev.html').read_text(encoding='utf-8')

# 1) inline style.css
css = (ROOT / 'style.css').read_text(encoding='utf-8')
assert '</style' not in css.lower()
html2 = re.sub(r'<link rel="stylesheet" href="style\.css[^"]*">',
               lambda m: '<style>\n' + css + '\n</style>', html, count=1)
assert html2 != html, 'style link not replaced'

# 2) inline scripts in original order
def repl(m):
    src = m.group(1).split('?')[0]
    code = (ROOT / src).read_text(encoding='utf-8')
    assert '</script' not in code.lower(), f'unsafe </script inside {src}'
    return '<script>\n' + code + '\n</script>'

html3 = re.sub(r'<script src="(js/[^"]+)"[^>]*></script>', repl, html2)
n_before = len(re.findall(r'<script src="js/', html2))
n_after = len(re.findall(r'<script src="js/', html3))
assert n_after == 0 and n_before == 9, f'expected 9 scripts, found {n_before}'

(ROOT / 'index.html').write_text(html3, encoding='utf-8')
print(f'OK: single-file index.html written ({len(html3)} bytes), {n_before} scripts + css inlined')
