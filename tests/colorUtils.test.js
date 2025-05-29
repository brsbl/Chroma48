const game = require('../app/script.js');

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: key => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        clear: () => {
            store = {};
        },
        removeItem: key => {
            delete store[key];
        }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Color Utility Functions', () => {
    describe('hexToRgb', () => {
        test('should convert 3-digit hex to RGB', () => {
            expect(game.hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
        });
        test('should convert 6-digit hex to RGB', () => {
            expect(game.hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
        });
        test('should handle mixed case hex', () => {
            expect(game.hexToRgb('#1a2B3c')).toEqual({ r: 26, g: 43, b: 60 });
        });
    });

    describe('rgbToHex', () => {
        test('should convert RGB red to hex', () => {
            expect(game.rgbToHex(255, 0, 0)).toBe('#ff0000');
        });
        test('should handle single digit hex components', () => {
            expect(game.rgbToHex(10, 10, 10)).toBe('#0a0a0a');
        });
        test('should handle decimal values by rounding', () => {
            expect(game.rgbToHex(10.7, 20.3, 30.9)).toBe('#0b141f');
        });
    });

    describe('mixColors - RGB Averaging', () => {
        test('should mix red and blue to get purple', () => {
            expect(game.mixColors('#FF0000', '#0000FF')).toBe('#800080');
        });
        test('should mix white and black to get gray', () => {
            expect(game.mixColors('#FFFFFF', '#000000')).toBe('#808080');
        });
        test('should mix two similar colors', () => {
            const color1 = '#FFDDDD'; // RGB: 255, 221, 221
            const color2 = '#FFEEEE'; // RGB: 255, 238, 238
            const mixed = game.mixColors(color1, color2);
            // Expected: RGB average = (255+255)/2, (221+238)/2, (221+238)/2 = 255, 229.5, 229.5
            expect(mixed).toBe('#ffe6e6'); // Rounded: 255, 230, 230
        });
        test('should mix yellow and blue', () => {
            const yellow = '#FFFF00'; // RGB: 255, 255, 0
            const blue = '#0000FF';   // RGB: 0, 0, 255
            // Expected: RGB average = 127.5, 127.5, 127.5
            expect(game.mixColors(yellow, blue)).toBe('#808080'); // Rounded: 128, 128, 128
        });
        test('should handle 3-digit hex colors', () => {
            expect(game.mixColors('#F00', '#00F')).toBe('#800080');
        });
    });
}); 