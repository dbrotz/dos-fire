; Copyright 2019 David Brotz
;
; Permission is hereby granted, free of charge, to any person obtaining a copy
; of this software and associated documentation files (the "Software"), to deal
; in the Software without restriction, including without limitation the rights
; to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
; copies of the Software, and to permit persons to whom the Software is
; furnished to do so, subject to the following conditions:
;
; The above copyright notice and this permission notice shall be included in
; all copies or substantial portions of the Software.
;
; THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
; IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
; FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
; AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
; LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
; OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
; THE SOFTWARE.

	org 0x100

%define INT_KEYB 0x09

%define SCANCODE_ESC 0x01

%define PIC1_PORT 0x20
%define EOI       0x20

%define KEYB_DATA_PORT 0x60

%define SEQ_ADDR_PORT 0x3C4
%define SEQ_DATA_PORT 0x3C5

%define SEQ_MAP_MASK    0x02
%define SEQ_MEMORY_MODE 0x04

%define DACWX_PORT   0x3C8
%define DACDATA_PORT 0x3C9

%define CRTC_ADDR_PORT 0x3D4
%define CRTC_DATA_PORT 0x3D5

%define CRTC_UNDERLINE_LOC 0x14
%define CRTC_MODE_CONTROL  0x17

%define VRAM_SEG 0xA000

%macro outb 2
	%if %2 == 0
		xor al, al
	%else
		mov al, %2
	%endif
	%if %1 < 256
		out %1, al
	%else
		mov dx, %1
		out dx, al
	%endif
%endmacro

	xor ax, ax
	mov es, ax

	cli

	; Save DOS keyboard interrupt vector.
	mov eax, [es:INT_KEYB * 4]
	mov [dos_keyb_int_vec], eax

	; Set up our keyboard ISR.
	mov [es:INT_KEYB * 4], word keyb_isr
	mov [es:INT_KEYB * 4 + 2], cs

	sti

	mov [pressed_esc], byte 0

	; Set up "Mode Y" (unchained mode 0x13).
	mov ax, 0x0013
	int 0x10
	outb SEQ_ADDR_PORT, SEQ_MEMORY_MODE
	outb SEQ_DATA_PORT, 0x06
	outb CRTC_ADDR_PORT, CRTC_UNDERLINE_LOC
	outb CRTC_DATA_PORT, 0x00
	outb CRTC_ADDR_PORT, CRTC_MODE_CONTROL
	outb CRTC_DATA_PORT, 0xE3

	; Set first palette color to red.
	outb DACWX_PORT, 0
	outb DACDATA_PORT, 0x3F
	outb DACDATA_PORT, 0x00
	outb DACDATA_PORT, 0x00

	; Select all planes.
	outb SEQ_ADDR_PORT, SEQ_MAP_MASK
	outb SEQ_DATA_PORT, 0x0F

	; Fill screen with red.
	mov ax, VRAM_SEG
	mov es, ax
	xor di, di
	xor al, al
	mov cx, 16000
	rep stosb

spin:
	cmp [pressed_esc], byte 0
	je spin

	xor ax, ax
	mov es, ax

	cli

	; Restore DOS keyboard interrupt vector.
	mov eax, [dos_keyb_int_vec]
	mov [es:INT_KEYB * 4], eax

	sti

	; Set 80x25 text video mode.
	mov ax, 0x0003
	int 0x10

	; Exit.
	mov ax, 0x4C00
	int 0x21

keyb_isr:
	pusha

	in al, KEYB_DATA_PORT
	cmp al, SCANCODE_ESC
	jne .send_eoi
	mov [pressed_esc], byte 1
.send_eoi:
	outb PIC1_PORT, EOI

	popa
	iret

dos_keyb_int_vec dd 0
pressed_esc db 0
