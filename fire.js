'use strict';

const w = 320;
const h = 200;

const paletteSize = 80;

function genPalette() {
  let palette = [];

  for (let i = 0; i < paletteSize; i++) {
    let t = i / (paletteSize - 1);
    let h = 60 * t;
    let s = 100;
    let l = 100 * t;
    palette[i] = `hsl(${h}, ${s}%, ${l}%)`;
  }

  return palette;
}

function initFireBuffer(buffer) {
  for (let y = 0; y < h - 1; y++)
    for (let x = 0; x < w; x++)
      buffer[y * w + x] = 0;
  for (let x = 0; x < w; x++)
    buffer[(h - 1) * w + x] = paletteSize - 1;
}

function fireStep(buffer) {
  for (let y = 1; y < h; y++) {
    let destY = y - 1;
    for (let x = 0; x < w; x++) {
      let destX = x + Math.floor(Math.random() * 3) - 1;
      if (destX >= 0 && destX < w) {
        let color = buffer[y * w + x];
        if (color > 0 && Math.random() >= 0.5)
          color--;
        buffer[destY * w + destX] = color;
      }
    }
  }
}

function plotPixel(ctx, x, y, style) {
  ctx.fillStyle = style;
  ctx.fillRect(x, y, 1, 1);
}

function main() {
  const canvas = document.createElement('canvas');

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');

  document.body.appendChild(canvas);

  let palette = genPalette();

  let buffer = new Array(w * h);
  initFireBuffer(buffer);

  function render() {
    fireStep(buffer);
    for (let y = 0; y < h; y++)
      for (let x = 0 ; x < w; x++)
        plotPixel(ctx, x, y, palette[buffer[y * w + x]]);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
