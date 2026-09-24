import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Combatant, WeaponManager } from './WeaponManager';
import { BattleHUD } from '../ui/BattleHUD';
import { AudioManager } from '../audio/AudioManager';

export type DropType = 'armor' | 'damage' | 'speed' | 'repair' | 'gold';

export interface DropZone {
    id: string;
    type: DropType;
    position: THREE.Vector3;
    groundY: number;
    decalMesh?: THREE.Mesh;
    activeBox?: DropBoxInstance;
}

export interface DropBoxInstance {
    id: string;
    type: DropType;
    root: THREE.Group;
    parachuteMesh?: THREE.Group;
    targetY: number;
    isLanding: boolean;
    isGrounded: boolean;
    lifeTimer: number;
    zone?: DropZone;
    decalMesh?: THREE.Mesh;
}

export interface DropZonesConfig {
    minDistanceBetweenZones: number;
    fallSpeed: number;
    boxScale: number;
    pickupRadiusXZ: number;
    pickupRadiusY: number;
    respawnTimes: Record<DropType, number>;
    sectors: Record<DropType, { x: number; z: number }[]>;
    goldSpots: { x: number; z: number }[];
}

export const DEFAULT_DROP_CONFIG: DropZonesConfig = {
    minDistanceBetweenZones: 6.0,
    fallSpeed: 3.4,
    boxScale: 1.15,
    pickupRadiusXZ: 2.2,
    pickupRadiusY: 2.0,
    respawnTimes: {
        repair: 35.0,
        armor: 40.0,
        damage: 40.0,
        speed: 30.0,
        gold: 300.0
    },
    // Координаты зон, строго соответствующие ARENA_GROUND_ZONES на сервере
    sectors: {
        'repair': [{ x: 0.0, z: 0.0 }],
        'armor': [{ x: -7.5, z: -6.0 }, { x: 7.5, z: 6.0 }],
        'damage': [{ x: 6.5, z: -6.0 }, { x: -6.5, z: 6.0 }],
        'speed': [{ x: -9.0, z: 0.0 }, { x: 9.0, z: 0.0 }],
        'gold': [{ x: 0.0, z: -4.5 }]
    },
    // Координаты точек сброса Голда (ARENA_GOLD_SPOTS на сервере)
    goldSpots: [
        { x: 0.0, z: -4.5 },
        { x: 0.0, z: 4.5 },
        { x: -5.5, z: -4.0 },
        { x: 5.5, z: 4.0 },
        { x: -8.0, z: -8.0 },
        { x: 8.0, z: 8.0 }
    ]
};

export class DropBoxManager {
    // Точная зафиксированная высота асфальта карты «Арена»
    public static readonly BASE_FLOOR_Y: number = 5.95;

    private scene: THREE.Scene;
    private world: RAPIER.World;
    private weaponManager: WeaponManager;
    private hud?: BattleHUD;
    private audio: AudioManager;

    private texLoader = new THREE.TextureLoader();
    private gltfLoader = new GLTFLoader();

    private textures: Map<string, THREE.Texture> = new Map();
    private boxPrototypes: Map<string, THREE.Group> = new Map();

    public activeBoxes: DropBoxInstance[] = [];
    public dropZones: DropZone[] = [];
    public config: DropZonesConfig;

    private mapMeshRef: THREE.Object3D | null = null;
    private mapOffset = new THREE.Vector3();

    // Сетевые колбэки для синхронизации
    public onBoxPickup?: (boxId: string, boxType: DropType) => void;
    public onGoldRequest?: (callerName?: string) => void;

    private readonly SOUNDS = {
        siren: encodeURI('/battle/boxes/goldbox_siren.mp3'),
        goldPickup: encodeURI('/battle/boxes/goldbox_pickup.mp3'),
        boxPickup: encodeURI('/battle/boxes/Взятие_дропа.mp3'),
        voiceRepair: encodeURI('/battle/boxes/Звук_Ремкомплект1_ТО.mp3'),
        voiceArmor: encodeURI('/battle/boxes/Звук_Повышенная_защита1_ТО.mp3'),
        voiceDamage: encodeURI('/battle/boxes/Звук_Повышенный_урон1_ТО.mp3'),
        voiceSpeed: encodeURI('/battle/boxes/Звук_Ускорение1_ТО.mp3')
    };

