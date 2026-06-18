import sys
from rembg import remove
from PIL import Image, ImageFilter

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    # Open the image
    input_image = Image.open(input_path)
    
    # Remove the background, keeping alpha_matting enabled this time for smoother initial edge
    output_image = remove(input_image, alpha_matting=True, alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=10, alpha_matting_erode_size=15)
    
    # Split channels
    r, g, b, a = output_image.split()
    
    # Threshold the alpha to remove any semi-transparent fringe (the gray/black halo)
    a = a.point(lambda p: 255 if p > 200 else 0)
    
    # Erode the mask (cut into the subject) to remove the outline
    # Applying MinFilter shrinks the mask (white areas become smaller)
    for _ in range(5):
        a = a.filter(ImageFilter.MinFilter(3))
        
    # Smooth the hard jagged edges
    a = a.filter(ImageFilter.GaussianBlur(radius=1.5))
    
    # Apply a slight contrast bump to the alpha so the edges aren't too soft
    a = a.point(lambda p: min(255, max(0, int((p - 128) * 1.5 + 128))))
    
    # Recombine
    final_image = Image.merge("RGBA", (r, g, b, a))
    
    # Save the cutout
    final_image.save(output_path)
    print(f"Saved smooth and eroded cutout to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input> <output>")
        sys.exit(1)
        
    process_image(sys.argv[1], sys.argv[2])
