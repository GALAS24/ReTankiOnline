// client/src/game/entities/Tank.ts
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';

export interface TankConfig {
    hullName: string;
    turretName: string;
    paintName: string;
    isPlayer?: boolean;
}

export class Tank {
    public rootNode: THREE.Group = new THREE.Group();
    public hullMesh: THREE.Group;
    public turretMesh: THREE.Group;
    
    // Точки привязки оружия и эффектов
    public muzzleSockets: THREE.Object3D[] = [];
    public turretMountPoint: THREE.Vector3 = new THREE.Vector3();

    // Физические компоненты Rapier
    public rigidBody: RAPIER.RigidBody | null = null;
    public collider: RAPIER.Collider | null = null;

    // Векторы размеров для логики и физики
    public hullDimensions: THREE.Vector3 = new THREE.Vector3();

    constructor(
        hullMesh: THREE.Group,
        turretMesh: THREE.Group,
        world?: RAPIER.World,
        spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 2, 0)
    ) {
        this.hullMesh = hullMesh;
        this.turretMesh = turretMesh;

        // 1. Автоматическая геометрическая посадка деталей
        this.assembleVisualHierarchy();

        // 2. Инициализация физического тела Rapier (если передан мир)
        if (world) {
            this.setupPhysics(world, spawnPosition);
        }
    }

    /**
     * Автоматическая стыковка башни и корпуса по сокетам 3ds Max
     */
    private assembleVisualHierarchy() {
        this.rootNode.add(this.hullMesh);

        // Расчёт реальных габаритов корпуса
        const hullBox = new THREE.Box3().setFromObject(this.hullMesh);
        hullBox.getSize(this.hullDimensions);

        // Поиск заводского сокета крепления башни
        let socketObj: THREE.Object3D | null = null;
        this.hullMesh.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes('mount') || name.includes('fmnt') || name.includes('turret')) {
                if (child !== this.hullMesh) {
                    socketObj = child;
                }
            }
        });

        if (socketObj) {
            (socketObj as THREE.Object3D).getWorldPosition(this.turretMountPoint);
            this.turretMesh.position.copy(this.turretMountPoint);
        } else {
            // Расчетная посадка на крышу корпуса
            const deckY = hullBox.max.y;
            this.turretMountPoint.set(0, deckY - 0.03, 0);
            this.turretMesh.position.copy(this.turretMountPoint);
        }

        this.rootNode.add(this.turretMesh);

        // Поиск всех сокетов вылета снаряда (muzzle01, muzzle02 для Твинса)
        this.muzzleSockets = [];
        this.turretMesh.traverse((child) => {
            if (child.name.toLowerCase().includes('muzzle')) {
                this.muzzleSockets.push(child);
            }
        });

        // Если моделлеры забыли сокет — ставим заглушку на кончик среза башни
        if (this.muzzleSockets.length === 0) {
            const turretBox = new THREE.Box3().setFromObject(this.turretMesh);
            const dummyMuzzle = new THREE.Object3D();
            dummyMuzzle.name = 'muzzle_fallback';
            // Вперед по -Z (стандарт WebGL)
            dummyMuzzle.position.set(0, (turretBox.max.y + turretBox.min.y) * 0.5, turretBox.min.z);
            this.turretMesh.add(dummyMuzzle);
            this.muzzleSockets.push(dummyMuzzle);
        }
    }

    /**
     * Создание динамического хитбокса Rapier под конкретные размеры корпуса
     */
    private setupPhysics(world: RAPIER.World, spawnPosition: THREE.Vector3) {
        // Динамическое твердое тело
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(spawnPosition.x, spawnPosition.y, spawnPosition.z)
            .setLinearDamping(0.8)
            .setAngularDamping(0.95);

        this.rigidBody = world.createRigidBody(bodyDesc);

        // Коллайдер строится строго по полуразмерам (halfExtents) текущего корпуса
        const halfX = this.hullDimensions.x * 0.48;
        const halfY = this.hullDimensions.y * 0.45;
        const halfZ = this.hullDimensions.z * 0.48;

        const colliderDesc = RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
            .setFriction(0.7)
            .setRestitution(0.05)
            .setDensity(this.calculateDensity(halfX * halfZ * 4)); // Масса от площади танка

        // Центр масс смещаем вниз корпуса для защиты от опрокидывания
        colliderDesc.setCenterOfMass(new RAPIER.Vector3(0, -halfY * 0.3, 0));

        this.collider = world.createCollider(colliderDesc, this.rigidBody);
    }

    /**
     * Расчет массы: Васп легкий, Мамонт тяжелый
     */
    private calculateDensity(footprintArea: number): number {
        // Площадь основания Васпа ~ 6-7 м^2, Мамонта ~ 18-22 м^2
        return 800.0 + footprintArea * 150.0;
    }

    /**
     * Поворот башни (в радианах) вокруг оси погона
     */
    public setTurretRotation(angleRad: number) {
        this.turretMesh.rotation.y = angleRad;
    }

    /**
     * Получение точной мировой позиции и направления ствола для стрельбы
     */
    public getMuzzleTransform(socketIndex: number = 0): { position: THREE.Vector3; direction: THREE.Vector3 } {
        const socket = this.muzzleSockets[socketIndex % this.muzzleSockets.length];
        const position = new THREE.Vector3();
        socket.getWorldPosition(position);

        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.turretMesh.getWorldQuaternion(new THREE.Quaternion()));

        return { position, direction };
    }

    /**
     * Синхронизация рендера Three.js с физикой Rapier (вызывать в tick / renderLoop)
     */
    public update() {
        if (!this.rigidBody) return;

        const t = this.rigidBody.translation();
        const r = this.rigidBody.rotation();

        this.rootNode.position.set(t.x, t.y, t.z);
        this.rootNode.quaternion.set(r.x, r.y, r.z, r.w);
    }

    /**
     * Очистка сущности при уничтожении танка
     */
    public destroy(world?: RAPIER.World) {
        if (world && this.rigidBody) {
            world.removeRigidBody(this.rigidBody);
        }
        this.rootNode.removeFromParent();
    }
}