import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { Renderer } from './graphics/Renderer';
import { AssetLoader } from './graphics/AssetLoader';
import { MapLoader } from './graphics/MapLoader';
import { GarageScene } from './graphics/GarageScene';
import { GarageUI } from './ui/GarageUI';
import { BattleHUD } from './ui/BattleHUD';
import { WeaponManager, Combatant } from './combat/WeaponManager';
import { DropBoxManager } from './combat/DropBoxManager';
import { TankPhysicsController, DEFAULT_TANK_SPECS } from './physics/TankPhysicsController';
import { SpawnManager } from './physics/SpawnManager';
import { AudioManager } from './audio/AudioManager';
import { TANK_SPECS } from '../../shared/constants';
import { NetworkManager } from './network/NetworkManager';
import { ZoneEditorUI } from './ui/ZoneEditorUI';

// ==========================================
// КОНФИГУРАЦИЯ БОЕВОЙ КАМЕРЫ (Alternativa3D Lag)
// ==========================================
const BASE_CAMERA_DISTANCE = 14.5;
const BASE_CAMERA_HEIGHT = 5.6;

const DEFAULT_CAMERA_CONFIG = {
    distance: BASE_CAMERA_DISTANCE,
    height: BASE_CAMERA_HEIGHT,
    targetOffsetY: 1.4,
    posLagSpeed: 9.5,
    rotLagSpeed: 7.0,
    orbitSpeed: 2.4
};

let CAMERA_CONFIG = { ...DEFAULT_CAMERA_CONFIG };
try {
    const savedCam = localStorage.getItem('retanki_camera_config');
    if (savedCam) CAMERA_CONFIG = { ...CAMERA_CONFIG, ...JSON.parse(savedCam) };
} catch { }

let zoomLevel = 1.0;

const container = document.getElementById('webgl-container') || document.body;
const assets = new AssetLoader();
const mapLoader = new MapLoader();

const garageScene = new GarageScene();
const garageUI = new GarageUI();

let battleHUD: BattleHUD | null = null;
try {
    battleHUD = new BattleHUD();
    battleHUD.setVisible(false);
} catch (e) {
    console.warn('[Main] BattleHUD disabled:', e);
}

const garageRenderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
garageRenderer.setSize(window.innerWidth, window.innerHeight);
garageRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
garageRenderer.shadowMap.enabled = true;
garageRenderer.shadowMap.type = THREE.PCFShadowMap;
garageRenderer.outputColorSpace = THREE.SRGBColorSpace;
garageRenderer.toneMapping = THREE.ACESFilmicToneMapping;
garageRenderer.toneMappingExposure = 1.1;
container.appendChild(garageRenderer.domElement);

let inBattle = false;

window.addEventListener('resize', () => {
    if (!inBattle && garageScene.camera) {
        garageScene.camera.aspect = window.innerWidth / window.innerHeight;
        garageScene.camera.updateProjectionMatrix();
        garageRenderer.setSize(window.innerWidth, window.innerHeight);
    }
});

let garageLastTime = performance.now();
function garageLoop() {
    if (inBattle) return;
    requestAnimationFrame(garageLoop);

    const now = performance.now();
    const dt = (now - garageLastTime) / 1000;
    garageLastTime = now;

    try {
        garageScene.update(dt);
        garageRenderer.render(garageScene.scene, garageScene.camera);
    } catch { }
}
garageLoop();

const playerSupplies: Record<number, { count: number; cooldown: number; maxCooldown: number; activeDuration: number }> = {
    1: { count: 25, cooldown: 0, maxCooldown: 30, activeDuration: 0 },
    2: { count: 40, cooldown: 0, maxCooldown: 15, activeDuration: 0 },
    3: { count: 35, cooldown: 0, maxCooldown: 15, activeDuration: 0 },
    4: { count: 50, cooldown: 0, maxCooldown: 15, activeDuration: 0 },
    5: { count: 15, cooldown: 0, maxCooldown: 20, activeDuration: 0 },
    6: { count: 5, cooldown: 0, maxCooldown: 60, activeDuration: 0 }
};

window.addEventListener('wheel', (e) => {
    if (!inBattle) return;
    zoomLevel = THREE.MathUtils.clamp(zoomLevel + e.deltaY * 0.0012, 0.45, 2.2);
    CAMERA_CONFIG.distance = BASE_CAMERA_DISTANCE * zoomLevel;
    CAMERA_CONFIG.height = BASE_CAMERA_HEIGHT * zoomLevel;
}, { passive: true });

let currentGarageHull: THREE.Group | null = null;
let currentGarageTurret: THREE.Group | null = null;
let garageTurretMount = new THREE.Group();

async function updateGarageTank() {
    try {
        if ((assets as any).activeArmorMaterials) {
            (assets as any).activeArmorMaterials = [];
        }

        while (garageScene.tankRoot.children.length > 0) {
            garageScene.tankRoot.remove(garageScene.tankRoot.children[0]);
        }

        const hullName = garageUI?.equipped?.hull || 'viking';
        const hullMod = (garageUI?.equipped as any)?.hullMod || 'm0';
        const turretName = garageUI?.equipped?.turret || 'shaft';
        const turretMod = (garageUI?.equipped as any)?.turretMod || 'm0';
        const paintName = garageUI?.equipped?.paint || 'white';

        currentGarageHull = await assets.loadModel('hulls', hullName, 5.0, hullMod);
        currentGarageTurret = await assets.loadModel('turrets', turretName, 4.0, turretMod);

        assets.applyPaint(currentGarageHull, paintName);
        assets.applyPaint(currentGarageTurret, paintName);

        garageScene.tankRoot.add(currentGarageHull);
        currentGarageHull.updateMatrixWorld(true);

        let mountSocket: THREE.Object3D | null = null;
        currentGarageHull.traverse((child) => {
            const name = child.name.toLowerCase();
            if (name.includes('fmnt') || name.includes('flag')) return;

            if (name === 'mount' || name.startsWith('mount') || name === 'turret_mount' || name === 't_mount') {
                mountSocket = child;
            }
        });

        garageTurretMount = new THREE.Group();

        if (mountSocket) {
            const mountPos = new THREE.Vector3();
            (mountSocket as THREE.Object3D).getWorldPosition(mountPos);
            currentGarageHull.worldToLocal(mountPos);
            garageTurretMount.position.copy(mountPos);
        } else {
            const hullBox = new THREE.Box3().setFromObject(currentGarageHull);
            const hSpec = TANK_SPECS?.hulls?.[hullName];
            const deckY = hSpec ? hSpec.mountY : (hullBox.max.y > -999 ? hullBox.max.y - 0.03 : 0.8);
            const deckZ = hSpec ? hSpec.mountZ : 0;
            const mountX = (hSpec as any)?.mountX ?? 0;
            garageTurretMount.position.set(mountX, deckY, deckZ);
        }

        garageTurretMount.add(currentGarageTurret);
        garageScene.tankRoot.add(garageTurretMount);

        garageScene.tankRoot.updateMatrixWorld(true);
        const tankBox = new THREE.Box3().setFromObject(garageScene.tankRoot);
        const cfg = garageScene.config;

        const finalY = (cfg && cfg.tankY !== undefined && cfg.tankY !== 0) ? cfg.tankY : -tankBox.min.y;

        garageScene.tankRoot.position.set(
            cfg?.tankX ?? 0,
            finalY || 0,
            cfg?.tankZ ?? 0
        );

        if (cfg) {
            garageScene.tankRoot.rotation.y = cfg.tankRotY || 0;
            garageScene.tankRoot.scale.setScalar(cfg.tankScale || 1.0);
        }
    } catch (e) {
        console.error('[Garage] Ошибка сборки танка:', e);
    }
}

