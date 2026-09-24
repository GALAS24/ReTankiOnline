import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { AssetLoader } from '../graphics/AssetLoader';

export interface HullSpec {
    mass: number;
    mountX: number;
    mountY: number;
    mountZ: number;
    rotY: number;
    visualOffsetY: number;
    visualScale: number;
    halfWidth: number;
    halfLength: number;
    halfHeight: number;
    colliderOffsetY: number;
    trackWidthRatio: number;
    trackLengthRatio: number;
    rayOriginY: number;
    suspensionRestLength: number;
    suspensionStiffness: number;
    suspensionDamping: number;
    driveForce: number;
    turnTorque: number;
    maxSpeed: number;
    reverseSpeed: number;
}

export interface TurretSpec {
    pivotX: number;
    pivotY: number;
    pivotZ: number;
    rotY: number;
    visualScale: number;
    boxWidth: number;
    boxHeight: number;
    boxLength: number;
    boxOffsetY: number;
    boxOffsetZ: number;
    maxTurretSpeed: number;
    recoilForce: number;
}

export interface TankConfig {
    hulls: Record<string, HullSpec>;
    turrets: Record<string, TurretSpec>;
}

export const DEFAULT_TANK_SPECS: TankConfig = {
    hulls: {
        'wasp': {
            mass: 1200,
            mountX: 0.0, mountY: 0.85, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.15, halfLength: 1.85, halfHeight: 0.35, colliderOffsetY: 0.45,
            trackWidthRatio: 0.95, trackLengthRatio: 1.80, rayOriginY: 0.08,
            suspensionRestLength: 0.85, suspensionStiffness: 42000, suspensionDamping: 3200,
            driveForce: 45000, turnTorque: 34000, maxSpeed: 21.0, reverseSpeed: 12.0
        },
        'hornet': {
            mass: 1500,
            mountX: 0.0, mountY: 0.90, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.25, halfLength: 2.10, halfHeight: 0.36, colliderOffsetY: 0.48,
            trackWidthRatio: 0.95, trackLengthRatio: 1.85, rayOriginY: 0.08,
            suspensionRestLength: 0.90, suspensionStiffness: 50000, suspensionDamping: 3800,
            driveForce: 52000, turnTorque: 38000, maxSpeed: 18.0, reverseSpeed: 10.0
        },
        'hunter': {
            mass: 2000,
            mountX: 0.0, mountY: 0.95, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.40, halfLength: 2.30, halfHeight: 0.38, colliderOffsetY: 0.50,
            trackWidthRatio: 0.95, trackLengthRatio: 1.85, rayOriginY: 0.08,
            suspensionRestLength: 0.92, suspensionStiffness: 60000, suspensionDamping: 4200,
            driveForce: 60000, turnTorque: 45000, maxSpeed: 15.0, reverseSpeed: 8.5
        },
        'viking': {
            mass: 2500,
            mountX: 0.0, mountY: 0.95, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.55, halfLength: 2.45, halfHeight: 0.38, colliderOffsetY: 0.50,
            trackWidthRatio: 0.95, trackLengthRatio: 1.85, rayOriginY: 0.08,
            suspensionRestLength: 0.95, suspensionStiffness: 72000, suspensionDamping: 4800,
            driveForce: 72000, turnTorque: 54000, maxSpeed: 13.5, reverseSpeed: 7.5
        },
        'dictator': {
            mass: 3200,
            mountX: 0.0, mountY: 1.15, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.60, halfLength: 2.70, halfHeight: 0.45, colliderOffsetY: 0.58,
            trackWidthRatio: 0.95, trackLengthRatio: 1.88, rayOriginY: 0.10,
            suspensionRestLength: 1.00, suspensionStiffness: 85000, suspensionDamping: 5400,
            driveForce: 84000, turnTorque: 62000, maxSpeed: 11.5, reverseSpeed: 6.5
        },
        'titan': {
            mass: 3800,
            mountX: 0.0, mountY: 1.05, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.70, halfLength: 2.65, halfHeight: 0.44, colliderOffsetY: 0.55,
            trackWidthRatio: 0.96, trackLengthRatio: 1.88, rayOriginY: 0.10,
            suspensionRestLength: 1.00, suspensionStiffness: 94000, suspensionDamping: 6000,
            driveForce: 96000, turnTorque: 70000, maxSpeed: 10.0, reverseSpeed: 5.5
        },
        'mammoth': {
            mass: 4500,
            mountX: 0.0, mountY: 1.20, mountZ: 0.0, rotY: 0.0,
            visualOffsetY: 0.0, visualScale: 1.0,
            halfWidth: 1.80, halfLength: 2.85, halfHeight: 0.48, colliderOffsetY: 0.60,
            trackWidthRatio: 0.98, trackLengthRatio: 1.90, rayOriginY: 0.10,
            suspensionRestLength: 1.05, suspensionStiffness: 108000, suspensionDamping: 6800,
            driveForce: 115000, turnTorque: 82000, maxSpeed: 8.5, reverseSpeed: 5.0
        }
    },
    turrets: {
        'smoky': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.2, boxHeight: 0.6, boxLength: 2.4, boxOffsetY: 0.3, boxOffsetZ: 0.4,
            maxTurretSpeed: 2.4, recoilForce: 3500
        },
        'firebird': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.2, boxHeight: 0.6, boxLength: 2.2, boxOffsetY: 0.3, boxOffsetZ: 0.3,
            maxTurretSpeed: 2.2, recoilForce: 1000
        },
        'twins': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.3, boxHeight: 0.6, boxLength: 2.5, boxOffsetY: 0.3, boxOffsetZ: 0.4,
            maxTurretSpeed: 2.2, recoilForce: 2000
        },
        'railgun': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.1, boxHeight: 0.55, boxLength: 4.6, boxOffsetY: 0.28, boxOffsetZ: 1.1,
            maxTurretSpeed: 1.5, recoilForce: 12000
        },
        'isida': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.2, boxHeight: 0.6, boxLength: 2.4, boxOffsetY: 0.3, boxOffsetZ: 0.4,
            maxTurretSpeed: 2.3, recoilForce: 1200
        },
        'thunder': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.3, boxHeight: 0.65, boxLength: 3.6, boxOffsetY: 0.32, boxOffsetZ: 0.8,
            maxTurretSpeed: 1.8, recoilForce: 7000
        },
        'freeze': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.2, boxHeight: 0.6, boxLength: 2.3, boxOffsetY: 0.3, boxOffsetZ: 0.3,
            maxTurretSpeed: 2.2, recoilForce: 1000
        },
        'ricochet': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.3, boxHeight: 0.6, boxLength: 2.8, boxOffsetY: 0.3, boxOffsetZ: 0.5,
            maxTurretSpeed: 2.0, recoilForce: 3000
        },
        'shaft': {
            pivotX: 0, pivotY: 0, pivotZ: 0, rotY: 0, visualScale: 1.0,
            boxWidth: 1.2, boxHeight: 0.6, boxLength: 4.8, boxOffsetY: 0.3, boxOffsetZ: 1.4,
            maxTurretSpeed: 1.2, recoilForce: 15000
        }
    }
};

