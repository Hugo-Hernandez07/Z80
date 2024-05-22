// Diccionario de mnemónicos a códigos de operación
const opcodes = {
    "NOP": 0x00,
    "LD": 0x3E,  // LD A, n es un ejemplo, el opcode dependerá de los registros usados
    "JP": 0xC3,
    "JR": 0x18,
    "HALT": 0x76,
    "ADD": 0x80,  // ADD A, r opcode (ADD A, B es 0x80, ADD A, C es 0x81, etc.)
    "CP": 0xFE,
};

// Función para ensamblar el código ASM
function assemble(asmCode) {
    // Inicializar direcciones de memoria y archivos de salida
    let address = 0;
    const hexOutput = [];
    const lstOutput = [];
    const labels = {};
    const instructions = [];

    // Primera pasada: recopilar etiquetas
    const lines = asmCode.split('\n');
    lines.forEach((line, index) => {
        // Eliminar espacios y comentarios
        line = line.trim().split(';')[0].trim();

        // Ignorar líneas vacías o de comentarios
        if (!line) {
            return;
        }

        // Dividir la línea en partes
        const parts = line.split(/\s+/);

        // Si la línea tiene una etiqueta (termina con ':')
        if (parts[0].endsWith(':')) {
            const label = parts[0].slice(0, -1);
            labels[label] = address;
            if (parts.length > 1) {
                instructions.push({ line: parts.slice(1).join(' '), address, index });
            }
        } else {
            instructions.push({ line, address, index });
        }

        // Simular incremento de la dirección de memoria (asumiendo longitud fija de 1 byte por instrucción)
        address += 3;  // Presupuesto de 3 bytes para la instrucción más larga (JP, etc.)
    });

    // Segunda pasada: ensamblar código máquina
    address = 0;
    instructions.forEach(instruction => {
        const line = instruction.line;

        // Dividir la línea en partes
        const parts = line.split(/\s+/);

        // Obtener el mnemónico y los operandos
        const mnemonic = parts[0];
        const operands = parts.slice(1).join('').split(',');

        // Convertir el mnemónico a código de operación
        const opcode = opcodes[mnemonic];

        // Procesar el mnemónico y generar código máquina
        if (opcode !== undefined) {
            // Generar código máquina
            let machineCode = [opcode];

            // Procesar operandos
            if (mnemonic === "LD") {
                if (operands.length === 2) {
                    const dest = operands[0];
                    const src = operands[1];

                    if (dest === "A" && src.startsWith("(") && src.endsWith("H)")) {
                        // LD A, (addr)
                        const addr = parseInt(src.slice(1, -2), 16);
                        machineCode = [0x3A, addr & 0xFF, (addr >> 8) & 0xFF];
                    } else if (dest.startsWith("(") && dest.endsWith("H)") && src === "A") {
                        // LD (addr), A
                        const addr = parseInt(dest.slice(1, -2), 16);
                        machineCode = [0x32, addr & 0xFF, (addr >> 8) & 0xFF];
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && src.startsWith("0x")) {
                        // LD r, n
                        const reg = dest;
                        const value = parseInt(src, 16);

                        if (reg === "A") {
                            machineCode = [0x3E, value];
                        } else if (reg === "B") {
                            machineCode = [0x06, value];
                        } else if (reg === "C") {
                            machineCode = [0x0E, value];
                        }
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && ["A", "B", "C", "D", "E", "H", "L"].includes(src)) {
                        // LD r, r'
                        const regMap = {
                            "A": 0x7F,
                            "B": 0x40,
                            "C": 0x41,
                            "D": 0x42,
                            "E": 0x43,
                            "H": 0x44,
                            "L": 0x45,
                        };
                        machineCode = [regMap[dest] + regMap[src] - 0x40];
                    }
                }
            } else if (mnemonic === "JP") {
                if (operands.length === 1) {
                    const addr = labels[operands[0]] !== undefined ? labels[operands[0]] : parseInt(operands[0], 16);
                    machineCode = [0xC3, addr & 0xFF, (addr >> 8) & 0xFF];
                }
            } else if (mnemonic === "JR") {
                if (operands.length === 1) {
                    const offset = labels[operands[0]] !== undefined ? labels[operands[0]] - (address + 2) : parseInt(operands[0], 16);
                    machineCode = [0x18, offset & 0xFF];
                }
            } else if (mnemonic === "CP") {
                if (operands.length === 1) {
                    const value = operands[0].startsWith('0x') ? parseInt(operands[0], 16) : parseInt(operands[0]);
                    machineCode = [0xFE, value];
                }
            } else if (mnemonic === "ADD") {
                if (operands.length === 2 && operands[0] === "A") {
                    const reg = operands[1];
                    const regMap = {
                        "B": 0x80,
                        "C": 0x81,
                        "D": 0x82,
                        "E": 0x83,
                        "H": 0x84,
                        "L": 0x85,
                    };
                    machineCode = [regMap[reg]];
                }
            }

            // Convertir el código máquina a formato hexadecimal
            hexOutput.push(...machineCode);

            // Generar entrada para el archivo .lst
            lstOutput.push(`${address.toString(16).padStart(4, '0').toUpperCase()} ${machineCode.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')} ${line}`);

            // Incrementar la dirección de memoria
            address += machineCode.length;
        }
    });

    return lstOutput.join('\n');
}

// Función para descargar contenido como archivo
function download(content, fileName) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Manejar la selección de archivos y el ensamblaje
document.getElementById('fileSelector').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'asm') {
                document.getElementById('asmContent').textContent = content;
                const lstContent = assemble(content);
                document.getElementById('lstContent').textContent = lstContent;

                // Crear y descargar el archivo .lst
                const outputFileName = file.name.replace(/\.asm$/i, '.lst');
                download(lstContent, outputFileName);
            } else if (extension === 'lst') {
                document.getElementById('lstContent').textContent = content;
            }
        };
        reader.readAsText(file);
    }
});
