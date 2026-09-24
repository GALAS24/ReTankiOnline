import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as RAPIER from '@dimforge/rapier3d-compat';

// Базовый глобальный масштаб танков (0.011 - 5% = 0.01045)
export const ORIGINAL_TANKI_SCALE = 0.01045;

export interface PaintTuningConfig {
    paintScale: number;
    turretScaleMult: number;
    paintAngle: number;
    mappingMode: number;
    mudStrength: number;
    dirtStrength: number;
    paintRoughness: number;
    paintMetalness: number;
}

export const DEFAULT_PAINT_TUNING: PaintTuningConfig = {
    paintScale: 2.2,
    turretScaleMult: 1.0,
    paintAngle: 0.0,
    mappingMode: 0,
    mudStrength: 0.55,
    dirtStrength: 0.45,
    paintRoughness: 0.65,
    paintMetalness: 0.15
};

export class AssetLoader {
    private loader = new GLTFLoader();
    private textureLoader = new THREE.TextureLoader();

    private textureCache: Map<string, THREE.Texture> = new Map();
    private paintTextureCache: Map<string, THREE.Texture> = new Map();
    public activeArmorMaterials: THREE.MeshStandardMaterial[] = [];

    public tuning: PaintTuningConfig;

    constructor() {
        this.tuning = this.loadSavedTuning();
    }

    private loadSavedTuning(): PaintTuningConfig {
        const saved = localStorage.getItem('retanki_paint_tuning');
        if (saved) {
            try {
                return { ...DEFAULT_PAINT_TUNING, ...JSON.parse(saved) };
            } catch {
                console.warn('[AssetLoader] Ошибка чтения настроек краски');
            }
        }
        return { ...DEFAULT_PAINT_TUNING };
    }

    public saveTuning() {
        localStorage.setItem('retanki_paint_tuning', JSON.stringify(this.tuning));
    }

    public resetTuning() {
        localStorage.removeItem('retanki_paint_tuning');
        this.tuning = { ...DEFAULT_PAINT_TUNING };
        this.updateLivePaintTuning();
    }

    private getFolderAliases(type: 'hulls' | 'turrets', rawName: string): string[] {
        const name = rawName.toLowerCase();
        if (type === 'hulls') {
            if (name === 'mammoth' || name === 'mamoth') return ['mammoth', 'mamoth'];
            return [name];
        }
        if (type === 'turrets') {
            if (name === 'freeze' || name === 'frezee') return ['freeze', 'frezee'];
            return [name];
        }
        return [name];
    }

    public async loadMap(url: string, scene: THREE.Scene, world: RAPIER.World): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    const mapMesh = gltf.scene;
                    const box = new THREE.Box3().setFromObject(mapMesh);
                    const center = box.getCenter(new THREE.Vector3());

                    mapMesh.position.x -= center.x;
                    mapMesh.position.z -= center.z;
                    mapMesh.position.y -= box.min.y;
                    mapMesh.updateMatrixWorld(true);