interface SuspensionRay {
    localOrigin: THREE.Vector3;
    localDir: THREE.Vector3;
    isTrackLeft: boolean;
}

export class TankPhysicsController {
    public world: RAPIER.World;
    public chassisBody: RAPIER.RigidBody;
    public chassisCollider: RAPIER.Collider;
    public turretCollider: RAPIER.Collider;

    public visualRoot = new THREE.Group();
    public hullWrapper = new THREE.Group();
    public hullModelContainer = new THREE.Group();
    public turretMount = new THREE.Group();
    public turretWrapper = new THREE.Group();
    public turretModelContainer = new THREE.Group();

    public get hullVisual(): THREE.Group {
        return (this.hullModelContainer.children[0] as THREE.Group) || this.hullModelContainer;
    }

    public get turretVisual(): THREE.Group {
        return (this.turretModelContainer.children[0] as THREE.Group) || this.turretModelContainer;
    }

    public debugGroup = new THREE.Group();
    private hullWireframe!: THREE.LineSegments;
    private turretWireframe!: THREE.LineSegments;
    private turretPivotMarker!: THREE.Group;
    private rayDebugLines: THREE.Line[] = [];

    public specs: TankConfig;
    public currentHullName: string;
    public currentHullMod: string;
    public currentTurretName: string;
    public currentTurretMod: string;
    public hSpec: HullSpec;
    public tSpec: TurretSpec;
    public isFlipped = false;

    public freezeRatio: number = 0.0;
    public burnRatio: number = 0.0;

