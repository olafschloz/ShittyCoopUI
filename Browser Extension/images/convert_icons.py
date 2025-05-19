from cairosvg import svg2png
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Define the sizes we need
sizes = [16, 48, 128]

# Convert SVG to PNG for each size
for size in sizes:
    output_file = os.path.join(script_dir, f'icon{size}.png')
    svg2png(url=os.path.join(script_dir, 'icon.svg'),
            write_to=output_file,
            output_width=size,
            output_height=size)
    print(f'Created {output_file}') 