    constructor(scene: THREE.Scene, world: RAPIER.World, weaponManager: WeaponManager, hud?: BattleHUD) {
        this.scene = scene;
        this.world = world;
        this.weaponManager = weaponManager;
        this.hud = hud;
        this.audio = AudioManager.getInstance();

        this.config = this.loadConfig();
        this.preloadAssets();
    }

    private loadConfig(): DropZonesConfig {
        const saved = localStorage.getItem('retanki_drop_config');
        if (saved) {
            try {
                return { ...DEFAULT_DROP_CONFIG, ...JSON.parse(saved) };
            } catch { }
        }
        return JSON.parse(JSON.stringify(DEFAULT_DROP_CONFIG));
    }

    private getTexture(url: string, isForGLB: boolean = false): THREE.Texture {
        const key = `${url}_${isForGLB}`;
        let tex = this.textures.get(key);
        if (!tex) {
            tex = this.texLoader.load(encodeURI(url));
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = !isForGLB;
            this.textures.set(key, tex);
        }
        return tex;
    }

    private preloadAssets() {
        const textures = [
            '/battle/boxes/box_armr.jpg',
            '/battle/boxes/box_nos.jpg',
            '/battle/boxes/box_shot.jpg',
            '/battle/boxes/repair.jpg',
            '/battle/boxes/1000Kr.jpg',
            '/battle/boxes/parachute.png',
            '/battle/drop_zones/armor.webp',
            '/battle/drop_zones/damage.webp',
            '/battle/drop_zones/repair.webp',
            '/battle/drop_zones/Speed.webp',
            '/battle/drop_zones/gold.webp'
        ];
        for (const u of textures) this.getTexture(u, u.includes('.jpg'));

        this.audio.preload(Object.values(this.SOUNDS));

        this.loadBoxModel('standard', '/battle/boxes/box.glb');
        this.loadBoxModel('gold', '/battle/boxes/gold_box.glb');
    }

    private loadBoxModel(key: string, url: string): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, (gltf) => {
                const model = gltf.scene;

                model.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0.001) {
                    model.scale.setScalar(this.config.boxScale / maxDim);
                }

                model.updateMatrixWorld(true);
                box.setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.set(-center.x, -box.min.y, -center.z);

