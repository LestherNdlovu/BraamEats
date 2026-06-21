import os
from PIL import Image

assets_dir = r"c:\Users\ndlov\Desktop\new restaurant\assets"
assets = [
    'board.png',
    'bun_bottom.png',
    'patty.png',
    'cheese.png',
    'sauce.png',
    'pickles.png',
    'bun_top.png'
]

for asset in assets:
    path = os.path.join(assets_dir, asset)
    if not os.path.exists(path):
        print(f"{asset}: not found")
        continue
    
    img = Image.open(path)
    img = img.convert("RGBA")
    width, height = img.size
    
    pixels = img.load()
    
    min_y = height
    max_y = 0
    min_x = width
    max_x = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            is_bg = (r > 240 and g > 240 and b > 240) or (a < 10)
            if not is_bg:
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                
    if min_y > max_y:
        print(f"{asset}: empty or all background")
    else:
        center_y = (min_y + max_y) / 2
        print(f"{asset}: size={width}x{height}, contentY=[{min_y}, {max_y}], center_y={center_y:.1f}, offset_from_center={center_y - height/2:.1f}")
