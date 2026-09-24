import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { RemoteTank } from '../physics/RemoteTank';
import { AssetLoader } from '../graphics/AssetLoader';
import { VFXManager } from '../graphics/VFXManager';
import { AudioManager } from '../audio/AudioManager';
import type { WeaponManager, Combatant } from '../combat/WeaponManager';
import type { BattleHUD } from '../ui/BattleHUD';
import type {
    ClientBattleMessage,
    ServerBattleMessage,
    TankNetworkState
} from '../../../shared/types';

export class NetworkManager {

    public ws: WebSocket | null = null;
    public myPlayerId: string | null = null;
    public isConnected: boolean = false;

    private scene: THREE.Scene;
    private world: RAPIER.World;
    private assets: AssetLoader;
    private weaponManager?: WeaponManager;
    private hud?: BattleHUD;

    public remoteTanks: Map<string, RemoteTank> = new Map();
    private inputSeq: number = 0;

    private selectedHull: string;
    private selectedTurret: string;
    private selectedPaint: string;
    private selectedHullMod: string;
    private selectedTurretMod: string;
    private spawnPos?: THREE.Vector3;

    public onLocalDamage?: (damage: number, currentHp: number) => void;
    public onLocalDeath?: (killerName: string, weapon: string) => void;
    public onLocalRespawn?: (x: number, y: number, z: number) => void;

    private localHSpec?: any;
    private localTSpec?: any;

    public setLocalHitboxSpecs(hSpec: any, tSpec: any) {
        this.localHSpec = {
            halfWidth: hSpec.halfWidth,
            halfHeight: hSpec.halfHeight,
            halfLength: hSpec.halfLength,
            colliderOffsetY: hSpec.colliderOffsetY,
            mountY: hSpec.mountY,
            mountZ: hSpec.mountZ
        };
        this.localTSpec = {
            boxWidth: tSpec.boxWidth,
            boxHeight: tSpec.boxHeight,
            boxLength: tSpec.boxLength,
            boxOffsetY: tSpec.boxOffsetY,
            boxOffsetZ: tSpec.boxOffsetZ
        };
    }

    constructor(
        scene: THREE.Scene,
        world: RAPIER.World,
        assets: AssetLoader,
        hull: string = 'viking',
        turret: string = 'smoky',
        paint: string = 'green',
        hullMod: string = 'm0',
        turretMod: string = 'm0',
        weaponManager?: WeaponManager,
        spawnPos?: THREE.Vector3,
        hud?: BattleHUD
    ) {
        this.scene = scene;
        this.world = world;
        this.assets = assets;
        this.selectedHull = hull;
        this.selectedTurret = turret;
        this.selectedPaint = paint;
        this.selectedHullMod = hullMod;
        this.selectedTurretMod = turretMod;
        this.weaponManager = weaponManager;
        this.spawnPos = spawnPos;
        this.hud = hud;
    }

    public connect(url: string = 'ws://localhost:8080') {
        console.log(`[NetworkManager] Подключение к сокет-серверу: ${url}...`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.isConnected = true;
            this.ws?.send(JSON.stringify({
                type: 'c_ready',
                hull: this.selectedHull,
                turret: this.selectedTurret,
                paint: this.selectedPaint,
                hullMod: this.selectedHullMod,
                turretMod: this.selectedTurretMod,
                spawnPos: this.spawnPos ? { x: this.spawnPos.x, y: this.spawnPos.y, z: this.spawnPos.z } : undefined,
                hSpec: this.localHSpec,
                tSpec: this.localTSpec
            }));
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleServerMessage(message);
            } catch (e) {
                console.error('[NetworkManager] Ошибка парсинга входящего пакета:', e);
            }
        };

