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
        if (parts[0].endsWith(':')) {
            const label = parts[0].slice(0, -1);
            labels[label] = address;
            if (parts.length > 1) {
                instructions.push({ line: parts.slice(1).join(' '), address, index });
            }
        } else {
            instructions.push({ line, address, index });
        }
        address += 3;
    });

    address = 0;
    instructions.forEach(instruction => {
        const line = instruction.line;
        const parts = line.split(/\s+/);
        const mnemonic = parts[0];
        const operands = parts.slice(1).join('').split(',');

        const opcode = opcodes[mnemonic];
        if (opcode !== undefined) {
            let machineCode = [opcode];

            if (mnemonic === "LD") {
                if (operands.length === 2) {
                    const dest = operands[0];
                    const src = operands[1];
                    if (dest === "A" && src.startsWith("(") && src.endsWith("H)")) {
                        const addr = parseInt(src.slice(1, -2), 16);
                        machineCode = [0x3A, addr & 0xFF, (addr >> 8) & 0xFF];
                    } else if (dest.startsWith("(") && dest.endsWith("H)") && src === "A") {
                        const addr = parseInt(dest.slice(1, -2), 16);
                        machineCode = [0x32, addr & 0xFF, (addr >> 8) & 0xFF];
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && src.startsWith("0x")) {
                        const reg = dest;
                        const value = parseInt(src, 16);
                        if (reg === "A") machineCode = [0x3E, value];
                        else if (reg === "B") machineCode = [0x06, value];
                        else if (reg === "C") machineCode = [0x0E, value];
                    } else if (["A", "B", "C", "D", "E", "H", "L"].includes(dest) && ["A", "B", "C", "D", "E", "H", "L"].includes(src)) {
                        const regMap = { "A": 0x7F, "B": 0x40, "C": 0x41, "D": 0x42, "E": 0x43, "H": 0x44, "L": 0x45 };
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
                    const regMap = { "B": 0x80, "C": 0x81, "D": 0x82, "E": 0x83, "H": 0x84, "L": 0x85 };
                    machineCode = [regMap[reg]];
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
                    machineCode = [opcode + regMap[reg]];
                }
            }

            hexOutput.push(...machineCode);
            lstOutput.push(`${address.toString(16).padStart(4, '0').toUpperCase()} ${machineCode.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')} ${line}`);
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

                const outputFileName = file.name.replace(/\.asm$/i, '.lst');
                download(lstContent, outputFileName);
            } else if (extension === 'lst') {
                document.getElementById('lstContent').textContent = content;
            }
        };
        reader.readAsText(file);
    }
});
