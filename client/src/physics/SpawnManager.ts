import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { TankPhysicsController } from './TankPhysicsController';

export interface SpawnPoint {
    position: THREE.Vector3;
    yaw: number;
    team?: 'neutral' | 'red' | 'blue';
}

export interface FlagPoint {
    position: THREE.Vector3;
    team: 'red' | 'blue';
}

export interface DropZone {
    position: THREE.Vector3;
    type: 'health' | 'armor' | 'damage' | 'nitro' | 'gold';
}

export class SpawnManager {
    public spawnPoints: SpawnPoint[] = [];
    public flagPoints: FlagPoint[] = [];
    public dropZones: DropZone[] = [];
    public lowestFloorY: number = -15.0;

    private lastSpawnIndex: number = -1;
    public mapMeshRef: THREE.Object3D | null = null;

    // Проверенные горизонтальные координаты внутри стен карты «Арена»
    private readonly ARENA_SAFE_SPAWNS: SpawnPoint[] = [
        // Синяя база (юг)
        { position: new THREE.Vector3(-8.0, 0.0, -11.0), yaw: 0.0, team: 'blue' },
        { position: new THREE.Vector3(8.0, 0.0, -11.0), yaw: 0.0, team: 'blue' },
        { position: new THREE.Vector3(0.0, 0.0, -13.0), yaw: 0.0, team: 'blue' },
        { position: new THREE.Vector3(-4.0, 0.0, -9.0), yaw: 0.3, team: 'blue' },

        // Красная база (север)
        { position: new THREE.Vector3(8.0, 0.0, 11.0), yaw: Math.PI, team: 'red' },
        { position: new THREE.Vector3(-8.0, 0.0, 11.0), yaw: Math.PI, team: 'red' },
        { position: new THREE.Vector3(0.0, 0.0, 13.0), yaw: Math.PI, team: 'red' },
        { position: new THREE.Vector3(4.0, 0.0, 9.0), yaw: -Math.PI + 0.3, team: 'red' },

        // Центр (DM)
        { position: new THREE.Vector3(-6.0, 0.0, 0.0), yaw: Math.PI / 2, team: 'neutral' },
        { position: new THREE.Vector3(6.0, 0.0, 0.0), yaw: -Math.PI / 2, team: 'neutral' },
        { position: new THREE.Vector3(0.0, 0.0, 3.5), yaw: Math.PI, team: 'neutral' },
        { position: new THREE.Vector3(0.0, 0.0, -3.5), yaw: 0.0, team: 'neutral' }
    ];

    /**
     * Загрузка спавнов с точным определением высоты по мешу карты и коллизиям Rapier
     */
    public async loadSpawns(
        mapId: string,
        mode: 'DM' | 'TDM' | 'CTF',
        mapOffset: THREE.Vector3,
        world: RAPIER.World,
        mapMesh?: THREE.Object3D | null
    ): Promise<void> {
        this.spawnPoints = [];
        this.flagPoints = [];
        this.dropZones = [];
        this.mapMeshRef = mapMesh || null;

        if (this.mapMeshRef) {
            this.mapMeshRef.updateMatrixWorld(true);
        }

        const candidates = [
            `/maps/${mapId}/spawns_${mode.toLowerCase()}.xml`,
            `/maps/${mapId}/spawns_dm.xml`,
            `/maps/${mapId}/Arena.xml`,
            `/maps/${mapId}/arena.xml`,
            `/maps/${mapId}.xml`,
            `/maps/Arena.xml`,
            `/maps/arena.xml`,
            `/maps/map.xml`
        ];

        const targetUrl = await this.resolveAvailableXml(candidates);
        let loadedSuccessfully = false;

        if (targetUrl) {
            try {
                const res = await fetch(targetUrl);
                if (res.ok) {
                    const text = await res.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, 'text/xml');

                    const spawnTags = [
                        ...Array.from(doc.getElementsByTagName('spawn-point')),
                        ...Array.from(doc.getElementsByTagName('spawn_point')),
                        ...Array.from(doc.getElementsByTagName('point'))
                    ];

                    for (const el of spawnTags) {
                        const parsed = this.parseCoords(el, mapOffset);
                        if (parsed) {
                            const teamAttr = el.getAttribute('team');
                            const team = (teamAttr === 'red' || teamAttr === 'blue') ? teamAttr : 'neutral';

                            const groundY = this.findGroundHeight(parsed.pos.x, parsed.pos.z, world);
                            parsed.pos.y = groundY !== null ? groundY : parsed.pos.y;
                            this.spawnPoints.push({ position: parsed.pos, yaw: parsed.yaw, team });
                        }
                    }

                    if (this.spawnPoints.length > 0) {
                        loadedSuccessfully = true;
                    }
                }
            } catch (e) {
                console.warn(`[SpawnManager] Ошибка чтения XML спавнов:`, e);
            }
        }

        // Если XML не найден — используем безопасный проверенный пул точек карты «Арена»
        if (!loadedSuccessfully || this.spawnPoints.length === 0) {
            for (const sp of this.ARENA_SAFE_SPAWNS) {
                const targetPos = sp.position.clone().add(mapOffset);
                const groundY = this.findGroundHeight(targetPos.x, targetPos.z, world);
                targetPos.y = groundY !== null ? groundY : targetPos.y;
                this.spawnPoints.push({
                    position: targetPos,
                    yaw: sp.yaw,
                    team: sp.team
                });
            }
        }

