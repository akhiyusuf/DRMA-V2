import sys
from PIL import Image

def process_image(input_path, output_path):
    print(f"Processing {input_path}...")
    # Open the image (should be transparent PNG)
    input_image = Image.open(input_path).convert("RGBA")
    
    # Create a neon green background
    background = Image.new("RGBA", input_image.size, (57, 255, 20, 255))
    
    # Paste the transparent image onto the background
    background.paste(input_image, (0, 0), input_image)
    
    # Save the neon green background version
    background.convert("RGB").save(output_path)
    print(f"Saved neon green version to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python script.py <input> <output>")
        sys.exit(1)
        
    process_image(sys.argv[1], sys.argv[2])