                    mapMesh.traverse((node: any) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                            this.createTrimeshCollider(node, world);
                        }
                    });

                    scene.add(mapMesh);
                    resolve(mapMesh);
                },
                undefined,
                reject
            );
        });
    }

    public async loadModel(
        type: 'hulls' | 'turrets',
        rawName: string,
        _targetScaleIgnored: number = 5.0,
        mod: string = 'm0'
    ): Promise<THREE.Group> {
        const cleanMod = (mod || 'm0').toLowerCase();
        const folderAliases = this.getFolderAliases(type, rawName);

        // 1. Загрузка 3D-модели нужной модификации
        const container = await this.loadGlbGeometry(type, folderAliases, cleanMod);

        // 2. Подгрузка деталей (швы, заклепки, решетки) и запеченного лайтмапа именно этого грейда
        const [detailsTex, lightmapTex] = await Promise.all([
            this.findTexture(type, folderAliases, cleanMod, ['details.png', 'details.jpg', 'details.webp']),
            this.findTexture(type, folderAliases, cleanMod, ['lightmap.jpg', 'lightmap.png', 'lightmap.webp'])
        ]);

        container.userData.modelType = type;
        container.userData.modelName = folderAliases[0];
        container.userData.mod = cleanMod;
        container.userData.detailsTex = detailsTex;
        container.userData.lightmapTex = lightmapTex;

        // Дублируем userData во вложенную сцену glTF, чтобы данные не терялись в контроллерах
        if (container.children[0]) {
            container.children[0].userData = { ...container.userData };
        }

        // 3. Первичная настройка материалов (гусеницы/катки получают текстуру деталей)
        this.setupModelMaterials(container, detailsTex, lightmapTex);

        return container;
    }

    private async loadGlbGeometry(
        type: 'hulls' | 'turrets',
        folderAliases: string[],
        mod: string
    ): Promise<THREE.Group> {
        const candidatePaths: string[] = [];
        for (const alias of folderAliases) {
            // Специфичные пути модификации (m0..m3)
            candidatePaths.push(`/models/${type}/${alias}/${mod}/model.glb`);
            candidatePaths.push(`/models/${type}/${alias}/${mod}/${alias}.glb`);
            candidatePaths.push(`/models/${type}/${alias}/${mod}.glb`);
            candidatePaths.push(`/models/${type}/${alias}_${mod}/model.glb`);
            // Фоллбек на корень предмета
            candidatePaths.push(`/models/${type}/${alias}/model.glb`);
            candidatePaths.push(`/models/${type}/${alias}/${alias}.glb`);
        }

        return new Promise((resolve) => {
            const tryIndex = (idx: number) => {
                if (idx >= candidatePaths.length) {
                    console.warn(`[AssetLoader] ${type}/${folderAliases[0]} (${mod}) не найден на диске. Включаем резервную модель.`);
                    const fallback = type === 'hulls' ? 'viking' : 'smoky';
                    if (folderAliases[0] !== fallback) {
                        this.loadGlbGeometry(type, [fallback], 'm0').then(resolve);
                    } else {
                        resolve(new THREE.Group());
                    }
                    return;
                }

                const path = candidatePaths[idx];
                this.loader.load(
                    path,
                    (gltf) => {
                        const rawMesh = gltf.scene;
                        rawMesh.scale.setScalar(ORIGINAL_TANKI_SCALE);
                        rawMesh.updateMatrixWorld(true);

                        const box = new THREE.Box3().setFromObject(rawMesh);
                        const center = box.getCenter(new THREE.Vector3());

                        if (type === 'hulls') {
                            rawMesh.position.set(-center.x, -box.min.y, -center.z);
                        } else {
                            rawMesh.position.set(0, -box.min.y, 0);
                        }

                        const wrapper = new THREE.Group();
                        wrapper.userData.modelType = type;
                        wrapper.userData.modelName = folderAliases[0];
                        wrapper.userData.mod = mod;
                        wrapper.add(rawMesh);

                        resolve(wrapper);
                    },
                    undefined,
                    () => tryIndex(idx + 1)
                );
            };

            tryIndex(0);
        });
    }

    private setupModelMaterials(
        container: THREE.Group,
        detailsTex: THREE.Texture | null,
        lightmapTex: THREE.Texture | null
    ) {
        container.traverse((node: any) => {
            if (!node.isMesh) return;
            node.castShadow = true;
            node.receiveShadow = true;

            const setupSingleMaterial = (mat: THREE.Material): THREE.Material => {
                const matName = (mat.name || '').toLowerCase();
                const nodeName = (node.name || '').toLowerCase();
                const isTrack = matName.includes('track') || nodeName.includes('track') || (mat.userData && mat.userData.isTrackMaterial);

                if (isTrack) {
                    return this.createTrackMaterial(detailsTex, lightmapTex);
                }
                return mat;
            };

            if (Array.isArray(node.material)) {
                node.material = node.material.map(setupSingleMaterial);
            } else if (node.material) {
                node.material = setupSingleMaterial(node.material);
            }
        });
    }

    public applyPaint(group: THREE.Group, paintName: string) {
        const id = paintName.toLowerCase();
        const cached = this.paintTextureCache.get(id);

        if (cached) {
            this.updateArmorMaterials(group, paintName, cached);
            return;
        }

        this.loadPaintTexture(id).then((tex) => {
            this.updateArmorMaterials(group, paintName, tex);
        });
    }

    private updateArmorMaterials(group: THREE.Group, paintName: string, paintTex: THREE.Texture) {
        // Извлекаем сохраненные текстуры из объекта или его первого потомка
        const sourceData = (group.userData?.detailsTex || group.userData?.modelType)
            ? group.userData
            : (group.children[0]?.userData || group.userData || {});

        const isTurret = sourceData.modelType === 'turrets' || group.name.toLowerCase().includes('turret');
        const detailsTex: THREE.Texture | null = sourceData.detailsTex || null;
        const lightmapTex: THREE.Texture | null = sourceData.lightmapTex || null;

        group.traverse((node: any) => {
            if (!node.isMesh) return;

            const updateMat = (mat: THREE.Material): THREE.Material => {
                const matName = (mat.name || '').toLowerCase();
                const nodeName = (node.name || '').toLowerCase();
                const isTrack = matName.includes('track') || nodeName.includes('track') || (mat.userData && mat.userData.isTrackMaterial);

                if (isTrack) {
                    return this.createTrackMaterial(detailsTex, lightmapTex);
                }
                return this.createArmorMaterial(paintName, paintTex, detailsTex, lightmapTex, isTurret);
            };

            if (Array.isArray(node.material)) {
                node.material = node.material.map(updateMat);
            } else if (node.material) {
                node.material = updateMat(node.material);
            }
        });
    }

    private createTrackMaterial(detailsTex: THREE.Texture | null, lightmapTex: THREE.Texture | null): THREE.MeshStandardMaterial {
        const mat = new THREE.MeshStandardMaterial({
            map: detailsTex || undefined,
            roughness: 0.88,
            metalness: 0.25,
            side: THREE.DoubleSide
        });
        mat.userData.isTrackMaterial = true;

        if (lightmapTex) {
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.uLightmap = { value: lightmapTex };
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `#include <common>
                    uniform sampler2D uLightmap;
                    `
                );
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <map_fragment>',
                    `
                    #include <map_fragment>
                    vec4 lm = texture2D(uLightmap, vMapUv);
                    diffuseColor.rgb *= (lm.rgb * 1.25);
                    `
                );
            };
        }

        return mat;
    }

    private createArmorMaterial(
        paintName: string,
        paintTexture: THREE.Texture,
        detailsTexture: THREE.Texture | null,
        lightmapTexture: THREE.Texture | null,
        isTurret: boolean = false
    ): THREE.MeshStandardMaterial {
        const material = new THREE.MeshStandardMaterial({
            map: lightmapTexture || paintTexture,
            roughness: this.tuning.paintRoughness,
            metalness: this.tuning.paintMetalness,
            side: THREE.DoubleSide
        });

        material.customProgramCacheKey = () => `armor_mat_${paintName}_${isTurret ? 't' : 'h'}_${detailsTexture ? 'd1' : 'd0'}_${lightmapTexture ? 'l1' : 'l0'}`;

        material.onBeforeCompile = (shader) => {
            material.userData.shader = shader;

            shader.uniforms.uPaintMap = { value: paintTexture };
            shader.uniforms.uDetailsMap = { value: detailsTexture || paintTexture };
            shader.uniforms.uLightmap = { value: lightmapTexture || paintTexture };
            shader.uniforms.uHasDetails = { value: detailsTexture ? 1.0 : 0.0 };
            shader.uniforms.uHasLightmap = { value: lightmapTexture ? 1.0 : 0.0 };

            shader.uniforms.uPaintScale = { value: this.tuning.paintScale };
            shader.uniforms.uTurretScaleMult = { value: this.tuning.turretScaleMult };
            shader.uniforms.uPaintAngle = { value: this.tuning.paintAngle };
            shader.uniforms.uMappingMode = { value: this.tuning.mappingMode };
            shader.uniforms.uIsTurret = { value: isTurret ? 1.0 : 0.0 };
            shader.uniforms.uMudStrength = { value: this.tuning.mudStrength };
            shader.uniforms.uDirtStrength = { value: this.tuning.dirtStrength };

            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vModelPos;
                varying vec3 vLocalNormal;
                varying vec2 vTankUv;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vTankUv = uv;
                vLocalNormal = normalize(normal);
                vModelPos = position;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                varying vec3 vModelPos;
                varying vec3 vLocalNormal;
                varying vec2 vTankUv;

                uniform sampler2D uPaintMap;
                uniform sampler2D uDetailsMap;
                uniform sampler2D uLightmap;

                uniform float uHasDetails;
                uniform float uHasLightmap;
                uniform float uPaintScale;
                uniform float uTurretScaleMult;
                uniform float uPaintAngle;
                uniform float uMappingMode;
                uniform float uIsTurret;
                uniform float uMudStrength;
                uniform float uDirtStrength;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                float effectiveScale = uPaintScale * (uIsTurret > 0.5 ? uTurretScaleMult : 1.0);
                vec4 paintColor;

                if (uMappingMode < 0.5) {
                    float s = sin(uPaintAngle);
                    float c = cos(uPaintAngle);
                    mat2 rotMat = mat2(c, -s, s, c);
                    vec2 finalUv = rotMat * ((vTankUv - 0.5) * effectiveScale) + 0.5;
                    paintColor = texture2D(uPaintMap, finalUv);
                } else {
                    vec3 localPos = vModelPos * (effectiveScale * 0.4);
                    vec3 blendWeights = pow(abs(vLocalNormal), vec3(4.0));
                    blendWeights /= max(blendWeights.x + blendWeights.y + blendWeights.z, 0.0001);

                    vec4 colX = texture2D(uPaintMap, localPos.zy);
                    vec4 colY = texture2D(uPaintMap, localPos.xz);
                    vec4 colZ = texture2D(uPaintMap, localPos.xy);
                    paintColor = colX * blendWeights.x + colY * blendWeights.y + colZ * blendWeights.z;
                }

                vec3 paintedArmor = paintColor.rgb;
                if (uHasLightmap > 0.5) {
                    vec4 lmColor = texture2D(uLightmap, vTankUv);
                    paintedArmor *= (lmColor.rgb * 1.32);
                }

                if (uHasDetails > 0.5) {
                    vec4 det = texture2D(uDetailsMap, vTankUv);
                    paintedArmor = mix(paintedArmor, det.rgb, det.a);
                }

                float groundDust = clamp((0.40 - vModelPos.y) / 0.85, 0.0, 1.0);
                float noise = fract(sin(dot(floor(vModelPos * 14.0), vec3(12.989, 78.233, 45.164))) * 43758.5453);
                float mudFactor = clamp(groundDust * (0.35 + 0.65 * noise), 0.0, 0.9) * uMudStrength;

                vec3 dirtColor = vec3(0.18, 0.14, 0.10);
                diffuseColor.rgb = mix(paintedArmor, dirtColor, mudFactor);
                `
            );
        };

        this.activeArmorMaterials.push(material);
        return material;
    }

    public updateLivePaintTuning() {
        this.activeArmorMaterials.forEach((mat) => {
            mat.roughness = this.tuning.paintRoughness;
            mat.metalness = this.tuning.paintMetalness;
            if (mat.userData.shader?.uniforms) {
                mat.userData.shader.uniforms.uPaintScale.value = this.tuning.paintScale;
                mat.userData.shader.uniforms.uTurretScaleMult.value = this.tuning.turretScaleMult;
                mat.userData.shader.uniforms.uPaintAngle.value = this.tuning.paintAngle;
                mat.userData.shader.uniforms.uMappingMode.value = this.tuning.mappingMode;
                mat.userData.shader.uniforms.uMudStrength.value = this.tuning.mudStrength;
                mat.userData.shader.uniforms.uDirtStrength.value = this.tuning.dirtStrength;
            }
        });
    }

    private async findTexture(type: string, folderAliases: string[], mod: string, fileNames: string[]): Promise<THREE.Texture | null> {
        const paths: string[] = [];
        for (const f of folderAliases) {
            for (const fn of fileNames) {
                // Поиск текстуры модификации
                paths.push(`/models/${type}/${f}/${mod}/${fn}`);
                paths.push(`/models/${type}/${f}/${fn.replace('.', `_${mod}.`)}`);
                paths.push(`/models/${type}/${f}/${fn}`);
                paths.push(`/models/${type}/${f}/m0/${fn}`);
            }
        }

        for (const path of paths) {
            if (this.textureCache.has(path)) return this.textureCache.get(path)!;
            try {
                const tex = await new Promise<THREE.Texture>((resolve, reject) => {
                    this.textureLoader.load(
                        path,
                        (t) => {
                            t.colorSpace = THREE.SRGBColorSpace;
                            t.flipY = false;
                            t.wrapS = THREE.ClampToEdgeWrapping;
                            t.wrapT = THREE.ClampToEdgeWrapping;
                            t.needsUpdate = true;
                            resolve(t);
                        },
                        undefined,
                        reject
                    );
                });
                this.textureCache.set(path, tex);
                return tex;
            } catch {}
        }
        return null;
    }

    /**
     * Генерация монохромной фоллбек-текстуры для простых цветов без картинки
     */
    private createColorFallbackTexture(paintId: string): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d')!;

        const colors: Record<string, string> = {
            white: '#f5f7fa',
            green: '#445b38',
            black: '#1c1e21',
            blue: '#2a4b75',
            red: '#7e2d2d',
            orange: '#b35d25'
        };

        ctx.fillStyle = colors[paintId] || '#5a626a';
        ctx.fillRect(0, 0, 16, 16);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        return tex;
    }

    private async loadPaintTexture(paintId: string): Promise<THREE.Texture> {
        const id = paintId.toLowerCase();
        if (this.paintTextureCache.has(id)) {
            return this.paintTextureCache.get(id)!;
        }

        const candidatePaths = [
            `/models/paints/${id}/image.jpg`,
            `/models/paints/${id}/image.png`,
            `/models/paints/${id}/preview.png`,
            `/models/paints/${id}/preview.jpg`,
            `/models/paints/${id}/image.webp`,
            `/paints/${id}/image.jpg`,
            `/paints/${id}/image.png`,
            `/paints/${id}/preview.png`
        ];

        return new Promise((resolve) => {
            const tryIndex = (idx: number) => {
                if (idx >= candidatePaths.length) {
                    const fallbackTex = this.createColorFallbackTexture(id);
                    this.paintTextureCache.set(id, fallbackTex);
                    resolve(fallbackTex);
                    return;
                }

                this.textureLoader.load(
                    candidatePaths[idx],
                    (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.flipY = false;
                        tex.wrapS = THREE.RepeatWrapping;
                        tex.wrapT = THREE.RepeatWrapping;
                        tex.needsUpdate = true;

                        this.paintTextureCache.set(id, tex);
                        resolve(tex);
                    },
                    undefined,
                    () => tryIndex(idx + 1)
                );
            };

            tryIndex(0);
        });
    }

    private createTrimeshCollider(mesh: THREE.Mesh, world: RAPIER.World) {
        if (!mesh.geometry || !mesh.geometry.attributes.position) return;

        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);

        const vertices = new Float32Array(geometry.attributes.position.array);

        let indices: Uint32Array;
        if (geometry.index) {
            indices = new Uint32Array(geometry.index.array);
        } else {
            const count = geometry.attributes.position.count;
            indices = new Uint32Array(count);
            for (let i = 0; i < count; i++) indices[i] = i;
        }

        if (vertices.length > 0 && indices.length > 0) {
            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
            world.createCollider(colliderDesc);
        }

        geometry.dispose();
    }
}
