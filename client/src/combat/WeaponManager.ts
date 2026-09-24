import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { TankPhysicsController } from '../physics/TankPhysicsController';
import { BattleHUD } from '../ui/BattleHUD';
import { AudioManager } from '../audio/AudioManager';
import { VFXManager } from '../graphics/VFXManager';
import { SpriteSheetCutter } from '../graphics/SpriteSheetCutter';

export const MOD_MULTIPLIERS: Record<string, number> = {
    'm0': 1.0,
    'm1': 1.15,
    'm2': 1.35,
    'm3': 1.60
};

export interface Combatant {
    id: string;
    name: string;
    controller: TankPhysicsController | any;
    currentHealth: number;
    maxHealth: number;
    isDead: boolean;
    team: 'blue' | 'red' | 'neutral';
    freezeRatio: number;
    freezeTimer?: number;
    burnTimer?: number;
    burnIntensity?: number;
    twinsBarrelToggle?: number;
    energy: number;
    repairTimer?: number;
    armorBuffTimer?: number;
    damageBuffTimer?: number;
    speedBuffTimer?: number;

    hullMod?: string;
    turretMod?: string;
    damageMultiplier?: number;
    reloadMultiplier?: number;

    isStreamFiring?: boolean;
    streamWeapon?: string;
    streamVisual?: THREE.Group | THREE.Mesh;
    lastStreamEmitTime?: number;
}

export interface Landmine {
    mesh: THREE.Group;
    position: THREE.Vector3;
    ownerId: string;
    team: 'blue' | 'red' | 'neutral';
    isArmed: boolean;
    armTimer: number;
    active: boolean;
    ledMaterial: THREE.MeshBasicMaterial;
}

export interface WeaponSpec {
    reloadTime: number;
    chargeTime: number;
    minDamage: number;
    maxDamage: number;
    critChance: number;
    critMultiplier: number;
    recoilForce: number;
    impactForce: number;
    piercing: boolean;
    autoAimVerticalAngle: number;
    autoAimHorizontalAngle: number;
    range?: number;
    splashRadius?: number;
}

export const WEAPON_CONFIGS: Record<string, WeaponSpec> = {
    'shaft': { reloadTime: 2.2, chargeTime: 2.8, minDamage: 280, maxDamage: 1300, critChance: 0.0, critMultiplier: 1.0, recoilForce: 16000, impactForce: 13000, piercing: false, autoAimVerticalAngle: 12.0, autoAimHorizontalAngle: 6.0, range: 260.0 },
    'railgun': { reloadTime: 4.6, chargeTime: 1.1, minDamage: 560, maxDamage: 740, critChance: 0.0, critMultiplier: 1.0, recoilForce: 14500, impactForce: 10500, piercing: true, autoAimVerticalAngle: 9.0, autoAimHorizontalAngle: 2.5 },
    'thunder': { reloadTime: 2.5, chargeTime: 0.0, minDamage: 380, maxDamage: 470, critChance: 0.0, critMultiplier: 1.0, recoilForce: 6800, impactForce: 6200, piercing: false, autoAimVerticalAngle: 11.0, autoAimHorizontalAngle: 3.5, splashRadius: 8.5 },
    'smoky': { reloadTime: 1.35, chargeTime: 0.0, minDamage: 130, maxDamage: 170, critChance: 0.25, critMultiplier: 2.8, recoilForce: 2800, impactForce: 3500, piercing: false, autoAimVerticalAngle: 14.0, autoAimHorizontalAngle: 4.5 },
    'twins': { reloadTime: 0.26, chargeTime: 0.0, minDamage: 80, maxDamage: 105, critChance: 0.0, critMultiplier: 1.0, recoilForce: 950, impactForce: 1200, piercing: false, autoAimVerticalAngle: 14.0, autoAimHorizontalAngle: 6.5, range: 55.0 },
    'isida': { reloadTime: 0.1, chargeTime: 0.0, minDamage: 20, maxDamage: 26, critChance: 0.0, critMultiplier: 1.0, recoilForce: 0, impactForce: 150, piercing: false, autoAimVerticalAngle: 28.0, autoAimHorizontalAngle: 35.0, range: 17.5 },
    'firebird': { reloadTime: 0.08, chargeTime: 0.0, minDamage: 32, maxDamage: 44, critChance: 0.0, critMultiplier: 1.0, recoilForce: 250, impactForce: 400, piercing: true, autoAimVerticalAngle: 15.0, autoAimHorizontalAngle: 8.0, range: 20.0 },
    'freeze': { reloadTime: 0.08, chargeTime: 0.0, minDamage: 14, maxDamage: 20, critChance: 0.0, critMultiplier: 1.0, recoilForce: 250, impactForce: 350, piercing: true, autoAimVerticalAngle: 15.0, autoAimHorizontalAngle: 8.0, range: 19.0 },
    'ricochet': { reloadTime: 0.55, chargeTime: 0.0, minDamage: 140, maxDamage: 180, critChance: 0.0, critMultiplier: 1.0, recoilForce: 2200, impactForce: 3200, piercing: false, autoAimVerticalAngle: 12.0, autoAimHorizontalAngle: 5.0, range: 75.0 }
};

interface StreamSpriteParticle {
    sprite: THREE.Sprite;
    frames: THREE.Texture[];
    active: boolean;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleStart: number;
    scaleEnd: number;
    baseOpacity: number;
    rotSpeed: number;
}

interface ProjectileSlot {
    sprite: THREE.Sprite;
    material?: THREE.SpriteMaterial;
    frames: THREE.Texture[];
    active: boolean;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    shooter?: Combatant | null;
    weapon: 'ricochet' | 'twins';
    bouncesLeft: number;
    traveled: number;
    maxDistance: number;
    animTime: number;
}

export class WeaponManager {
    private scene: THREE.Scene;
    private world: RAPIER.World;
    private camera: THREE.Camera;
    private hud?: BattleHUD;
    private audio: AudioManager;
    private vfx: VFXManager;
    private cutter: SpriteSheetCutter;

    public combatantsByCollider: Map<number, Combatant> = new Map();
    public allCombatants: Combatant[] = [];
    public dropBoxManager?: any;

    private reloadTimer: number = 1.0;
    private chargeTimer: number = 0.0;
    private isCharging: boolean = false;

    // Шафт
    private shaftAiming: boolean = false;
    private shaftChargeTime: number = 0.0;
    private readonly shaftMaxChargeTime: number = 2.8;
    private spaceHeldDuration: number = 0.0;
    private wasSpacePressed: boolean = false;
    private shaftSniperShotCooldown: number = 2.2;
    public shaftPitch: number = 0.0;
    private shaftLaserLine!: THREE.Line;
    private shaftLaserDot!: THREE.Sprite;

    private textures: Map<string, THREE.Texture> = new Map();
    private muzzleOffsetsCache: Map<string, THREE.Vector3> = new Map();

    // Струйные пулы (Огнемёт и Фриз)
    private fireballPool: StreamSpriteParticle[] = [];
    private freezeBreezePool: StreamSpriteParticle[] = [];
    private freezeFlakePool: StreamSpriteParticle[] = [];
    private streamDamageAccumulator: Map<string, number> = new Map();

    private projectilePool: ProjectileSlot[] = [];
    public landmines: Landmine[] = [];

    // Изида
    private isidaRoot = new THREE.Group();
    private isidaMuzzleSprite!: THREE.Sprite;
    private isidaContactSprite!: THREE.Sprite;
    private isidaBeamMesh1!: THREE.Mesh;
    private isidaBeamMesh2!: THREE.Mesh;
    private isidaAnimTimer: number = 0;
    private isidaDamageStartFrames: THREE.Texture[] = [];
    private isidaDamageEndFrames: THREE.Texture[] = [];
    private isidaHealStartFrames: THREE.Texture[] = [];
    private isidaHealEndFrames: THREE.Texture[] = [];
    private isidaIdleSparkFrames: THREE.Texture[] = [];
    private isidaDamageShaftTex!: THREE.Texture;
    private isidaHealShaftTex!: THREE.Texture;
    private isidaReady: boolean = false;

    // Рельса
    private railChargeGroup = new THREE.Group();
    private railChargePart1!: THREE.Sprite;
    private railChargePart2!: THREE.Sprite;
    private railChargePart3!: THREE.Sprite;

    public onRespawn?: (victim: Combatant) => void;
    public onFireShot?: (weapon: string, origin: THREE.Vector3, direction: THREE.Vector3, hitPoint?: THREE.Vector3, victim?: Combatant, damage?: number) => void;
    public onPlaceMine?: (id: string, x: number, y: number, z: number) => void;

    constructor(scene: THREE.Scene, world: RAPIER.World, camera: THREE.Camera, hud?: BattleHUD) {
        this.scene = scene;
        this.world = world;
        this.camera = camera;
        this.hud = hud;
        this.audio = AudioManager.getInstance();
        this.cutter = SpriteSheetCutter.getInstance();
        this.vfx = VFXManager.getInstance();
        this.vfx.init(this.scene);

        this.scene.add(this.railChargeGroup);
        this.railChargeGroup.visible = false;

        this.initShaftLaser();
        this.preloadAssets();
        this.initStreamVisuals();
        this.initIsidaVisuals();
        this.initRailgunVisuals();
    }

