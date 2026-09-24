import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface PropInstance {
    name: string;
    pos: THREE.Vector3;
    rot: THREE.Euler;
}

export class MapParser {
    private loader = new GLTFLoader();
    // Кеш уникальных моделей пропов (куб, рампа, стена)
    private propPrototypes: Map<string, THREE.Mesh> = new Map();

    /**
     * Загружает XML файл карты, парсит пропсы, собирает сцену и физику
     */
    public async loadMapFromXML(
        xmlUrl: string,
        scene: THREE.Scene,
        world: RAPIER.World
    ): Promise<THREE.Group> {
        console.log(`[MapParser] Загрузка карты: ${xmlUrl}`);
        const response = await fetch(xmlUrl);
        const xmlText = await response.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const propNodes = xmlDoc.getElementsByTagName("prop");
        const propsToSpawn: PropInstance[] = [];
        const uniqueNames = new Set<string>();

        // 1. Сбор всех координат из XML
        for (let i = 0; i < propNodes.length; i++) {
            const node = propNodes[i];
            const name = node.getAttribute("name") || "block_sand";
            uniqueNames.add(name);

            const posEl = node.getElementsByTagName("position")[0];
            const rotEl = node.getElementsByTagName("rotation")[0];

            const rawX = parseFloat(posEl?.getAttribute("x") || "0");
            const rawY = parseFloat(posEl?.getAttribute("y") || "0");
            const rawZ = parseFloat(posEl?.getAttribute("z") || "0");

            const rotZ = parseFloat(rotEl?.getAttribute("z") || "0"); // Yaw в A3D

            // Конвертация системы координат Alternativa3D -> Three.js (см -> метры)
            const pos = new THREE.Vector3(rawX * 0.01, rawZ * 0.01, -rawY * 0.01);
            const rot = new THREE.Euler(0, rotZ, 0, 'YXZ');

            propsToSpawn.push({ name, pos, rot });
        }

        console.log(`[MapParser] Найдено пропов: ${propsToSpawn.length}, уникальных типов: ${uniqueNames.size}`);

        // 2. Предзагрузка необходимых прототипов пропов из папки /models/props/
        for (const name of uniqueNames) {
            if (!this.propPrototypes.has(name)) {
                try {
                    const mesh = await this.loadPropPrototype(name);
                    this.propPrototypes.set(name, mesh);
                } catch {
                    // Fallback: если какого-то редкого пропа нет, заменяем стандартным кубом 4x4x4м
                    console.warn(`[MapParser] Проп ${name} не найден. Создан fallback куб 4x4.`);
                    this.propPrototypes.set(name, this.createFallbackBlock());
                }
            }
        }

        // 3. Расстановка и сборка коллизий в Rapier
        const mapGroup = new THREE.Group();

        propsToSpawn.forEach(item => {
            const proto = this.propPrototypes.get(item.name)!;
            const clone = proto.clone();
            clone.position.copy(item.pos);
            clone.rotation.copy(item.rot);
            clone.castShadow = true;
            clone.receiveShadow = true;

            mapGroup.add(clone);

            // Создаем физический коллайдер для каждого блока
            this.createColliderForProp(clone, world);
        });

        scene.add(mapGroup);
        console.log(`[MapParser] Карта успешно собрана!`);
        return mapGroup;
    }

    private loadPropPrototype(name: string): Promise<THREE.Mesh> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                `/models/props/${name}.glb`,
                (gltf) => {
                    let foundMesh: THREE.Mesh | null = null;
                    gltf.scene.traverse((child: any) => {
                        if (child.isMesh && !foundMesh) foundMesh = child;
                    });
                    if (foundMesh) resolve(foundMesh);
                    else reject();
                },
                undefined,
                reject
            );
        });
    }

    private createFallbackBlock(): THREE.Mesh {
        const geo = new THREE.BoxGeometry(4.0, 4.0, 4.0);
        const mat = new THREE.MeshLambertMaterial({ color: 0x8a7d55 });
        return new THREE.Mesh(geo, mat);
    }

    private createColliderForProp(mesh: THREE.Mesh, world: RAPIER.World) {
        mesh.updateMatrixWorld();
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);

        const vertices = geometry.attributes.position.array as Float32Array;
        const indices = geometry.index ? (geometry.index.array as Uint32Array) : undefined;

        if (vertices && indices) {
            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
            world.createCollider(colliderDesc);
        }
    }
}