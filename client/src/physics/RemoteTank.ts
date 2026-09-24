import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { AssetLoader } from '../graphics/AssetLoader';
import { TANK_SPECS } from '../../../shared/constants';
import type { Combatant } from '../combat/WeaponManager';
import type { TankNetworkState } from '../../../shared/types';

export class RemoteTank {
    public id: string;
    public username: string;
    public rank: number;
    public hull: string;
    public turret: string;
    public paint: string;

    // Свойства для модификаций (M0-M3)
    public hullMod: string;
    public turretMod: string;

    public visualRoot = new THREE.Group();
    public hullWrapper = new THREE.Group();
    public hullModelContainer = new THREE.Group();
    public turretMount = new THREE.Group();
    public turretWrapper = new THREE.Group();
    public turretModelContainer = new THREE.Group();

    public currentHealth: number = 2000;
    public maxHealth: number = 2000;
    public isDead: boolean = false;
    public team: 'blue' | 'red' | 'neutral' = 'neutral';

    private targetPosition = new THREE.Vector3();
    private targetQuaternion = new THREE.Quaternion();
    private targetTurretYaw: number = 0;

    public collider?: RAPIER.Collider;
    public turretCollider?: RAPIER.Collider;
    public rigidBody?: RAPIER.RigidBody;
    private world: RAPIER.World;
    private scene: THREE.Scene;
    private assets: AssetLoader;

    public debugGroup = new THREE.Group();
    private hullWireframe?: THREE.LineSegments;
    private turretWireframe?: THREE.LineSegments;

    public combatantData!: Combatant;

    constructor(
        scene: THREE.Scene,
        world: RAPIER.World,
        assets: AssetLoader,
        state: TankNetworkState | any
    ) {
        this.scene = scene;
        this.world = world;
        this.assets = assets;
        this.id = state.id;
        this.username = state.username || `Tankist_${state.id.substring(0, 4)}`;
        this.rank = state.rank || 4;
        this.hull = state.hull || 'viking';
        this.turret = state.turret || 'smoky';
        this.paint = state.paint || 'green';
        this.hullMod = state.hullMod || 'm0';
        this.turretMod = state.turretMod || 'm0';
        this.currentHealth = state.hp || 2000;
        this.maxHealth = state.maxHp || 2000;

        this.targetPosition.set(state.x, state.y, state.z);
        this.targetQuaternion.set(state.rx, state.ry, state.rz, state.rw);
        this.targetTurretYaw = state.turretYaw;

        this.visualRoot.position.copy(this.targetPosition);
        this.visualRoot.quaternion.copy(this.targetQuaternion);

        this.visualRoot.add(this.hullWrapper);
        this.hullWrapper.rotation.y = Math.PI;
        this.hullWrapper.add(this.hullModelContainer);

        const hSpec = TANK_SPECS.hulls[this.hull as keyof typeof TANK_SPECS.hulls] || TANK_SPECS.hulls['viking'];
        const mountX = (hSpec as any)?.mountX ?? 0;
        this.turretMount.position.set(mountX, hSpec.mountY ?? 0.95, hSpec.mountZ ?? 0);

        this.visualRoot.add(this.turretMount);
        this.turretMount.add(this.turretWrapper);
        this.turretWrapper.rotation.y = Math.PI;
        this.turretWrapper.add(this.turretModelContainer);

        this.scene.add(this.visualRoot);

        const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(state.x, state.y, state.z);
        this.rigidBody = this.world.createRigidBody(bodyDesc);

        this.buildHitboxesAndVisualizers(state.hSpec, state.tSpec);
        this.setupCombatantAdapter();
        this.loadVisuals();
    }

    private async loadVisuals() {
        try {
            const hullMesh = await this.assets.loadModel('hulls', this.hull, 5.0, this.hullMod);
            const turretMesh = await this.assets.loadModel('turrets', this.turret, 4.0, this.turretMod);

            this.assets.applyPaint(hullMesh, this.paint);
            this.assets.applyPaint(turretMesh, this.paint);

            this.hullModelContainer.clear();
            this.hullModelContainer.add(hullMesh);

            this.turretModelContainer.clear();
            this.turretModelContainer.add(turretMesh);

            this.alignTurretToSocket();
        } catch (e) {
            console.warn(`[RemoteTank] Ошибка загрузки моделей ${this.id}:`, e);
        }
    }

