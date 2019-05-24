.PHONY: clean

fire.com: fire.asm palette.asm
	nasm -f bin -o $@ fire.asm

clean:
	$(RM) fire.com
