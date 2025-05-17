const game = require('../script.js');

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

    describe('rgbToHsl', () => {
        test('should convert RGB red to HSL', () => {
            const hsl = game.rgbToHsl(255, 0, 0);
            expect(hsl.h).toBeCloseTo(0);
            expect(hsl.s).toBeCloseTo(1);
            expect(hsl.l).toBeCloseTo(0.5);
        });
        test('should convert RGB gray to HSL (achromatic)', () => {
            const hsl = game.rgbToHsl(128, 128, 128);
            expect(hsl.h).toBeCloseTo(0);
            expect(hsl.s).toBeCloseTo(0);
            expect(hsl.l).toBeCloseTo(0.50, 1);
        });
    });

    describe('hslToRgb', () => {
        test('should convert HSL red to RGB', () => {
            expect(game.hslToRgb(0, 1, 0.5)).toEqual({ r: 255, g: 0, b: 0 });
        });
        test('should convert HSL gray to RGB (achromatic)', () => {
            expect(game.hslToRgb(0, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
        });
    });

    describe('rgbToHex', () => {
        test('should convert RGB red to hex', () => {
            expect(game.rgbToHex(255, 0, 0)).toBe('#ff0000');
        });
        test('should handle single digit hex components', () => {
            expect(game.rgbToHex(10, 10, 10)).toBe('#0a0a0a');
        });
    });

    describe('mixColors', () => {
        test('should mix two distinct colors (e.g., red and blue)', () => {
            expect(game.mixColors('#FF0000', '#0000FF')).toBe('#ff00ff');
        });
        test('should mix two similar colors', () => {
            const color1 = '#FFDDDD';
            const color2 = '#FFEEEE';
            const mixed = game.mixColors(color1, color2);
            const mixedRgb = game.hexToRgb(mixed);
            expect(mixedRgb.r).toBeGreaterThan(250);
            expect(mixedRgb.g).toBe(229);
            expect(mixedRgb.b).toBe(229);
        });
         test('should mix yellow and blue to get a green-ish hue (approx)', () => {
            const yellow = '#FFFF00';
            const blue = '#0000FF';
            expect(game.mixColors(yellow, blue)).toBe('#00ffb1');
        });
    });
}); 