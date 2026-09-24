import * as THREE from 'three';
import { SpriteSheetCutter } from './SpriteSheetCutter';

export type EasingType = 'linear' | 'easeOutQuad' | 'easeOutCubic' | 'easeInQuad';

interface AnimatedBillboardSlot {
    sprite: THREE.Sprite;
    material: THREE.SpriteMaterial;
    active: boolean;
    frames: THREE.Texture[];
    currentFrame: number;
    life: number;
    maxLife: number;
    scaleStart: number;
    scaleEnd: number;
    easing: EasingType;
    fadeOutRatio: number;
    initialOpacity: number;
    isLoop: boolean;
}

export class VFXManager {
    private static instance: VFXManager;
    private scene!: THREE.Scene;
    private poolGroup: THREE.Group = new THREE.Group();

    private cutter: SpriteSheetCutter;
    private pool: AnimatedBillboardSlot[] = [];
    private readonly POOL_SIZE = 64;

    private constructor() {
        this.cutter = SpriteSheetCutter.getInstance();
    }

    public static getInstance(): VFXManager {
        if (!VFXManager.instance) {
            VFXManager.instance = new VFXManager();
        }
        return VFXManager.instance;
    }

    public init(scene: THREE.Scene) {
        this.scene = scene;
        this.scene.add(this.poolGroup);

        for (let i = 0; i < this.POOL_SIZE; i++) {
            const mat = new THREE.SpriteMaterial({
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                color: 0xffffff
            });
            const sprite = new THREE.Sprite(mat);
            sprite.visible = false;
            this.poolGroup.add(sprite);

            this.pool.push({
                sprite,
                material: mat,
                active: false,
                frames: [],
                currentFrame: 0,
                life: 0,
                maxLife: 0.45,
                scaleStart: 1.0,
                scaleEnd: 1.0,
                easing: 'easeOutCubic',
                fadeOutRatio: 0.65,
                initialOpacity: 1.0,
                isLoop: false
            });
        }

        // Преднарезка анимаций
        this.cutter.preload([
            '/models/turrets/thunder/m0/fire.png',
            '/models/turrets/thunder/m0/shot.png',
            '/models/turrets/smoky/m0/fire.png',
            '/models/turrets/smoky/critical_hit.png',
            '/models/turrets/twins/m0/shot.png',
            '/models/turrets/twins/m0/charge.png',
            '/models/turrets/twins/m0/explosion.png',
            '/models/turrets/twins/m0/fade.png',
            '/models/turrets/ricochet/m0/ricochet_explosion.png',
            '/models/turrets/ricochet/m0/ricochet_shot.png',
            '/models/turrets/shaft/m0/shaft_explosion.png',
            '/models/turrets/firebird/shot.png',
            '/models/turrets/freeze/m0/snow_breeze.png',
            '/models/turrets/isida/m0/damage_start.png',
            '/models/turrets/isida/m0/damage_end.png',
            '/models/turrets/isida/m0/heal_start.png',
            '/models/turrets/isida/m0/heal_end.png',
            '/models/turrets/isida/m0/idle_spark.png',
            '/battle/death/explosion.png'
        ]);
    }

    private applyEasing(t: number, type: EasingType): number {
        switch (type) {
            case 'easeOutQuad':
                return 1 - (1 - t) * (1 - t);
            case 'easeOutCubic':
                return 1 - Math.pow(1 - t, 3);
            case 'easeInQuad':
                return t * t;
            case 'linear':
            default:
                return t;
        }
    }

    public async playSequence(options: {
        stripUrl: string;
        position: THREE.Vector3;
        duration?: number;
        scaleStart?: number;
        scaleEnd?: number;
        rotation?: number;
        blending?: THREE.Blending;
        easing?: EasingType;
        fadeOutRatio?: number;
        opacity?: number;
        isLoop?: boolean;
        color?: number; // Добавлена поддержка окрашивания спрайта
    }) {
        const frames = await this.cutter.slice(options.stripUrl);
        if (!frames || frames.length === 0) return;

        const slot = this.pool.find(p => !p.active);
        if (!slot) return;

        slot.active = true;
        slot.frames = frames;
        slot.currentFrame = 0;
        slot.life = 0;
        slot.maxLife = options.duration ?? 0.45;
        slot.scaleStart = options.scaleStart ?? 2.0;
        slot.scaleEnd = options.scaleEnd ?? slot.scaleStart;
        slot.easing = options.easing ?? 'easeOutCubic';
        slot.fadeOutRatio = options.fadeOutRatio ?? 0.65;
        slot.initialOpacity = options.opacity ?? 1.0;
        slot.isLoop = !!options.isLoop;

        slot.material.map = frames[0];
        slot.material.blending = options.blending ?? THREE.AdditiveBlending;
        slot.material.opacity = slot.initialOpacity;
        slot.material.rotation = options.rotation ?? Math.random() * Math.PI * 2;

        // Применяем переданный цвет (или сбрасываем на белый по умолчанию)
        if (options.color !== undefined) {
            slot.material.color.setHex(options.color);
        } else {
            slot.material.color.setHex(0xffffff);
        }

        slot.material.needsUpdate = true;

        slot.sprite.position.copy(options.position);
        slot.sprite.scale.set(slot.scaleStart, slot.scaleStart, 1.0);
        slot.sprite.visible = true;
    }

