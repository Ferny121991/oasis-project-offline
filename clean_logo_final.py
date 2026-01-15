from PIL import Image, ImageDraw
import sys
import numpy as np

def clean_logo_final(input_path, output_path):
    # Open the image and ensure it's RGBA
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # Create a circular mask
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    # Draw a circle that fits the image (leaving a 2px margin)
    draw.ellipse((2, 2, width-2, height-2), fill=255)
    
    # Apply the mask
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask=mask)
    
    # Now, also remove "whiteish" background inside the circle
    # This is for logos that have a white background inside a circle
    data = np.array(result)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Identify pixels that are both high brightness AND not already transparent
    # Threshold 220 to be safe
    bg_mask = (r > 220) & (g > 220) & (b > 220) & (a > 0)
    
    # Make them transparent
    data[bg_mask, 3] = 0
    
    # Convert back to image
    final_img = Image.fromarray(data)
    
    # Crop to content
    bbox = final_img.getbbox()
    if bbox:
        final_img = final_img.crop(bbox)
        
    # Final check: if the images is too small, it's probably junk
    if final_img.size[0] < 10 or final_img.size[1] < 10:
        print("Warning: Cleaned image is too small. Using original with circle mask only.")
        result.save(output_path, "PNG")
    else:
        final_img.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py input.png output.png")
    else:
        clean_logo_final(sys.argv[1], sys.argv[2])
