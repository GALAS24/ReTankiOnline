export type Team = 'none' | 'blue' | 'red';
export type BattleMode = 'DM' | 'TDM' | 'CTF';
export type DropType = 'health' | 'armor' | 'damage' | 'nitro' | 'gold';

export interface PlayerInputPacket {
    seq: number;
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
    drive: number;
    turn: number;
    fire: boolean;
}

export interface TankNetworkState {
    id: string;
    username: string;
    rank: number;
    hull: string;
    turret: string;
    paint: string;
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    rw: number;
    turretYaw: number;
    vx: number;
    vy: number;
    vz: number;
    hp: number;
    maxHp: number;
    energy: number;
    isDead: boolean;
    team: Team;
}

export type ClientBattleMessage =
    | { type: 'c_ready'; hull: string; turret: string; paint: string; spawnPos?: { x: number; y: number; z: number } }
    | { type: 'c_state'; state: PlayerInputPacket }
    | { type: 'c_shot'; weapon: string; origin: [number, number, number]; direction: [number, number, number]; hitPoint?: [number, number, number]; victimId?: string; damage?: number }
    | { type: 'c_mine_place'; id: string; x: number; y: number; z: number }
    | { type: 'c_box_take'; boxId: string }
    | { type: 'c_respawn_request' };

export type ServerBattleMessage =
    | { type: 's_battle_init'; yourId: string; mapId: string; mode: BattleMode; tanks: TankNetworkState[] }
    | { type: 's_world_snapshot'; tick: number; tanks: TankNetworkState[] }
    | { type: 's_player_joined'; tank: TankNetworkState }
    | { type: 's_player_left'; id: string }
    | { type: 's_shot_fired'; shooterId: string; weapon: string; origin: [number, number, number]; direction: [number, number, number]; hitPoint?: [number, number, number] }
    | { type: 's_damage'; victimId: string; damage: number; currentHp: number; attackerId: string; hitPoint?: [number, number, number] }
    | { type: 's_kill'; killerId: string; victimId: string; killerName: string; victimName: string; weapon: string }
    | { type: 's_respawn'; id: string; x: number; y: number; z: number; hp: number }
    | { type: 's_mine_spawn'; mineId: string; ownerId: string; team: Team; x: number; y: number; z: number }
    | { type: 's_mine_explode'; mineId: string }
    | { type: 's_box_spawn'; boxId: string; boxType: DropType; x: number; y: number; z: number }
    | { type: 's_box_take'; boxId: string; takerId: string; boxType: DropType };