import os
import math
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
    
    # Sample background color from the four corners
    sum_r = pixels[0, 0][0] + pixels[width-1, 0][0] + pixels[0, height-1][0] + pixels[width-1, height-1][0]
    sum_g = pixels[0, 0][1] + pixels[width-1, 0][1] + pixels[0, height-1][1] + pixels[width-1, height-1][1]
    sum_b = pixels[0, 0][2] + pixels[width-1, 0][2] + pixels[0, height-1][2] + pixels[width-1, height-1][2]
    
    bg_r = sum_r / 4
    bg_g = sum_g / 4
    bg_b = sum_b / 4
    
    min_y = height
    max_y = 0
    min_x = width
    max_x = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Euclidean distance in RGB space
            dist = math.sqrt((r - bg_r)**2 + (g - bg_g)**2 + (b - bg_b)**2)
            if dist > 30 and a > 10:
                if y < min_y: min_y = y
                if y > max_y: max_y = y
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                
    if min_y > max_y:
        print(f"{asset}: empty or all background")
    else:
        center_y = (min_y + max_y) / 2
        print(f"{asset}: contentY=[{min_y}, {max_y}], height={max_y - min_y}, center_y={center_y:.1f}, offset_from_center={center_y - height/2:.1f}")
