import colorsys

palette_size = 80
palette = []

for i in range(palette_size):
    t = i / (palette_size - 1)
    h = t * (60 / 360)
    l = t
    s = 1.0
    color = colorsys.hls_to_rgb(h, l, s)
    color = tuple(map(lambda x: round(x * 63), color))
    palette.append(color)

with open('palette.asm', 'w', newline='\n') as f:
    f.write('palette:\n')

    for color in palette:
        f.write('\tdb ');
        color = map(lambda x: '0x{:02X}'.format(x), color)
        f.write(', '.join(color))
        f.write('\n')
