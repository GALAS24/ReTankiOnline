import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
    TankNetworkState,
    ClientBattleMessage,
    ServerBattleMessage,
    BattleMode,
    Team,
    DropType
} from '../../../shared/types';

export interface ConnectedPlayer {
    id: string;
    ws: WebSocket;
    username: string;
    rank: number;
    hull: string;
    turret: string;
    paint: string;
    hullMod: string;
    turretMod: string;
    team: Team;
    hp: number;
    maxHp: number;
    energy: number;
    isDead: boolean;
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    rw: number;
    vx: number;
    vy: number;
    vz: number;
    turretYaw: number;
    hSpec?: any;
    tSpec?: any;
}

export interface ServerDropBox {
    id: string;
    type: DropType;
    x: number;
    groundY: number;
    z: number;
}

export class Room {
    public id: string;
    public name: string;
    public mapId: string;
    public mode: BattleMode;
    public maxPlayers: number;

    private players: Map<string, ConnectedPlayer> = new Map();
    private activeMines: Map<string, { id: string; ownerId: string; team: Team; x: number; y: number; z: number }> = new Map();
    private activeBoxes: Map<string, ServerDropBox> = new Map();
    private isGoldActive: boolean = false;

    private tickCounter: number = 0;
    private broadcastInterval?: NodeJS.Timeout;
    private dropBoxInterval?: NodeJS.Timeout;

    public static readonly ARENA_FLOOR_Y: number = 5.95;

    private readonly ARENA_GROUND_ZONES: { type: DropType; x: number; z: number }[] = [
        { type: 'health', x: 0.0, z: 0.0 },
        { type: 'armor', x: -7.5, z: -6.0 },
        { type: 'armor', x: 7.5, z: 6.0 },
        { type: 'damage', x: 6.5, z: -6.0 },
        { type: 'damage', x: -6.5, z: 6.0 },
        { type: 'nitro', x: -9.0, z: 0.0 },
        { type: 'nitro', x: 9.0, z: 0.0 }
    ];

    private readonly ARENA_GOLD_SPOTS = [
        { x: 0.0, z: -4.5 }, { x: 0.0, z: 4.5 },
        { x: -5.5, z: -4.0 }, { x: 5.5, z: 4.0 },
        { x: -8.0, z: -8.0 }, { x: 8.0, z: 8.0 }
    ];

    constructor(id: string = 'arena_dm_1', name: string = 'Арена DM', mapId: string = 'arena', mode: BattleMode = 'DM', maxPlayers: number = 8) {
        this.id = id;
        this.name = name;
        this.mapId = mapId;
        this.mode = mode;
        this.maxPlayers = maxPlayers;
    }

    async init() {
        console.log(`[Room:${this.id}] Инициализация комнаты "${this.name}" на карте "${this.mapId}" (Floor Y = ${Room.ARENA_FLOOR_Y})...`);
        this.startBroadcastLoop();
        this.startServerDropLoop();
    }

    public addPlayer(
        id: string,
        ws: WebSocket,
        username: string,
        hull: string = 'viking',
        turret: string = 'smoky',
        paint: string = 'green',
        spawnPos?: { x: number; y: number; z: number },
        hSpec?: any,
        tSpec?: any,
        hullMod: string = 'm0',
        turretMod: string = 'm0'
    ) {
        const player: ConnectedPlayer = {
            id, ws, username, rank: 4,
            hull, turret, paint, hullMod, turretMod,
            team: 'none', hp: 2000, maxHp: 2000, energy: 1.0, isDead: false,
            x: spawnPos?.x ?? 0, y: spawnPos?.y ?? Room.ARENA_FLOOR_Y, z: spawnPos?.z ?? 0,
            rx: 0, ry: 0, rz: 0, rw: 1, vx: 0, vy: 0, vz: 0, turretYaw: 0,
            hSpec, tSpec
        };

        this.players.set(id, player);
        console.log(`[Room:${this.id}] Игрок ${username} (${id}) зашел. Mоды: ${hullMod}/${turretMod}`);

        ws.send(JSON.stringify({
            type: 's_battle_init',
            yourId: id,
            mapId: this.mapId,
            mode: this.mode,
            tanks: this.getAllTanksState()
        }));

        this.activeBoxes.forEach((b) => {
            ws.send(JSON.stringify({
                type: 's_box_spawn', boxId: b.id, boxType: b.type, x: b.x, y: b.groundY, z: b.z
            }));
        });

        this.activeMines.forEach((m) => {
            ws.send(JSON.stringify({
                type: 's_mine_spawn', mineId: m.id, ownerId: m.ownerId, team: m.team, x: m.x, y: m.y, z: m.z
            }));
        });

        this.broadcast({
            type: 's_player_joined',
            tank: this.getTankState(id)
        }, id);
    }