    private rays: SuspensionRay[] = [];

    constructor(
        world: RAPIER.World,
        hullMesh: THREE.Group,
        turretMesh: THREE.Group,
        spawnPos: THREE.Vector3,
        hullName: string = 'viking',
        turretName: string = 'railgun',
        hullMod: string = 'm0',
        turretMod: string = 'm0'
    ) {
        this.world = world;
        this.currentHullName = hullName;
        this.currentHullMod = hullMod;
        this.currentTurretName = turretName;
        this.currentTurretMod = turretMod;

        this.specs = this.loadSanitizedSpecs();
        this.hSpec = this.specs.hulls[hullName] || this.specs.hulls['viking'];
        this.tSpec = this.specs.turrets[turretName] || this.specs.turrets['railgun'];

        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
            .setLinearDamping(0.6)
            .setAngularDamping(3.2)
            .setCcdEnabled(true)
            .setAdditionalMass(this.hSpec.mass);

        this.chassisBody = this.world.createRigidBody(bodyDesc);

        // 1. Коллайдер корпуса (Chassis Collider)
        const hullColDesc = RAPIER.ColliderDesc.cuboid(
            this.hSpec.halfWidth,
            this.hSpec.halfHeight,
            this.hSpec.halfLength
        )
            .setTranslation(0, this.hSpec.colliderOffsetY, 0)
            .setFriction(0.2)
            .setRestitution(0.0);
        this.chassisCollider = this.world.createCollider(hullColDesc, this.chassisBody);

        // 2. Коллайдер башни (Turret Collider)
        const turretColDesc = RAPIER.ColliderDesc.cuboid(
            Math.max(0.4, this.tSpec.boxWidth / 2),
            Math.max(0.3, this.tSpec.boxHeight / 2),
            Math.max(0.5, this.tSpec.boxLength / 2)
        )
            .setTranslation(
                this.hSpec.mountX,
                this.hSpec.mountY + (this.tSpec.boxOffsetY || 0.3),
                this.hSpec.mountZ + (this.tSpec.boxOffsetZ || 0.4)
            )
            .setFriction(0.2)
            .setRestitution(0.0);
        this.turretCollider = this.world.createCollider(turretColDesc, this.chassisBody);

        // Дерево сцены Three.js
        this.visualRoot.add(this.hullWrapper);
        this.hullWrapper.rotation.y = Math.PI;
        this.hullWrapper.add(this.hullModelContainer);
        this.hullModelContainer.add(hullMesh);

        this.visualRoot.add(this.turretMount);
        this.turretMount.add(this.turretWrapper);
        this.turretWrapper.rotation.y = Math.PI;
        this.turretWrapper.add(this.turretModelContainer);
        this.turretModelContainer.add(turretMesh);

        this.alignTurretToSocket();
        this.setupSuspensionRays();
        this.buildDebugVisualizers();

        this.toggleDebug(false);

        this.applyTuning();
        this.autoFitHullHitbox();
        this.autoFitTurretHitbox();
    }

    public resetOrientation(yaw: number = 0) {
        this.turretMount.rotation.y = 0;
        this.syncTurretColliderRotation(0);
        this.isFlipped = false;

        this.freezeRatio = 0.0;
        this.burnRatio = 0.0;
        this.applyFrostVisual(0.0);
        this.applyBurnVisual(0.0);

        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        this.chassisBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
        this.chassisBody.setLinvel({ x: 0, y: 0.0, z: 0 }, true);
        this.chassisBody.setAngvel({ x: 0, y: 0.0, z: 0 }, true);

        this.visualRoot.position.copy(this.getPosition());
        this.visualRoot.quaternion.copy(q);
    }

