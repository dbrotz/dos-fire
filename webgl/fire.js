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

const paletteSize = 256;

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

function createTexture(gl, width, height, pixels) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // disable mipmaps
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixelsUint8 = new Uint8Array(pixels);
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width, height,
    border,
    srcFormat,
    srcType,
    pixelsUint8);

  return texture;
}

function genPaletteTexture(gl) {
  const pixels = [];
  const palette = genPalette();

  for (let i = 0; i < paletteSize; i++) {
    for (const x of palette[i])
      pixels.push(x);
    pixels.push(255);
  }

  return createTexture(gl, paletteSize, 1, pixels);
}

function genSimTexture(gl) {
  const pixels = [];

  for (let x = 0; x < w; x++) {
    pixels.push(255);
    for (let i = 0; i < 3; i++)
      pixels.push(0);
  }

  for (let y = 1; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let i = 0; i < 4; i++)
        pixels.push(0);

  return createTexture(gl, w, h, pixels);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error('Failed to compile shader: ' + gl.getShaderInfoLog(shader));

  return shader;
}

function getActiveAttributes(gl, program) {
  const attributes = {};

  const attributeCount = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (let i = 0; i < attributeCount; i++) {
    const name = gl.getActiveAttrib(program, i).name;
    attributes[name] = gl.getAttribLocation(program, name);
  }

  return attributes;
}

function getActiveUniforms(gl, program) {
  const uniforms = {};

  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  for (let i = 0; i < uniformCount; i++) {
    const name = gl.getActiveUniform(program, i).name;
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  return uniforms;
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error('Failed to link program: ' + gl.getProgramInfoLog(program));

  return {
    program: program,
    attributes: getActiveAttributes(gl, program),
    uniforms: getActiveUniforms(gl, program),
  };
}

function stepSim(gl, fb, simTextures, simProgram, positionBuffer, frontTexture, time) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    simTextures[frontTexture ^ 1],
    0);

  gl.useProgram(simProgram.program);

  gl.enableVertexAttribArray(simProgram.attributes.position);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    simProgram.attributes.position,
    2,
    gl.FLOAT,
    false,
    0,
    0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, simTextures[frontTexture]);
  gl.uniform1i(simProgram.uniforms.prev, 0);

  gl.uniform2f(simProgram.uniforms.viewSize, w, h);

  gl.uniform1f(simProgram.uniforms.time, time % 30000);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render(gl, simTextures, paletteTexture, renderProgram, positionBuffer, frontTexture) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(renderProgram.program);

  gl.enableVertexAttribArray(renderProgram.attributes.position);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    renderProgram.attributes.position,
    2,
    gl.FLOAT,
    false,
    0,
    0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, paletteTexture);
  gl.uniform1i(renderProgram.uniforms.palette, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, simTextures[frontTexture]);
  gl.uniform1i(renderProgram.uniforms.firePixels, 1);

  gl.uniform2f(renderProgram.uniforms.viewSize, w, h);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function main() {
  const canvas = document.createElement('canvas');

  canvas.width = w;
  canvas.height = h;

  document.body.appendChild(canvas);

  const gl = canvas.getContext('webgl');

  gl.disable(gl.DEPTH_TEST);

  const paletteTexture = genPaletteTexture(gl);

  const simTextures = [];
  for (let i = 0; i < 2; i++)
    simTextures.push(genSimTexture(gl));

  const fb = gl.createFramebuffer();

  const positions = [
    -1.0,  1.0, // upper left
    -1.0, -1.0, // lower left
     1.0,  1.0, // upper right
     1.0, -1.0, // lower right
  ];

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const vertexShaderSource = `
    attribute vec2 position;

    void main() {
      gl_Position = vec4(position, 0, 1.0);
    }
  `;

  const renderFragmentShaderSource = `
    precision mediump float;

    uniform sampler2D palette;
    uniform sampler2D firePixels;
    uniform vec2 viewSize;

    void main() {
      float index = texture2D(firePixels, gl_FragCoord.xy / viewSize).r;
      gl_FragColor = texture2D(palette, vec2(index, 0));
    }
  `;

  const simFragmentShaderSource = `
    precision mediump float;

    uniform sampler2D prev;
    uniform vec2 viewSize;
    uniform float time;

    float getPixel(float x, float y) {
      return texture2D(prev, (gl_FragCoord.xy + vec2(x, y)) / viewSize).r;
    }

    float random(vec2 v) {
      return fract(sin(dot(v, vec2(12.9898, 78.233)) * time) * 43758.5453);
    }

    bool isMatch(int x) {
      vec2 v = (gl_FragCoord.xy + vec2(float(x), -1.0)) / viewSize;
      int offset = int(random(v) * 3.0) - 1;
      return (offset == -x);
    }

    void main() {
      if (gl_FragCoord.y < 1.0) {
        gl_FragColor.r = getPixel(0.0, 0.0);
        return;
      }

      vec2 pos = gl_FragCoord.xy / viewSize;
      float n = (1.0 / 90.0) * random(pos);

      if (isMatch(-1)) {
        gl_FragColor.r = getPixel(-1.0, -1.0) - n;
        return;
      }

      if (isMatch(0)) {
        gl_FragColor.r = getPixel(0.0, -1.0) - n;
        return;
      }

      if (isMatch(1)) {
        gl_FragColor.r = getPixel(1.0, -1.0) - n;
        return;
      }

      gl_FragColor.r = getPixel(0.0, 0.0);
    }
  `;

  const renderProgram = createProgram(gl, vertexShaderSource, renderFragmentShaderSource);
  const simProgram = createProgram(gl, vertexShaderSource, simFragmentShaderSource);

  let frontTexture = 0;

  function doFrame(time) {
    stepSim(gl, fb, simTextures, simProgram, positionBuffer, frontTexture, time);
    render(gl, simTextures, paletteTexture, renderProgram, positionBuffer, frontTexture);

    frontTexture ^= 1;

    requestAnimationFrame(doFrame);
  }

  requestAnimationFrame(doFrame);
}

main();
