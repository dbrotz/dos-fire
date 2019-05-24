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

%define DACWX_PORT   0x3C8
%define DACDATA_PORT 0x3C9

%define INPUT_STATUS_1_PORT 0x3DA

%define VSYNC_ACTIVE (1 << 3)

%define VRAM_SEG 0xA000

%define SCREEN_W 320
%define SCREEN_H 200

%define PALETTE_SIZE 80

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

	call set_seed

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

	; Set up mode 0x13.
	mov ax, 0x0013
	int 0x10

	; Set up palette.
	outb DACWX_PORT, 0
	mov dx, DACDATA_PORT
	mov si, palette
	mov cx, PALETTE_SIZE * 3
	rep outsb

	call init_buffer

main_loop:
	call fire_step
	call wait_vsync
	call copy_to_vram

	cmp [pressed_esc], byte 0
	je main_loop

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
	mov [cs:pressed_esc], byte 1
.send_eoi:
	outb PIC1_PORT, EOI

	popa
	iret

init_buffer:
	mov ax, cs
	add ax, 0x1000
	mov es, ax
	xor di, di
	xor al, al
	mov cx, SCREEN_W * (SCREEN_H - 1)
	rep stosb
	mov al, PALETTE_SIZE - 1
	mov cx, SCREEN_W
	rep stosb
	ret

fire_step:
	mov ax, cs
	add ax, 0x1000
	mov es, ax
	mov di, SCREEN_W
	mov cx, SCREEN_W * (SCREEN_H - 1)
.loop:
	mov si, di
	call rand
	mov bx, ax
	shr ax, 1
	and bx, 1
	jz .no_horizontal
	mov bx, ax
	shr ax, 1
	and bx, 1
	dec bx
	add si, bx
.no_horizontal:
	mov dl, [es:di]
	or dl, dl
	jz .next
	call rand
	and al, 1
	jz .next
	dec dl
.next:
	mov [es:si - SCREEN_W], dl
	inc di
	loop .loop
	ret

copy_to_vram:
	mov ax, cs
	add ax, 0x1000
	mov ds, ax
	mov ax, VRAM_SEG
	mov es, ax
	xor si, si
	xor di, di
	mov cx, (SCREEN_W * SCREEN_H) / 2
	rep movsw
	mov ax, cs
	mov ds, ax
	ret

wait_vsync:
	mov dx, INPUT_STATUS_1_PORT
.loop:
	in al, dx
	and al, VSYNC_ACTIVE
	jz .loop
	ret

set_seed:
	mov ah, 0x2C
	int 0x21
	mov [seed], dx
	ret

rand:
	mov ax, [seed]

	mov bx, ax
	shl bx, 7
	xor ax, bx

	mov bx, ax
	shr bx, 9
	xor ax, bx

	mov bx, ax
	shl bx, 8
	xor ax, bx

	mov [seed], ax
	ret

dos_keyb_int_vec dd 0
pressed_esc db 0
seed dw 1

%include "palette.asm"
