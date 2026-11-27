"""Launcher icons and splash screens for the Android app from public/assets (Pillow).
   python3 scripts/icons.py <public/assets> <android/app/src/main/res>"""
import glob, os, sys
from PIL import Image
assets, res = sys.argv[1], sys.argv[2]
icon = Image.open(os.path.join(assets, 'icon-512.png')).convert('RGBA')
mask = Image.open(os.path.join(assets, 'icon-maskable-512.png')).convert('RGBA')
for d, n in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    p = os.path.join(res, 'mipmap-' + d)
    os.makedirs(p, exist_ok=True)
    icon.resize((n, n), Image.LANCZOS).save(os.path.join(p, 'ic_launcher.png'))
    icon.resize((n, n), Image.LANCZOS).save(os.path.join(p, 'ic_launcher_round.png'))
    f = n * 9 // 4   # adaptive icon layer: 108dp, the maskable icon keeps its content in the safe zone
    mask.resize((f, f), Image.LANCZOS).save(os.path.join(p, 'ic_launcher_foreground.png'))
for p in glob.glob(os.path.join(res, 'drawable*', 'splash.png')):
    w, h = Image.open(p).size
    bg = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    n = int(min(w, h) * 0.28)
    bg.alpha_composite(icon.resize((n, n), Image.LANCZOS), ((w - n) // 2, (h - n) // 2))
    bg.convert('RGB').save(p, optimize=True)
print('icons and splash screens written')
