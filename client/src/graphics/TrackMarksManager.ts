import * as THREE from 'three';

interface TrackDecalSlot {
    mesh: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
    active: boolean;
    life: number;
    maxLife: number;
    initialOpacity: number;
}

interface ExhaustParticle {
    sprite: THREE.Sprite;
    material: THREE.SpriteMaterial;
    active: boolean;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    scaleStart: number;
    scaleEnd: number;
}

export class TrackMarksManager {
    private static instance: TrackMarksManager;
    private scene!: THREE.Scene;

    // Пул сегментов следов гусениц (до 160 сегментов)
    private decalPool: TrackDecalSlot[] = [];
    private decalGeometry = new THREE.PlaneGeometry(0.85, 0.95);

    // Пул частиц выхлопа (до 30 спрайтов)
    private exhaustPool: ExhaustParticle[] = [];

    // Дистанции последнего спавна следов для каждого танка
    private lastPositions: Map<string, { left: THREE.Vector3; right: THREE.Vector3 }> = new Map();

    private trackTexture!: THREE.Texture;
    private exhaustTexture!: THREE.Texture;

    private constructor() {
        this.decalGeometry.rotateX(-Math.PI / 2);
        this.initTextures();
    }

    public static getInstance(): TrackMarksManager {
        if (!TrackMarksManager.instance) {
            TrackMarksManager.instance = new TrackMarksManager();
        }
        return TrackMarksManager.instance;
    }

    private initTextures() {
        // Процедурная генерация текстуры классического протектора гусениц
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 64, 64);

        // Рисунок поперечных металлических траков
        ctx.fillStyle = '#ffffff';
        for (let y = 4; y < 64; y += 12) {
            ctx.fillRect(6, y, 52, 6);
            ctx.fillStyle = '#888888';
            ctx.fillRect(10, y + 6, 44, 2);
            ctx.fillStyle = '#ffffff';
        }

        this.trackTexture = new THREE.CanvasTexture(canvas);
        this.trackTexture.colorSpace = THREE.SRGBColorSpace;

        // Мягкий градиентный круг для дыма выхлопа
        const exCanvas = document.createElement('canvas');
        exCanvas.width = 32;
        exCanvas.height = 32;
        const exCtx = exCanvas.getContext('2d')!;
        const grad = exCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, 'rgba(100, 105, 115, 0.85)');
        grad.addColorStop(0.5, 'rgba(70, 75, 85, 0.4)');
        grad.addColorStop(1, 'rgba(40, 45, 50, 0)');
        exCtx.fillStyle = grad;
        exCtx.fillRect(0, 0, 32, 32);

        this.exhaustTexture = new THREE.CanvasTexture(exCanvas);
    }

    public init(scene: THREE.Scene) {
        this.scene = scene;

        // Инициализация пула декалей следов
        for (let i = 0; i < 160; i++) {
            const mat = new THREE.MeshBasicMaterial({
                map: this.trackTexture,
                transparent: true,
                opacity: 0,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -3.0,
                polygonOffsetUnits: -3.0,
                color: 0x1a1a1a
            });
            const mesh = new THREE.Mesh(this.decalGeometry, mat);
            mesh.visible = false;
            mesh.renderOrder = 2;
            this.scene.add(mesh);

            this.decalPool.push({
                mesh,
                material: mat,
                active: false,
                life: 0,
                maxLife: 16.0,
                initialOpacity: 0.55
            });
        }

        // Инициализация пула выхлопа
        for (let i = 0; i < 32; i++) {
            const mat = new THREE.SpriteMaterial({
                map: this.exhaustTexture,
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.scene.add(sprite);

            this.exhaustPool.push({
                sprite,
                material: mat,
                active: false,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 0.55,
                scaleStart: 0.45,
                scaleEnd: 1.65
            });
        }
    }

    /**
     * Спавн следов под гусеницами при движении
     */
    public addTrackDecal(pos: THREE.Vector3, yaw: number) {
        const slot = this.decalPool.find(d => !d.active);
        if (!slot) return;

        slot.active = true;
        slot.life = 0;
        slot.mesh.position.set(pos.x, pos.y + 0.025, pos.z);
        slot.mesh.rotation.y = yaw;
        slot.material.opacity = slot.initialOpacity;
        slot.mesh.visible = true;
    }

    /**
     * Выброс дыма выхлопных газов из кормы
     */
    public emitExhaust(origin: THREE.Vector3, backwardDir: THREE.Vector3) {
        const slot = this.exhaustPool.find(e => !e.active);
        if (!slot) return;

        slot.active = true;
        slot.life = 0;
        slot.sprite.position.copy(origin);
        slot.sprite.scale.set(slot.scaleStart, slot.scaleStart, 1.0);
        slot.material.opacity = 0.5;
        slot.sprite.visible = true;

        slot.velocity.copy(backwardDir).multiplyScalar(2.4).add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.8,
            0.6 + Math.random() * 0.6,
            (Math.random() - 0.5) * 0.8
        ));
    }

    public update(dt: number) {
        // Обновление следов гусениц
        for (const slot of this.decalPool) {
            if (!slot.active) continue;

            slot.life += dt;
            const progress = slot.life / slot.maxLife;

            if (progress >= 1.0) {
                slot.active = false;
                slot.mesh.visible = false;
                continue;
            }

            // Плавное затухание в последние 40% жизни
            if (progress > 0.6) {
                const fadeT = (progress - 0.6) / 0.4;
                slot.material.opacity = slot.initialOpacity * (1.0 - fadeT);
            }
        }

        // Обновление выхлопа
        for (const slot of this.exhaustPool) {
            if (!slot.active) continue;

            slot.life += dt;
            const progress = slot.life / slot.maxLife;

            if (progress >= 1.0) {
                slot.active = false;
                slot.sprite.visible = false;
                continue;
            }

            slot.sprite.position.addScaledVector(slot.velocity, dt);

            const scale = THREE.MathUtils.lerp(slot.scaleStart, slot.scaleEnd, progress);
            slot.sprite.scale.set(scale, scale, 1.0);
            slot.material.opacity = 0.5 * (1.0 - progress);
        }
    }
}