garageScene.loadGarageModel('/garage.glb')
    .then(() => updateGarageTank())
    .catch(() => updateGarageTank());

if (garageUI) {
    garageUI.onSelectEquipment = () => {
        updateGarageTank();
    };
}

const garageDebugMenu = document.getElementById('garage-debug-menu');

function bindGarageVal(id: string, valId: string, get: () => number, set: (v: number) => void, onLiveUpdate?: () => void) {
    const inp = document.getElementById(id) as HTMLInputElement | null;
    const span = document.getElementById(valId);
    if (!inp) return;

    try {
        const initial = get();
        if (initial !== undefined && initial !== null && !isNaN(initial)) {
            inp.value = initial.toString();
            if (span) span.innerText = initial.toFixed(2);
        }
    } catch { }

    inp.oninput = () => {
        const v = parseFloat(inp.value);
        if (span && !isNaN(v)) span.innerText = v.toFixed(2);
        set(v);
        if (onLiveUpdate) {
            onLiveUpdate();
        } else {
            garageScene?.applyConfig?.();
            garageScene?.updateCamera?.();
        }
    };
}

function syncGarageDebugUI() {
    const cfg = garageScene?.config;
    const t = assets?.tuning;

    if (t) {
        bindGarageVal('t-p-scale', 'v-p-scale', () => t.paintScale, (v) => { t.paintScale = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-turret-mult', 'v-p-turret-mult', () => t.turretScaleMult, (v) => { t.turretScaleMult = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-angle', 'v-p-angle', () => t.paintAngle, (v) => { t.paintAngle = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-mud', 'v-p-mud', () => t.mudStrength, (v) => { t.mudStrength = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-dirt', 'v-p-dirt', () => t.dirtStrength, (v) => { t.dirtStrength = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-roughness', 'v-p-roughness', () => t.paintRoughness, (v) => { t.paintRoughness = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());
        bindGarageVal('t-p-metalness', 'v-p-metalness', () => t.paintMetalness, (v) => { t.paintMetalness = v; assets.saveTuning(); }, () => assets.updateLivePaintTuning());

        const btnUv = document.getElementById('sw-mode-uv');
        const btnTri = document.getElementById('sw-mode-tri');
        const updateModeBtns = () => {
            btnUv?.classList.toggle('active', t.mappingMode === 0);
            btnTri?.classList.toggle('active', t.mappingMode === 1);
        };
        if (btnUv) btnUv.onclick = () => { t.mappingMode = 0; assets.saveTuning(); assets.updateLivePaintTuning(); updateModeBtns(); };
        if (btnTri) btnTri.onclick = () => { t.mappingMode = 1; assets.saveTuning(); assets.updateLivePaintTuning(); updateModeBtns(); };
        updateModeBtns();
    }

    if (cfg) {
        bindGarageVal('t-g-tankY', 'v-g-tankY', () => cfg.tankY ?? 0, (v) => cfg.tankY = v);
        bindGarageVal('t-g-tankZ', 'v-g-tankZ', () => cfg.tankZ ?? 0, (v) => cfg.tankZ = v);
        bindGarageVal('t-g-tankX', 'v-g-tankX', () => cfg.tankX ?? 0, (v) => cfg.tankX = v);
        bindGarageVal('t-g-tankScale', 'v-g-tankScale', () => cfg.tankScale ?? 1.0, (v) => cfg.tankScale = v);
        bindGarageVal('t-g-tankRotY', 'v-g-tankRotY', () => cfg.tankRotY ?? 0, (v) => cfg.tankRotY = v);

        bindGarageVal('t-g-camDist', 'v-g-camDist', () => cfg.camDistance ?? 12, (v) => cfg.camDistance = v);
        bindGarageVal('t-g-camHeight', 'v-g-camHeight', () => cfg.camHeight ?? 4, (v) => cfg.camHeight = v);
        bindGarageVal('t-g-camTargetY', 'v-g-camTargetY', () => cfg.camTargetY ?? 1, (v) => cfg.camTargetY = v);
        bindGarageVal('t-g-autoSpeed', 'v-g-autoSpeed', () => cfg.autoRotateSpeed ?? 0.5, (v) => cfg.autoRotateSpeed = v);

        const autoRotateCb = document.getElementById('t-g-autoRotate') as HTMLInputElement | null;
        if (autoRotateCb) {
            autoRotateCb.checked = !!cfg.autoRotate;
            autoRotateCb.onchange = () => {
                cfg.autoRotate = autoRotateCb.checked;
            };
        }
    }
}

const toggleGarageDebug = () => {
    if (!garageDebugMenu) return;
    const isHidden = window.getComputedStyle(garageDebugMenu).display === 'none';
    garageDebugMenu.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) syncGarageDebugUI();
};

document.getElementById('btn-toggle-garage-debug')?.addEventListener('click', toggleGarageDebug);
document.getElementById('btn-close-garage-debug')?.addEventListener('click', toggleGarageDebug);

document.getElementById('btn-save-garage-cfg')?.addEventListener('click', () => {
    garageScene.saveConfig();
    alert('Настройки гаража сохранены!');
});

document.getElementById('btn-reset-garage-cfg')?.addEventListener('click', () => {
    garageScene.resetConfig();
    syncGarageDebugUI();
    alert('Настройки гаража сброшены!');
});

syncGarageDebugUI();

let toggleBattleDebugFn: (() => void) | null = null;

window.addEventListener('keydown', (e) => {
    if (e.code === 'F4' || e.code === 'Backquote') {
        e.preventDefault();
        if (!inBattle) {
            toggleGarageDebug();
        } else if (toggleBattleDebugFn) {
            toggleBattleDebugFn();
        }
    }
});

const launchBattle = () => {
    if (inBattle) return;
    inBattle = true;

    if (garageDebugMenu) garageDebugMenu.style.display = 'none';
    document.getElementById('garage-screen')?.classList.remove('active');
    document.getElementById('battle-screen')?.classList.add('active');

    try {
        garageScene.destroy();
        garageRenderer.dispose();
    } catch { }

    const hull = garageUI?.equipped?.hull || 'viking';
    const turret = garageUI?.equipped?.turret || 'shaft';
    const paint = garageUI?.equipped?.paint || 'white';
    const hullMod = (garageUI?.equipped as any)?.hullMod || 'm0';
    const turretMod = (garageUI?.equipped as any)?.turretMod || 'm0';

    startBattleGame(hull, turret, paint, hullMod, turretMod, 'arena', 'DM');
};

if (garageUI) garageUI.onStartBattle = launchBattle;
document.getElementById('btn-garage-battle')?.addEventListener('click', launchBattle);

async function startBattleGame(
    selectedHull: string,
    selectedTurret: string,
    selectedPaint: string,
    selectedHullMod: string = 'm0',
    selectedTurretMod: string = 'm0',
    selectedMap: string = 'arena',
    gameMode: 'DM' | 'TDM' | 'CTF' = 'DM'
) {
    container.innerHTML = '';

    await RAPIER.init();
    const world = new RAPIER.World({ x: 0, y: -20.0, z: 0 });

    const battleGraphics = new Renderer(container);
    battleGraphics.scene.add(battleGraphics.sun.target);

    let mapMesh: THREE.Group | null = null;
    try {
        const loaded = await mapLoader.loadMap(selectedMap, battleGraphics.scene, world);
        mapMesh = loaded.mapMesh;
    } catch (e) {
        try {
            mapMesh = await assets.loadMap('/maps/map.glb', battleGraphics.scene, world);
        } catch { }
    }

    const spawns = new SpawnManager();
    const mapOffset = mapMesh ? mapMesh.position.clone() : new THREE.Vector3(0, 0, 0);
    await spawns.loadSpawns(selectedMap, gameMode, mapOffset, world, mapMesh);

    let currentPaint = selectedPaint || 'white';
    let currentHullMod = selectedHullMod || 'm0';
    let currentTurretMod = selectedTurretMod || 'm0';

    // Спавним танк локального игрока на арене
    const playerInitialPoint = spawns.getSpawn('neutral');

    const hullMesh = await assets.loadModel('hulls', selectedHull, 5.0, currentHullMod);
    const turretMesh = await assets.loadModel('turrets', selectedTurret, 4.0, currentTurretMod);

    const localTank = new TankPhysicsController(
        world,
        hullMesh,
        turretMesh,
        playerInitialPoint.position,
        selectedHull,
        selectedTurret,
        currentHullMod,
        currentTurretMod
    );

    localTank.toggleDebug(false);
    assets.applyPaint(localTank.hullVisual, currentPaint);
    assets.applyPaint(localTank.turretVisual, currentPaint);
    battleGraphics.scene.add(localTank.visualRoot);

    const weaponManager = new WeaponManager(battleGraphics.scene, world, battleGraphics.camera, battleHUD || undefined);

    const playerCombatant: Combatant = {
        id: 'player_local',
        name: 'Player (Вы)',
        controller: localTank,
        currentHealth: 2000,
        maxHealth: 2000,
        isDead: false,
        team: 'blue',
        freezeRatio: 0.0,
        energy: 1.0,
        hullMod: currentHullMod,
        turretMod: currentTurretMod
    };
    weaponManager.registerCombatant(playerCombatant);

    const dropBoxManager = new DropBoxManager(
        battleGraphics.scene,
        world,
        weaponManager,
        battleHUD || undefined
    );
    weaponManager.dropBoxManager = dropBoxManager;

    await dropBoxManager.setupBattleZones(selectedMap, mapOffset, mapMesh);

    // 1. Инициализация звука
    const audio = AudioManager.getInstance();
    audio.startTankEngine();

    // 2. Инициализация сетевого менеджера
    const network = new NetworkManager(
        battleGraphics.scene,
        world,
        assets,
        selectedHull,
        selectedTurret,
        currentPaint,
        currentHullMod,
        currentTurretMod,
        weaponManager,
        playerInitialPoint.position,
        battleHUD || undefined
    );

    // 3. Синхронизация выстрелов, мин и дропов с сервером
    weaponManager.onFireShot = (weapon: string, origin: THREE.Vector3, dir: THREE.Vector3, hitPoint?: THREE.Vector3, victim?: Combatant, damage?: number) => {
        network.sendShot(weapon, origin, dir, hitPoint, victim?.id, damage);
    };

    weaponManager.onPlaceMine = (id: string, x: number, y: number, z: number) => {
        network.sendMinePlace(id, x, y, z);
    };

    dropBoxManager.onBoxPickup = (boxId: string, boxType: any) => {
        network.sendBoxTake(boxId, boxType);
    };

    dropBoxManager.onGoldRequest = (callerName?: string) => {
        network.sendGoldRequest(callerName);
    };

    // 4. Сетевое получение урона по нашему танку
    network.onLocalDamage = (damage: number, currentHp: number) => {
        playerCombatant.currentHealth = currentHp;
        battleHUD?.setHealth(playerCombatant.currentHealth, playerCombatant.maxHealth);
        weaponManager.spawnDamageIndicator(localTank.getPosition().add(new THREE.Vector3(0, 1.0, 0)), damage, false);
    };

    // 5. Обработка уничтожения нашего танка
    network.onLocalDeath = (killerName: string, weapon: string) => {
        playerCombatant.isDead = true;
        playerCombatant.currentHealth = 0;
        battleHUD?.setHealth(0, playerCombatant.maxHealth);

        const tankPos = localTank.getPosition();
        (assets as any).vfx?.playSequence?.({
            stripUrl: '/battle/death/explosion.png',
            position: tankPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
            duration: 0.65,
            scaleStart: 2.5,
            scaleEnd: 7.0,
            rotation: Math.random() * Math.PI * 2,
            easing: 'easeOutCubic',
            fadeOutRatio: 0.6
        });

        const texLoader = new THREE.TextureLoader();
        texLoader.load('/battle/death/dead.jpg', (deadTex) => {
            deadTex.colorSpace = THREE.SRGBColorSpace;
            const deadMat = new THREE.MeshStandardMaterial({ map: deadTex, roughness: 0.9, metalness: 0.1 });
            localTank.visualRoot.traverse((node: any) => {
                if (node.isMesh) node.material = deadMat;
            });
        });
    };

    // 6. Обработка возрождения от сервера
    network.onLocalRespawn = (x: number, y: number, z: number) => {
        playerCombatant.isDead = false;
        playerCombatant.currentHealth = playerCombatant.maxHealth;
        battleHUD?.setHealth(playerCombatant.maxHealth, playerCombatant.maxHealth);

        localTank.chassisBody.setTranslation({ x, y, z }, true);
        localTank.resetOrientation(0);
        assets.applyPaint(localTank.hullVisual, currentPaint);
        assets.applyPaint(localTank.turretVisual, currentPaint);
    };

    // Считываем точные физические размеры из локального танка
    const localHSpec = (localTank as any).hSpec || {};
    const localTSpec = (localTank as any).tSpec || {};

    let hullBoxSize = { x: 3.24, y: 1.05, z: 4.90 };
    let hullCenterY = 0.85;
    let turretBoxSize = { x: 1.55, y: 0.85, z: 2.85 };
    let turretCenterY = 1.62;
    let turretCenterZ = 0.0;

    if ((localTank as any).hullWireframe && (localTank as any).hullWireframe.geometry) {
        const geo = (localTank as any).hullWireframe.geometry;
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        if (bb) {
            hullBoxSize.x = bb.max.x - bb.min.x;
            hullBoxSize.y = bb.max.y - bb.min.y;
            hullBoxSize.z = bb.max.z - bb.min.z;
            hullCenterY = (bb.max.y + bb.min.y) / 2;
        }
    }

    if ((localTank as any).turretWireframe && (localTank as any).turretWireframe.geometry) {
        const geo = (localTank as any).turretWireframe.geometry;
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        if (bb) {
            turretBoxSize.x = bb.max.x - bb.min.x;
            turretBoxSize.y = bb.max.y - bb.min.y;
            turretBoxSize.z = bb.max.z - bb.min.z;
            turretCenterY = (bb.max.y + bb.min.y) / 2;
            turretCenterZ = (bb.max.z + bb.min.z) / 2;
        }
    }

    network.setLocalHitboxSpecs({
        halfWidth: hullBoxSize.x / 2,
        halfHeight: hullBoxSize.y / 2,
        halfLength: hullBoxSize.z / 2,
        centerY: hullCenterY
    }, {
        boxWidth: turretBoxSize.x,
        boxHeight: turretBoxSize.y,
        boxLength: turretBoxSize.z,
        centerY: turretCenterY,
        centerZ: turretCenterZ
    });

    network.connect('ws://localhost:8080');

    // Синхронизация персонального сетевого ID и удаление любых плашек собственного танка
    const syncIdInterval = setInterval(() => {
        if (network.myPlayerId) {
            battleHUD?.removeOverheadPlate('player_local');
            battleHUD?.removeOverheadPlate(playerCombatant.id);
            battleHUD?.removeOverheadPlate(network.myPlayerId);
            playerCombatant.id = network.myPlayerId;
            clearInterval(syncIdInterval);
        }
    }, 50);

    weaponManager.onRespawn = (victim) => {
        spawns.respawn(victim.controller, world, victim.team);
        const paint = victim.team === 'red' ? 'red' : currentPaint;
        assets.applyPaint(victim.controller.hullVisual, paint);
        assets.applyPaint(victim.controller.turretVisual, paint);
        victim.freezeRatio = 0.0;
        victim.burnTimer = 0.0;
        victim.burnIntensity = 0.0;
        victim.energy = 1.0;
        victim.controller.applyFrostVisual(0.0);
        victim.controller.applyBurnVisual(0.0);
    };

    if (battleHUD) {
        battleHUD.setVisible(true);

        for (let i = 1; i <= 6; i++) {
            if (playerSupplies[i]) {
                battleHUD.updateSupplySlot(i, playerSupplies[i]);
            }
        }

        battleHUD.onActivateSupply = (slotId: number) => {
            const s = playerSupplies[slotId];
            if (!s || s.count <= 0 || s.cooldown > 0) return;

            s.count--;
            s.cooldown = s.maxCooldown;
            s.activeDuration = slotId === 1 ? 3 : (slotId === 6 ? 0 : 40);
            battleHUD?.updateSupplySlot(slotId, s);

            weaponManager.activateSupply(playerCombatant, slotId);
        };

        battleHUD.renderScoreboard([
            { name: 'Player (Вы)', rank: 12, score: 140, kills: 7, deaths: 1, ping: 18, team: 'blue', isLocal: true }
        ], gameMode === 'DM');
    }

    const battleDebug = document.getElementById('debug-menu');

    const bindVal = (id: string, valId: string, get: () => number, set: (v: number) => void, onDone?: () => void) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        const span = document.getElementById(valId);
        if (!inp) return;

        try {
            const v = get();
            inp.value = (v ?? 0).toString();
            if (span) span.innerText = (v ?? 0).toFixed(2);
        } catch { }

        inp.oninput = () => {
            const v = parseFloat(inp.value);
            if (span && !isNaN(v)) span.innerText = Number.isInteger(v) ? v.toString() : v.toFixed(2);
            set(v);
            localTank.applyTuning();
            if (onDone) onDone();
        };
    };

    const ALL_HULLS = ['wasp', 'hornet', 'hunter', 'viking', 'dictator', 'titan', 'mammoth'];
    const ALL_TURRETS = ['smoky', 'firebird', 'twins', 'railgun', 'isida', 'thunder', 'freeze', 'ricochet', 'shaft'];
    const ALL_PAINTS = [
        'white', 'green', 'black', 'blue', 'red', 'orange', 'acid', 'apple', 'flora',
        'galaxy', 'izumurud', 'jaguar', 'krio', 'lava', 'marine', 'moderator',
        'needles', 'nefrit', 'nightmare', 'python', 'redl', 'safari', 'savanna',
        'space', 'spark', 'standstone', 'storm', 'vlastelin', 'zeus'
    ];

    function syncBattleDebugUI() {
        bindVal('t-hullVisualY', 'v-hullVisualY', () => localTank.hSpec.visualOffsetY ?? -0.24, (v) => localTank.hSpec.visualOffsetY = v);
        bindVal('t-hullScale', 'v-hullScale', () => localTank.hSpec.visualScale ?? 1.0, (v) => {
            localTank.hSpec.visualScale = v;
            localTank.autoFitHullHitbox();
        });
        bindVal('t-turretScale', 'v-turretScale', () => localTank.tSpec.visualScale ?? 1.0, (v) => {
            localTank.tSpec.visualScale = v;
            localTank.autoFitTurretHitbox();
        });

        bindVal('t-mountX', 'v-mountX', () => localTank.hSpec.mountX || 0, (v) => localTank.hSpec.mountX = v);
        bindVal('t-mountY', 'v-mountY', () => localTank.hSpec.mountY, (v) => localTank.hSpec.mountY = v);
        bindVal('t-mountZ', 'v-mountZ', () => localTank.hSpec.mountZ, (v) => localTank.hSpec.mountZ = v);

        bindVal('t-pivotX', 'v-pivotX', () => localTank.tSpec.pivotX || 0, (v) => localTank.tSpec.pivotX = v);
        bindVal('t-pivotY', 'v-pivotY', () => localTank.tSpec.pivotY, (v) => localTank.tSpec.pivotY = v);
        bindVal('t-pivotZ', 'v-pivotZ', () => localTank.tSpec.pivotZ, (v) => localTank.tSpec.pivotZ = v);

        bindVal('t-tboxW', 'v-tboxW', () => localTank.tSpec.boxWidth, (v) => localTank.tSpec.boxWidth = v, () => localTank.updateHitboxGeometry());
        bindVal('t-tboxH', 'v-tboxH', () => localTank.tSpec.boxHeight, (v) => localTank.tSpec.boxHeight = v, () => localTank.updateHitboxGeometry());
        bindVal('t-tboxL', 'v-tboxL', () => localTank.tSpec.boxLength, (v) => localTank.tSpec.boxLength = v, () => localTank.updateHitboxGeometry());
        bindVal('t-tboxY', 'v-tboxY', () => localTank.tSpec.boxOffsetY, (v) => localTank.tSpec.boxOffsetY = v, () => localTank.updateHitboxGeometry());
        bindVal('t-tboxZ', 'v-tboxZ', () => localTank.tSpec.boxOffsetZ, (v) => localTank.tSpec.boxOffsetZ = v, () => localTank.updateHitboxGeometry());

        bindVal('t-hboxW', 'v-hboxW', () => localTank.hSpec.halfWidth * 2, (v) => localTank.hSpec.halfWidth = v / 2, () => localTank.updateHitboxGeometry());
        bindVal('t-hboxH', 'v-hboxH', () => localTank.hSpec.halfHeight * 2, (v) => localTank.hSpec.halfHeight = v / 2, () => localTank.updateHitboxGeometry());
        bindVal('t-hboxL', 'v-hboxL', () => localTank.hSpec.halfLength * 2, (v) => localTank.hSpec.halfLength = v / 2, () => localTank.updateHitboxGeometry());
        bindVal('t-hboxOffY', 'v-hboxOffY', () => localTank.hSpec.colliderOffsetY, (v) => localTank.hSpec.colliderOffsetY = v, () => localTank.updateHitboxGeometry());

        bindVal('t-trackWidth', 'v-trackWidth', () => localTank.hSpec.trackWidthRatio || 0.95, (v) => localTank.hSpec.trackWidthRatio = v, () => localTank.setupSuspensionRays());
        bindVal('t-trackLength', 'v-trackLength', () => localTank.hSpec.trackLengthRatio || 1.85, (v) => localTank.hSpec.trackLengthRatio = v, () => localTank.setupSuspensionRays());
        bindVal('t-rayOriginY', 'v-rayOriginY', () => localTank.hSpec.rayOriginY || 0.08, (v) => localTank.hSpec.rayOriginY = v, () => localTank.setupSuspensionRays());
        bindVal('t-restLen', 'v-restLen', () => localTank.hSpec.suspensionRestLength, (v) => localTank.hSpec.suspensionRestLength = v, () => localTank.setupSuspensionRays());
        bindVal('t-stiffness', 'v-stiffness', () => localTank.hSpec.suspensionStiffness, (v) => localTank.hSpec.suspensionStiffness = v);
        bindVal('t-damping', 'v-damping', () => localTank.hSpec.suspensionDamping, (v) => localTank.hSpec.suspensionDamping = v);
        bindVal('t-driveForce', 'v-driveForce', () => localTank.hSpec.driveForce, (v) => localTank.hSpec.driveForce = v);
        bindVal('t-turnTorque', 'v-turnTorque', () => localTank.hSpec.turnTorque, (v) => localTank.hSpec.turnTorque = v);

        bindVal('t-camDist', 'v-camDist', () => CAMERA_CONFIG.distance, (v) => CAMERA_CONFIG.distance = v);
        bindVal('t-camHeight', 'v-camHeight', () => CAMERA_CONFIG.height, (v) => CAMERA_CONFIG.height = v);
        bindVal('t-camLookY', 'v-camLookY', () => CAMERA_CONFIG.targetOffsetY, (v) => CAMERA_CONFIG.targetOffsetY = v);
        bindVal('t-camLag', 'v-camLag', () => CAMERA_CONFIG.posLagSpeed, (v) => CAMERA_CONFIG.posLagSpeed = v);

        ALL_HULLS.forEach(h => {
            document.getElementById(`sw-hull-${h}`)?.classList.toggle('active', localTank.currentHullName === h);
        });
        ALL_TURRETS.forEach(t => {
            document.getElementById(`sw-turret-${t}`)?.classList.toggle('active', localTank.currentTurretName === t);
        });
        ALL_PAINTS.forEach(p => {
            document.getElementById(`sw-paint-${p}`)?.classList.toggle('active', currentPaint === p);
        });

        // Кнопки модификаций (M0-M3)
        ['m0', 'm1', 'm2', 'm3'].forEach(mod => {
            const btnHull = document.getElementById(`sw-hullmod-${mod}`);
            if (btnHull) {
                btnHull.classList.toggle('active', currentHullMod === mod);
                btnHull.onclick = async () => {
                    currentHullMod = mod;
                    await localTank.switchEquipment('hull', localTank.currentHullName, assets, currentPaint, currentHullMod);
                    weaponManager.applyModifications(playerCombatant, currentHullMod, currentTurretMod);

                    // Сообщаем серверу, что мы переоделись
                    if ((network as any).ws && network.isConnected) {
                        (network as any).ws.send(JSON.stringify({ type: 'c_equip_change', hull: localTank.currentHullName, turret: localTank.currentTurretName, paint: currentPaint, hullMod: currentHullMod, turretMod: currentTurretMod }));
                    }
                    syncBattleDebugUI();
                };
            }

            const btnTurret = document.getElementById(`sw-turretmod-${mod}`);
            if (btnTurret) {
                btnTurret.classList.toggle('active', currentTurretMod === mod);
                btnTurret.onclick = async () => {
                    currentTurretMod = mod;
                    await localTank.switchEquipment('turret', localTank.currentTurretName, assets, currentPaint, currentTurretMod);
                    weaponManager.applyModifications(playerCombatant, currentHullMod, currentTurretMod);

                    // Сообщаем серверу, что мы переоделись
                    if ((network as any).ws && network.isConnected) {
                        (network as any).ws.send(JSON.stringify({ type: 'c_equip_change', hull: localTank.currentHullName, turret: localTank.currentTurretName, paint: currentPaint, hullMod: currentHullMod, turretMod: currentTurretMod }));
                    }
                    syncBattleDebugUI();
                };
            }
        });
    }

    const toggleBattleDebug = () => {
        if (!battleDebug) return;
        const isHidden = window.getComputedStyle(battleDebug).display === 'none';
        battleDebug.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) syncBattleDebugUI();
    };

    toggleBattleDebugFn = toggleBattleDebug;

    document.getElementById('btn-hitbox-toggle')?.addEventListener('click', () => {
        const isVis = localTank.toggleDebug();
        network.remoteTanks.forEach(rt => rt.toggleDebug(isVis));
    });

    document.getElementById('btn-autofit')?.addEventListener('click', () => {
        localTank.autoFitHullHitbox();
        localTank.autoFitTurretHitbox();
        syncBattleDebugUI();
    });

    document.getElementById('btn-flip-hull')?.addEventListener('click', () => {
        localTank.hSpec.rotY = (localTank.hSpec.rotY === 0) ? Math.PI : 0;
        localTank.applyTuning();
    });

    document.getElementById('btn-flip-turret')?.addEventListener('click', () => {
        localTank.tSpec.rotY = (localTank.tSpec.rotY === 0) ? Math.PI : 0;
        localTank.applyTuning();
    });

    ALL_HULLS.forEach(h => {
        const btn = document.getElementById(`sw-hull-${h}`);
        if (btn) {
            btn.onclick = async () => {
                await localTank.switchEquipment('hull', h, assets, currentPaint, currentHullMod);
                weaponManager.applyModifications(playerCombatant, currentHullMod, currentTurretMod);
                if ((network as any).ws && network.isConnected) {
                    (network as any).ws.send(JSON.stringify({ type: 'c_equip_change', hull: h, turret: localTank.currentTurretName, paint: currentPaint, hullMod: currentHullMod, turretMod: currentTurretMod }));
                }
                syncBattleDebugUI();
            };
        }
    });

    ALL_TURRETS.forEach(t => {
        const btn = document.getElementById(`sw-turret-${t}`);
        if (btn) {
            btn.onclick = async () => {
                await localTank.switchEquipment('turret', t, assets, currentPaint, currentTurretMod);
                weaponManager.applyModifications(playerCombatant, currentHullMod, currentTurretMod);
                if ((network as any).ws && network.isConnected) {
                    (network as any).ws.send(JSON.stringify({ type: 'c_equip_change', hull: localTank.currentHullName, turret: t, paint: currentPaint, hullMod: currentHullMod, turretMod: currentTurretMod }));
                }
                syncBattleDebugUI();
            };
        }
    });

    ALL_PAINTS.forEach(p => {
        const btn = document.getElementById(`sw-paint-${p}`);
        if (btn) {
            btn.onclick = () => {
                currentPaint = p;
                assets.applyPaint(localTank.hullVisual, currentPaint);
                assets.applyPaint(localTank.turretVisual, currentPaint);
                if ((network as any).ws && network.isConnected) {
                    (network as any).ws.send(JSON.stringify({ type: 'c_equip_change', hull: localTank.currentHullName, turret: localTank.currentTurretName, paint: currentPaint, hullMod: currentHullMod, turretMod: currentTurretMod }));
                }
                syncBattleDebugUI();
            };
        }
    });

    const btnSaveCfg = document.getElementById('btn-save-cfg');
    if (btnSaveCfg) {
        btnSaveCfg.onclick = () => {
            localStorage.setItem('retanki_tank_specs', JSON.stringify(localTank.specs));
            localStorage.setItem('retanki_camera_config', JSON.stringify(CAMERA_CONFIG));
            alert('Конфигурация танка и камеры сохранена!');
        };
    }

    const btnResetCfg = document.getElementById('btn-reset-cfg');
    if (btnResetCfg) {
        btnResetCfg.onclick = () => {
            localStorage.removeItem('retanki_tank_specs');
            localStorage.removeItem('retanki_camera_config');
            CAMERA_CONFIG = { ...DEFAULT_CAMERA_CONFIG };
            localTank.specs = JSON.parse(JSON.stringify(DEFAULT_TANK_SPECS));
            localTank.hSpec = localTank.specs.hulls[localTank.currentHullName];
            localTank.tSpec = localTank.specs.turrets[localTank.currentTurretName];
            localTank.applyTuning();
            localTank.updateHitboxGeometry();
            localTank.setupSuspensionRays();
            syncBattleDebugUI();
            alert('Настройки сброшены к значениям по умолчанию!');
        };
    }
    const initialZoneData = {
        groundY: 5.95,
        dropZones: [
            { type: 'repair', x: 0.0, z: 0.0 },
            { type: 'armor', x: -7.5, z: -6.0 },
            { type: 'armor', x: 7.5, z: 6.0 },
            { type: 'damage', x: 6.5, z: -6.0 },
            { type: 'damage', x: -6.5, z: 6.0 },
            { type: 'speed', x: -9.0, z: 0.0 },
            { type: 'speed', x: 9.0, z: 0.0 }
        ],
        goldSpots: [
            { x: 0.0, z: -4.5 },
            { x: 0.0, z: 4.5 },
            { x: -5.5, z: -4.0 },
            { x: 5.5, z: 4.0 },
            { x: -8.0, z: -8.0 },
            { x: 8.0, z: 8.0 }
        ],
        spawns: [
            { x: -8.0, y: 5.95, z: -11.0 },
            { x: 8.0, y: 5.95, z: -11.0 },
            { x: 8.0, y: 5.95, z: 11.0 },
            { x: -8.0, y: 5.95, z: 11.0 },
            { x: 0.0, y: 5.95, z: 0.0 }
        ]
    };

    // Создаем редактор
    const zoneEditor = new ZoneEditorUI(
        initialZoneData,
        (cfg) => {
            dropBoxManager.dropZones.forEach(z => {
                z.groundY = cfg.groundY;
                if (z.decalMesh) {
                    z.decalMesh.position.y = cfg.groundY + 0.04;
                }
            });
        },
        (cfg) => {
            (network as any).ws?.send(JSON.stringify({
                type: 'c_save_arena_zones',
                payload: cfg
            }));
        }
    );

    if (battleDebug) battleDebug.style.display = 'none';
    syncBattleDebugUI();

    let shaftOverlay = document.getElementById('shaft-scope-overlay');
    if (!shaftOverlay) {
        shaftOverlay = document.createElement('div');
        shaftOverlay.id = 'shaft-scope-overlay';
        shaftOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            display: none;
            z-index: 40;
            background: radial-gradient(circle at center, transparent 30%, rgba(0, 10, 20, 0.75) 60%, rgba(0, 0, 0, 0.96) 88%);
        `;
        shaftOverlay.innerHTML = `
            <div style="position: absolute; left: 50%; top: 50%; width: 250px; height: 250px; border: 2px solid rgba(249, 115, 22, 0.75); border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 20px rgba(249, 115, 22, 0.45);">
                <div style="position: absolute; left: -40px; right: -40px; top: 50%; height: 1px; background: rgba(249, 115, 22, 0.85);"></div>
                <div style="position: absolute; top: -40px; bottom: -40px; left: 50%; width: 1px; background: rgba(249, 115, 22, 0.85);"></div>
                <div style="position: absolute; left: 50%; top: 50%; width: 6px; height: 6px; background: #ef4444; border-radius: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px #ef4444;"></div>
            </div>
        `;
        document.body.appendChild(shaftOverlay);
    }

    let turretYaw = 0;
    let currentCamYaw = 0;
    const currentCamPos = new THREE.Vector3();
    const currentCamTarget = new THREE.Vector3();

    function doRespawn(tank: TankPhysicsController, team: 'neutral' | 'red' | 'blue' = 'neutral') {
        const sp = spawns.respawn(tank, world, team);

        if (tank === localTank) {
            turretYaw = 0;
            weaponManager.shaftPitch = 0.0;
            currentCamYaw = sp.yaw;

            localTank.turretMount.rotation.y = 0;
            localTank.turretMount.rotation.x = 0;
            localTank.syncTurretColliderRotation(0);

            const tankPos = localTank.getPosition();
            const camFwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), currentCamYaw);

            currentCamPos.set(
                tankPos.x - camFwd.x * CAMERA_CONFIG.distance,
                tankPos.y + CAMERA_CONFIG.height,
                tankPos.z - camFwd.z * CAMERA_CONFIG.distance
            );
            currentCamTarget.set(
                tankPos.x,
                tankPos.y + CAMERA_CONFIG.targetOffsetY,
                tankPos.z
            );

            battleGraphics.camera.position.copy(currentCamPos);
            battleGraphics.camera.lookAt(currentCamTarget);
        }
    }

    doRespawn(localTank, 'neutral');

    const keys: Record<string, boolean> = {};

    let isStreamFiring = false;

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        const supplyKeyMap: Record<string, number> = {
            'Digit1': 1, 'Numpad1': 1,
            'Digit2': 2, 'Numpad2': 2,
            'Digit3': 3, 'Numpad3': 3,
            'Digit4': 4, 'Numpad4': 4,
            'Digit5': 5, 'Numpad5': 5,
            'Digit6': 6, 'Numpad6': 6
        };

        if (supplyKeyMap[e.code]) {
            const slotId = supplyKeyMap[e.code];
            const s = playerSupplies[slotId];
            if (s && s.count > 0 && s.cooldown <= 0) {
                s.count--;
                s.cooldown = s.maxCooldown;
                s.activeDuration = slotId === 1 ? 3 : (slotId === 6 ? 0 : 40);
                battleHUD?.updateSupplySlot(slotId, s);

                weaponManager.activateSupply(playerCombatant, slotId);
            }
        }

        if (e.code === 'Space' && !playerCombatant.isDead && !isStreamFiring) {
            const weapon = localTank.currentTurretName.toLowerCase();
            if (weapon === 'firebird' || weapon === 'freeze' || weapon === 'isida') {
                isStreamFiring = true;
                network.sendStreamState(weapon, true);
            }
        }

        if (e.code === 'KeyG') {
            const s = playerSupplies[6];
            if (s && s.count > 0 && s.cooldown <= 0) {
                s.count--;
                s.cooldown = s.maxCooldown;
                battleHUD?.updateSupplySlot(6, s);
            }
            network.sendGoldRequest(playerCombatant.name);
        }

        if (e.code === 'KeyR') {
            localTank.recover();
            turretYaw = 0;
            weaponManager.shaftPitch = 0.0;
        }

        if (e.code === 'KeyK' || e.code === 'Delete') {
            doRespawn(localTank, 'neutral');
            playerCombatant.currentHealth = playerCombatant.maxHealth;
            playerCombatant.isDead = false;
        }

        if (e.code === 'KeyH') {
            const isVis = localTank.toggleDebug();
            network.remoteTanks.forEach(rt => rt.toggleDebug(isVis));
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;

        if (e.code === 'Space' && isStreamFiring) {
            const weapon = localTank.currentTurretName.toLowerCase();
            isStreamFiring = false;
            network.sendStreamState(weapon, false);
        }
    });

    window.addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;

        if (isStreamFiring) {
            const weapon = localTank.currentTurretName.toLowerCase();
            isStreamFiring = false;
            network.sendStreamState(weapon, false);
        }
    });

    const flipAlert = document.getElementById('flip-alert');
    let lastTime = performance.now();
    let matchTimeSeconds = 900;
    let currentFund = 120;

    function battleLoop() {
        requestAnimationFrame(battleLoop);

        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.033);
        lastTime = now;

        let driveInput = 0;
        let turnInput = 0;
        let turretInput = 0;

        matchTimeSeconds = Math.max(0, matchTimeSeconds - dt);
        currentFund += dt * 0.45;
        battleHUD?.updateMatchState(Math.floor(currentFund), matchTimeSeconds, 1, 0, gameMode === 'DM');

        if (!playerCombatant.isDead) {
            if (keys['KeyW'] || keys['ArrowUp']) driveInput += 1.0;
            if (keys['KeyS'] || keys['ArrowDown']) driveInput -= 1.0;

            if (keys['KeyA'] || keys['ArrowLeft']) turnInput += 1.0;
            if (keys['KeyD'] || keys['ArrowRight']) turnInput -= 1.0;

            if (keys['KeyZ']) turretInput += 1.0;
            if (keys['KeyX']) turretInput -= 1.0;
        }

        const isLocalFiring = !!keys['Space'] && !playerCombatant.isDead;
        weaponManager.update(dt, isLocalFiring, playerCombatant);

        dropBoxManager.update(dt, [playerCombatant]);

        const isShaftSniping = weaponManager.isShaftSniping();
        const shaftZoomRatio = weaponManager.getShaftZoomRatio();

        if (shaftOverlay) {
            shaftOverlay.style.display = isShaftSniping ? 'block' : 'none';
        }

        if (battleHUD) {
            battleHUD.setHealth(playerCombatant.currentHealth, playerCombatant.maxHealth);
            battleHUD.setReloadProgress(weaponManager.getReloadProgress());

            battleHUD.removeOverheadPlate('player_local');
            if (network.myPlayerId) {
                battleHUD.removeOverheadPlate(network.myPlayerId);
            }

            network.remoteTanks.forEach((remote) => {
                const tankPos = remote.visualRoot.position.clone();
                const overheadWorldPos = tankPos.clone();
                overheadWorldPos.y += 2.2;

                const dist = battleGraphics.camera.position.distanceTo(overheadWorldPos);
                const proj = overheadWorldPos.clone().project(battleGraphics.camera);
                const isBehindCam = proj.z > 1.0;

                const screenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
                const screenY = (-(proj.y * 0.5) + 0.5) * window.innerHeight;

                const visible = !isBehindCam && !remote.isDead;
                const scale = Math.max(0.65, Math.min(1.05, 1.0 - (dist - 12.0) * 0.015));

                battleHUD.updateOverheadPlate(remote.id, {
                    name: remote.username,
                    screenX,
                    screenY,
                    scale,
                    visible,
                    opacity: 1.0,
                    hpRatio: remote.currentHealth / remote.maxHealth,
                    team: remote.team,
                    isLocal: false,
                    rank: remote.rank || 4
                });
            });

            for (let i = 1; i <= 6; i++) {
                const s = playerSupplies[i];
                if (!s) continue;

                let needsHudUpdate = false;
                if (s.cooldown > 0) {
                    s.cooldown = Math.max(0, s.cooldown - dt);
                    needsHudUpdate = true;
                }
                if (s.activeDuration > 0) {
                    s.activeDuration = Math.max(0, s.activeDuration - dt);
                    needsHudUpdate = true;
                }
                if (needsHudUpdate) {
                    battleHUD.updateSupplySlot(i, s);
                }
            }
        }

        const freezeTurretMult = THREE.MathUtils.lerp(1.0, 0.20, localTank.freezeRatio || 0);

        if (isShaftSniping) {
            if (keys['KeyW'] || keys['ArrowUp']) {
                weaponManager.shaftPitch = Math.min(0.44, weaponManager.shaftPitch + 0.55 * dt);
            }
            if (keys['KeyS'] || keys['ArrowDown']) {
                weaponManager.shaftPitch = Math.max(-0.35, weaponManager.shaftPitch - 0.55 * dt);
            }

            turretYaw += turretInput * localTank.tSpec.maxTurretSpeed * freezeTurretMult * 0.32 * dt;
            localTank.turretMount.rotation.x = -weaponManager.shaftPitch;
        } else {
            weaponManager.shaftPitch = THREE.MathUtils.damp(weaponManager.shaftPitch, 0.0, 12.0, dt);
            localTank.turretMount.rotation.x = -weaponManager.shaftPitch;

            if (keys['KeyC']) {
                turretYaw = THREE.MathUtils.damp(turretYaw, 0, 14.0 * freezeTurretMult, dt);
            } else {
                turretYaw += turretInput * localTank.tSpec.maxTurretSpeed * freezeTurretMult * 1.5 * dt;
            }
        }

        const isTankMoving = (Math.abs(driveInput) > 0.05 || Math.abs(turnInput) > 0.05) && !playerCombatant.isDead;
        audio.updateEngineState(isTankMoving, playerCombatant.isDead);

        const isTurretMoving = Math.abs(turretInput) > 0.05 && !playerCombatant.isDead;
        if (isTurretMoving) {
            audio.playLoop('/models/turrets/TurretRotation.mp3', 'turret_rotation', 0.55);
        } else {
            audio.stop('turret_rotation', 0.05);
        }

        const tPos = localTank.getPosition();
        const tRot = localTank.chassisBody.rotation();
        const tVel = localTank.chassisBody.linvel();
        const quat = new THREE.Quaternion(tRot.x, tRot.y, tRot.z, tRot.w);
        const velVec = new THREE.Vector3(tVel.x, tVel.y, tVel.z);

        network.sendState(tPos, quat, velVec, turretYaw, driveInput, turnInput, isLocalFiring);
        network.update(dt);

        localTank.turretMount.rotation.y = turretYaw;
        localTank.syncTurretColliderRotation(turretYaw);

        const isNitroActive = (playerCombatant.speedBuffTimer && playerCombatant.speedBuffTimer > 0);
        const nitroSpeedMult = isNitroActive ? 1.40 : 1.0;

        world.timestep = dt;
        localTank.update(dt, driveInput * nitroSpeedMult, turnInput);
        world.step();

        const tankPos = localTank.getPosition();

        if (tankPos.y < spawns.lowestFloorY) {
            doRespawn(localTank, 'neutral');
            playerCombatant.currentHealth = playerCombatant.maxHealth;
            playerCombatant.isDead = false;
        }

        if (flipAlert) flipAlert.style.display = localTank.isFlipped ? 'block' : 'none';

        const targetFov = isShaftSniping ? THREE.MathUtils.lerp(55, 16, shaftZoomRatio) : 60;
        battleGraphics.camera.fov = THREE.MathUtils.damp(battleGraphics.camera.fov, targetFov, 12.0, dt);
        battleGraphics.camera.updateProjectionMatrix();

        if (isShaftSniping) {
            const muzzle = weaponManager.getShaftAimTransform(playerCombatant);
            const scopePos = muzzle.position.clone()
                .add(muzzle.direction.clone().multiplyScalar(-0.25))
                .add(new THREE.Vector3(0, 0.22, 0));
            const scopeTarget = scopePos.clone().add(muzzle.direction.clone().multiplyScalar(150.0));

            currentCamPos.lerp(scopePos, 0.45);
            currentCamTarget.lerp(scopeTarget, 0.55);

            battleGraphics.camera.position.copy(currentCamPos);
            battleGraphics.camera.lookAt(currentCamTarget);
        } else {
            const tankYaw = localTank.getYaw();
            const targetCamYaw = tankYaw + turretYaw;

            let diffYaw = targetCamYaw - currentCamYaw;
            while (diffYaw < -Math.PI) diffYaw += Math.PI * 2;
            while (diffYaw > Math.PI) diffYaw -= Math.PI * 2;
            currentCamYaw += diffYaw * (1.0 - Math.exp(-CAMERA_CONFIG.rotLagSpeed * dt));

            const camForward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), currentCamYaw);
            const idealTarget = new THREE.Vector3(tankPos.x, tankPos.y + CAMERA_CONFIG.targetOffsetY, tankPos.z);

            const idealCamPos = new THREE.Vector3(
                tankPos.x - camForward.x * CAMERA_CONFIG.distance,
                tankPos.y + CAMERA_CONFIG.height,
                tankPos.z - camForward.z * CAMERA_CONFIG.distance
            );

            const camRayVec = idealCamPos.clone().sub(idealTarget);
            const desiredDist = camRayVec.length();
            const camRayDir = camRayVec.clone().normalize();

            const camRay = new RAPIER.Ray(
                { x: idealTarget.x, y: idealTarget.y, z: idealTarget.z },
                { x: camRayDir.x, y: camRayDir.y, z: camRayDir.z }
            );

            const hit = world.castRay(
                camRay,
                desiredDist,
                true,
                undefined,
                undefined,
                undefined,
                undefined,
                (c: RAPIER.Collider) => (
                    c.handle !== localTank.chassisCollider.handle &&
                    (!localTank.turretCollider || c.handle !== localTank.turretCollider.handle)
                )
            );

            const hitToi = typeof hit === 'number' ? hit : ((hit as any)?.timeOfImpact ?? (hit as any)?.toi ?? null);

            let finalDistance = desiredDist;
            if (hitToi !== null && typeof hitToi === 'number' && hitToi < desiredDist) {
                finalDistance = Math.max(1.6, hitToi - 0.45);
            }

            const safeCamPos = idealTarget.clone().add(camRayDir.multiplyScalar(finalDistance));

            const posLerpFactor = 1.0 - Math.exp(-CAMERA_CONFIG.posLagSpeed * dt);
            currentCamPos.lerp(safeCamPos, posLerpFactor);
            currentCamTarget.lerp(idealTarget, posLerpFactor);

            battleGraphics.camera.position.copy(currentCamPos);
            battleGraphics.camera.lookAt(currentCamTarget);
        }

        battleGraphics.sun.position.set(tankPos.x + 35, 70, tankPos.z - 25);
        battleGraphics.sun.target.position.copy(tankPos);
        battleGraphics.sun.target.updateMatrixWorld();

        battleGraphics.renderer.render(battleGraphics.scene, battleGraphics.camera);
    }

    battleLoop();
}