// src/utils/CodeGenerator.js

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 4;

/**
 * Generate a random alphanumeric room code.
 * @param {number} length - The length of the code (default: 4)
 * @returns {string} A random code like "X7K9" or "A3F8"
 */
function generateCode(length = DEFAULT_LENGTH) {
    let code = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * CHARS.length);
        code += CHARS.charAt(randomIndex);
    }
    return code;
}

/**
 * Validate a room code format.
 * @param {string} code - The code to validate
 * @param {number} length - The expected length (default: 4)
 * @returns {boolean} True if the code matches the expected format
 */
function isValidCode(code, length = DEFAULT_LENGTH) {
    const regex = new RegExp(`^[A-Z0-9]{${length}}$`);
    return regex.test(code);
}

module.exports = {
    generateCode,
    isValidCode
};