                const wrapper = new THREE.Group();
                wrapper.add(model);
                this.boxPrototypes.set(key, wrapper);
                resolve(wrapper);
            }, undefined, reject);
        });
    }

    /**
     * Поиск высоты пола: отсекает надземные мосты (Y > 7.0),
     * гарантируя возврат фактической высоты 5.95.
     */
    public findFloorHeight(x: number, z: number): number {
        if (this.mapMeshRef) {
            this.mapMeshRef.updateMatrixWorld(true);
            const ray = new THREE.Raycaster(
                new THREE.Vector3(x, 25.0, z),
                new THREE.Vector3(0, -1, 0),
                0.1,
                60.0
            );
            const hits = ray.intersectObject(this.mapMeshRef, true);

            for (const hit of hits) {
                if (!hit.face || !hit.point) continue;
                const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
                if (normal.y > 0.5 && hit.point.y >= 5.0 && hit.point.y <= 6.8) {
                    return hit.point.y;
                }
            }
        }

        if (this.world) {
            const ray = new RAPIER.Ray({ x, y: 20.0, z }, { x: 0, y: -1, z: 0 });
            const hit = this.world.castRayAndGetNormal(ray, 40.0, true);
            if (hit) {
                const toi = typeof (hit as any).timeOfImpact === 'number' ? (hit as any).timeOfImpact : (hit as any).toi;
                if (toi !== undefined && !isNaN(toi) && hit.normal && hit.normal.y > 0.5) {
                    const y = 20.0 - toi;
                    if (y >= 5.0 && y <= 6.8) return y;
                }
            }
        }

        return DropBoxManager.BASE_FLOOR_Y;
    }

    /**
     * Создает декали строго на фиксированных серверных позициях арены
     */
    public async setupBattleZones(
        mapId: string,
        mapOffset: THREE.Vector3,
        mapMesh: THREE.Object3D | null
    ): Promise<void> {
        this.mapMeshRef = mapMesh;
        this.mapOffset.copy(mapOffset);

        for (const z of this.dropZones) {
            if (z.decalMesh) this.scene.remove(z.decalMesh);
            if (z.activeBox) this.scene.remove(z.activeBox.root);
        }
        this.dropZones = [];
        this.activeBoxes = [];

        const regularTypes: DropType[] = ['repair', 'armor', 'damage', 'speed'];

        for (const type of regularTypes) {
            const list = this.config.sectors[type] || DEFAULT_DROP_CONFIG.sectors[type];

            list.forEach((spot, idx) => {
                const worldPos = new THREE.Vector3(spot.x, DropBoxManager.BASE_FLOOR_Y, spot.z);
                this.registerRegularZone(`zone_${type}_${idx}`, type, worldPos);
            });
        }
    }

    private registerRegularZone(id: string, type: DropType, pos: THREE.Vector3) {
        const decalGeo = new THREE.PlaneGeometry(3.0, 3.0);
        decalGeo.rotateX(-Math.PI / 2);

        const decalTexMap: Record<DropType, string> = {
            'armor': '/battle/drop_zones/armor.webp',
            'damage': '/battle/drop_zones/damage.webp',
            'speed': '/battle/drop_zones/Speed.webp',
            'repair': '/battle/drop_zones/repair.webp',
            'gold': '/battle/drop_zones/gold.webp'
        };

        const tex = this.getTexture(decalTexMap[type], false);
        const decalMat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -4.0,
            polygonOffsetUnits: -4.0
        });

        const decalMesh = new THREE.Mesh(decalGeo, decalMat);
        decalMesh.position.set(pos.x, pos.y + 0.03, pos.z);
        decalMesh.renderOrder = 5;
        this.scene.add(decalMesh);

        this.dropZones.push({
            id,
            type,
            position: pos.clone(),
            groundY: pos.y,
            decalMesh
        });
    }

    /**
     * Сетевой спавн обычного припаса (вызывается строго по пакету s_box_spawn с сервера)
     */
    public spawnNetworkBox(boxId: string, rawType: string, pos: THREE.Vector3) {
        if (this.activeBoxes.some(b => b.id === boxId)) return;

        let type: DropType = 'repair';
        if (rawType === 'health' || rawType === 'repair') type = 'repair';
        else if (rawType === 'armor') type = 'armor';
        else if (rawType === 'damage') type = 'damage';
        else if (rawType === 'speed' || rawType === 'nitro') type = 'speed';

        // Привязываем спавн строго к центру соответствующей декали
        const zone = this.dropZones.find(z =>
            z.type === type && Math.hypot(z.position.x - pos.x, z.position.z - pos.z) < 2.5
        );

        const targetX = zone ? zone.position.x : pos.x;
        const targetZ = zone ? zone.position.z : pos.z;
        const groundY = DropBoxManager.BASE_FLOOR_Y;

        let root: THREE.Group;
        const boxTexMap: Record<DropType, string> = {
            'armor': '/battle/boxes/box_armr.jpg',
            'damage': '/battle/boxes/box_shot.jpg',
            'speed': '/battle/boxes/box_nos.jpg',
            'repair': '/battle/boxes/repair.jpg',
            'gold': '/battle/boxes/1000Kr.jpg'
        };
        const tex = this.getTexture(boxTexMap[type], true);

        if (this.boxPrototypes.has('standard')) {
            root = this.boxPrototypes.get('standard')!.clone(true);
            root.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: tex,
                        roughness: 0.55,
                        metalness: 0.15,
                        side: THREE.FrontSide
                    });
                    child.material.needsUpdate = true;
                }
            });
        } else {
            const geo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
            geo.translate(0, 1.1 / 2, 0);
            const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 });
            root = new THREE.Group();
            root.add(new THREE.Mesh(geo, mat));
        }

        // Парашют
        const paraGroup = new THREE.Group();
        const domeGeo = new THREE.SphereGeometry(1.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshBasicMaterial({
            color: 0xf1f5f9,
            map: this.getTexture('/battle/boxes/parachute.png', false) || null,
            side: THREE.DoubleSide
        });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.y = 2.2;
        paraGroup.add(domeMesh);
        root.add(paraGroup);

        const spawnY = groundY + 20.0;
        root.position.set(targetX, spawnY, targetZ);
        this.scene.add(root);

        const instance: DropBoxInstance = {
            id: boxId,
            type,
            root,
            parachuteMesh: paraGroup,
            targetY: groundY + 0.04,
            isLanding: true,
            isGrounded: false,
            lifeTimer: 60.0,
            zone
        };

        if (zone) zone.activeBox = instance;
        this.activeBoxes.push(instance);
    }

    /**
     * Сетевой спавн Золотого ящика (вызывается строго по пакету s_gold_spawn с сервера)
     */
    public spawnNetworkGold(boxId: string, pos: THREE.Vector3, callerName?: string) {
        if (this.activeBoxes.some(b => b.id === boxId)) return;

        const groundY = DropBoxManager.BASE_FLOOR_Y;

        this.audio.play(this.SOUNDS.siren, { channel: 'gold_siren', volume: 1.0 });
        this.hud?.showGoldBoxAlert(5.0);

        if (callerName) {
            this.hud?.pushKillFeed(callerName, 'Золотой ящик', 'gold');
        }

        // Декаль золота на полу
        const decalGeo = new THREE.PlaneGeometry(3.2, 3.2);
        decalGeo.rotateX(-Math.PI / 2);
        const goldDecalTex = this.getTexture('/battle/drop_zones/gold.webp', false);
        const decalMat = new THREE.MeshBasicMaterial({
            map: goldDecalTex,
            transparent: true,
            opacity: 0.95,
            depthWrite: false,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -4.0,
            polygonOffsetUnits: -4.0
        });
        const decalMesh = new THREE.Mesh(decalGeo, decalMat);
        decalMesh.position.set(pos.x, groundY + 0.03, pos.z);
        decalMesh.renderOrder = 6;
        this.scene.add(decalMesh);

        let root: THREE.Group;
        const goldTex = this.getTexture('/battle/boxes/1000Kr.jpg', true);

        if (this.boxPrototypes.has('gold')) {
            root = this.boxPrototypes.get('gold')!.clone(true);
            root.traverse((child: any) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshStandardMaterial({
                        map: goldTex,
                        roughness: 0.45,
                        metalness: 0.20,
                        side: THREE.FrontSide
                    });
                    child.material.needsUpdate = true;
                }
            });
        } else {
            const geo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
            geo.translate(0, 1.15 / 2, 0);
            const mat = new THREE.MeshStandardMaterial({ map: goldTex, roughness: 0.45, metalness: 0.20 });
            root = new THREE.Group();
            root.add(new THREE.Mesh(geo, mat));
        }

        // Золотой парашют
        const paraGroup = new THREE.Group();
        const domeGeo = new THREE.SphereGeometry(1.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshBasicMaterial({
            color: 0xffdd00,
            map: this.getTexture('/battle/boxes/parachute.png', false) || null,
            side: THREE.DoubleSide
        });
        const domeMesh = new THREE.Mesh(domeGeo, domeMat);
        domeMesh.position.y = 2.4;
        paraGroup.add(domeMesh);
        root.add(paraGroup);

        const spawnY = groundY + 22.0;
        root.position.set(pos.x, spawnY, pos.z);
        this.scene.add(root);

        const instance: DropBoxInstance = {
            id: boxId,
            type: 'gold',
            root,
            parachuteMesh: paraGroup,
            targetY: groundY + 0.04,
            isLanding: true,
            isGrounded: false,
            lifeTimer: 90.0,
            decalMesh
        };

        this.activeBoxes.push(instance);
    }

    /**
     * Обработка клавиши G: шлёт запрос на сервер без локального самовольного спавна
     */
    public triggerGoldDrop(source: 'supply' | 'random' | 'network' = 'random', callerName?: string, customSpot?: { x: number; z: number }): boolean {
        if (source === 'supply' && this.onGoldRequest) {
            this.onGoldRequest(callerName);
            return true;
        }

        if (source === 'network' && customSpot) {
            this.spawnNetworkGold(`gold_${Date.now()}`, new THREE.Vector3(customSpot.x, DropBoxManager.BASE_FLOOR_Y, customSpot.z), callerName);
            return true;
        }

        return false;
    }

    public removeBoxById(boxId: string) {
        const index = this.activeBoxes.findIndex(b => b.id === boxId);
        if (index !== -1) {
            const box = this.activeBoxes[index];
            this.removeDropBox(box, index);
        }
    }

    /**
     * Цикл обновления: только анимация парашюта и подбор локальным танком
     */
    public update(dt: number, combatants: Combatant[]) {
        const now = performance.now() * 0.001;

        for (let i = this.activeBoxes.length - 1; i >= 0; i--) {
            const b = this.activeBoxes[i];

            if (b.isLanding) {
                b.root.position.y -= this.config.fallSpeed * dt;
                b.root.rotation.y += dt * 0.4;

                if (b.parachuteMesh) {
                    b.parachuteMesh.rotation.z = Math.sin(now * 3.0) * 0.08;
                }

                if (b.root.position.y <= b.targetY) {
                    b.root.position.y = b.targetY;
                    b.isLanding = false;
                    b.isGrounded = true;
                    b.root.rotation.set(0, b.root.rotation.y, 0);

                    if (b.parachuteMesh) {
                        b.root.remove(b.parachuteMesh);
                        b.parachuteMesh = undefined;
                    }
                }
            } else {
                b.lifeTimer -= dt;
                if (b.lifeTimer <= 5.0) {
                    b.root.visible = (Math.floor(now * 8) % 2 === 0);
                }
                if (b.lifeTimer <= 0) {
                    this.removeDropBox(b, i);
                    continue;
                }
            }

            const boxPos = b.root.position;

            // Проверка подбора танком
            for (const c of combatants) {
                if (c.isDead) continue;
                const tankPos = c.controller.getPosition();

                const distXZ = Math.hypot(tankPos.x - boxPos.x, tankPos.z - boxPos.z);
                const distY = Math.abs(tankPos.y - (boxPos.y + 0.5));

                if (distXZ <= this.config.pickupRadiusXZ && distY <= this.config.pickupRadiusY) {
                    this.consumeBox(c, b);

                    // Оповещаем сервер о взятии ящика для удаления у всех клиентов
                    if (this.onBoxPickup) {
                        this.onBoxPickup(b.id, b.type);
                    }

                    this.removeDropBox(b, i);
                    break;
                }
            }
        }
    }

    private consumeBox(tank: Combatant, box: DropBoxInstance) {
        if (box.type === 'gold') {
            this.audio.play(this.SOUNDS.goldPickup, { channel: 'gold_pickup', volume: 1.0 });
            tank.currentHealth = tank.maxHealth;
            this.hud?.pushKillFeed(tank.name, 'Золотой ящик', 'gold');
        } else {
            this.audio.play(this.SOUNDS.boxPickup, { channel: 'box_pickup', volume: 0.9 });

            const typeToSlot: Record<DropType, number> = {
                'repair': 1,
                'armor': 2,
                'damage': 3,
                'speed': 4,
                'gold': 0
            };

            const slot = typeToSlot[box.type];
            if (slot > 0) {
                this.weaponManager.activateSupply(tank, slot);
            }

            const voiceMap: Partial<Record<DropType, string>> = {
                'repair': this.SOUNDS.voiceRepair,
                'armor': this.SOUNDS.voiceArmor,
                'damage': this.SOUNDS.voiceDamage,
                'speed': this.SOUNDS.voiceSpeed
            };

            const voiceSound = voiceMap[box.type];
            if (voiceSound) {
                this.audio.play(voiceSound, { channel: 'announcer_voice', volume: 0.95 });
            }
        }
    }

    private removeDropBox(box: DropBoxInstance, index: number) {
        this.scene.remove(box.root);

        if (box.decalMesh) {
            this.scene.remove(box.decalMesh);
            box.decalMesh.geometry.dispose();
            if (box.decalMesh.material instanceof THREE.Material) {
                box.decalMesh.material.dispose();
            }
        }

        if (box.zone) {
            box.zone.activeBox = undefined;
        }

        this.activeBoxes.splice(index, 1);
    }
}