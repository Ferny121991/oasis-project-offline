from PIL import Image
import sys
import numpy as np

def make_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # Create a mask for "whiteish" pixels
    # We use a threshold to handle compression artifacts
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    
    # Pure white is (255, 255, 255)
    # We'll target anything very bright (> 240 in all channels)
    white_mask = (r > 240) & (g > 240) & (b > 240)
    
    # Set alpha to 0 for these pixels
    data[white_mask, 3] = 0
    
    # Save the result
    new_img = Image.fromarray(data)
    
    # Optional: Trim empty space
    bbox = new_img.getbbox()
    if bbox:
        new_img = new_img.crop(bbox)
        
    new_img.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python script.py input.png output.png")
    else:
        make_transparent(sys.argv[1], sys.argv[2])