    public removePlayer(id: string) {
        const player = this.players.get(id);
        if (!player) return;

        this.players.delete(id);
        console.log(`[Room:${this.id}] Игрок ${player.username || id} вышел.`);
        this.broadcast({ type: 's_player_left', id });

        for (const [mineId, mine] of this.activeMines.entries()) {
            if (mine.ownerId === id) {
                this.activeMines.delete(mineId);
                this.broadcast({ type: 's_mine_explode', mineId });
            }
        }
    }

    public handleMessage(id: string, data: any) {
        const player = this.players.get(id);
        if (!player) return;

        if (data.type === 'c_state' && data.state) {
            if (!player.isDead) {
                player.x = data.state.x; player.y = data.state.y; player.z = data.state.z;
                player.rx = data.state.rx; player.ry = data.state.ry; player.rz = data.state.rz; player.rw = data.state.rw;
                player.vx = data.state.vx; player.vy = data.state.vy; player.vz = data.state.vz;
                player.turretYaw = data.state.turretYaw;
            }
            return;
        }

        if (data.type === 'c_stream_state') {
            this.broadcast({
                type: 's_stream_state',
                shooterId: id,
                weapon: data.weapon,
                isFiring: data.isFiring
            }, id);
            return;
        }

        if (data.type === 'c_equip_change') {
            player.hull = data.hull;
            player.turret = data.turret;
            player.paint = data.paint;
            player.hullMod = data.hullMod || 'm0';
            player.turretMod = data.turretMod || 'm0';

            this.broadcast({
                type: 's_equip_change',
                id: id,
                hull: player.hull,
                turret: player.turret,
                paint: player.paint,
                hullMod: player.hullMod,
                turretMod: player.turretMod
            }, id);

            console.log(`[Room:${this.id}] Игрок ${player.username} переоделся: ${player.hull}(${player.hullMod}) / ${player.turret}(${player.turretMod})`);
            return;
        }

        if (data.type === 'c_box_take' && data.boxId) {
            const box = this.activeBoxes.get(data.boxId);
            if (box) {
                if (box.type === 'gold') this.isGoldActive = false;
                this.activeBoxes.delete(data.boxId);
                this.broadcast({ type: 's_box_take', boxId: box.id, takerId: id, boxType: box.type });
            }
            return;
        }

        if (data.type === 'c_gold_request') {
            if (this.isGoldActive) return;
            this.isGoldActive = true;
            const spot = this.ARENA_GOLD_SPOTS[Math.floor(Math.random() * this.ARENA_GOLD_SPOTS.length)];
            const goldId = `gold_${Date.now()}`;
            this.activeBoxes.set(goldId, { id: goldId, type: 'gold', x: spot.x, groundY: Room.ARENA_FLOOR_Y, z: spot.z });
            this.broadcast({ type: 's_gold_spawn', boxId: goldId, x: spot.x, y: Room.ARENA_FLOOR_Y, z: spot.z, callerName: data.callerName || player.username });
            return;
        }

        if (data.type === 'c_mine_place') {
            const mineId = data.id || uuidv4().substring(0, 8);
            this.activeMines.set(mineId, { id: mineId, ownerId: id, team: player.team, x: data.x, y: data.y, z: data.z });
            this.broadcast({ type: 's_mine_spawn', mineId, ownerId: id, team: player.team, x: data.x, y: data.y, z: data.z });
            return;
        }

        if (data.type === 'c_shot') {
            this.broadcast({
                type: 's_shot_fired',
                shooterId: id,
                weapon: data.weapon,
                origin: data.origin,
                direction: data.direction,
                hitPoint: data.hitPoint
            }, id);

            if (data.victimId && data.damage) {
                const victim = this.players.get(data.victimId);
                if (victim && !victim.isDead) {
                    victim.hp = Math.max(0, victim.hp - data.damage);
                    this.broadcast({ type: 's_damage', victimId: victim.id, damage: data.damage, currentHp: victim.hp, attackerId: id, hitPoint: data.hitPoint });

                    if (victim.hp <= 0) {
                        victim.isDead = true;
                        victim.hp = 0;
                        this.broadcast({ type: 's_kill', killerId: id, victimId: victim.id, killerName: player.username, victimName: victim.username, weapon: data.weapon });

                        setTimeout(() => {
                            if (this.players.has(victim.id)) {
                                victim.isDead = false;
                                victim.hp = victim.maxHp;
                                const safeSpawns = [
                                    { x: -8.0, y: Room.ARENA_FLOOR_Y, z: -11.0 }, { x: 8.0, y: Room.ARENA_FLOOR_Y, z: -11.0 },
                                    { x: 8.0, y: Room.ARENA_FLOOR_Y, z: 11.0 }, { x: -8.0, y: Room.ARENA_FLOOR_Y, z: 11.0 },
                                    { x: 0.0, y: Room.ARENA_FLOOR_Y, z: 0.0 }
                                ];
                                const sp = safeSpawns[Math.floor(Math.random() * safeSpawns.length)];
                                victim.x = sp.x; victim.y = sp.y; victim.z = sp.z;
                                this.broadcast({ type: 's_respawn', id: victim.id, x: victim.x, y: victim.y, z: victim.z, hp: victim.hp });
                            }
                        }, 3500);
                    }
                }
            }
            return;
        }
    }