    // ==========================================
    // ГОТОВЫЕ БИЛБОРД-ЭФФЕКТЫ
    // ==========================================

    public spawnThunderExplosion(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/thunder/m0/fire.png',
            position: position.clone().add(new THREE.Vector3(0, 0.35, 0)),
            duration: 0.48,
            scaleStart: 2.0,
            scaleEnd: 5.6,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.6,
            opacity: 1.0
        });

        this.playSequence({
            stripUrl: '/models/turrets/thunder/m0/shot.png',
            position: position.clone().add(new THREE.Vector3(0, 0.2, 0)),
            duration: 0.08,
            scaleStart: 2.2,
            scaleEnd: 3.8,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutQuad',
            fadeOutRatio: 0.3,
            opacity: 1.0
        });
    }

    public spawnMuzzleFlash(position: THREE.Vector3, textureUrl: string, size: number = 2.4) {
        this.playSequence({
            stripUrl: textureUrl,
            position,
            duration: 0.065,
            scaleStart: size * 0.7,
            scaleEnd: size * 1.15,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutQuad',
            fadeOutRatio: 0.25,
            opacity: 1.0
        });
    }

    public spawnSmokyCrit(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/smoky/critical_hit.png',
            position: position.clone().add(new THREE.Vector3(0, 0.4, 0)),
            duration: 0.36,
            scaleStart: 2.2,
            scaleEnd: 4.8,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.6,
            opacity: 1.0
        });
    }

    /**
     * Эффект искр / вспышки при попадании снаряда (Смоки, Рельса и т.д.)
     */
    public spawnHitSparks(position: THREE.Vector3, colorHex?: number) {
        this.playSequence({
            stripUrl: '/models/turrets/smoky/critical_hit.png', // Используем текстуру крита как базу для вспышки
            position: position.clone().add(new THREE.Vector3(0, 0.2, 0)),
            duration: 0.22,
            scaleStart: 1.0,
            scaleEnd: 2.5,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutQuad',
            fadeOutRatio: 0.5,
            opacity: 0.95,
            color: colorHex // Передаем цвет для тонирования искр
        });
    }

    public spawnRicochetExplosion(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/ricochet/m0/ricochet_explosion.png',
            position,
            duration: 0.42,
            scaleStart: 1.8,
            scaleEnd: 4.2,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.65,
            opacity: 1.0
        });
    }

    // Вспышка выстрела Твинса
    public spawnTwinsMuzzleFlash(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/twins/m0/shot.png',
            position,
            duration: 0.06,
            scaleStart: 1.5,
            scaleEnd: 2.5,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutQuad',
            fadeOutRatio: 0.3,
            opacity: 1.0
        });
    }

    // Взрыв плазмы Твинса при ударе
    public spawnTwinsExplosion(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/twins/m0/explosion.png',
            position,
            duration: 0.36,
            scaleStart: 1.6,
            scaleEnd: 4.0,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.6,
            opacity: 1.0
        });
    }

    // Растворение плазмы Твинса при исчерпании дистанции
    public spawnTwinsFade(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/twins/m0/fade.png',
            position,
            duration: 0.28,
            scaleStart: 1.5,
            scaleEnd: 0.4,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutQuad',
            fadeOutRatio: 0.4,
            opacity: 0.85
        });
    }

    public spawnShaftExplosion(position: THREE.Vector3) {
        this.playSequence({
            stripUrl: '/models/turrets/shaft/m0/shaft_explosion.png',
            position,
            duration: 0.45,
            scaleStart: 2.0,
            scaleEnd: 5.0,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.6,
            opacity: 1.0
        });
    }

    public update(dt: number) {
        for (const slot of this.pool) {
            if (!slot.active) continue;

            slot.life += dt;
            const progress = slot.life / slot.maxLife;

            if (progress >= 1.0 && !slot.isLoop) {
                slot.active = false;
                slot.sprite.visible = false;
                continue;
            }

            const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
            const total = slot.frames.length;

            const frameIdx = slot.isLoop
                ? Math.floor((slot.life / slot.maxLife) * total) % total
                : Math.min(total - 1, Math.floor(clampedProgress * total));

            if (frameIdx !== slot.currentFrame && slot.frames[frameIdx]) {
                slot.currentFrame = frameIdx;
                slot.material.map = slot.frames[frameIdx];
                slot.material.needsUpdate = true;
            }

            const easedT = this.applyEasing(clampedProgress, slot.easing);
            const currentScale = THREE.MathUtils.lerp(slot.scaleStart, slot.scaleEnd, easedT);
            slot.sprite.scale.set(currentScale, currentScale, 1.0);

            if (clampedProgress > slot.fadeOutRatio) {
                const fadeNorm = (clampedProgress - slot.fadeOutRatio) / (1.0 - slot.fadeOutRatio);
                slot.material.opacity = slot.initialOpacity * (1.0 - fadeNorm);
            } else {
                slot.material.opacity = slot.initialOpacity;
            }
        }
    }
}