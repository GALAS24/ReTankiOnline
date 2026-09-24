import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as RAPIER from '@dimforge/rapier3d-compat';

export interface MapConfig {
    id: string;
    name: string;
    gravity: number;
    ambientColor: string;
    ambientIntensity: number;
    sunColor: string;
    sunIntensity: number;
    sunPosition: [number, number, number];
    fogColor?: string;
    fogNear?: number;
    fogFar?: number;
    supportedModes: ('DM' | 'TDM' | 'CTF')[];
    defaultMode: 'DM' | 'TDM' | 'CTF';
}

export class MapLoader {
    private gltfLoader = new GLTFLoader();

    public async loadMap(
        mapId: string,
        scene: THREE.Scene,
        world: RAPIER.World
    ): Promise<{ mapMesh: THREE.Group; config: MapConfig }> {
        // 1. Загрузка конфигурации окружения
        const configUrl = `/maps/${mapId}/config.json`;
        let config: MapConfig;

        try {
            const res = await fetch(configUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            config = await res.json();
        } catch {
            console.warn(`[MapLoader] Не найден config.json для "${mapId}", используются значения по умолчанию`);
            config = {
                id: mapId,
                name: mapId.toUpperCase(),
                gravity: -20.0,
                ambientColor: '#b4c6d4',
                ambientIntensity: 1.25,
                sunColor: '#fff8ed',
                sunIntensity: 1.85,
                sunPosition: [45.0, 75.0, -35.0],
                supportedModes: ['DM'],
                defaultMode: 'DM'
            };
        }

        // 2. Настройка гравитации физического мира
        world.gravity = { x: 0, y: config.gravity, z: 0 };

        // 3. Загрузка геометрии карты
        const glbPath = `/maps/${mapId}/map.glb`;
        const gltf = await this.gltfLoader.loadAsync(glbPath);
        const mapMesh = gltf.scene;

        // Центрирование карты
        const box = new THREE.Box3().setFromObject(mapMesh);
        const center = box.getCenter(new THREE.Vector3());
        mapMesh.position.x -= center.x;
        mapMesh.position.z -= center.z;
        mapMesh.position.y -= box.min.y;
        mapMesh.updateMatrixWorld(true);

        // 4. Генерация Trimesh-коллайдеров и настройка теней
        mapMesh.traverse((node: any) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                this.createTrimeshCollider(node, world);
            }
        });

        scene.add(mapMesh);

        // 5. Освещение и туман под цветовую гамму карты
        this.applyAtmosphere(scene, config);

        return { mapMesh, config };
    }

    private applyAtmosphere(scene: THREE.Scene, cfg: MapConfig) {
        if (cfg.fogColor && cfg.fogNear !== undefined && cfg.fogFar !== undefined) {
            scene.fog = new THREE.Fog(cfg.fogColor, cfg.fogNear, cfg.fogFar);
            scene.background = new THREE.Color(cfg.fogColor);
        }
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
            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)
                .setFriction(0.6)
                .setRestitution(0.0);
            world.createCollider(colliderDesc);
        }

        geometry.dispose();
    }
}
