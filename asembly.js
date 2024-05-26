// Diccionario de mnemónicos a códigos de operación
const opcodes = {
    "NOP": 0x00,
    "LD": 0x3E,  // LD A, n es un ejemplo, el opcode dependerá de los registros usados
    "JP": 0xC3,
    "JR": 0x18,
    "HALT": 0x76,
    "ADD": 0x80,  // ADD A, r opcode (ADD A, B es 0x80, ADD A, C es 0x81, etc.)
    "CP": 0xFE,
    "PUSH": 0xC5, // PUSH BC es un ejemplo, el opcode dependerá de los registros usados
    "POP": 0xC1,  // POP BC es un ejemplo, el opcode dependerá de los registros usados
    "DJNZ": 0x10, // DJNZ opcode
    "INC": 0x04,  // INC r opcode (INC B es 0x04, INC C es 0x0C, etc.)
    "DEC": 0x05   // DEC r opcode (DEC B es 0x05, DEC C es 0x0D, etc.)
};

// Función para ensamblar el código ASM
function assemble(asmCode) {
    let address = 0;
    const hexOutput = [];
    const lstOutput = [];
    const labels = {};
    const instructions = [];

    const lines = asmCode.split('\n');
    lines.forEach((line, index) => {
        line = line.trim().split(';')[0].trim();
        if (!line) return;
        const parts = line.split(/\s+/);
        if (parts[0].toUpperCase() === "ORG") {
            address = parseInt(parts[1], 16);
        } else if (parts[0].endsWith(':')) {
            const label = parts[0].slice(0, -1);
            labels[label] = address;
            if (parts.length > 1) {
                instructions.push({ line: parts.slice(1).join(' '), address, index });
                address += 3; // Incrementar por 3 bytes para cada instrucción como aproximación
            }
        } else {
            instructions.push({ line, address, index });
            address += 3; // Incrementar por 3 bytes para cada instrucción como aproximación
        }
    });

    // Reset address to the starting address specified by ORG
    if (lines[0].split(/\s+/)[0].toUpperCase() === "ORG") {
        address = parseInt(lines[0].split(/\s+/)[1], 16);
    } else {
        address = 0;
    }

    instructions.forEach(instruction => {
        const line = instruction.line;
        const parts = line.split(/\s+/);
        const mnemonic = parts[0];
        const operands = parts.slice(1).join('').split(',');

        const opcode = opcodes[mnemonic];
        if (opcode !== undefined) {
            let machineCode = [opcode];
            let instructionLength = 1;

            if (mnemonic === "LD") {
                if (operands.length === 2) {
                    const dest = operands[0];
                    const src = operands[1];
                    if (dest === "A" && src.startsWith("(") && src.endsWith("H)")) {
                        const addr = parseInt(src.slice(1, -2), 16);
                        if (!isNaN(addr)) {
                            machineCode = [0x3A, addr & 0xFF, (addr >> 8) & 0xFF];
                            instructionLength = 3;
                        }
                    } else if (dest.startsWith("(") && dest.endsWith("H)") && src === "A") {
                        const addr = parseInt(dest.slice(1, -2), 16);
                        if (!isNaN(addr)) {
                            machineCode = [0x32, addr & 0xFF, (addr >> 8) & 0xFF];
                            instructionLength = 3;
                        }
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && src.startsWith("0x")) {
                        const reg = dest;
                        const value = parseInt(src, 16);
                        if (!isNaN(value)) {
                            if (reg === "A") machineCode = [0x3E, value];
                            else if (reg === "B") machineCode = [0x06, value];
                            else if (reg === "C") machineCode = [0x0E, value];
                            instructionLength = 2;
                        }
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && ["A", "B", "C", "D", "E", "H", "L"].includes(src)) {
                        const regMap = { "A": 0x78, "B": 0x40, "C": 0x48, "D": 0x50, "E": 0x58, "H": 0x60, "L": 0x68 };
                        machineCode = [regMap[dest] + (regMap[src] & 0x07)];
                        instructionLength = 1;
                    }
                }
            } else if (mnemonic === "JP") {
                if (operands.length === 1) {
                    const addr = labels[operands[0]] !== undefined ? labels[operands[0]] : parseInt(operands[0], 16);
                    if (!isNaN(addr)) {
                        machineCode = [0xC3, addr & 0xFF, (addr >> 8) & 0xFF];
                        instructionLength = 3;
                    }
                }
            } else if (mnemonic === "JR") {
                if (operands.length === 1) {
                    const offset = labels[operands[0]] !== undefined ? labels[operands[0]] - (address + 2) : parseInt(operands[0], 16);
                    if (!isNaN(offset)) {
                        machineCode = [0x18, offset & 0xFF];
                        instructionLength = 2;
                    }
                }
            } else if (mnemonic === "CP") {
                if (operands.length === 1) {
                    const value = operands[0].startsWith('0x') ? parseInt(operands[0], 16) : parseInt(operands[0]);
                    if (!isNaN(value)) {
                        machineCode = [0xFE, value];
                        instructionLength = 2;
                    }
                }
            } else if (mnemonic === "ADD") {
                if (operands.length === 2 && operands[0] === "A") {
                    const reg = operands[1];
                    const regMap = { "B": 0x80, "C": 0x81, "D": 0x82, "E": 0x83, "H": 0x84, "L": 0x85 };
                    if (regMap[reg] !== undefined) {
                        machineCode = [regMap[reg]];
                        instructionLength = 1;
                    }
                }
            } else if (mnemonic === "PUSH" || mnemonic === "POP") {
                if (operands.length === 1) {
                    const reg = operands[0];
                    const regMap = {
                        "BC": 0x00,
                        "DE": 0x10,
                        "HL": 0x20,
                        "AF": 0x30
                    };
                    if (regMap[reg] !== undefined) {
                        machineCode = [opcode + regMap[reg]];
                        instructionLength = 1;
                    }
                }
            } else if (mnemonic === "DJNZ") {
                if (operands.length === 1) {
                    const offset = labels[operands[0]] !== undefined ? labels[operands[0]] - (address + 2) : parseInt(operands[0], 16);
                    if (!isNaN(offset)) {
                        machineCode = [0x10, offset & 0xFF];
                        instructionLength = 2;
                    }
                }
            } else if (mnemonic === "INC" || mnemonic === "DEC") {
                if (operands.length === 1) {
                    const reg = operands[0];
                    const regMap = {
                        "B": 0x00, "C": 0x01, "D": 0x02, "E": 0x03, "H": 0x04, "L": 0x05, "(HL)": 0x06, "A": 0x07
                    };
                    if (regMap[reg] !== undefined) {
                        machineCode = [opcode + regMap[reg]];
                        instructionLength = 1;
                    }
                }
            }

            if (machineCode.includes(NaN)) {
                throw new Error(`Invalid operand in instruction on line ${instruction.index + 1}: ${line}`);
            }

            hexOutput.push(...machineCode);
            lstOutput.push(`${address.toString(16).padStart(4, '0').toUpperCase()} ${machineCode.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')} ${line}`);
            address += instructionLength;
        }
    });

    const hexContent = hexOutput.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    // Construcción de la tabla de símbolos
    let symbolTable = "\n\nTabla de Símbolos:\n";
    for (const [label, addr] of Object.entries(labels)) {
        symbolTable += `${label}: ${addr.toString(16).padStart(4, '0').toUpperCase()}\n`;
    }

    return { lstContent: lstOutput.join('\n') + symbolTable, hexContent };
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
                const { lstContent, hexContent } = assemble(content);
                document.getElementById('lstContent').textContent = lstContent;

                const lstFileName = file.name.replace(/\.asm$/i, '.lst');
                const hexFileName = file.name.replace(/\.asm$/i, '.hex');
                download(lstContent, lstFileName);
                download(hexContent, hexFileName);
            } else if (extension === 'lst') {
                document.getElementById('lstContent').textContent = content;
            }
        };
        reader.readAsText(file);
    }
});