    private initShaftLaser() {
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff1122, linewidth: 3, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        this.shaftLaserLine = new THREE.Line(lineGeo, lineMat);
        this.shaftLaserLine.visible = false;
        this.scene.add(this.shaftLaserLine);

        const dotCanvas = document.createElement('canvas');
        dotCanvas.width = 32; dotCanvas.height = 32;
        const ctx = dotCanvas.getContext('2d');
        if (ctx) {
            const rad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
            rad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            rad.addColorStop(0.35, 'rgba(255, 20, 20, 0.95)');
            rad.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = rad;
            ctx.fillRect(0, 0, 32, 32);
        }
        const dotTex = new THREE.CanvasTexture(dotCanvas);
        const dotMat = new THREE.SpriteMaterial({ map: dotTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
        this.shaftLaserDot = new THREE.Sprite(dotMat);
        this.shaftLaserDot.scale.set(0.65, 0.65, 1.0);
        this.shaftLaserDot.visible = false;
        this.scene.add(this.shaftLaserDot);
    }

    private preloadAssets() {
        const texturesList = [
            '/battle/death/dead.jpg',
            '/models/turrets/railgun/m0/charge_part1.png',
            '/models/turrets/railgun/m0/charge_part2.png',
            '/models/turrets/railgun/m0/charge_part3.png',
            '/models/turrets/railgun/m0/railgun.png',
            '/models/turrets/railgun/railgun.png',
            '/models/turrets/shaft/m0/shaft_shot.png',
            '/models/turrets/shaft/m0/shaft_trail.png'
        ];

        const loader = new THREE.TextureLoader();
        for (const url of texturesList) {
            loader.load(url, (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                this.textures.set(url, tex);
            });
        }
    }

    private getTexture(paths: string[]): THREE.Texture | null {
        for (const p of paths) {
            const t = this.textures.get(p);
            if (t) return t;
        }
        return null;
    }

    private async initStreamVisuals() {
        const fireballFrames = await this.cutter.slice('/models/turrets/firebird/m0/fireball.png', 10);
        for (let i = 0; i < 48; i++) {
            const mat = new THREE.SpriteMaterial({ map: fireballFrames[0], blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.scene.add(sprite);
            this.fireballPool.push({
                sprite, frames: fireballFrames, active: false, velocity: new THREE.Vector3(),
                life: 0, maxLife: 0.68, scaleStart: 0.7, scaleEnd: 4.6, baseOpacity: 0.95, rotSpeed: (Math.random() - 0.5) * 4.0
            });
        }

        const breezeFrames = await this.cutter.slice('/models/turrets/freeze/m0/snow_breeze.png', 16);
        for (let i = 0; i < 48; i++) {
            const mat = new THREE.SpriteMaterial({ map: breezeFrames[0], color: new THREE.Color(0x88ccff), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.32 });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.scene.add(sprite);
            this.freezeBreezePool.push({
                sprite, frames: breezeFrames, active: false, velocity: new THREE.Vector3(),
                life: 0, maxLife: 0.65, scaleStart: 0.32, scaleEnd: 3.4, baseOpacity: 0.34, rotSpeed: (Math.random() - 0.5) * 1.6
            });
        }

        const freezeFlakeFrames = await this.cutter.slice('/models/turrets/freeze/m0/snow_flake.png', 16);
        for (let i = 0; i < 36; i++) {
            const mat = new THREE.SpriteMaterial({ map: freezeFlakeFrames[0], color: new THREE.Color(0xddf4ff), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.65 });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.scene.add(sprite);
            this.freezeFlakePool.push({
                sprite, frames: freezeFlakeFrames, active: false, velocity: new THREE.Vector3(),
                life: 0, maxLife: 0.52, scaleStart: 0.22, scaleEnd: 1.8, baseOpacity: 0.65, rotSpeed: (Math.random() - 0.5) * 6.5
            });
        }

        const ricoFrames = await this.cutter.slice('/models/turrets/ricochet/m0/ricochet_shot.png', 10);
        for (let i = 0; i < 20; i++) {
            const mat = new THREE.SpriteMaterial({ map: ricoFrames[0], blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            sprite.scale.set(1.5, 1.5, 1.0);
            this.scene.add(sprite);
            this.projectilePool.push({
                sprite, material: mat, frames: ricoFrames, active: false, position: new THREE.Vector3(),
                velocity: new THREE.Vector3(), shooter: null, weapon: 'ricochet', bouncesLeft: 2, traveled: 0, maxDistance: 75.0, animTime: 0
            });
        }
    }

    private initIsidaVisuals() {
        this.scene.add(this.isidaRoot);
        this.isidaRoot.visible = false;

        const tl = new THREE.TextureLoader();
        this.isidaDamageShaftTex = tl.load('/models/turrets/isida/m0/damage_shaft.png');
        this.isidaDamageShaftTex.wrapS = THREE.RepeatWrapping;
        this.isidaDamageShaftTex.wrapT = THREE.RepeatWrapping;

        this.isidaHealShaftTex = tl.load('/models/turrets/isida/m0/heal_shaft.png');
        this.isidaHealShaftTex.wrapS = THREE.RepeatWrapping;
        this.isidaHealShaftTex.wrapT = THREE.RepeatWrapping;

        const muzzleMat = new THREE.SpriteMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
        this.isidaMuzzleSprite = new THREE.Sprite(muzzleMat);
        this.isidaMuzzleSprite.scale.set(1.6, 1.6, 1.0);
        this.isidaRoot.add(this.isidaMuzzleSprite);

        const contactMat = new THREE.SpriteMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
        this.isidaContactSprite = new THREE.Sprite(contactMat);
        this.isidaContactSprite.scale.set(2.4, 2.4, 1.0);
        this.isidaContactSprite.visible = false;
        this.isidaRoot.add(this.isidaContactSprite);

        const beamGeo = new THREE.PlaneGeometry(0.75, 1.0);
        const beamMat = new THREE.MeshBasicMaterial({ map: this.isidaDamageShaftTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });

        this.isidaBeamMesh1 = new THREE.Mesh(beamGeo, beamMat);
        this.isidaBeamMesh2 = new THREE.Mesh(beamGeo, beamMat);
        this.isidaBeamMesh2.rotation.y = Math.PI / 2;

        this.isidaRoot.add(this.isidaBeamMesh1);
        this.isidaRoot.add(this.isidaBeamMesh2);
        this.isidaBeamMesh1.visible = false;
        this.isidaBeamMesh2.visible = false;

        this.isidaReady = true;

        Promise.all([
            this.cutter.slice('/models/turrets/isida/m0/damage_start.png', 10),
            this.cutter.slice('/models/turrets/isida/m0/damage_end.png', 11),
            this.cutter.slice('/models/turrets/isida/m0/heal_start.png', 10),
            this.cutter.slice('/models/turrets/isida/m0/heal_end.png', 11),
            this.cutter.slice('/models/turrets/isida/m0/idle_spark.png', 10)
        ]).then(([dStart, dEnd, hStart, hEnd, idle]) => {
            this.isidaDamageStartFrames = dStart;
            this.isidaDamageEndFrames = dEnd;
            this.isidaHealStartFrames = hStart;
            this.isidaHealEndFrames = hEnd;
            this.isidaIdleSparkFrames = idle;
        }).catch(() => { });
    }

    private initRailgunVisuals() {
        const tl = new THREE.TextureLoader();
        tl.load('/models/turrets/railgun/m0/charge_part1.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            this.railChargePart1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.railChargeGroup.add(this.railChargePart1);
        });
        tl.load('/models/turrets/railgun/m0/charge_part2.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            this.railChargePart2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.railChargeGroup.add(this.railChargePart2);
        });
        tl.load('/models/turrets/railgun/m0/charge_part3.png', (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            this.railChargePart3 = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false }));
            this.railChargeGroup.add(this.railChargePart3);
        });
    }

    public registerCombatant(combatant: Combatant) {
        combatant.freezeRatio = 0.0;
        combatant.burnTimer = 0.0;
        combatant.burnIntensity = 0.0;
        combatant.twinsBarrelToggle = 0;
        combatant.energy = 1.0;
        combatant.repairTimer = 0.0;
        combatant.armorBuffTimer = 0.0;
        combatant.damageBuffTimer = 0.0;
        combatant.speedBuffTimer = 0.0;
        combatant.isStreamFiring = false;
        combatant.lastStreamEmitTime = 0;

        const hMod = combatant.hullMod || 'm0';
        const tMod = combatant.turretMod || 'm0';
        this.applyModifications(combatant, hMod, tMod);

        if (!this.allCombatants.some(c => c.id === combatant.id)) {
            this.allCombatants.push(combatant);
        }
        if (combatant.controller.chassisCollider) {
            this.combatantsByCollider.set(combatant.controller.chassisCollider.handle, combatant);
        }
        if (combatant.controller.turretCollider) {
            this.combatantsByCollider.set(combatant.controller.turretCollider.handle, combatant);
        }
    }

    public applyModifications(c: Combatant, hullMod: string, turretMod: string) {
        c.hullMod = hullMod.toLowerCase();
        c.turretMod = turretMod.toLowerCase();

        const hMult = MOD_MULTIPLIERS[c.hullMod] || 1.0;
        const tMult = MOD_MULTIPLIERS[c.turretMod] || 1.0;

        const baseMass = c.controller.hSpec?.mass || 2000;
        const newMaxHp = baseMass * 1.2 * hMult;
        const hpPercentage = c.maxHealth > 0 ? (c.currentHealth / c.maxHealth) : 1.0;

        c.maxHealth = newMaxHp;
        c.currentHealth = c.isDead ? 0 : (newMaxHp * hpPercentage);

        c.damageMultiplier = tMult;
        c.reloadMultiplier = tMult;

        if (c.id === 'player_local') {
            this.hud?.setHealth(c.currentHealth, c.maxHealth);
        }
    }

    public setRemoteStreamState(shooterId: string, weapon: string, isFiring: boolean) {
        const c = this.allCombatants.find(comp => comp.id === shooterId);
        if (!c || c.id === 'player_local') return;

        c.isStreamFiring = isFiring;
        c.streamWeapon = weapon;
    }

    public getCombatantByCollider(collider: RAPIER.Collider): Combatant | undefined {
        if (!collider) return undefined;
        const direct = this.combatantsByCollider.get(collider.handle);
        if (direct) return direct;

        const parentBody = collider.parent();
        if (parentBody) {
            for (const c of this.allCombatants) {
                if (c.controller && c.controller.chassisBody === parentBody) {
                    this.combatantsByCollider.set(collider.handle, c);
                    return c;
                }
            }
        }
        return undefined;
    }

    public isShooterCollider(collider: RAPIER.Collider, shooter?: Combatant | null): boolean {
        if (!collider || !shooter || !shooter.controller) return false;
        if (shooter.controller.chassisBody && collider.parent() === shooter.controller.chassisBody) return true;
        if (shooter.controller.chassisCollider && collider.handle === shooter.controller.chassisCollider.handle) return true;
        if (shooter.controller.turretCollider && collider.handle === shooter.controller.turretCollider.handle) return true;

        const victim = this.getCombatantByCollider(collider);
        return !!victim && victim.id === shooter.id;
    }

    public getReloadProgress(): number {
        if (this.shaftAiming) {
            return Math.max(0, 1.0 - (this.shaftChargeTime / this.shaftMaxChargeTime));
        }
        return this.reloadTimer;
    }

    public isShaftSniping(): boolean {
        return this.shaftAiming;
    }

    public getShaftZoomRatio(): number {
        return THREE.MathUtils.clamp(this.shaftChargeTime / this.shaftMaxChargeTime, 0, 1);
    }

    public activateSupply(combatant: Combatant, slotId: number) {
        if (!combatant || combatant.isDead) return;

        if (slotId === 1) {
            combatant.burnTimer = 0;
            combatant.burnIntensity = 0;
            combatant.controller.applyBurnVisual(0.0);
            combatant.repairTimer = 3.0;
            this.audio.play(encodeURI('/battle/boxes/Звук_Ремкомплект1_ТО.mp3'), { channel: 'announcer_voice', volume: 0.95 });
        } else if (slotId === 2) {
            combatant.armorBuffTimer = 40.0;
            this.audio.play(encodeURI('/battle/boxes/Звук_Повышенная_защита1_ТО.mp3'), { channel: 'announcer_voice', volume: 0.95 });
        } else if (slotId === 3) {
            combatant.damageBuffTimer = 40.0;
            this.audio.play(encodeURI('/battle/boxes/Звук_Повышенный_урон1_ТО.mp3'), { channel: 'announcer_voice', volume: 0.95 });
        } else if (slotId === 4) {
            combatant.speedBuffTimer = 40.0;
            this.audio.play(encodeURI('/battle/boxes/Звук_Ускорение1_ТО.mp3'), { channel: 'announcer_voice', volume: 0.95 });
        } else if (slotId === 5) {
            this.dropLandmine(combatant);
        } else if (slotId === 6) {
            if (this.dropBoxManager) this.dropBoxManager.triggerGoldDrop('supply', combatant.name);
        }
    }

    public dropLandmine(shooter: Combatant) {
        const chassisPos = shooter.controller.getPosition();
        const chassisRot = shooter.controller.chassisBody.rotation();
        const quat = new THREE.Quaternion(chassisRot.x, chassisRot.y, chassisRot.z, chassisRot.w);
        const backward = new THREE.Vector3(0, 0, -1).applyQuaternion(quat).normalize();
        const dropPos = chassisPos.clone().addScaledVector(backward, (shooter.controller.hSpec?.halfLength || 2.2) * 0.85);

        const ray = new RAPIER.Ray({ x: dropPos.x, y: dropPos.y + 0.3, z: dropPos.z }, { x: 0, y: -1, z: 0 });
        const hit = this.world.castRay(ray, 4.0, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));
        const hitToi = typeof hit === 'number' ? hit : (hit ? (hit as any).toi ?? (hit as any).timeOfImpact : null);
        const groundY = hitToi !== null ? (dropPos.y + 0.3 - hitToi) + 0.05 : dropPos.y - (shooter.controller.hSpec?.halfHeight || 0.6) + 0.05;

        const mineId = `mine_${Math.random().toString(36).substring(2, 9)}`;
        this.spawnVisualMine(mineId, shooter.id, shooter.team, new THREE.Vector3(dropPos.x, groundY, dropPos.z));

        if (this.onPlaceMine) this.onPlaceMine(mineId, dropPos.x, groundY, dropPos.z);
    }