        const minY = Math.min(...this.spawnPoints.map(p => p.position.y));
        const estimatedFloor = isFinite(minY) ? minY : 0.0;
        this.lowestFloorY = estimatedFloor - 12.0;
    }

    private async resolveAvailableXml(candidates: string[]): Promise<string | null> {
        for (const url of candidates) {
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (res.ok) return url;
            } catch {}
        }
        return null;
    }

    private parseCoords(el: Element, offset: THREE.Vector3): { pos: THREE.Vector3; yaw: number } | null {
        let rawX = parseFloat(el.getAttribute('x') || '0');
        let rawY = parseFloat(el.getAttribute('y') || '0');
        let rawZ = parseFloat(el.getAttribute('z') || '0');
        const angAttr = el.getAttribute('rot') || el.getAttribute('angle') || '0';

        const posNode = el.querySelector('position');
        const rotNode = el.querySelector('rotation');
        if (posNode) {
            rawX = parseFloat(posNode.getAttribute('x') || posNode.querySelector('x')?.textContent || '0');
            rawY = parseFloat(posNode.getAttribute('y') || posNode.querySelector('y')?.textContent || '0');
            rawZ = parseFloat(posNode.getAttribute('z') || posNode.querySelector('z')?.textContent || '0');
        }

        const scale = (Math.abs(rawX) > 100 || Math.abs(rawY) > 100 || Math.abs(rawZ) > 100) ? 0.01 : 1.0;
        rawX *= scale;
        rawY *= scale;
        rawZ *= scale;

        const isAlternativa = Math.abs(rawY) > Math.abs(rawZ);
        const posX = rawX + offset.x;
        const posY = (isAlternativa ? rawZ : rawY) + offset.y;
        const posZ = (isAlternativa ? -rawY : rawZ) + offset.z;

        const yaw = rotNode
            ? (parseFloat(rotNode.getAttribute('y') || '0') * Math.PI) / 180
            : (parseFloat(angAttr) * Math.PI) / 180.0;

        return { pos: new THREE.Vector3(posX, posY, posZ), yaw };
    }

    /**
     * Поиск пола карты: сначала по мешу Three.js с проверкой нормали пола, затем по Rapier
     */
    public findGroundHeight(
        x: number,
        z: number,
        world: RAPIER.World,
        excludeTank?: TankPhysicsController
    ): number | null {
        // 1. Проверка по реальному визуальному мешу карты
        if (this.mapMeshRef) {
            this.mapMeshRef.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(this.mapMeshRef);
            const startY = Math.max(50.0, box.max.y + 10.0);

            const raycaster = new THREE.Raycaster(
                new THREE.Vector3(x, startY, z),
                new THREE.Vector3(0, -1, 0),
                0.1,
                150.0
            );

            const hits = raycaster.intersectObject(this.mapMeshRef, true);
            for (const hit of hits) {
                if (!hit.face || !hit.point) continue;
                const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
                // Игнорируем потолки и стены — нам нужна горизонтальная поверхность пола (нормаль вверх)
                if (worldNormal.y > 0.45) {
                    return hit.point.y;
                }
            }
        }

        // 2. Резервная проверка через физический луч Rapier
        const testHeights = [40.0, 20.0, 8.0];
        for (const startY of testHeights) {
            const ray = new RAPIER.Ray({ x, y: startY, z }, { x: 0, y: -1, z: 0 });
            const hit = world.castRayAndGetNormal(
                ray,
                60.0,
                false,
                undefined,
                undefined,
                (c: RAPIER.Collider) => {
                    if (!excludeTank) return true;
                    if (c.handle === excludeTank.chassisCollider.handle) return false;
                    if (excludeTank.turretCollider && c.handle === excludeTank.turretCollider.handle) return false;
                    return true;
                }
            );

            if (hit && hit.timeOfImpact > 0.05 && hit.normal.y > 0.4) {
                return startY - hit.timeOfImpact;
            }
        }

        return null;
    }

    public getSpawn(team: 'neutral' | 'red' | 'blue' = 'neutral'): SpawnPoint {
        const matching = this.spawnPoints.filter(p => p.team === team || team === 'neutral');
        const pool = matching.length > 0 ? matching : this.spawnPoints;

        let nextIdx = Math.floor(Math.random() * pool.length);
        if (pool.length > 1 && nextIdx === this.lastSpawnIndex) {
            nextIdx = (nextIdx + 1) % pool.length;
        }
        this.lastSpawnIndex = nextIdx;

        return pool[nextIdx];
    }

    /**
     * Посадка танка точно на колёса с выравниванием по полу
     */
    public respawn(
        tank: TankPhysicsController,
        world: RAPIER.World,
        team: 'neutral' | 'red' | 'blue' = 'neutral'
    ): SpawnPoint {
        const spawn = this.getSpawn(team);
        const groundY = this.findGroundHeight(spawn.position.x, spawn.position.z, world, tank);
        const actualFloor = groundY !== null ? groundY : spawn.position.y;

        const restLen = tank.hSpec?.suspensionRestLength || 0.95;
        // Сажаем танк точно на высоту пружин — никакого падения с неба
        const finalY = actualFloor + (restLen * 0.82);

        tank.chassisBody.setTranslation(
            { x: spawn.position.x, y: finalY, z: spawn.position.z },
            true
        );

        tank.chassisBody.setLinvel({ x: 0, y: 0.0, z: 0 }, true);
        tank.chassisBody.setAngvel({ x: 0, y: 0.0, z: 0 }, true);

        tank.resetOrientation(spawn.yaw);

        return {
            position: new THREE.Vector3(spawn.position.x, finalY, spawn.position.z),
            yaw: spawn.yaw,
            team: spawn.team
        };
    }
}