        this.ws.onclose = () => {
            this.isConnected = false;
            console.warn('[NetworkManager] Соединение разорвано. Очистка удалённых танков...');
            this.clearAllRemoteTanks();
        };
    }

    private handleServerMessage(msg: any) {
        switch (msg.type) {
            case 's_battle_init':
                this.myPlayerId = msg.yourId;
                console.log(`[NetworkManager] Инициализация боя. Мой ID: ${this.myPlayerId}. Танков в сети: ${msg.tanks?.length}`);
                for (const tankState of msg.tanks) {
                    if (tankState.id !== this.myPlayerId) {
                        this.spawnRemoteTank(tankState);
                    }
                }
                break;

            case 's_player_joined':
                if (msg.tank.id !== this.myPlayerId && !this.remoteTanks.has(msg.tank.id)) {
                    console.log(`[NetworkManager] Новый игрок зашёл в битву: ${msg.tank.username} (${msg.tank.id})`);
                    this.spawnRemoteTank(msg.tank);
                }
                break;

            case 's_player_left':
                console.log(`[NetworkManager] Игрок вышел из боя: ID ${msg.id}`);
                this.removeRemoteTank(msg.id);
                break;

            // Обработка смены модификаций и переодевания соперника на лету
            case 's_equip_change': {
                const existingTank = this.remoteTanks.get(msg.id);
                if (existingTank) {
                    const pos = existingTank.visualRoot.position;
                    const quat = existingTank.visualRoot.quaternion;

                    // Создаем временный слепок состояния для пересоздания танка
                    const newState: any = {
                        id: existingTank.id,
                        username: existingTank.username,
                        rank: existingTank.rank,
                        hull: msg.hull,
                        turret: msg.turret,
                        paint: msg.paint,
                        hullMod: msg.hullMod,
                        turretMod: msg.turretMod,
                        hp: existingTank.currentHealth,
                        maxHp: existingTank.maxHealth, // maxHp потом обновится внутри WeaponManager
                        x: pos.x,
                        y: pos.y,
                        z: pos.z,
                        rx: quat.x,
                        ry: quat.y,
                        rz: quat.z,
                        rw: quat.w,
                        turretYaw: existingTank.turretMount ? existingTank.turretMount.rotation.y : 0,
                        team: existingTank.team
                    };

                    this.removeRemoteTank(msg.id);
                    this.spawnRemoteTank(newState);
                }
                break;
            }

            case 's_world_snapshot':
                for (const state of msg.tanks) {
                    if (state.id !== this.myPlayerId) {
                        const remote = this.remoteTanks.get(state.id);
                        if (remote) {
                            remote.applyServerState(state);
                        } else {
                            this.spawnRemoteTank(state);
                        }
                    }
                }
                break;

            case 's_shot_fired':
                this.renderRemoteShot(msg.shooterId, msg.weapon, msg.origin, msg.direction, msg.hitPoint);
                break;

            // Обработка старта/стопа потокового оружия (Огнемёт, Фриз, Изида)
            case 's_stream_state':
                if (msg.shooterId !== this.myPlayerId && this.weaponManager) {
                    if (typeof (this.weaponManager as any).setRemoteStreamState === 'function') {
                        (this.weaponManager as any).setRemoteStreamState(msg.shooterId, msg.weapon, msg.isFiring);
                    }
                }
                break;

            case 's_damage':
                if (msg.victimId === this.myPlayerId) {
                    if (this.onLocalDamage) {
                        this.onLocalDamage(msg.damage, msg.currentHp);
                    }
                } else {
                    const remote = this.remoteTanks.get(msg.victimId);
                    if (remote) {
                        remote.currentHealth = msg.currentHp;
                        remote.combatantData.currentHealth = msg.currentHp;
                        if (this.weaponManager && msg.hitPoint) {
                            this.weaponManager.spawnDamageIndicator(new THREE.Vector3(...msg.hitPoint), msg.damage, false);
                        }
                    }
                }
                break;

            case 's_kill':
                this.hud?.pushKillFeed(msg.killerName, msg.victimName, msg.weapon);
                AudioManager.getInstance().play('/battle/death/explosion-tnk.mp3', { volume: 0.95 });

                if (msg.victimId === this.myPlayerId) {
                    if (this.onLocalDeath) {
                        this.onLocalDeath(msg.killerName, msg.weapon);
                    }
                } else {
                    const remote = this.remoteTanks.get(msg.victimId);
                    if (remote) {
                        remote.triggerDeathVisual();
                        VFXManager.getInstance().playSequence({
                            stripUrl: '/battle/death/explosion.png',
                            position: remote.visualRoot.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                            duration: 0.65,
                            scaleStart: 2.5,
                            scaleEnd: 7.0,
                            rotation: Math.random() * Math.PI * 2,
                            easing: 'easeOutCubic',
                            fadeOutRatio: 0.6
                        });
                    }
                }
                break;

            case 's_respawn':
                if (msg.id === this.myPlayerId) {
                    if (this.onLocalRespawn) {
                        this.onLocalRespawn(msg.x, msg.y, msg.z);
                    }
                } else {
                    const remote = this.remoteTanks.get(msg.id);
                    if (remote) {
                        remote.triggerRespawnVisual(msg.x, msg.y, msg.z);
                    }
                }
                break;

            // ==========================================
            // МИНЫ
            // ==========================================
            case 's_mine_spawn':
                if (this.weaponManager && msg.ownerId !== this.myPlayerId) {
                    this.weaponManager.spawnVisualMine(
                        msg.mineId,
                        msg.ownerId,
                        msg.team,
                        new THREE.Vector3(msg.x, msg.y, msg.z)
                    );
                }
                break;

            case 's_mine_explode':
                if (this.weaponManager) {
                    const mineIdx = this.weaponManager.landmines.findIndex((m: any) => m.id === msg.mineId);
                    if (mineIdx !== -1) {
                        const m = this.weaponManager.landmines[mineIdx];
                        this.scene.remove(m.mesh);
                        this.weaponManager.landmines.splice(mineIdx, 1);
                    }
                }
                break;

            // ==========================================
            // ДРОПЫ И ГОЛД (СЕРВЕРНАЯ СИНХРОНИЗАЦИЯ)
            // ==========================================
            case 's_drop_spawn':
            case 's_box_spawn':
                if (this.weaponManager?.dropBoxManager) {
                    this.weaponManager.dropBoxManager.spawnNetworkBox(
                        msg.boxId,
                        msg.boxType,
                        new THREE.Vector3(msg.x, msg.y, msg.z)
                    );
                }
                break;

            case 's_gold_spawn':
            case 's_gold_drop':
                if (this.weaponManager?.dropBoxManager) {
                    this.weaponManager.dropBoxManager.spawnNetworkGold(
                        msg.boxId,
                        new THREE.Vector3(msg.x, msg.y, msg.z),
                        msg.callerName
                    );
                }
                break;

            case 's_box_take':
                if (this.weaponManager?.dropBoxManager) {
                    this.weaponManager.dropBoxManager.removeBoxById(msg.boxId);
                }
                break;
        }
    }

    private renderRemoteShot(
        shooterId: string,
        weapon: string,
        origin: [number, number, number],
        dir: [number, number, number],
        hitPoint?: [number, number, number]
    ) {
        const remote = this.remoteTanks.get(shooterId);
        let start = new THREE.Vector3(...origin);

        if (remote) {
            const mountPos = new THREE.Vector3();
            if (remote.turretMount) {
                remote.turretMount.getWorldPosition(mountPos);
                if (start.distanceTo(mountPos) > 4.0) {
                    start.copy(mountPos).add(new THREE.Vector3(0, 0.4, 0));
                }
            }
        }

        const direction = new THREE.Vector3(...dir).normalize();
        const end = hitPoint
            ? new THREE.Vector3(...hitPoint)
            : start.clone().addScaledVector(direction, 70.0);

        const audio = AudioManager.getInstance();
        const vfx = VFXManager.getInstance();

        // Звук и дульная вспышка
        switch (weapon.toLowerCase()) {
            case 'smoky':
                audio.play('/models/turrets/smoky/smoky_shot.mp3', { volume: 0.85 });
                if (vfx.spawnMuzzleFlash) {
                    vfx.spawnMuzzleFlash(start, '/models/turrets/smoky/m0/shot.png', 2.0);
                }
                this.spawnLineTracer(start, end, 0xffea00, 3, 140);
                if (hitPoint && typeof vfx.spawnHitSparks === 'function') {
                    vfx.spawnHitSparks(end, 0xffea00);
                }
                break;

            case 'railgun':
                audio.play('/models/turrets/railgun/railgun.mp3', { volume: 0.85 });
                this.spawnLineTracer(start, end, 0x60a5fa, 5, 250);
                if (hitPoint && typeof vfx.spawnHitSparks === 'function') {
                    vfx.spawnHitSparks(end, 0x60a5fa);
                }
                break;

            case 'thunder':
                audio.play('/models/turrets/thunder/thunder_shot.mp3', { volume: 0.85 });
                if (vfx.spawnThunderExplosion) {
                    vfx.spawnThunderExplosion(end);
                } else if (hitPoint && typeof vfx.spawnHitSparks === 'function') {
                    vfx.spawnHitSparks(end, 0xff8800);
                }
                this.spawnLineTracer(start, end, 0xf59e0b, 4, 150);
                break;

            case 'twins':
                audio.play('/models/turrets/twins/plazma_shot.mp3', { volume: 0.8 });
                if (vfx.spawnTwinsMuzzleFlash) vfx.spawnTwinsMuzzleFlash(start);
                if (this.weaponManager?.fireRemotePlasmaVisual) {
                    this.weaponManager.fireRemotePlasmaVisual('twins', start, direction);
                }
                break;

            case 'ricochet':
                audio.play('/models/turrets/ricochet/ricochet_shot.mp3', { volume: 0.8 });
                if (vfx.spawnMuzzleFlash) {
                    vfx.spawnMuzzleFlash(start, '/models/turrets/ricochet/m0/ricochet_shot_flash.png', 2.0);
                }
                if (this.weaponManager?.fireRemotePlasmaVisual) {
                    this.weaponManager.fireRemotePlasmaVisual('ricochet', start, direction);
                }
                break;

            case 'shaft':
                audio.play('/models/turrets/shaft/shot.wav', { volume: 0.95 });
                if (vfx.spawnMuzzleFlash) {
                    vfx.spawnMuzzleFlash(start, '/models/turrets/shaft/m0/shaft_shot.png', 2.5);
                }
                if (vfx.spawnShaftExplosion) {
                    vfx.spawnShaftExplosion(end);
                }
                this.spawnLineTracer(start, end, 0xf97316, 4, 180);
                break;
        }
    }

    private spawnLineTracer(start: THREE.Vector3, end: THREE.Vector3, color: number, width: number, lifeTimeMs: number) {
        const dir = new THREE.Vector3().subVectors(end, start);
        const len = dir.length();

        const geom = new THREE.CylinderGeometry(0.04, 0.04, len, 6);
        geom.rotateX(Math.PI / 2);

        const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(start).addScaledVector(dir, 0.5);
        mesh.lookAt(end);

        this.scene.add(mesh);

        setTimeout(() => {
            this.scene.remove(mesh);
            geom.dispose();
            mat.dispose();
        }, lifeTimeMs);
    }

    private spawnRemoteTank(state: TankNetworkState) {
        const remote = new RemoteTank(this.scene, this.world, this.assets, state);
        this.remoteTanks.set(state.id, remote);

        if (this.weaponManager) {
            this.weaponManager.registerCombatant(remote.combatantData);
            if (remote.collider) {
                this.weaponManager.combatantsByCollider.set(remote.collider.handle, remote.combatantData);
            }
            if (remote.turretCollider) {
                this.weaponManager.combatantsByCollider.set(remote.turretCollider.handle, remote.combatantData);
            }
        }
    }

    private removeRemoteTank(id: string) {
        const tank = this.remoteTanks.get(id);
        if (tank) {
            if (this.weaponManager) {
                if (tank.collider) this.weaponManager.combatantsByCollider.delete(tank.collider.handle);
                if (tank.turretCollider) this.weaponManager.combatantsByCollider.delete(tank.turretCollider.handle);
                this.weaponManager.allCombatants = this.weaponManager.allCombatants.filter(c => c.id !== id);
            }
            this.hud?.removeOverheadPlate(id);
            tank.destroy();
            this.remoteTanks.delete(id);
        }
    }

    private clearAllRemoteTanks() {
        this.remoteTanks.forEach((_, id) => this.hud?.removeOverheadPlate(id));
        this.remoteTanks.forEach(tank => tank.destroy());
        this.remoteTanks.clear();
    }

    public sendState(
        pos: THREE.Vector3,
        rot: THREE.Quaternion,
        vel: THREE.Vector3,
        turretYaw: number,
        drive: number,
        turn: number,
        fire: boolean
    ) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg: ClientBattleMessage = {
            type: 'c_state',
            state: {
                seq: ++this.inputSeq,
                x: Number(pos.x.toFixed(3)),
                y: Number(pos.y.toFixed(3)),
                z: Number(pos.z.toFixed(3)),
                rx: Number(rot.x.toFixed(4)),
                ry: Number(rot.y.toFixed(4)),
                rz: Number(rot.z.toFixed(4)),
                rw: Number(rot.w.toFixed(4)),
                vx: Number(vel.x.toFixed(2)),
                vy: Number(vel.y.toFixed(2)),
                vz: Number(vel.z.toFixed(2)),
                turretYaw: Number(turretYaw.toFixed(4)),
                drive,
                turn,
                fire
            }
        };

        this.ws.send(JSON.stringify(msg));
    }

    public sendShot(
        weapon: string,
        origin: THREE.Vector3,
        direction: THREE.Vector3,
        hitPoint?: THREE.Vector3,
        victimId?: string,
        damage?: number
    ) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg: ClientBattleMessage = {
            type: 'c_shot',
            weapon,
            origin: [origin.x, origin.y, origin.z],
            direction: [direction.x, direction.y, direction.z],
            hitPoint: hitPoint ? [hitPoint.x, hitPoint.y, hitPoint.z] : undefined,
            victimId,
            damage
        };

        this.ws.send(JSON.stringify(msg));
    }

    /**
     * Отправка состояния потокового оружия (зажат или отпущен пробел для Огнемёта/Фриза/Изиды)
     */
    public sendStreamState(weapon: string, isFiring: boolean) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'c_stream_state',
            weapon: weapon,
            isFiring: isFiring
        }));
    }

    /**
     * Прямая отправка смены вооружения на сервер
     */
    public sendEquipChange(hull: string, turret: string, paint: string, hullMod: string, turretMod: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify({
            type: 'c_equip_change',
            hull: hull,
            turret: turret,
            paint: paint,
            hullMod: hullMod,
            turretMod: turretMod
        }));
    }

    public sendMinePlace(id: string, x: number, y: number, z: number) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        console.log(`[NetDebug] [КЛИЕНТ -> СЕРВЕР] Установка мины: ID=${id}, pos=(${x}, ${y}, ${z})`);
        this.ws.send(JSON.stringify({ type: 'c_mine_place', id, x, y, z }));
    }

    public sendBoxTake(boxId: string, boxType?: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        console.log(`[NetDebug] [КЛИЕНТ -> СЕРВЕР] Взят ящик: boxId=${boxId}, boxType=${boxType}`);
        this.ws.send(JSON.stringify({ type: 'c_box_take', boxId, boxType }));
    }

    public sendGoldRequest(callerName?: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        console.log(`[NetDebug] [КЛИЕНТ -> СЕРВЕР] Запрос сброса ГОЛДА игроком: ${callerName}`);
        this.ws.send(JSON.stringify({ type: 'c_gold_request', callerName }));
    }

    public update(dt: number) {
        this.remoteTanks.forEach(tank => tank.update(dt));
    }
}