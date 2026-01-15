from PIL import Image, ImageDraw
import sys

def create_favicon(input_path, output_path, size=64):
    """Create a clean, larger favicon from the logo."""
    img = Image.open(input_path).convert("RGBA")
    
    # Resize to target size with high quality
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    
    # Create a circular mask for a cleaner look
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    # Apply mask
    result = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask=mask)
    
    # Save as ICO for best compatibility
    result.save(output_path, "PNG")
    
    # Also save a 32x32 version for smaller displays
    small = result.resize((32, 32), Image.Resampling.LANCZOS)
    small.save(output_path.replace('.png', '-32.png'), "PNG")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py input.png output.png")
    else:
        create_favicon(sys.argv[1], sys.argv[2])
