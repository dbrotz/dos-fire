// Copyright 2019 David Brotz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

const w = 320;
const h = 200;

const paletteSize = 80;

function genPalette() {
  const palette = [];

  for (let i = 0; i < paletteSize; i++) {
    const t = i / (paletteSize - 1);
    const h = 60 * t;
    const s = 100;
    const l = 100 * t;
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
    const destY = y - 1;
    for (let x = 0; x < w; x++) {
      const destX = x + Math.floor(Math.random() * 3) - 1;
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

  const palette = genPalette();

  const buffer = new Array(w * h);
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
