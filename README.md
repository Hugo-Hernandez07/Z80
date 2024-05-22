# ASm to LST Viewer

Este proyecto es un ensamblador para el procesador Z80, escrito en JavaScript. Convierte código ensamblador Z80 (ASM) en código máquina, generando archivos `.lst` y `.hex`.

## Instalación

### Requisitos Previos
- Un navegador web moderno

## Uso

### Cargar un Archivo ASM

1. Abre `index.html` en tu navegador.
2. Haz clic en "Select a file" y selecciona un archivo `.asm`.
3. El ensamblador procesará el archivo y mostrará el contenido ASM y el resultado LST en pantalla.
4. El archivo `.lst` generado se descargará automáticamente.

## Ejemplo de Uso

### Código ASM de Ejemplo

```asm
LD A, (50h)
CP 0
JP M, error; validando negativo
CP 9
JP P, error; el numero no puede ser mayor a 8
CP 2
JP M, uno
LD E, A
LD D, 0; numero al que se le calculara el factorial
PUSH DE
POP HL; resultado
DEC A
factorial:
LD B, A
DEC B; indice para la suma 
JP Z, guardar
multiplicar:
ADD HL, DE
DJNZ multiplicar
PUSH HL
POP DE
DEC A
CP 1
JP NZ, factorial
JP guardar
error:
LD HL, -1; Se coloca -1 para indicar error
JP guardar
uno:
LD HL, 1; factorial de 0 y 1
guardar:
HALT
END