    public applyFrostVisual(ratio: number) {
        this.freezeRatio = THREE.MathUtils.clamp(ratio, 0, 1);
        const frostColor = new THREE.Color(0x7dd3fc);

        this.visualRoot.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat: any) => {
                    if (mat.color) {
                        if (!mat.userData.baseColor) {
                            mat.userData.baseColor = mat.color.clone();
                        }
                        mat.color.copy(mat.userData.baseColor).lerp(frostColor, this.freezeRatio * 0.75);
                    }
                });
            }
        });
    }

    public applyBurnVisual(ratio: number) {
        this.burnRatio = THREE.MathUtils.clamp(ratio, 0, 1);
        if (this.burnRatio <= 0 && this.freezeRatio > 0) return;

        const burnColor = new THREE.Color(0xf97316);

        this.visualRoot.traverse((child: any) => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat: any) => {
                    if (mat.color) {
                        if (!mat.userData.baseColor) {
                            mat.userData.baseColor = mat.color.clone();
                        }
                        mat.color.copy(mat.userData.baseColor).lerp(burnColor, this.burnRatio * 0.85);
                    }
                });
            }
        });
    }

    public toggleDebug(force?: boolean): boolean {
        const vis = force !== undefined ? force : !this.debugGroup.visible;
        this.debugGroup.visible = vis;
        if (this.hullWireframe) this.hullWireframe.visible = vis;
        if (this.turretWireframe) this.turretWireframe.visible = vis;
        if (this.turretPivotMarker) this.turretPivotMarker.visible = vis;
        for (const line of this.rayDebugLines) {
            line.visible = vis;
        }
        return vis;
    }

    public alignTurretToSocket() {
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

            this.hSpec.mountX = mountPos.x;
            this.hSpec.mountY = mountPos.y;
            this.hSpec.mountZ = mountPos.z;
            this.turretMount.position.copy(mountPos);
        } else {
            const hullBox = new THREE.Box3().setFromObject(this.hullWrapper);
            const deckY = hullBox.max.y - 0.03;
            this.hSpec.mountX = 0;
            this.hSpec.mountY = deckY;
            this.hSpec.mountZ = 0;
            this.turretMount.position.set(0, deckY, 0);
        }

        this.tSpec.pivotX = 0;
        this.tSpec.pivotY = 0;
        this.tSpec.pivotZ = 0;
        this.turretWrapper.position.set(0, 0, 0);
    }

    private loadSanitizedSpecs(): TankConfig {
        const defaults: TankConfig = JSON.parse(JSON.stringify(DEFAULT_TANK_SPECS));
        const savedRaw = localStorage.getItem('retanki_tank_specs');
        if (!savedRaw) return defaults;

        try {
            const parsed = JSON.parse(savedRaw);
            for (const h in defaults.hulls) {
                if (parsed.hulls?.[h]) {
                    defaults.hulls[h] = {
                        ...defaults.hulls[h],
                        ...parsed.hulls[h],
                        visualScale: 1.0,
                        rotY: 0.0
                    };
                }
            }
            for (const t in defaults.turrets) {
                if (parsed.turrets?.[t]) {
                    defaults.turrets[t] = {
                        ...defaults.turrets[t],
                        ...parsed.turrets[t],
                        visualScale: 1.0,
                        rotY: 0.0,
                        pivotX: 0.0,
                        pivotZ: 0.0
                    };
                }
            }
        } catch {
            console.warn('[TankPhysics] Использованы стандартные настройки');
        }
        return defaults;
    }

    private buildDebugVisualizers() {
        const hullGeo = new THREE.BoxGeometry(
            this.hSpec.halfWidth * 2,
            this.hSpec.halfHeight * 2,
            this.hSpec.halfLength * 2
        );
        hullGeo.translate(0, this.hSpec.colliderOffsetY, 0);
        this.hullWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(hullGeo),
            new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 })
        );
        this.debugGroup.add(this.hullWireframe);

        const turretGeo = new THREE.BoxGeometry(this.tSpec.boxWidth, this.tSpec.boxHeight, this.tSpec.boxLength);
        turretGeo.translate(0, this.tSpec.boxOffsetY, this.tSpec.boxOffsetZ);
        this.turretWireframe = new THREE.LineSegments(
            new THREE.WireframeGeometry(turretGeo),
            new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
        );
        this.turretWrapper.add(this.turretWireframe);

        this.turretPivotMarker = new THREE.Group();
        const ring = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(
                new THREE.Path().absarc(0, 0, 0.45, 0, Math.PI * 2, true).getPoints(32).map(p => new THREE.Vector3(p.x, 0, p.y))
            ),
            new THREE.LineBasicMaterial({ color: 0xf59e0b })
        );
        const axes = new THREE.AxesHelper(0.6);
        this.turretPivotMarker.add(ring);
        this.turretPivotMarker.add(axes);
        this.turretMount.add(this.turretPivotMarker);

        this.visualRoot.add(this.debugGroup);
    }

    private getLocalBounds(relativeTo: THREE.Object3D, targetObject: THREE.Object3D): THREE.Box3 {
        const box = new THREE.Box3();
        relativeTo.updateMatrixWorld(true);
        targetObject.updateMatrixWorld(true);

        const invRel = relativeTo.matrixWorld.clone().invert();
        const corners = [
            new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
            new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
        ];

        targetObject.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh && mesh.geometry) {
                if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
                const b = mesh.geometry.boundingBox;
                if (!b) return;

                const meshToRel = mesh.matrixWorld.clone().premultiply(invRel);

                corners[0].set(b.min.x, b.min.y, b.min.z).applyMatrix4(meshToRel);
                corners[1].set(b.min.x, b.min.y, b.max.z).applyMatrix4(meshToRel);
                corners[2].set(b.min.x, b.max.y, b.min.z).applyMatrix4(meshToRel);
                corners[3].set(b.min.x, b.max.y, b.max.z).applyMatrix4(meshToRel);
                corners[4].set(b.max.x, b.min.y, b.min.z).applyMatrix4(meshToRel);
                corners[5].set(b.max.x, b.min.y, b.max.z).applyMatrix4(meshToRel);
                corners[6].set(b.max.x, b.max.y, b.min.z).applyMatrix4(meshToRel);
                corners[7].set(b.max.x, b.max.y, b.max.z).applyMatrix4(meshToRel);

                for (const c of corners) {
                    box.expandByPoint(c);
                }
            }
        });

        return box;
    }

    public autoFitHullHitbox() {
        const localBox = this.getLocalBounds(this.visualRoot, this.hullWrapper);
        if (localBox.isEmpty()) return;

        const size = localBox.getSize(new THREE.Vector3());

        this.hSpec.halfWidth = Number((size.x / 2).toFixed(2));
        this.hSpec.halfLength = Number((size.z / 2).toFixed(2));

        const clearanceRatio = 0.30;
        const effectiveHeight = size.y * (1.0 - clearanceRatio);
        this.hSpec.halfHeight = Number((effectiveHeight / 2).toFixed(2));
        this.hSpec.colliderOffsetY = Number((localBox.max.y - this.hSpec.halfHeight).toFixed(2));

        this.updateHitboxGeometry();
        this.setupSuspensionRays();
    }

    public autoFitTurretHitbox() {
        const localBox = this.getLocalBounds(this.turretWrapper, this.turretModelContainer);
        if (localBox.isEmpty()) return;

        const size = localBox.getSize(new THREE.Vector3());
        const center = localBox.getCenter(new THREE.Vector3());

        this.tSpec.boxWidth = Number(size.x.toFixed(2));
        this.tSpec.boxHeight = Number(size.y.toFixed(2));
        this.tSpec.boxLength = Number(size.z.toFixed(2));

        this.tSpec.boxOffsetY = Number(center.y.toFixed(2));
        this.tSpec.boxOffsetZ = Number(center.z.toFixed(2));

        this.updateHitboxGeometry();
    }

    public updateHitboxGeometry() {
        if (!this.hullWireframe || !this.turretWireframe) return;

        this.hullWireframe.geometry.dispose();
        const hullGeo = new THREE.BoxGeometry(
            this.hSpec.halfWidth * 2,
            this.hSpec.halfHeight * 2,
            this.hSpec.halfLength * 2
        );
        hullGeo.translate(0, this.hSpec.colliderOffsetY, 0);
        this.hullWireframe.geometry = new THREE.WireframeGeometry(hullGeo);

        this.turretWireframe.geometry.dispose();
        const turretGeo = new THREE.BoxGeometry(this.tSpec.boxWidth, this.tSpec.boxHeight, this.tSpec.boxLength);
        turretGeo.translate(0, this.tSpec.boxOffsetY, this.tSpec.boxOffsetZ);
        this.turretWireframe.geometry = new THREE.WireframeGeometry(turretGeo);

        if (this.chassisCollider) {
            this.world.removeCollider(this.chassisCollider, true);
            const colliderDesc = RAPIER.ColliderDesc.cuboid(
                this.hSpec.halfWidth,
                this.hSpec.halfHeight,
                this.hSpec.halfLength
            )
                .setTranslation(0, this.hSpec.colliderOffsetY, 0)
                .setFriction(0.2)
                .setRestitution(0.0);
            this.chassisCollider = this.world.createCollider(colliderDesc, this.chassisBody);
        }

        if (this.turretCollider) {
            this.world.removeCollider(this.turretCollider, true);
            const turretColDesc = RAPIER.ColliderDesc.cuboid(
                Math.max(0.4, this.tSpec.boxWidth / 2),
                Math.max(0.3, this.tSpec.boxHeight / 2),
                Math.max(0.5, this.tSpec.boxLength / 2)
            )
                .setTranslation(
                    this.hSpec.mountX,
                    this.hSpec.mountY + (this.tSpec.boxOffsetY || 0.3),
                    this.hSpec.mountZ + (this.tSpec.boxOffsetZ || 0.4)
                )
                .setFriction(0.2)
                .setRestitution(0.0);
            this.turretCollider = this.world.createCollider(turretColDesc, this.chassisBody);
        }
    }

    public syncTurretColliderRotation(turretYaw: number) {
        if (!this.turretCollider) return;
        const totalYaw = Math.PI + (this.tSpec.rotY || 0) + turretYaw;
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), totalYaw);
        const boxOffset = new THREE.Vector3(
            0,
            this.tSpec.boxOffsetY || 0.3,
            this.tSpec.boxOffsetZ || 0.4
        ).applyQuaternion(q);

        const pos = new THREE.Vector3(this.hSpec.mountX, this.hSpec.mountY, this.hSpec.mountZ).add(boxOffset);
        this.turretCollider.setTranslationWrtParent(pos);
        this.turretCollider.setRotationWrtParent({ x: q.x, y: q.y, z: q.z, w: q.w });
    }

    public setupSuspensionRays() {
        this.rays = [];
        for (const line of this.rayDebugLines) this.debugGroup.remove(line);
        this.rayDebugLines = [];

        const trackX = this.hSpec.halfWidth * (this.hSpec.trackWidthRatio || 0.95);
        const length = this.hSpec.halfLength * (this.hSpec.trackLengthRatio || 1.85);
        const countPerTrack = 6;
        const zStep = length / (countPerTrack - 1);
        const zStart = length / 2;

        const sides = [
            { isLeft: true, x: -trackX },
            { isLeft: false, x: trackX }
        ];

        const restLength = this.hSpec.suspensionRestLength || 0.95;

        for (const side of sides) {
            for (let i = 0; i < countPerTrack; i++) {
                const z = zStart - (i * zStep);
                let dir = new THREE.Vector3(0, -1, 0);

                if (i === 0) {
                    dir = new THREE.Vector3(0, -Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)).normalize();
                } else if (i === countPerTrack - 1) {
                    dir = new THREE.Vector3(0, -Math.cos(Math.PI / 7), -Math.sin(Math.PI / 7)).normalize();
                }

                this.rays.push({
                    localOrigin: new THREE.Vector3(side.x, this.hSpec.rayOriginY || 0.08, z),
                    localDir: dir,
                    isTrackLeft: side.isLeft
                });

                const lineGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(0, -restLength, 0)
                ]);
                const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0x33ff33 }));
                line.visible = this.debugGroup.visible;
                this.debugGroup.add(line);
                this.rayDebugLines.push(line);
            }
        }
    }

    public update(dt: number, driveInput: number = 0, turnInput: number = 0) {
        if (!this.chassisBody) return;

        const bodyTrans = this.chassisBody.translation();
        const bodyRot = this.chassisBody.rotation();

        if (isNaN(bodyTrans.x) || isNaN(bodyTrans.y) || isNaN(bodyTrans.z)) {
            this.recover();
            return;
        }

        const chassisPos = new THREE.Vector3(bodyTrans.x, bodyTrans.y, bodyTrans.z);
        const chassisQuat = new THREE.Quaternion(bodyRot.x, bodyRot.y, bodyRot.z, bodyRot.w);

        this.visualRoot.position.copy(chassisPos);
        this.visualRoot.quaternion.copy(chassisQuat);

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(chassisQuat);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(chassisQuat);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(chassisQuat);

        this.isFlipped = up.y < 0.25;

        const linVel = this.chassisBody.linvel();
        const angVel = this.chassisBody.angvel();
        const linVelVec = new THREE.Vector3(linVel.x, linVel.y, linVel.z);
        const angVelVec = new THREE.Vector3(angVel.x, angVel.y, angVel.z);

        const currentForwardSpeed = linVelVec.dot(forward);

        const freezeSpeedMult = THREE.MathUtils.lerp(1.0, 0.30, this.freezeRatio);
        const freezeTurnMult = THREE.MathUtils.lerp(1.0, 0.25, this.freezeRatio);

        const effectiveMaxSpeed = this.hSpec.maxSpeed * freezeSpeedMult;
        const effectiveReverseSpeed = this.hSpec.reverseSpeed * freezeSpeedMult;

        let forwardThrottle = 1.0;
        if (driveInput > 0) {
            if (currentForwardSpeed >= effectiveMaxSpeed) {
                forwardThrottle = 0.0;
            } else if (currentForwardSpeed > effectiveMaxSpeed * 0.85) {
                forwardThrottle = (effectiveMaxSpeed - currentForwardSpeed) / (effectiveMaxSpeed * 0.15);
            }
        } else if (driveInput < 0) {
            if (currentForwardSpeed <= -effectiveReverseSpeed) {
                forwardThrottle = 0.0;
            } else if (currentForwardSpeed < -effectiveReverseSpeed * 0.85) {
                forwardThrottle = (-effectiveReverseSpeed - currentForwardSpeed) / (-effectiveReverseSpeed * 0.15);
            }
        }

        let groundedWheels = 0;
        const restLen = this.hSpec.suspensionRestLength || 0.95;
        const maxRayDist = restLen * 1.30;
        const wheelMass = this.hSpec.mass / this.rays.length;

        for (let i = 0; i < this.rays.length; i++) {
            const rayData = this.rays[i];
            const debugLine = this.rayDebugLines[i];

            const worldOrigin = rayData.localOrigin.clone().applyQuaternion(chassisQuat).add(chassisPos);
            const worldDir = rayData.localDir.clone().applyQuaternion(chassisQuat).normalize();

            if (debugLine) {
                debugLine.position.copy(rayData.localOrigin);
                debugLine.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), rayData.localDir);
            }

            const ray = new RAPIER.Ray(
                { x: worldOrigin.x, y: worldOrigin.y, z: worldOrigin.z },
                { x: worldDir.x, y: worldDir.y, z: worldDir.z }
            );

            // Безопасный вызов луча с корректным порядком аргументов (фильтр на 8-й позиции)
            const hit = this.world.castRayAndGetNormal(
                ray,
                maxRayDist,
                true,
                undefined,
                undefined,
                undefined,
                undefined,
                (c: RAPIER.Collider) => c.handle !== this.chassisCollider.handle && (!this.turretCollider || c.handle !== this.turretCollider.handle)
            );

            if (hit) {
                const toi = typeof (hit as any).timeOfImpact === 'number' ? (hit as any).timeOfImpact : (hit as any).toi;

                if (toi !== undefined && toi < maxRayDist) {
                    const hitNormal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z);

                    if (hitNormal.y > 0.15) {
                        groundedWheels++;
                        const dist = toi;

                        const pointOffset = worldOrigin.clone().sub(chassisPos);
                        const pointVel = linVelVec.clone().add(angVelVec.clone().cross(pointOffset));

                        const compression = Math.max(0, restLen - dist);
                        const springSpeed = pointVel.dot(worldDir);
                        const rawForce = (compression * this.hSpec.suspensionStiffness) + (springSpeed * this.hSpec.suspensionDamping);
                        const springForce = Math.max(0, rawForce);
                        const suspForceVec = new THREE.Vector3(0, 1, 0).multiplyScalar(springForce);

                        let trackInput = 0;
                        if (turnInput !== 0) {
                            const turnContrib = (rayData.isTrackLeft ? turnInput : -turnInput) * 0.95;
                            if (driveInput !== 0) {
                                trackInput = (driveInput * forwardThrottle * 0.65) + turnContrib;
                            } else {
                                trackInput = turnContrib;
                            }
                        } else {
                            trackInput = driveInput * forwardThrottle;
                        }

                        let tractiveDir = forward.clone().projectOnPlane(hitNormal);
                        if (tractiveDir.lengthSq() > 0.001) tractiveDir.normalize();
                        else tractiveDir.copy(forward);

                        const forcePerWheel = (this.hSpec.driveForce * freezeSpeedMult) / this.rays.length;
                        const driveForceVec = tractiveDir.multiplyScalar(trackInput * forcePerWheel);

                        let sideDir = right.clone().projectOnPlane(hitNormal);
                        if (sideDir.lengthSq() > 0.001) sideDir.normalize();
                        else sideDir.copy(right);

                        const lateralSpeed = pointVel.dot(sideDir);
                        const frictionGrip = turnInput !== 0 ? 0.25 : 1.0;
                        const maxAllowedLateralImpulse = Math.abs(lateralSpeed) * wheelMass * frictionGrip;
                        const desiredLateralImpulse = -lateralSpeed * wheelMass * Math.min(1.0, 16.0 * dt) * frictionGrip;
                        const clampedLateralImpulse = THREE.MathUtils.clamp(
                            desiredLateralImpulse,
                            -maxAllowedLateralImpulse,
                            maxAllowedLateralImpulse
                        );

                        const suspAndDrive = suspForceVec.add(driveForceVec).multiplyScalar(dt);
                        const totalImpulse = suspAndDrive.add(sideDir.multiplyScalar(clampedLateralImpulse));

                        if (!isNaN(totalImpulse.x) && !isNaN(totalImpulse.y) && !isNaN(totalImpulse.z)) {
                            this.chassisBody.applyImpulseAtPoint(
                                { x: totalImpulse.x, y: totalImpulse.y, z: totalImpulse.z },
                                { x: worldOrigin.x, y: worldOrigin.y, z: worldOrigin.z },
                                true
                            );
                        }

                        if (debugLine) (debugLine.material as THREE.LineBasicMaterial).color.setHex(0x00ff00);
                    }
                }
            } else {
                if (debugLine) (debugLine.material as THREE.LineBasicMaterial).color.setHex(0xff0000);
            }
        }

        if (groundedWheels >= 2 && turnInput !== 0) {
            const torqueImpulse = turnInput * this.hSpec.turnTorque * freezeTurnMult * dt;
            this.chassisBody.applyTorqueImpulse({ x: 0, y: torqueImpulse, z: 0 }, true);
        }
    }

    public recover() {
        const trans = this.chassisBody.translation();
        const x = isNaN(trans.x) ? 0 : trans.x;
        const y = isNaN(trans.y) ? 5.0 : trans.y + 1.5;
        const z = isNaN(trans.z) ? 0 : trans.z;

        this.chassisBody.setTranslation({ x, y, z }, true);
        this.resetOrientation(this.getYaw());
    }

    public getPosition(): THREE.Vector3 {
        const t = this.chassisBody.translation();
        return new THREE.Vector3(t.x || 0, t.y || 0, t.z || 0);
    }

    public getYaw(): number {
        const r = this.chassisBody.rotation();
        const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        return e.y || 0;
    }

    public applyTuning() {
        this.hullWrapper.rotation.y = Math.PI + (this.hSpec.rotY || 0);
        this.hullWrapper.position.set(0, this.hSpec.visualOffsetY || 0, 0);
        this.hullModelContainer.scale.set(1.0, 1.0, 1.0);

        this.turretWrapper.rotation.y = Math.PI + (this.tSpec.rotY || 0);
        this.turretModelContainer.scale.set(1.0, 1.0, 1.0);

        this.chassisBody.setAdditionalMass(this.hSpec.mass, true);
    }

    public async switchEquipment(
        type: 'hull' | 'turret',
        name: string,
        assets: AssetLoader,
        currentPaint: string,
        mod: string = 'm0'
    ) {
        if (type === 'hull') {
            this.currentHullName = name;
            this.currentHullMod = mod;
            this.hSpec = this.specs.hulls[name] || this.specs.hulls['viking'];

            const newMesh = await assets.loadModel('hulls', name, 5.0, mod);
            this.hullModelContainer.clear();
            this.hullModelContainer.add(newMesh);
            assets.applyPaint(newMesh, currentPaint);

            this.alignTurretToSocket();
            this.applyTuning();
            this.autoFitHullHitbox();
        } else {
            this.currentTurretName = name;
            this.currentTurretMod = mod;
            this.tSpec = this.specs.turrets[name] || this.specs.turrets['railgun'];

            const newMesh = await assets.loadModel('turrets', name, 4.0, mod);
            this.turretModelContainer.clear();
            this.turretModelContainer.add(newMesh);
            assets.applyPaint(newMesh, currentPaint);

            this.applyTuning();
            this.autoFitTurretHitbox();
        }
    }
}