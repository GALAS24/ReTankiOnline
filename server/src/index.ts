import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Room } from './core/Room';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

const rooms: Map<string, Room> = new Map();
const playerRoomMap: Map<string, Room> = new Map();

// Создаём единую комнату по умолчанию
const defaultRoom = new Room('arena_dm_1', 'Арена DM [Без припасов]', 'arena', 'DM', 8);
rooms.set(defaultRoom.id, defaultRoom);

defaultRoom.init().then(() => {
    console.log(`[Server] ReTanki Authoritative Server running on ws://localhost:${PORT}`);
    console.log(`[Battle] Default Room "${defaultRoom.name}" initialized on map "${defaultRoom.mapId}"`);
});

/**
 * Обработка сохранения координат из игры напрямую в файлы проекта
 */
export function handleSaveBattleConfig(config: {
    groundY: number;
    dropZones: any[];
    goldSpots: any[];
    spawns?: any[];
}): boolean {
    try {
        const roomPath = path.resolve(__dirname, './core/Room.ts');
        const dropManagerPath = path.resolve(__dirname, '../../client/src/combat/DropBoxManager.ts');

        // 1. Обновляем Room.ts
        if (fs.existsSync(roomPath)) {
            let roomCode = fs.readFileSync(roomPath, 'utf-8');

            const zonesStr = JSON.stringify(config.dropZones, null, 8)
                .replace(/"([^"]+)":/g, '$1:');
            roomCode = roomCode.replace(
                /private readonly ARENA_GROUND_ZONES[\s\S]*?\];/,
                `private readonly ARENA_GROUND_ZONES: { type: DropType; x: number; z: number }[] = ${zonesStr};`
            );

            const goldStr = JSON.stringify(config.goldSpots, null, 8)
                .replace(/"([^"]+)":/g, '$1:');
            roomCode = roomCode.replace(
                /private readonly ARENA_GOLD_SPOTS[\s\S]*?\];/,
                `private readonly ARENA_GOLD_SPOTS = ${goldStr};`
            );

            roomCode = roomCode.replace(/ARENA_FLOOR_Y:\s*number\s*=\s*[\d.]+/g, `ARENA_FLOOR_Y: number = ${config.groundY.toFixed(2)}`);

            fs.writeFileSync(roomPath, roomCode, 'utf-8');
            console.log(`[ConfigSync] Файл Room.ts успешно обновлен! (ARENA_FLOOR_Y = ${config.groundY.toFixed(2)})`);
        }

        // 2. Обновляем DropBoxManager.ts
        if (fs.existsSync(dropManagerPath)) {
            let dropCode = fs.readFileSync(dropManagerPath, 'utf-8');
            dropCode = dropCode.replace(/BASE_FLOOR_Y:\s*number\s*=\s*[\d.]+/g, `BASE_FLOOR_Y: number = ${config.groundY.toFixed(2)}`);
            fs.writeFileSync(dropManagerPath, dropCode, 'utf-8');
            console.log(`[ConfigSync] Файл DropBoxManager.ts успешно обновлен!`);
        }

        return true;
    } catch (err) {
        console.error('[ConfigSync] Ошибка сохранения конфига:', err);
        return false;
    }
}

wss.on('connection', (ws: WebSocket) => {
    const playerId = uuidv4().substring(0, 8);
    const defaultUsername = `Tankist_${playerId.substring(0, 4)}`;
    console.log(`[Network] Новое подключение сокета: ${playerId} (${defaultUsername})`);

    ws.on('message', (raw: string) => {
        try {
            const data = JSON.parse(raw);

            // Сохранение из панели F7
            if (data.type === 'c_save_arena_zones') {
                const ok = handleSaveBattleConfig(data.payload);
                ws.send(JSON.stringify({ type: 's_save_arena_result', success: ok }));
                return;
            }

            // Вход игрока в бой
            // Вход игрока в бой
            if (data.type === 'c_ready') {
                console.log(`[Battle] Игрок ${playerId} (${defaultUsername}) входит в defaultRoom! Моды: ${data.hullMod}/${data.turretMod}`);

                playerRoomMap.set(playerId, defaultRoom);

                defaultRoom.addPlayer(
                    playerId,
                    ws,
                    defaultUsername,
                    data.hull || 'viking',
                    data.turret || 'smoky',
                    data.paint || 'green',
                    data.spawnPos,
                    data.hSpec,
                    data.tSpec,
                    data.hullMod || 'm0',    // <-- Передаем на сервер
                    data.turretMod || 'm0'   // <-- Передаем на сервер
                );
                return;
            }

            // Передача остальных боевых пакетов (c_state, c_shot, c_box_take, c_gold_request, c_mine_place)
            const room = playerRoomMap.get(playerId);
            if (room) {
                room.handleMessage(playerId, data);
            } else {
                console.warn(`[Network] Пакет ${data.type} от ${playerId} отклонён: игрок не привязан к комнате!`);
            }
        } catch (e) {
            console.error(`[Network] Ошибка парсинга пакета от ${playerId}:`, e);
        }
    });

    ws.on('close', () => {
        console.log(`[Network] Игрок отключился: ${playerId}`);
        const room = playerRoomMap.get(playerId);
        if (room) {
            room.removePlayer(playerId);
            playerRoomMap.delete(playerId);
        }
    });

    ws.on('error', (err) => {
        console.error(`[Network] Ошибка сокета игрока ${playerId}:`, err);
    });
});