    private startServerDropLoop() {
        this.dropBoxInterval = setInterval(() => {
            if (this.players.size === 0 || this.activeBoxes.size >= this.ARENA_GROUND_ZONES.length) return;

            const availableZones = this.ARENA_GROUND_ZONES.filter(zone => {
                for (const b of this.activeBoxes.values()) {
                    if (Math.hypot(b.x - zone.x, b.z - zone.z) < 1.5) return false;
                }
                return true;
            });

            if (availableZones.length === 0) return;

            const selectedZone = availableZones[Math.floor(Math.random() * availableZones.length)];
            const boxId = `box_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

            this.activeBoxes.set(boxId, { id: boxId, type: selectedZone.type, x: selectedZone.x, groundY: Room.ARENA_FLOOR_Y, z: selectedZone.z });
            this.broadcast({ type: 's_box_spawn', boxId, boxType: selectedZone.type, x: selectedZone.x, y: Room.ARENA_FLOOR_Y, z: selectedZone.z });
        }, 12000);
    }

    private startBroadcastLoop() {
        this.broadcastInterval = setInterval(() => {
            if (this.players.size === 0) return;
            this.tickCounter++;
            const allTanks = this.getAllTanksState();

            this.players.forEach((player) => {
                if (player.ws.readyState === WebSocket.OPEN) {
                    player.ws.send(JSON.stringify({ type: 's_world_snapshot', tick: this.tickCounter, tanks: allTanks }));
                }
            });
        }, 1000 / 25);
    }

    private getTankState(id: string): any {
        const p = this.players.get(id)!;
        return {
            id: p.id, username: p.username, rank: p.rank, team: p.team,
            hull: p.hull, turret: p.turret, paint: p.paint,
            hullMod: p.hullMod, turretMod: p.turretMod,
            x: p.x, y: p.y, z: p.z, rx: p.rx, ry: p.ry, rz: p.rz, rw: p.rw,
            turretYaw: p.turretYaw, vx: p.vx, vy: p.vy, vz: p.vz,
            hp: p.hp, maxHp: p.maxHp, energy: p.energy, isDead: p.isDead,
            hSpec: p.hSpec, tSpec: p.tSpec
        };
    }

    private getAllTanksState(): TankNetworkState[] {
        const list: TankNetworkState[] = [];
        this.players.forEach((_, id) => list.push(this.getTankState(id)));
        return list;
    }

    public broadcast(message: any, excludeId?: string) {
        const raw = JSON.stringify(message);
        this.players.forEach((p, id) => {
            if (id !== excludeId && p.ws.readyState === WebSocket.OPEN) p.ws.send(raw);
        });
    }

    public destroy() {
        if (this.broadcastInterval) clearInterval(this.broadcastInterval);
        if (this.dropBoxInterval) clearInterval(this.dropBoxInterval);
    }
}