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

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs(hp % 2 - 1));
  let r, g, b;
  switch (Math.floor(hp)) {
  case 0: [r, g, b] = [c, x, 0]; break;
  case 1: [r, g, b] = [x, c, 0]; break;
  case 2: [r, g, b] = [0, c, x]; break;
  case 3: [r, g, b] = [0, x, c]; break;
  case 4: [r, g, b] = [x, 0, c]; break;
  case 5: [r, g, b] = [c, 0, x]; break;
  default:
    throw new Error('Invalid hue: ' + h);
  }
  const m = l - c / 2;
  let color = [r, g, b].map(x => x + m);
  color = color.map(x => Math.floor(x * 256));
  color = color.map(x => Math.min(255, Math.max(0, x))); // clamp
  return color;
}

function genPalette() {
  const palette = [];

  for (let i = 0; i < paletteSize; i++) {
    const t = i / (paletteSize - 1);
    const h = 60 * t;
    const s = 1;
    const l = t;
    palette[i] = hslToRgb(h, s, l);
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

function initImageData(imageData) {
  for (let i = 0; i < imageData.data.length; i += 4) {
    for (let j = 0; j < 3; j++)
      imageData.data[i + j] = 0;
    imageData.data[i + 3] = 255;
  }
}

function main() {
  const canvas = document.createElement('canvas');

  canvas.width = w;
  canvas.height = h;

  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(w, h);
  initImageData(imageData);

  const palette = genPalette();

  const buffer = new Array(w * h);
  initFireBuffer(buffer);

  function render() {
    fireStep(buffer);
    for (let i = 0; i < w * h; i++) {
      const color = palette[buffer[i]];
      const offset = i * 4;
      for (let j = 0; j < 3; j++)
          imageData.data[offset + j] = color[j];
    }
    ctx.putImageData(imageData, 0, 0);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