    private alignTurretToSocket() {
        this.hullWrapper.updateMatrixWorld(true);
        let mountSocket: THREE.Object3D | null = null;

        this.hullModelContainer.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes('fmnt') || name.includes('flag')) return;
            if (name === 'mount' || name.startsWith('mount') || name === 'turret_mount' || name === 't_mount') {
                mountSocket = child;
            }
        });

        if (mountSocket) {
            const mountPos = new THREE.Vector3();
            (mountSocket as THREE.Object3D).getWorldPosition(mountPos);
            this.visualRoot.worldToLocal(mountPos);
            this.turretMount.position.copy(mountPos);
        }
    }

    private buildHitboxesAndVisualizers(serverHSpec?: any, serverTSpec?: any) {
        const halfWidth = serverHSpec?.halfWidth ?? 1.62;
        const halfHeight = serverHSpec?.halfHeight ?? 0.525;
        const halfLength = serverHSpec?.halfLength ?? 2.45;
        const centerY = serverHSpec?.centerY ?? 0.85;

        const turretW = serverTSpec?.boxWidth ?? 1.55;
        const turretH = serverTSpec?.boxHeight ?? 0.85;
        const turretL = serverTSpec?.boxLength ?? 2.85;
        const turretCenterY = serverTSpec?.centerY ?? 1.62;
        const turretCenterZ = serverTSpec?.centerZ ?? 0.0;

        if (this.collider) this.world.removeCollider(this.collider, false);
        const hullColDesc = RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfLength)
            .setTranslation(0, centerY, 0);
        this.collider = this.world.createCollider(hullColDesc, this.rigidBody!);

        if (this.hullWireframe) this.debugGroup.remove(this.hullWireframe);
        const hullGeo = new THREE.BoxGeometry(halfWidth * 2, halfHeight * 2, halfLength * 2);
        hullGeo.translate(0, centerY, 0);
        this.hullWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(hullGeo),
            new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 })
        );
        this.debugGroup.add(this.hullWireframe);

        if (this.turretCollider) this.world.removeCollider(this.turretCollider, false);
        const turretColDesc = RAPIER.ColliderDesc.cuboid(turretW / 2, turretH / 2, turretL / 2)
            .setTranslation(0, turretCenterY, turretCenterZ);
        this.turretCollider = this.world.createCollider(turretColDesc, this.rigidBody!);

        if (this.turretWireframe) this.debugGroup.remove(this.turretWireframe);
        const turretGeo = new THREE.BoxGeometry(turretW, turretH, turretL);
        turretGeo.translate(0, turretCenterY, turretCenterZ);
        this.turretWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(turretGeo),
            new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
        );
        this.debugGroup.add(this.turretWireframe);

        this.debugGroup.visible = false;
        this.visualRoot.add(this.debugGroup);
    }

    public toggleDebug(visible: boolean) {
        this.debugGroup.visible = visible;
    }

    private setupCombatantAdapter() {
        this.combatantData = {
            id: this.id,
            name: this.username,
            currentHealth: this.currentHealth,
            maxHealth: this.maxHealth,
            isDead: this.isDead,
            team: this.team,
            freezeRatio: 0.0,
            energy: 1.0,
            hullMod: this.hullMod,
            turretMod: this.turretMod,
            controller: {
                currentTurretName: this.turret,
                currentTurretMod: this.turretMod,
                currentHullName: this.hull,
                currentHullMod: this.hullMod,
                hSpec: { mass: 2200, halfHeight: 0.45, halfLength: 2.2 },
                turretMount: this.turretMount,
                visualRoot: this.visualRoot,
                chassisBody: this.rigidBody as any,
                chassisCollider: this.collider,
                turretCollider: this.turretCollider,
                getPosition: () => this.visualRoot.position.clone(),
                applyFrostVisual: () => { },
                applyBurnVisual: () => { },
                recover: () => { }
            } as any
        };
    }

    public applyServerState(state: TankNetworkState | any) {
        this.targetPosition.set(state.x, state.y, state.z);
        this.targetQuaternion.set(state.rx, state.ry, state.rz, state.rw);
        this.targetTurretYaw = state.turretYaw;

        this.currentHealth = state.hp;
        this.maxHealth = state.maxHp;
        this.combatantData.currentHealth = this.currentHealth;

        if (state.isDead && !this.isDead) {
            this.triggerDeathVisual();
        } else if (!state.isDead && this.isDead) {
            this.triggerRespawnVisual(state.x, state.y, state.z);
        }
    }

    public triggerDeathVisual() {
        this.isDead = true;
        this.combatantData.isDead = true;

        const texLoader = new THREE.TextureLoader();
        texLoader.load('/battle/death/dead.jpg', (deadTex) => {
            deadTex.colorSpace = THREE.SRGBColorSpace;
            const deadMat = new THREE.MeshStandardMaterial({ map: deadTex, roughness: 0.9, metalness: 0.1 });
            this.visualRoot.traverse((child: any) => {
                if (child.isMesh) child.material = deadMat;
            });
        });
    }

    public triggerRespawnVisual(x?: number, y?: number, z?: number) {
        this.isDead = false;
        this.combatantData.isDead = false;
        this.currentHealth = this.maxHealth;
        this.combatantData.currentHealth = this.maxHealth;

        if (x !== undefined && y !== undefined && z !== undefined) {
            this.targetPosition.set(x, y, z);
            this.visualRoot.position.set(x, y, z);
        }

        this.assets.applyPaint(this.hullModelContainer, this.paint);
        this.assets.applyPaint(this.turretModelContainer, this.paint);
    }

    public update(dt: number) {
        const lerpFactor = 1.0 - Math.exp(-22.0 * dt);
        this.visualRoot.position.lerp(this.targetPosition, lerpFactor);
        this.visualRoot.quaternion.slerp(this.targetQuaternion, lerpFactor);

        let diffYaw = this.targetTurretYaw - this.turretMount.rotation.y;
        while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
        while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
        this.turretMount.rotation.y += diffYaw * (1.0 - Math.exp(-25.0 * dt));

        if (this.turretCollider) {
            const currentYaw = this.turretMount.rotation.y;
            const turretRot = new RAPIER.Quaternion(0, Math.sin(currentYaw / 2), 0, Math.cos(currentYaw / 2));
            this.turretCollider.setRotation(turretRot);
        }

        if (this.rigidBody) {
            this.rigidBody.setTranslation({
                x: this.visualRoot.position.x,
                y: this.visualRoot.position.y,
                z: this.visualRoot.position.z
            }, true);
            this.rigidBody.setRotation({
                x: this.visualRoot.quaternion.x,
                y: this.visualRoot.quaternion.y,
                z: this.visualRoot.quaternion.z,
                w: this.visualRoot.quaternion.w
            }, true);
        }
    }

    public destroy() {
        this.scene.remove(this.visualRoot);
        if (this.collider) this.world.removeCollider(this.collider, true);
        if (this.turretCollider) this.world.removeCollider(this.turretCollider, true);
        if (this.rigidBody) this.world.removeRigidBody(this.rigidBody);
    }
}