    public spawnVisualMine(id: string, ownerId: string, team: 'blue' | 'red' | 'neutral', pos: THREE.Vector3) {
        if (this.landmines.some(m => (m as any).id === id)) return;

        const mineGroup = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.12, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });
        mineGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

        const ledGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16);
        const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.85 });
        mineGroup.add(new THREE.Mesh(ledGeo, ledMaterial));

        mineGroup.position.copy(pos);
        this.scene.add(mineGroup);

        this.landmines.push({ mesh: mineGroup, position: mineGroup.position.clone(), ownerId, team, isArmed: false, armTimer: 1.2, active: true, ledMaterial, ...({ id } as any) });
    }

    private updateLandmines(dt: number) {
        for (const mine of this.landmines) {
            if (!mine.active) continue;

            if (!mine.isArmed) {
                mine.armTimer -= dt;
                if (mine.armTimer <= 0) {
                    mine.isArmed = true;
                    const armedColor = mine.team === 'blue' ? 0x00a8ff : (mine.team === 'red' ? 0xff2222 : 0xffaa00);
                    mine.ledMaterial.color.setHex(armedColor);
                }
                continue;
            }

            for (const c of this.allCombatants) {
                if (c.isDead || c.id === mine.ownerId) continue;
                if (c.team !== 'neutral' && c.team === mine.team) continue;

                const tankPos = c.controller.getPosition();
                const distXZ = Math.hypot(tankPos.x - mine.position.x, tankPos.z - mine.position.z);
                const distY = Math.abs(tankPos.y - mine.position.y);

                if (distXZ <= 1.85 && distY <= 1.8) {
                    mine.active = false;
                    this.scene.remove(mine.mesh);

                    let mineDamage = THREE.MathUtils.randInt(1400, 1800);
                    if (c.armorBuffTimer && c.armorBuffTimer > 0) mineDamage = Math.floor(mineDamage * 0.5);

                    c.currentHealth = Math.max(0, c.currentHealth - mineDamage);
                    if (c.repairTimer && c.repairTimer > 0) c.repairTimer = 0;

                    const mass = c.controller.hSpec?.mass || 2200;
                    c.controller.chassisBody?.applyImpulse({ x: 0, y: mass * 9.5, z: 0 }, true);
                    c.controller.chassisBody?.applyTorqueImpulse({ x: (Math.random() - 0.5) * mass * 4.0, y: 0, z: (Math.random() - 0.5) * mass * 4.0 }, true);

                    this.audio.play('/battle/death/explosion-tnk.mp3', { channel: 'mine_boom', volume: 1.0 });
                    this.vfx.spawnThunderExplosion(mine.position);
                    this.spawnDamageIndicator(mine.position, mineDamage, true);

                    const killer = this.allCombatants.find(o => o.id === mine.ownerId) || c;
                    if (c.currentHealth <= 0 && !c.isDead) this.handleDeath(killer, c, 'mine');
                    break;
                }
            }
        }
    }

    public update(dt: number, isLocalFiring: boolean, localShooter: Combatant) {
        this.vfx.update(dt);
        this.updateProjectiles(dt);
        this.updateLandmines(dt);
        this.updateStatusEffects(dt);
        this.updateStreamParticles(dt);

        const now = performance.now();

        for (const c of this.allCombatants) {
            c.lastStreamEmitTime = c.lastStreamEmitTime || 0;

            if (c.id === 'player_local') {
                c.streamWeapon = c.controller.currentTurretName?.toLowerCase() || 'smoky';
                const isStreamTurret = ['freeze', 'firebird', 'isida'].includes(c.streamWeapon || '');

                if (isStreamTurret) {
                    const dischargeRate = c.streamWeapon === 'isida' ? (1.0 / 8.5) : (1.0 / 6.5);
                    const rechargeRate = 1.0 / 10.0;

                    if (isLocalFiring && c.energy > 0 && !c.isDead) {
                        c.energy = Math.max(0, c.energy - dt * dischargeRate);
                        c.isStreamFiring = true;
                    } else {
                        if (c.energy < 1.0) c.energy = Math.min(1.0, c.energy + dt * rechargeRate);
                        c.isStreamFiring = false;
                    }
                    this.reloadTimer = c.energy;
                } else {
                    c.isStreamFiring = false;
                }
            }

            if (c.isStreamFiring && !c.isDead) {
                const weapon = c.streamWeapon || 'smoky';
                const muzzle = this.getMuzzleTransform(c);

                if (weapon === 'firebird') {
                    if (now - c.lastStreamEmitTime > 26) {
                        this.emitStreamParticle(this.fireballPool, muzzle.position, muzzle.direction, 26.0, 0.16);
                        c.lastStreamEmitTime = now;
                    }
                    if (c.id === 'player_local') {
                        this.audio.playLoop('/models/turrets/firebird/flamethrower.mp3', 'firebird_loop', 0.85);
                        this.applyConeDamage(c, muzzle, WEAPON_CONFIGS.firebird.range || 20.0, 0.36, WEAPON_CONFIGS.firebird.minDamage * dt * 10, 'fire');
                    }
                } else if (weapon === 'freeze') {
                    if (now - c.lastStreamEmitTime > 24) {
                        this.emitStreamParticle(this.freezeBreezePool, muzzle.position, muzzle.direction, 24.5, 0.16);
                        if (Math.random() < 0.75) {
                            this.emitStreamParticle(this.freezeFlakePool, muzzle.position, muzzle.direction, 25.5, 0.12);
                        }
                        c.lastStreamEmitTime = now;
                    }
                    if (c.id === 'player_local') {
                        this.audio.playLoop('/models/turrets/freeze/freeze.mp3', 'freeze_loop', 0.85);
                        this.applyConeDamage(c, muzzle, WEAPON_CONFIGS.freeze.range || 19.0, 0.36, WEAPON_CONFIGS.freeze.minDamage * dt * 10, 'freeze');
                    }
                } else if (weapon === 'isida') {
                    if (c.id === 'player_local') {
                        this.handleIsidaLogic(c, muzzle, WEAPON_CONFIGS.isida, dt);
                    } else {
                        if (now - c.lastStreamEmitTime > 40) {
                            this.vfx.spawnHitSparks(muzzle.position, 0xff0044);
                            c.lastStreamEmitTime = now;
                        }
                    }
                }
            } else if (c.id === 'player_local' && ['firebird', 'freeze', 'isida'].includes(c.streamWeapon || '')) {
                this.stopStreamSounds();
                this.isidaRoot.visible = false;
            }
        }

        if (!localShooter || localShooter.isDead) {
            this.railChargeGroup.visible = false;
            if (this.shaftAiming) this.exitShaftAimMode();
            return;
        }

        const weapon = localShooter.controller.currentTurretName?.toLowerCase() || 'smoky';
        const config = WEAPON_CONFIGS[weapon] || WEAPON_CONFIGS['smoky'];

        if (['freeze', 'firebird', 'isida'].includes(weapon)) {
            return;
        }

        const freezeReloadMult = THREE.MathUtils.lerp(1.0, 0.50, localShooter.freezeRatio || 0);

        if (this.reloadTimer < 1.0 && !this.shaftAiming) {
            const currentReloadTime = (weapon === 'shaft') ? this.shaftSniperShotCooldown : config.reloadTime;
            this.reloadTimer = Math.min(1.0, this.reloadTimer + (dt * freezeReloadMult * (localShooter.reloadMultiplier || 1.0)) / currentReloadTime);
        }

        if (weapon === 'shaft') {
            this.handleShaftInput(dt, isLocalFiring, localShooter, config);
            return;
        } else {
            if (this.shaftLaserLine) this.shaftLaserLine.visible = false;
            if (this.shaftLaserDot) this.shaftLaserDot.visible = false;
        }

        if (this.isCharging) {
            this.chargeTimer += dt * (localShooter.reloadMultiplier || 1.0);
            if (weapon === 'railgun') this.updateRailgunCharge(localShooter, dt);

            if (this.chargeTimer >= config.chargeTime) {
                this.isCharging = false;
                this.railChargeGroup.visible = false;
                this.executeDischarge(localShooter, weapon, config);
                this.reloadTimer = 0.0;
            }
            return;
        }

        if (isLocalFiring && this.reloadTimer >= 1.0) {
            if (config.chargeTime > 0) {
                this.isCharging = true;
                this.chargeTimer = 0.0;
                if (weapon === 'railgun') {
                    this.audio.play('/models/turrets/railgun/railgun.mp3', { channel: 'railgun_charge', volume: 0.85, fadeOldTime: 0.08 });
                    this.railChargeGroup.visible = true;
                }
            } else {
                this.executeDischarge(localShooter, weapon, config);
                this.reloadTimer = 0.0;
            }
        }
    }

    private emitStreamParticle(pool: StreamSpriteParticle[], origin: THREE.Vector3, dir: THREE.Vector3, speed: number, spreadMagnitude: number) {
        const slot = pool.find(p => !p.active);
        if (!slot) return;
        slot.active = true;
        slot.life = 0;
        slot.sprite.visible = true;
        slot.sprite.position.copy(origin).addScaledVector(dir, 0.25);
        slot.sprite.material.rotation = Math.random() * Math.PI * 2;
        slot.scaleStart = slot.scaleStart || 0.7;
        slot.sprite.scale.set(slot.scaleStart, slot.scaleStart, 1.0);
        slot.sprite.material.opacity = slot.baseOpacity;
        const spread = new THREE.Vector3((Math.random() - 0.5) * spreadMagnitude, (Math.random() - 0.5) * spreadMagnitude, (Math.random() - 0.5) * spreadMagnitude);
        slot.velocity.copy(dir).add(spread).normalize().multiplyScalar(speed);
    }

    private updateStreamParticles(dt: number) {
        const updatePool = (pool: StreamSpriteParticle[]) => {
            for (const p of pool) {
                if (!p.active) continue;
                p.life += dt;
                p.sprite.position.addScaledVector(p.velocity, dt);
                const progress = p.life / p.maxLife;
                if (progress >= 1.0) {
                    p.active = false;
                    p.sprite.visible = false;
                    continue;
                }
                if (p.frames.length > 0) {
                    const frameIdx = Math.min(p.frames.length - 1, Math.floor(progress * p.frames.length));
                    p.sprite.material.map = p.frames[frameIdx];
                }
                const curScale = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, Math.pow(progress, 0.70));
                p.sprite.scale.set(curScale, curScale, 1.0);
                p.sprite.material.rotation += p.rotSpeed * dt;
                if (progress < 0.12) p.sprite.material.opacity = p.baseOpacity * (progress / 0.12);
                else if (progress > 0.40) p.sprite.material.opacity = p.baseOpacity * (1.0 - (progress - 0.40) / 0.60);
                else p.sprite.material.opacity = p.baseOpacity;
            }
        };
        updatePool(this.fireballPool);
        updatePool(this.freezeBreezePool);
        updatePool(this.freezeFlakePool);
    }

    private applyConeDamage(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, range: number, coneAngle: number, damage: number, type: 'fire' | 'freeze') {
        for (const target of this.allCombatants) {
            if (target.id === shooter.id || target.isDead) continue;
            if (target.team !== 'neutral' && target.team === shooter.team) continue;

            const targetPos = target.controller.getPosition().clone();
            const toTarget = targetPos.clone().sub(muzzle.position);
            const dist = toTarget.length();
            if (dist > range) continue;

            const dirToTarget = toTarget.clone().normalize();
            if (dirToTarget.dot(muzzle.direction) > Math.cos(coneAngle)) {
                let actualDamage = damage * (shooter.damageMultiplier || 1.0);
                if (shooter.damageBuffTimer && shooter.damageBuffTimer > 0) actualDamage *= 2.0;
                if (target.armorBuffTimer && target.armorBuffTimer > 0) actualDamage *= 0.5;

                target.currentHealth = Math.max(0, target.currentHealth - actualDamage);

                if (this.onFireShot) {
                    const acc = (this.streamDamageAccumulator.get(target.id) || 0) + actualDamage;
                    if (acc >= 24 || target.currentHealth <= 0) {
                        this.onFireShot(type === 'fire' ? 'firebird' : 'freeze', muzzle.position, muzzle.direction, targetPos, target, Math.floor(acc));
                        this.streamDamageAccumulator.set(target.id, 0);
                    } else {
                        this.streamDamageAccumulator.set(target.id, acc);
                    }
                }

                if (target.repairTimer && target.repairTimer > 0) target.repairTimer = 0;

                if (type === 'fire') {
                    target.burnTimer = Math.min(5.0, (target.burnTimer || 0) + 0.15);
                    target.burnIntensity = Math.min(1.0, (target.burnIntensity || 0) + 0.1);
                    target.controller.applyBurnVisual(target.burnIntensity);
                } else if (type === 'freeze') {
                    target.freezeRatio = Math.min(1.0, (target.freezeRatio || 0) + 0.04);
                    target.freezeTimer = 0.6;
                    target.controller.applyFrostVisual(target.freezeRatio);
                }

                if (target.currentHealth <= 0 && !target.isDead) this.handleDeath(shooter, target, type === 'fire' ? 'firebird' : 'freeze');
            }
        }
    }

    private handleIsidaLogic(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, config: WeaponSpec, dt: number) {
        if (!this.isidaReady || !this.isidaMuzzleSprite || !this.isidaBeamMesh1 || !this.isidaBeamMesh2 || !this.isidaContactSprite) return;

        this.isidaRoot.visible = true;
        this.isidaAnimTimer += dt * 24.0;
        const maxRange = config.range || 17.5;
        let lockedTarget: Combatant | null = null;
        let bestScore = -1.0;

        for (const target of this.allCombatants) {
            if (target.id === shooter.id || target.isDead) continue;
            const targetCenter = target.controller.getPosition().clone().add(new THREE.Vector3(0, target.controller.hSpec?.halfHeight || 0.45, 0));
            const toTarget = targetCenter.clone().sub(muzzle.position);
            const dist = toTarget.length();
            if (dist > maxRange) continue;
            const dirToTarget = toTarget.clone().normalize();
            const dot = dirToTarget.dot(muzzle.direction);

            if (dot > Math.cos(THREE.MathUtils.degToRad(config.autoAimHorizontalAngle || 35.0))) {
                const ray = new RAPIER.Ray({ x: muzzle.position.x, y: muzzle.position.y, z: muzzle.position.z }, { x: dirToTarget.x, y: dirToTarget.y, z: dirToTarget.z });
                const hit = this.world.castRayAndGetNormal(ray, dist, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));
                const toi = (hit as any)?.toi ?? (hit as any)?.timeOfImpact ?? dist;
                const hitCombatant = hit ? this.getCombatantByCollider(hit.collider) : undefined;
                const hitTarget = hitCombatant && hitCombatant.id === target.id;
                const noObstacle = !hit || hitTarget || (toi >= dist - 1.2);

                if (noObstacle) {
                    const score = dot / (dist + 0.1);
                    if (score > bestScore) {
                        bestScore = score;
                        lockedTarget = target;
                    }
                }
            }
        }

        this.isidaMuzzleSprite.position.copy(muzzle.position);

        if (lockedTarget) {
            const isAlly = lockedTarget.team !== 'neutral' && lockedTarget.team === shooter.team;
            const targetCenter = lockedTarget.controller.getPosition().clone().add(new THREE.Vector3(0, lockedTarget.controller.hSpec?.halfHeight || 0.45, 0));
            this.isidaBeamMesh1.visible = true; this.isidaBeamMesh2.visible = true; this.isidaContactSprite.visible = true;
            this.isidaContactSprite.position.copy(targetCenter);

            if (isAlly) {
                this.audio.stop('isida_damage', 0.08); this.audio.stop('isida_idle', 0.08);
                this.audio.playLoop('/models/turrets/isida/healing.mp3', 'isida_heal', 0.85);
                if (this.isidaHealStartFrames.length > 0) this.isidaMuzzleSprite.material.map = this.isidaHealStartFrames[Math.floor(this.isidaAnimTimer) % this.isidaHealStartFrames.length];
                if (this.isidaHealEndFrames.length > 0) this.isidaContactSprite.material.map = this.isidaHealEndFrames[Math.floor(this.isidaAnimTimer) % this.isidaHealEndFrames.length];
                this.updateIsidaBeamGeometry(muzzle.position, targetCenter, this.isidaHealShaftTex);
                const healRate = config.minDamage * dt * 12.0 * (shooter.damageMultiplier || 1.0);
                lockedTarget.currentHealth = Math.min(lockedTarget.maxHealth, lockedTarget.currentHealth + healRate);
            } else {
                this.audio.stop('isida_heal', 0.08); this.audio.stop('isida_idle', 0.08);
                this.audio.playLoop('/models/turrets/isida/damage.mp3', 'isida_damage', 0.85);
                if (this.isidaDamageStartFrames.length > 0) this.isidaMuzzleSprite.material.map = this.isidaDamageStartFrames[Math.floor(this.isidaAnimTimer) % this.isidaDamageStartFrames.length];
                if (this.isidaDamageEndFrames.length > 0) this.isidaContactSprite.material.map = this.isidaDamageEndFrames[Math.floor(this.isidaAnimTimer) % this.isidaDamageEndFrames.length];
                this.updateIsidaBeamGeometry(muzzle.position, targetCenter, this.isidaDamageShaftTex);

                let dmg = config.minDamage * dt * 10.0 * (shooter.damageMultiplier || 1.0);
                if (shooter.damageBuffTimer && shooter.damageBuffTimer > 0) dmg *= 2.0;
                if (lockedTarget.armorBuffTimer && lockedTarget.armorBuffTimer > 0) dmg *= 0.5;

                lockedTarget.currentHealth = Math.max(0, lockedTarget.currentHealth - dmg);
                shooter.currentHealth = Math.min(shooter.maxHealth, shooter.currentHealth + dmg * 0.5);

                if (this.onFireShot) {
                    const acc = (this.streamDamageAccumulator.get(lockedTarget.id) || 0) + dmg;
                    if (acc >= 20 || lockedTarget.currentHealth <= 0) {
                        this.onFireShot('isida', muzzle.position, muzzle.direction, targetCenter, lockedTarget, Math.floor(acc));
                        this.streamDamageAccumulator.set(lockedTarget.id, 0);
                    } else {
                        this.streamDamageAccumulator.set(lockedTarget.id, acc);
                    }
                }
                if (lockedTarget.repairTimer && lockedTarget.repairTimer > 0) lockedTarget.repairTimer = 0;
                if (lockedTarget.currentHealth <= 0 && !lockedTarget.isDead) this.handleDeath(shooter, lockedTarget, 'isida');
            }
        } else {
            this.audio.stop('isida_damage', 0.08); this.audio.stop('isida_heal', 0.08);
            this.audio.playLoop('/models/turrets/isida/idle.mp3', 'isida_idle', 0.65);
            this.isidaBeamMesh1.visible = false; this.isidaBeamMesh2.visible = false; this.isidaContactSprite.visible = false;
            if (this.isidaIdleSparkFrames.length > 0) this.isidaMuzzleSprite.material.map = this.isidaIdleSparkFrames[Math.floor(this.isidaAnimTimer) % this.isidaIdleSparkFrames.length];
        }
    }

    private updateIsidaBeamGeometry(start: THREE.Vector3, end: THREE.Vector3, texture: THREE.Texture) {
        const dist = start.distanceTo(end);
        if (dist < 0.01 || isNaN(dist)) return;
        const midPoint = start.clone().lerp(end, 0.5);
        const dir = end.clone().sub(start).normalize();
        if (dir.lengthSq() < 0.001) return;
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        this.isidaBeamMesh1.position.copy(midPoint); this.isidaBeamMesh1.quaternion.copy(quat); this.isidaBeamMesh1.scale.set(1.0, dist, 1.0);
        this.isidaBeamMesh2.position.copy(midPoint); this.isidaBeamMesh2.quaternion.copy(quat); this.isidaBeamMesh2.scale.set(1.0, dist, 1.0);
        if (texture) {
            texture.offset.y -= 0.07;
            texture.repeat.set(1.0, Math.max(1.0, dist / 2.2));
            (this.isidaBeamMesh1.material as THREE.MeshBasicMaterial).map = texture;
            (this.isidaBeamMesh2.material as THREE.MeshBasicMaterial).map = texture;
        }
    }

    private handleShaftInput(dt: number, isFiring: boolean, shooter: Combatant, config: WeaponSpec) {
        if (isFiring && this.reloadTimer >= 1.0) {
            this.spaceHeldDuration += dt;
            if (this.spaceHeldDuration >= 0.16 && !this.shaftAiming) {
                this.shaftAiming = true;
                this.shaftChargeTime = 0.0;
                this.audio.play('/models/turrets/shaft/zoomMode.wav', { channel: 'shaft_zoom', volume: 0.85 });
                this.audio.playLoop('/models/turrets/shaft/targetingSound.wav', 'shaft_aim_loop', 0.85);
            }
            if (this.shaftAiming) {
                this.shaftChargeTime += dt * (shooter.reloadMultiplier || 1.0);
                this.updateShaftLaser(shooter, config);
                if (this.shaftChargeTime >= this.shaftMaxChargeTime) {
                    this.fireShaftSniper(shooter, config, 1.0);
                    this.exitShaftAimMode();
                    this.spaceHeldDuration = 0;
                    this.wasSpacePressed = false;
                    return;
                }
            }
        } else if (!isFiring && this.wasSpacePressed) {
            if (this.shaftAiming) {
                const chargeRatio = THREE.MathUtils.clamp(this.shaftChargeTime / this.shaftMaxChargeTime, 0.15, 1.0);
                this.fireShaftSniper(shooter, config, chargeRatio);
                this.exitShaftAimMode();
            } else if (this.reloadTimer >= 1.0 && this.spaceHeldDuration > 0 && this.spaceHeldDuration < 0.16) {
                this.fireShaftArcade(shooter, config);
            }
            this.spaceHeldDuration = 0;
        }
        this.wasSpacePressed = isFiring;
    }

    private exitShaftAimMode() {
        this.shaftAiming = false;
        this.shaftChargeTime = 0.0;
        this.audio.stop('shaft_aim_loop', 0.05);
        this.audio.stop('shaft_zoom', 0.05);
        if (this.shaftLaserLine) this.shaftLaserLine.visible = false;
        if (this.shaftLaserDot) this.shaftLaserDot.visible = false;
    }

    private updateShaftLaser(shooter: Combatant, config: WeaponSpec) {
        const muzzle = this.getShaftAimTransform(shooter);
        const maxDist = config.range || 260.0;
        const ray = new RAPIER.Ray({ x: muzzle.position.x, y: muzzle.position.y, z: muzzle.position.z }, { x: muzzle.direction.x, y: muzzle.direction.y, z: muzzle.direction.z });
        const hit = this.world.castRayAndGetNormal(ray, maxDist, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));
        let hitPoint = muzzle.position.clone().addScaledVector(muzzle.direction, maxDist);
        if (hit) {
            const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? maxDist);
            hitPoint = muzzle.position.clone().addScaledVector(muzzle.direction, Math.max(0.2, toi));
        }
        const positions = this.shaftLaserLine.geometry.attributes.position;
        if (positions) {
            positions.setXYZ(0, muzzle.position.x, muzzle.position.y, muzzle.position.z);
            positions.setXYZ(1, hitPoint.x, hitPoint.y, hitPoint.z);
            positions.needsUpdate = true;
            this.shaftLaserLine.geometry.computeBoundingSphere();
        }
        this.shaftLaserLine.visible = true;
        this.shaftLaserDot.position.copy(hitPoint).addScaledVector(muzzle.direction, -0.08);
        this.shaftLaserDot.visible = true;
    }

    public getShaftAimTransform(shooter: Combatant): { position: THREE.Vector3; direction: THREE.Vector3 } {
        const turretMount = shooter.controller.turretMount;
        turretMount.updateMatrixWorld(true);
        const mountWorldPos = new THREE.Vector3();
        turretMount.getWorldPosition(mountWorldPos);
        const mountQuat = new THREE.Quaternion();
        turretMount.getWorldQuaternion(mountQuat);

        const localOffset = this.getOrComputeLocalMuzzleOffset(shooter).clone();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(mountQuat).normalize();
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(mountQuat).normalize();
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(mountQuat).normalize();

        const muzzleWorldPos = mountWorldPos.clone()
            .add(right.clone().multiplyScalar(localOffset.x))
            .add(up.clone().multiplyScalar(localOffset.y))
            .add(forward.clone().multiplyScalar(localOffset.z));

        const aimDir = forward.clone().applyAxisAngle(right, this.shaftPitch).normalize();
        return { position: muzzleWorldPos, direction: aimDir };
    }

    private fireShaftArcade(shooter: Combatant, config: WeaponSpec) {
        const muzzle = this.getMuzzleTransform(shooter);
        this.audio.play('/models/turrets/shaft/shot.wav', { channel: 'shaft_shot', volume: 0.9 });
        this.vfx.spawnMuzzleFlash(muzzle.position, '/models/turrets/shaft/m0/shaft_shot.png', 2.4);

        this.shaftSniperShotCooldown = 2.0;
        this.reloadTimer = 0.0;

        const arcadeSpec: WeaponSpec = { ...config, minDamage: 280, maxDamage: 360, recoilForce: 4500, impactForce: 3800 };
        const recoilImpulse = muzzle.direction.clone().multiplyScalar(-arcadeSpec.recoilForce);
        shooter.controller.chassisBody?.applyImpulseAtPoint({ x: recoilImpulse.x, y: recoilImpulse.y, z: recoilImpulse.z }, { x: muzzle.position.x, y: muzzle.position.y, z: muzzle.position.z }, true);

        this.executeRaycastShot(shooter, muzzle, arcadeSpec, 'shaft');
    }

    private fireShaftSniper(shooter: Combatant, config: WeaponSpec, chargeRatio: number) {
        const muzzle = this.getShaftAimTransform(shooter);
        this.audio.play('/models/turrets/shaft/shot.wav', { channel: 'shaft_shot', volume: 1.0 });
        this.vfx.spawnMuzzleFlash(muzzle.position, '/models/turrets/shaft/m0/shaft_shot.png', 3.4);

        let damage = Math.floor(THREE.MathUtils.lerp(450, 1300, chargeRatio)) * (shooter.damageMultiplier || 1.0);
        if (shooter.damageBuffTimer && shooter.damageBuffTimer > 0) damage *= 2;

        const recoil = THREE.MathUtils.lerp(6500, 17000, chargeRatio);
        const impact = THREE.MathUtils.lerp(5500, 14000, chargeRatio);

        this.shaftSniperShotCooldown = 2.0 + chargeRatio * 3.6;
        this.reloadTimer = 0.0;

        const recoilImpulse = muzzle.direction.clone().multiplyScalar(-recoil);
        shooter.controller.chassisBody?.applyImpulseAtPoint({ x: recoilImpulse.x, y: recoilImpulse.y, z: recoilImpulse.z }, { x: muzzle.position.x, y: muzzle.position.y, z: muzzle.position.z }, true);

        let currentOrigin = muzzle.position.clone();
        let remainingRange = config.range || 260.0;
        let endPoint = muzzle.position.clone().add(muzzle.direction.clone().multiplyScalar(remainingRange));
        let hitVictim: Combatant | undefined;
        let finalDmg: number | undefined;

        for (let step = 0; step < 5 && remainingRange > 0.1; step++) {
            const ray = new RAPIER.Ray({ x: currentOrigin.x, y: currentOrigin.y, z: currentOrigin.z }, { x: muzzle.direction.x, y: muzzle.direction.y, z: muzzle.direction.z });
            const hit = this.world.castRayAndGetNormal(ray, remainingRange, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));

            if (!hit) break;
            const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? 0);

            if (this.isShooterCollider(hit.collider, shooter)) {
                currentOrigin.addScaledVector(muzzle.direction, toi + 0.15);
                remainingRange -= (toi + 0.15);
                continue;
            }

            endPoint = currentOrigin.clone().addScaledVector(muzzle.direction, toi);
            const victim = this.getCombatantByCollider(hit.collider);

            if (victim && !victim.isDead && victim.id !== shooter.id) {
                let actualDmg = damage;
                if (victim.armorBuffTimer && victim.armorBuffTimer > 0) actualDmg = Math.floor(actualDmg * 0.5);

                victim.currentHealth = Math.max(0, victim.currentHealth - actualDmg);
                hitVictim = victim;
                finalDmg = actualDmg;

                if (victim.repairTimer && victim.repairTimer > 0) victim.repairTimer = 0;

                const victimImpact = muzzle.direction.clone().multiplyScalar(impact);
                victim.controller.chassisBody?.applyImpulseAtPoint({ x: victimImpact.x, y: victimImpact.y, z: victimImpact.z }, { x: endPoint.x, y: endPoint.y, z: endPoint.z }, true);
                this.spawnDamageIndicator(endPoint, actualDmg, chargeRatio > 0.85 || (shooter.damageBuffTimer ?? 0) > 0);

                if (victim.currentHealth <= 0 && !victim.isDead) this.handleDeath(shooter, victim, 'shaft');
            }

            this.vfx.spawnShaftExplosion(endPoint);
            break;
        }

        this.spawnShaftBeam(muzzle.position, endPoint);
        if (this.onFireShot) this.onFireShot('shaft', muzzle.position, muzzle.direction, endPoint, hitVictim, finalDmg);
    }

    private spawnShaftBeam(start: THREE.Vector3, end: THREE.Vector3) {
        const tex = this.getTexture(['/models/turrets/shaft/m0/shaft_trail.png']);
        const dist = start.distanceTo(end);
        const midPoint = start.clone().lerp(end, 0.5);
        const dir = end.clone().sub(start).normalize();

        const beamGroup = new THREE.Group();
        beamGroup.position.copy(midPoint);
        beamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        const geo = new THREE.PlaneGeometry(0.55, dist);
        const mat = new THREE.MeshBasicMaterial({ map: tex || null, color: 0xffaa11, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });

        const p1 = new THREE.Mesh(geo, mat);
        const p2 = new THREE.Mesh(geo, mat);
        p2.rotation.y = Math.PI / 2;

        beamGroup.add(p1);
        beamGroup.add(p2);
        this.scene.add(beamGroup);

        let opacity = 1.0;
        const iv = setInterval(() => {
            opacity -= 0.16;
            mat.opacity = Math.max(0, opacity);
            if (opacity <= 0) {
                clearInterval(iv);
                this.scene.remove(beamGroup);
                geo.dispose();
                mat.dispose();
            }
        }, 30);
    }

    private getOrComputeLocalMuzzleOffset(shooter: Combatant): THREE.Vector3 {
        const key = `${shooter.controller.currentTurretName}_${shooter.controller.currentTurretMod || 'm0'}`;
        if (this.muzzleOffsetsCache.has(key)) return this.muzzleOffsetsCache.get(key)!;

        const controller = shooter.controller;
        const turretMount = controller.turretMount;
        turretMount.updateMatrixWorld(true);

        const invMount = turretMount.matrixWorld.clone().invert();
        const box = new THREE.Box3();

        turretMount.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (mesh.isMesh && mesh.geometry) {
                const geom = mesh.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                const meshToMount = mesh.matrixWorld.clone().premultiply(invMount);
                const v = new THREE.Vector3();
                for (let i = 0; i < posAttr.count; i++) {
                    v.fromBufferAttribute(posAttr, i).applyMatrix4(meshToMount);
                    box.expandByPoint(v);
                }
            }
        });

        if (!box.isEmpty()) {
            const maxZ = box.max.z;
            let sumX = 0, sumY = 0, count = 0;

            turretMount.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.isMesh && mesh.geometry) {
                    const geom = mesh.geometry;
                    const posAttr = geom.attributes.position;
                    if (!posAttr) return;

                    const meshToMount = mesh.matrixWorld.clone().premultiply(invMount);
                    const v = new THREE.Vector3();
                    for (let i = 0; i < posAttr.count; i++) {
                        v.fromBufferAttribute(posAttr, i).applyMatrix4(meshToMount);
                        if (v.z >= maxZ - 0.15) {
                            sumX += v.x; sumY += v.y; count++;
                        }
                    }
                }
            });

            const localMuzzle = new THREE.Vector3(
                count > 0 ? sumX / count : (box.min.x + box.max.x) / 2,
                count > 0 ? sumY / count : (box.min.y + box.max.y) / 2,
                maxZ + 0.08
            );

            this.muzzleOffsetsCache.set(key, localMuzzle);
            return localMuzzle;
        }

        const fallback = new THREE.Vector3(0, 0.35, (controller.hSpec?.halfLength || 2.4) + 0.3);
        this.muzzleOffsetsCache.set(key, fallback);
        return fallback;
    }

    public getMuzzleTransform(shooter: Combatant): { position: THREE.Vector3; direction: THREE.Vector3 } {
        const turretMount = shooter.controller.turretMount;
        turretMount.updateMatrixWorld(true);

        const mountWorldPos = new THREE.Vector3();
        turretMount.getWorldPosition(mountWorldPos);

        const mountQuat = new THREE.Quaternion();
        turretMount.getWorldQuaternion(mountQuat);

        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(mountQuat).normalize();
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(mountQuat).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(mountQuat).normalize();

        const localOffset = this.getOrComputeLocalMuzzleOffset(shooter).clone();

        if (shooter.controller.currentTurretName === 'twins') {
            const barrelSide = shooter.twinsBarrelToggle === 1 ? 0.34 : -0.34;
            localOffset.x += barrelSide;
        }

        const muzzleWorldPos = mountWorldPos.clone()
            .add(right.clone().multiplyScalar(localOffset.x))
            .add(up.clone().multiplyScalar(localOffset.y))
            .add(dir.clone().multiplyScalar(localOffset.z));

        return { position: muzzleWorldPos, direction: dir };
    }

    private stopStreamSounds() {
        this.streamDamageAccumulator.clear();
        this.audio.stop('firebird_loop', 0.05);
        this.audio.stop('freeze_loop', 0.05);
        this.audio.stop('isida_damage', 0.05);
        this.audio.stop('isida_heal', 0.05);
        this.audio.stop('isida_idle', 0.05);
        this.audio.stop('shaft_aim_loop', 0.05);
        this.audio.stop('shaft_zoom', 0.05);
    }

    private updateRailgunCharge(shooter: Combatant, dt: number) {
        const muzzle = this.getMuzzleTransform(shooter);
        this.railChargeGroup.visible = true;
        this.railChargeGroup.position.copy(muzzle.position);

        const progress = THREE.MathUtils.clamp(this.chargeTimer / 1.1, 0, 1);

        if (this.railChargePart1) {
            const p1Scale = (0.5 + progress * 0.9) * (0.9 + Math.sin(performance.now() * 0.02) * 0.1);
            this.railChargePart1.scale.set(p1Scale, p1Scale, 1.0);
        }

        if (this.railChargePart2) {
            const p2Scale = 0.6 + progress * 1.1;
            this.railChargePart2.scale.set(p2Scale, p2Scale, 1.0);
            this.railChargePart2.material.rotation += dt * 4.5;
        }

        if (this.railChargePart3) {
            const p3Scale = (0.3 + progress * 1.6) * (0.85 + Math.cos(performance.now() * 0.03) * 0.15);
            this.railChargePart3.scale.set(p3Scale, p3Scale, 1.0);
            this.railChargePart3.material.rotation -= dt * 6.0;
        }
    }

    private executeDischarge(shooter: Combatant, weapon: string, config: WeaponSpec) {
        const muzzle = this.getMuzzleTransform(shooter);

        const recoilImpulse = muzzle.direction.clone().multiplyScalar(-config.recoilForce);
        shooter.controller.chassisBody?.applyImpulseAtPoint({ x: recoilImpulse.x, y: recoilImpulse.y, z: recoilImpulse.z }, { x: muzzle.position.x, y: muzzle.position.y, z: muzzle.position.z }, true);

        if (weapon === 'smoky') {
            this.audio.play('/models/turrets/smoky/smoky_shot.mp3', { channel: 'smoky_shot', volume: 0.9, fadeOldTime: 0.08, detune: (Math.random() - 0.5) * 40 });
            this.vfx.spawnMuzzleFlash(muzzle.position, '/models/turrets/smoky/m0/shot.png', 2.2);
            this.executeRaycastShot(shooter, muzzle, config, weapon);
        } else if (weapon === 'thunder') {
            this.audio.play('/models/turrets/thunder/thunder_shot.mp3', { channel: 'thunder_shot', volume: 0.9, fadeOldTime: 0.08 });
            this.vfx.spawnMuzzleFlash(muzzle.position, '/models/turrets/thunder/m0/shot.png', 2.6);
            this.executeThunderShot(shooter, muzzle, config);
        } else if (weapon === 'twins') {
            shooter.twinsBarrelToggle = shooter.twinsBarrelToggle === 1 ? 0 : 1;
            this.audio.play('/models/turrets/twins/plazma_shot.mp3', { channel: 'twins_shot', volume: 0.85, allowOverlap: true, maxPolyphony: 8, detune: (Math.random() - 0.5) * 35 });
            this.vfx.spawnTwinsMuzzleFlash(muzzle.position);
            this.firePlasmaProjectile(shooter, muzzle, 'twins', 48.0);
            if (this.onFireShot) this.onFireShot('twins', muzzle.position, muzzle.direction);
        } else if (weapon === 'railgun') {
            this.executeRailgunPiercingShot(shooter, muzzle, config);
        } else if (weapon === 'ricochet') {
            this.audio.play('/models/turrets/ricochet/ricochet_shot.mp3', { channel: 'ricochet_shot', volume: 0.8, fadeOldTime: 0.08 });
            this.vfx.spawnMuzzleFlash(muzzle.position, '/models/turrets/ricochet/m0/ricochet_shot_flash.png', 2.2);
            this.firePlasmaProjectile(shooter, muzzle, 'ricochet', 42.0);
            if (this.onFireShot) this.onFireShot('ricochet', muzzle.position, muzzle.direction);
        }
    }

    private executeThunderShot(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, config: WeaponSpec) {
        let currentOrigin = muzzle.position.clone();
        let remainingRange = 180.0;
        let hitPoint = muzzle.position.clone().addScaledVector(muzzle.direction, 180.0);

        for (let step = 0; step < 5 && remainingRange > 0.1; step++) {
            const ray = new RAPIER.Ray({ x: currentOrigin.x, y: currentOrigin.y, z: currentOrigin.z }, { x: muzzle.direction.x, y: muzzle.direction.y, z: muzzle.direction.z });
            const hit = this.world.castRayAndGetNormal(ray, remainingRange, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));

            if (!hit) break;

            const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? 0);

            if (this.isShooterCollider(hit.collider, shooter)) {
                const advance = toi + 0.15;
                currentOrigin.addScaledVector(muzzle.direction, advance);
                remainingRange -= advance;
                continue;
            }

            hitPoint = currentOrigin.clone().addScaledVector(muzzle.direction, toi);
            break;
        }

        this.spawnTracer(muzzle.position, hitPoint, 'thunder');
        this.audio.play('/models/turrets/thunder/thunder_fire.mp3', { channel: 'thunder_impact', volume: 0.9, fadeOldTime: 0.08 });
        this.vfx.spawnThunderExplosion(hitPoint);

        const splashRadius = config.splashRadius || 8.5;
        let mainVictim: Combatant | undefined;
        let maxSplashDmg = 0;

        for (const c of this.allCombatants) {
            if (c.isDead) continue;
            const targetPos = c.controller.getPosition().clone().add(new THREE.Vector3(0, (c.controller.hSpec?.halfHeight || 0.45) + 0.2, 0));
            const dist = targetPos.distanceTo(hitPoint);

            if (dist <= splashRadius) {
                if (c.id === shooter.id && hitPoint.distanceTo(muzzle.position) < 1.8) continue;

                const falloff = THREE.MathUtils.clamp(1.0 - (dist / splashRadius) * 0.75, 0.25, 1.0);
                let rawDamage = THREE.MathUtils.randFloat(config.minDamage, config.maxDamage) * (shooter.damageMultiplier || 1.0);
                if (shooter.damageBuffTimer && shooter.damageBuffTimer > 0) rawDamage *= 2.0;
                if (c.armorBuffTimer && c.armorBuffTimer > 0) rawDamage *= 0.5;

                const damage = Math.floor(rawDamage * falloff);
                c.currentHealth = Math.max(0, c.currentHealth - damage);

                if (damage > maxSplashDmg && c.id !== shooter.id) {
                    maxSplashDmg = damage;
                    mainVictim = c;
                }

                if (c.repairTimer && c.repairTimer > 0) c.repairTimer = 0;

                const pushDir = targetPos.clone().sub(hitPoint).normalize();
                if (pushDir.lengthSq() < 0.01) pushDir.set(0, 1, 0);
                const splashImpulse = pushDir.multiplyScalar(config.impactForce * falloff);

                c.controller.chassisBody?.applyImpulseAtPoint({ x: splashImpulse.x, y: splashImpulse.y, z: splashImpulse.z }, { x: targetPos.x, y: targetPos.y, z: targetPos.z }, true);
                this.spawnDamageIndicator(targetPos, damage, (shooter.damageBuffTimer ?? 0) > 0);

                if (c.currentHealth <= 0 && !c.isDead) this.handleDeath(shooter, c, 'thunder');
            }
        }

        if (this.onFireShot) this.onFireShot('thunder', muzzle.position, muzzle.direction, hitPoint, mainVictim, maxSplashDmg > 0 ? maxSplashDmg : undefined);
    }

    private executeRailgunPiercingShot(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, config: WeaponSpec) {
        let currentOrigin = muzzle.position.clone();
        let remainingRange = 180.0;
        let endPoint = muzzle.position.clone().addScaledVector(muzzle.direction, 180.0);
        const piercedTanks = new Set<string>();
        let firstVictim: Combatant | undefined;
        let firstDmg: number | undefined;

        while (remainingRange > 0.5) {
            const ray = new RAPIER.Ray({ x: currentOrigin.x, y: currentOrigin.y, z: currentOrigin.z }, { x: muzzle.direction.x, y: muzzle.direction.y, z: muzzle.direction.z });
            const hit = this.world.castRayAndGetNormal(ray, remainingRange, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => {
                if (this.isShooterCollider(c, shooter)) return false;
                const victim = this.getCombatantByCollider(c);
                if (!victim) return true;
                return !piercedTanks.has(victim.id);
            });

            if (!hit) break;

            const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? 0);

            if (this.isShooterCollider(hit.collider, shooter)) {
                currentOrigin.addScaledVector(muzzle.direction, toi + 0.15);
                remainingRange -= (toi + 0.15);
                continue;
            }

            const hitPoint = currentOrigin.clone().addScaledVector(muzzle.direction, toi);
            const victim = this.getCombatantByCollider(hit.collider);

            if (victim && victim.id !== shooter.id && !victim.isDead && !piercedTanks.has(victim.id)) {
                piercedTanks.add(victim.id);
                const dmg = this.applyDamageToVictim(shooter, victim, config, 'railgun', hitPoint, muzzle.direction);
                if (!firstVictim) {
                    firstVictim = victim;
                    firstDmg = dmg;
                } else if (this.onFireShot) {
                    this.onFireShot('railgun', muzzle.position, muzzle.direction, hitPoint, victim, dmg);
                }

                currentOrigin = hitPoint.clone().addScaledVector(muzzle.direction, 0.4);
                remainingRange = 180.0 - currentOrigin.distanceTo(muzzle.position);
            } else if (!victim) {
                endPoint = hitPoint;
                break;
            } else {
                currentOrigin = hitPoint.clone().addScaledVector(muzzle.direction, 0.2);
                remainingRange -= toi + 0.2;
            }
        }

        this.spawnTexturedRailgunBeam(muzzle.position, endPoint);
        if (this.onFireShot) this.onFireShot('railgun', muzzle.position, muzzle.direction, endPoint, firstVictim, firstDmg);
    }

    private spawnTexturedRailgunBeam(start: THREE.Vector3, end: THREE.Vector3) {
        const tex = this.getTexture(['/models/turrets/railgun/m0/railgun.png', '/models/turrets/railgun/railgun.png']);
        const dist = start.distanceTo(end);
        const midPoint = start.clone().lerp(end, 0.5);
        const dir = end.clone().sub(start).normalize();

        const beamGroup = new THREE.Group();
        beamGroup.position.copy(midPoint);
        beamGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

        const geo = new THREE.PlaneGeometry(0.7, dist);
        const mat = new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? 0xffffff : 0x93c5fd, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide });

        const p1 = new THREE.Mesh(geo, mat);
        const p2 = new THREE.Mesh(geo, mat);
        p2.rotation.y = Math.PI / 2;

        beamGroup.add(p1);
        beamGroup.add(p2);
        this.scene.add(beamGroup);

        let opacity = 1.0;
        const fadeInterval = setInterval(() => {
            opacity -= 0.12;
            mat.opacity = Math.max(0, opacity);
            if (opacity <= 0) {
                clearInterval(fadeInterval);
                this.scene.remove(beamGroup);
                geo.dispose();
                mat.dispose();
            }
        }, 30);
    }

    private async firePlasmaProjectile(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, weapon: 'ricochet' | 'twins', speed: number) {
        let slot = this.projectilePool.find(p => !p.active);
        if (!slot) {
            const mat = new THREE.SpriteMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            this.scene.add(sprite);
            slot = {
                sprite, material: mat, frames: [], active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
                shooter: null, weapon, bouncesLeft: 0, traveled: 0, maxDistance: 75.0, animTime: 0
            };
            this.projectilePool.push(slot);
        }

        const stripUrl = weapon === 'twins' ? '/models/turrets/twins/m0/charge.png' : '/models/turrets/ricochet/m0/ricochet_shot.png';
        const frames = await this.cutter.slice(stripUrl);
        slot.frames = frames; slot.active = true; slot.shooter = shooter; slot.weapon = weapon;
        slot.bouncesLeft = weapon === 'ricochet' ? 2 : 0; slot.traveled = 0; slot.maxDistance = weapon === 'twins' ? 55.0 : 75.0; slot.animTime = 0;

        slot.position.copy(muzzle.position);
        slot.velocity.copy(muzzle.direction).multiplyScalar(speed);
        slot.sprite.position.copy(slot.position);
        slot.sprite.scale.set(weapon === 'twins' ? 1.6 : 1.4, weapon === 'twins' ? 1.6 : 1.4, 1.0);
        if (frames && frames.length > 0) {
            slot.sprite.material.map = frames[0];
            slot.sprite.material.needsUpdate = true;
        }
        slot.sprite.visible = true;
    }

    public async fireRemotePlasmaVisual(weapon: 'twins' | 'ricochet', origin: THREE.Vector3, direction: THREE.Vector3) {
        let slot = this.projectilePool.find(p => !p.active);
        if (!slot) {
            const mat = new THREE.SpriteMaterial({ blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            this.scene.add(sprite);
            slot = {
                sprite, material: mat, frames: [], active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
                shooter: null, weapon, bouncesLeft: 0, traveled: 0, maxDistance: 75.0, animTime: 0
            };
            this.projectilePool.push(slot);
        }

        const stripUrl = weapon === 'twins' ? '/models/turrets/twins/m0/charge.png' : '/models/turrets/ricochet/m0/ricochet_shot.png';
        const frames = await this.cutter.slice(stripUrl);
        slot.frames = frames; slot.active = true; slot.shooter = null; slot.weapon = weapon;
        slot.bouncesLeft = 0; slot.traveled = 0; slot.maxDistance = weapon === 'twins' ? 55.0 : 75.0; slot.animTime = 0;

        slot.position.copy(origin);
        slot.velocity.copy(direction).multiplyScalar(weapon === 'twins' ? 48.0 : 42.0);
        slot.sprite.position.copy(slot.position);
        slot.sprite.scale.set(weapon === 'twins' ? 1.6 : 1.4, weapon === 'twins' ? 1.6 : 1.4, 1.0);
        if (frames && frames.length > 0) {
            slot.sprite.material.map = frames[0];
            slot.sprite.material.needsUpdate = true;
        }
        slot.sprite.visible = true;
    }

    private updateProjectiles(dt: number) {
        for (const p of this.projectilePool) {
            if (!p.active) continue;

            p.animTime += dt * 25.0;
            if (p.frames.length > 0) {
                const frameIdx = Math.floor(p.animTime) % p.frames.length;
                p.sprite.material.map = p.frames[frameIdx];
            }

            const step = p.velocity.clone().multiplyScalar(dt);
            const stepDist = step.length();
            const velLen = p.velocity.length();

            if (velLen < 0.001) {
                p.active = false; p.sprite.visible = false; continue;
            }

            const ray = new RAPIER.Ray({ x: p.position.x, y: p.position.y, z: p.position.z }, { x: p.velocity.x / velLen, y: p.velocity.y / velLen, z: p.velocity.z / velLen });
            const hit = this.world.castRayAndGetNormal(ray, stepDist, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, p.shooter));

            if (hit) {
                const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? 0);

                if (this.isShooterCollider(hit.collider, p.shooter)) {
                    p.position.add(step); p.sprite.position.copy(p.position); p.traveled += stepDist;
                    continue;
                }

                const hitNormal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
                const hitPoint = p.position.clone().add(p.velocity.clone().normalize().multiplyScalar(toi));
                const victim = this.getCombatantByCollider(hit.collider);

                if (victim && !victim.isDead && victim.id !== p.shooter?.id) {
                    if (p.shooter) {
                        const dmg = this.applyDamageToVictim(p.shooter, victim, WEAPON_CONFIGS[p.weapon], p.weapon, hitPoint, p.velocity.clone().normalize());
                        if (this.onFireShot) this.onFireShot(p.weapon, p.position, p.velocity.clone().normalize(), hitPoint, victim, dmg);
                    }
                    if (p.weapon === 'twins') this.vfx.spawnTwinsExplosion(hitPoint);
                    else this.vfx.spawnRicochetExplosion(hitPoint);
                    p.active = false; p.sprite.visible = false;
                    continue;
                } else if (p.bouncesLeft > 0) {
                    p.bouncesLeft--;
                    p.velocity.reflect(hitNormal);
                    p.position.copy(hitPoint).addScaledVector(hitNormal, 0.15);
                    p.sprite.position.copy(p.position);
                    this.audio.play('/models/turrets/ricochet/ricochet_ricochet.mp3', { channel: 'ricochet_bounce', volume: 0.75, fadeOldTime: 0.05 });
                    continue;
                } else {
                    if (p.weapon === 'twins') this.vfx.spawnTwinsExplosion(hitPoint);
                    else this.vfx.spawnRicochetExplosion(hitPoint);
                    p.active = false; p.sprite.visible = false;
                    continue;
                }
            }

            p.position.add(step);
            p.sprite.position.copy(p.position);
            p.traveled += stepDist;

            if (p.traveled >= p.maxDistance) {
                if (p.weapon === 'twins') this.vfx.spawnTwinsFade(p.position);
                else this.vfx.spawnRicochetExplosion(p.position);
                p.active = false; p.sprite.visible = false;
            }
        }
    }

    private executeRaycastShot(shooter: Combatant, muzzle: { position: THREE.Vector3; direction: THREE.Vector3 }, config: WeaponSpec, weapon: string) {
        let currentOrigin = muzzle.position.clone();
        let remainingRange = config.range || 180.0;
        let endPoint = muzzle.position.clone().add(muzzle.direction.clone().multiplyScalar(remainingRange));
        let hitVictim: Combatant | undefined;
        let hitDamage: number | undefined;

        for (let step = 0; step < 5 && remainingRange > 0.1; step++) {
            const ray = new RAPIER.Ray({ x: currentOrigin.x, y: currentOrigin.y, z: currentOrigin.z }, { x: muzzle.direction.x, y: muzzle.direction.y, z: muzzle.direction.z });
            const hit = this.world.castRayAndGetNormal(ray, remainingRange, true, undefined, undefined, undefined, undefined, (c: RAPIER.Collider) => !this.isShooterCollider(c, shooter));

            if (!hit) break;

            const toi = typeof hit === 'number' ? hit : ((hit as any).toi ?? (hit as any).timeOfImpact ?? 0);

            if (this.isShooterCollider(hit.collider, shooter)) {
                const advance = toi + 0.15;
                currentOrigin.addScaledVector(muzzle.direction, advance);
                remainingRange -= advance;
                continue;
            }

            endPoint = currentOrigin.clone().addScaledVector(muzzle.direction, toi);
            const victim = this.getCombatantByCollider(hit.collider);

            if (victim && !victim.isDead && victim.id !== shooter.id) {
                hitVictim = victim;
                hitDamage = this.applyDamageToVictim(shooter, victim, config, weapon, endPoint, muzzle.direction);
            }
            break;
        }

        this.spawnTracer(muzzle.position, endPoint, weapon);
        if (this.onFireShot) this.onFireShot(weapon, muzzle.position, muzzle.direction, endPoint, hitVictim, hitDamage);
    }

    private applyDamageToVictim(attacker: Combatant, victim: Combatant, config: WeaponSpec, weapon: string, hitPoint: THREE.Vector3, shotDir: THREE.Vector3): number {
        if (!victim || victim.id === attacker.id || victim.isDead) return 0;

        let isCrit = false;
        let rawDamage = THREE.MathUtils.randFloat(config.minDamage, config.maxDamage) * (attacker.damageMultiplier || 1.0);

        if (attacker.damageBuffTimer && attacker.damageBuffTimer > 0) rawDamage *= 2.0;

        if (config.critChance > 0 && Math.random() < config.critChance) {
            isCrit = true;
            rawDamage *= config.critMultiplier;
            if (weapon === 'smoky') {
                this.audio.play('/models/turrets/smoky/smoky_exp.mp3', { channel: 'smoky_crit', volume: 0.95 });
                this.vfx.spawnSmokyCrit(hitPoint);
            }
        }

        if (victim.armorBuffTimer && victim.armorBuffTimer > 0) rawDamage *= 0.5;

        const finalDamage = Math.floor(rawDamage);
        victim.currentHealth = Math.max(0, victim.currentHealth - finalDamage);
        if (victim.repairTimer && victim.repairTimer > 0) victim.repairTimer = 0;

        const impact = shotDir.clone().multiplyScalar(isCrit ? config.impactForce * 2.2 : config.impactForce);
        victim.controller.chassisBody?.applyImpulseAtPoint({ x: impact.x, y: impact.y, z: impact.z }, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);

        this.spawnDamageIndicator(hitPoint, finalDamage, isCrit || (attacker.damageBuffTimer ?? 0) > 0);
        if (victim.currentHealth <= 0 && !victim.isDead) this.handleDeath(attacker, victim, weapon);

        return finalDamage;
    }

    private handleDeath(killer: Combatant, victim: Combatant, weapon: string) {
        victim.isDead = true;
        victim.freezeRatio = 0.0; victim.burnTimer = 0.0; victim.burnIntensity = 0.0;
        victim.repairTimer = 0.0; victim.armorBuffTimer = 0.0; victim.damageBuffTimer = 0.0; victim.speedBuffTimer = 0.0;
        victim.controller.applyFrostVisual(0.0); victim.controller.applyBurnVisual(0.0);

        this.hud?.pushKillFeed(killer.name, victim.name, weapon);
        this.audio.play('/battle/death/explosion-tnk.mp3', { channel: 'tank_death', volume: 0.95 });

        const tankCenter = victim.controller.getPosition();
        const mass = victim.controller.hSpec?.mass || 2200;
        victim.controller.chassisBody?.applyImpulse({ x: 0, y: mass * 7.5, z: 0 }, true);
        victim.controller.chassisBody?.applyTorqueImpulse({ x: (Math.random() - 0.5) * mass * 4.5, y: 0, z: (Math.random() - 0.5) * mass * 4.5 }, true);

        this.vfx.playSequence({
            stripUrl: '/battle/death/explosion.png',
            position: tankCenter.clone().add(new THREE.Vector3(0, 1.2, 0)),
            duration: 0.65, scaleStart: 2.5, scaleEnd: 7.0,
            rotation: Math.random() * Math.PI * 2, easing: 'easeOutCubic', fadeOutRatio: 0.6
        });

        const deadTex = this.getTexture(['/battle/death/dead.jpg']);
        if (deadTex) {
            const deadMat = new THREE.MeshStandardMaterial({ map: deadTex, roughness: 0.9, metalness: 0.1 });
            victim.controller.visualRoot.traverse((node: any) => { if (node.isMesh) node.material = deadMat; });
        }

        setTimeout(() => {
            victim.isDead = false;
            victim.currentHealth = victim.maxHealth;
            victim.energy = 1.0;
            if (this.onRespawn) this.onRespawn(victim);
            else victim.controller.recover();
        }, 3500);
    }

    private updateStatusEffects(dt: number) {
        for (const c of this.allCombatants) {
            if (c.isDead) {
                c.burnTimer = 0; c.burnIntensity = 0; c.freezeRatio = 0;
                c.repairTimer = 0; c.armorBuffTimer = 0; c.damageBuffTimer = 0; c.speedBuffTimer = 0;
                c.controller.applyFrostVisual(0.0); c.controller.applyBurnVisual(0.0);
                continue;
            }

            if (c.repairTimer && c.repairTimer > 0) {
                c.repairTimer -= dt;
                c.currentHealth = Math.min(c.maxHealth, c.currentHealth + (c.maxHealth * 0.35) * dt);
            }

            if (c.armorBuffTimer && c.armorBuffTimer > 0) c.armorBuffTimer -= dt;
            if (c.damageBuffTimer && c.damageBuffTimer > 0) c.damageBuffTimer -= dt;
            if (c.speedBuffTimer && c.speedBuffTimer > 0) c.speedBuffTimer -= dt;

            if (c.burnTimer && c.burnTimer > 0) {
                c.burnTimer -= dt;
                c.currentHealth = Math.max(0, c.currentHealth - (26.0 * dt));
                c.burnIntensity = Math.min(1.0, c.burnTimer / 3.0);
                c.controller.applyBurnVisual(c.burnIntensity);

                if (c.currentHealth <= 0 && !c.isDead) this.handleDeath(c, c, 'firebird');
            } else if (c.burnIntensity && c.burnIntensity > 0) {
                c.burnIntensity = Math.max(0, c.burnIntensity - dt * 0.5);
                c.controller.applyBurnVisual(c.burnIntensity);
            }

            if (c.freezeTimer && c.freezeTimer > 0) c.freezeTimer -= dt;
            else if (c.freezeRatio && c.freezeRatio > 0) {
                c.freezeRatio = Math.max(0, c.freezeRatio - dt * 0.16);
                c.controller.applyFrostVisual(c.freezeRatio);
            }
        }
    }

    private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, weapon: string) {
        const isThunder = weapon === 'thunder';
        const isSmoky = weapon === 'smoky';
        const isShaft = weapon === 'shaft';
        const color = isThunder ? 0xf59e0b : (isSmoky ? 0xffcc00 : (isShaft ? 0xf97316 : 0xfde047));
        const width = isThunder ? 4 : (isSmoky ? 3 : 2);
        const lifeTime = isThunder ? 80 : 65;

        const mat = new THREE.LineBasicMaterial({ color, linewidth: width });
        const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        setTimeout(() => {
            this.scene.remove(line); geo.dispose(); mat.dispose();
        }, lifeTime);
    }

    public spawnDamageIndicator(hitPoint: THREE.Vector3, damage: number, isCrit: boolean) {
        const spawnWorldPos = hitPoint.clone().add(new THREE.Vector3(0, 0.7, 0));
        const proj = spawnWorldPos.project(this.camera);
        if (proj.z > 1.0) return;

        const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-(proj.y * 0.5) + 0.5) * window.innerHeight;

        const div = document.createElement('div');
        div.innerText = isCrit ? `CRIT! -${damage}` : `-${damage}`;
        div.style.cssText = `
            position: fixed; left: ${sx.toFixed(1)}px; top: ${sy.toFixed(1)}px;
            color: ${isCrit ? '#ff3b30' : '#ffcc00'}; font-size: ${isCrit ? '22px' : '17px'}; font-weight: 900;
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.85);
            pointer-events: none; z-index: 10001; transform: translate(-50%, -50%); transition: transform 0.75s ease-out, opacity 0.75s ease-out;
        `;
        document.body.appendChild(div);

        requestAnimationFrame(() => {
            div.style.transform = `translate(-50%, -140%) scale(1.15)`;
            div.style.opacity = '0';
        });

        setTimeout(() => div.remove(), 750);
    }
}