#!/usr/bin/env python3
"""Generate placeholder icons for DataKiln Chrome Extension"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """Create a simple icon with DataKiln branding"""
    # Create image with gradient-like background
    img = Image.new('RGB', (size, size), '#667eea')
    draw = ImageDraw.Draw(img)

    # Draw a simple database/data cylinder icon
    center = size // 2
    margin = int(size * 0.15)

    # Main circle/data symbol
    radius = size // 2 - margin
    x1 = center - radius
    y1 = center - radius
    x2 = center + radius
    y2 = center + radius

    # Draw outer circle (database)
    draw.ellipse([x1, y1, x2, y2], fill='#764ba2', outline='white', width=max(2, size // 32))

    # Draw inner data layers (horizontal lines representing data)
    if size >= 32:
        layer_spacing = radius // 3
        for i in range(3):
            y = center - radius + layer_spacing * i + layer_spacing // 2
            draw.line([x1 + margin, y, x2 - margin, y], fill='white', width=max(1, size // 64))

    # Save
    img.save(output_path, 'PNG')
    print(f"Created {output_path}")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, 'icons')
    os.makedirs(icons_dir, exist_ok=True)

    # Generate icons at different sizes
    sizes = [16, 48, 128]
    for size in sizes:
        output_path = os.path.join(icons_dir, f'icon{size}.png')
        create_icon(size, output_path)

    print("\nAll icons generated successfully!")

if __name__ == '__main__':
    main()
