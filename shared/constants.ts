// shared/constants.ts

export interface BaseHullConfig {
    mass: number;
    mountX?: number; // Центрирование башни по X (по умолчанию 0)
    mountY: number;  // Высота посадки башни над корпусом
    mountZ: number;  // Смещение башни вперёд/назад
    rotY?: number;
    scale?: number;
    [key: string]: any;
}

export interface BaseTurretConfig {
    pivotX?: number;
    pivotY: number;
    pivotZ: number;
    rotY?: number;
    scale?: number;
    [key: string]: any;
}

// Отдельный интерфейс для всей конфигурации танков
export interface TankSpecsConfig {
    hulls: Record<string, BaseHullConfig>;
    turrets: Record<string, BaseTurretConfig>;
    paints: Record<string, number>;
}

export const TANK_SPECS: TankSpecsConfig = {
    // 7 оригинальных корпусов
    hulls: {
        // Легкие корпуса
        "wasp": {
            mass: 0.8,
            width: 2.4,
            length: 4.2,
            height: 1.1,
            mountY: 0.95,
            mountZ: -0.15,
            scale: 4.4
        },
        "hornet": {
            mass: 1.0,
            width: 2.7,
            length: 4.8,
            height: 1.2,
            mountY: 1.05,
            mountZ: -0.20,
            scale: 4.8
        },

        // Средние корпуса
        "hunter": {
            mass: 1.7,
            width: 2.9,
            length: 5.0,
            height: 1.2,
            mountY: 1.05,
            mountZ: -0.25,
            scale: 5.0
        },
        "viking": {
            mass: 2.3,
            width: 3.1,
            length: 5.2,
            height: 1.2,
            mountY: 1.00,
            mountZ: -0.40,
            scale: 5.2
        },
        "dictator": {
            mass: 2.8,
            width: 3.0,
            length: 5.6,
            height: 1.5,
            mountY: 1.35,
            mountZ: -0.65, // Погон смещен сильно назад
            scale: 5.6
        },

        // Тяжелые корпуса
        "titan": {
            mass: 3.8,
            width: 3.3,
            length: 5.3,
            height: 1.3,
            mountY: 1.15,
            mountZ: 0.10,
            scale: 5.3
        },
        "mammoth": {
            mass: 4.5,
            width: 3.4,
            length: 5.4,
            height: 1.4,
            mountY: 1.20,
            mountZ: 0.50,
            scale: 5.4
        }
    },

    // 11 оригинальных орудий
    turrets: {
        "smoky": {
            pivotZ: 0.65,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.2
        },
        "firebird": {
            pivotZ: 0.40,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.2
        },
        "twins": {
            pivotZ: 0.50,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.4
        },
        "railgun": {
            pivotZ: 1.15,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 4.6
        },
        "isida": {
            pivotZ: 0.45,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.2
        },
        "thunder": {
            pivotZ: 0.35,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.6
        },
        "freeze": {
            pivotZ: 0.45,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.2
        },
        "ricochet": {
            pivotZ: 0.60,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 3.6
        },
        "shaft": {
            pivotZ: 1.40,
            pivotY: 0.0,
            rotY: Math.PI,
            scale: 4.8
        }
    },

    // Цветовые оттенки и базовые краски
    paints: {
        'green': 0x4e6b2f,
        'flora': 0x3d5028,
        'metallic': 0x7b8b99,
        'lava': 0x99381e,
        'apple': 0x5a7a32,
        'carbon': 0x222222,
        'black': 0x181818,
        'blue': 0x274a78,
        'sand': 0x8b8058
    }
};