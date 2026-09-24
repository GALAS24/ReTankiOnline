import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GarageConfig {
    tankX: number;
    tankY: number;
    tankZ: number;
    tankScale: number;
    tankRotY: number;
    camDistance: number;
    camHeight: number;
    camTargetY: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
}

export const DEFAULT_GARAGE_CONFIG: GarageConfig = {
    tankX: 0,
    tankY: 0,
    tankZ: 0,
    tankScale: 1.0,
    tankRotY: 0,
    camDistance: 9.2,
    camHeight: 2.6,
    camTargetY: 0.9,
    autoRotate: false,
    autoRotateSpeed: 0.25
};

export class GarageScene {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public tankRoot: THREE.Group = new THREE.Group();
    public garageMesh: THREE.Group | null = null;
    public config: GarageConfig;

    private loader = new GLTFLoader();

    private camAngle: number = Math.PI / 4;
    private camPitch: number = 0.25;
    private isDragging: boolean = false;
    private prevMouseX: number = 0;
    private prevMouseY: number = 0;

    constructor() {
        this.config = this.loadConfig();

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101214);

        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        this.setupLights();
        this.scene.add(this.tankRoot);

        this.applyConfig();
        this.updateCamera();
        this.setupControls();

        window.addEventListener('resize', this.onResize);
    }

    /**
     * Загрузка карты ангара и проверка масштабов
     */
    public async loadGarageModel(url: string = '/garage.glb'): Promise<THREE.Group> {
        return new Promise((resolve) => {
            this.loader.load(
                url,
                (gltf) => {
                    if (this.garageMesh) {
                        this.scene.remove(this.garageMesh);
                    }

                    this.garageMesh = gltf.scene;

                    // 1. Измеряем исходные габариты модели из Blender
                    const box = new THREE.Box3().setFromObject(this.garageMesh);
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());

                    console.log('%c[Garage Debug] РАЗМЕРЫ АНГАРЫ:', 'color: #00ff00; font-weight: bold;');
                    console.log(`Размеры (X, Y, Z): ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
                    console.log(`Центр модели: X=${center.x.toFixed(2)}, Y=${center.y.toFixed(2)}, Z=${center.z.toFixed(2)}`);

                    // 2. Проверка: если размер больше 100 единиц — модель в сантиметрах 3ds Max
                    if (size.x > 100) {
                        console.log('%c[Garage Debug] Габариты > 100 -> применяем масштаб 0.0125', 'color: #33ccff;');
                        this.garageMesh.scale.setScalar(0.0125);
                    } else {
                        console.log('%c[Garage Debug] Габариты нормальные (метры) -> масштаб 1.0', 'color: #ffaa00;');
                        this.garageMesh.scale.setScalar(1.0);
                    }

                    this.garageMesh.updateMatrixWorld(true);

                    // 3. Выравниваем подиум под танк
                    const finalBox = new THREE.Box3().setFromObject(this.garageMesh);
                    const finalCenter = finalBox.getCenter(new THREE.Vector3());

                    // Центрируем комнату относительно нуля (где стоит танк)
                    this.garageMesh.position.x -= finalCenter.x;
                    this.garageMesh.position.z -= finalCenter.z;
                    // Пол комнаты ставим точно на отметку Y = 0
                    this.garageMesh.position.y -= finalBox.min.y;

                    // 4. Настройка материалов: убираем черноту и засветы
                    this.garageMesh.traverse((node: any) => {
                        if (node.isMesh) {
                            node.castShadow = false;
                            node.receiveShadow = true;
                            if (node.material) {
                                node.material.side = THREE.DoubleSide;
                                node.material.metalness = 0.05;
                                node.material.roughness = 0.85;
                                if (node.material.map) {
                                    node.material.map.colorSpace = THREE.SRGBColorSpace;
                                }
                            }
                        }
                    });

                    this.scene.add(this.garageMesh);
                    resolve(this.garageMesh);
                },
                undefined,
                (error) => {
                    console.error('[GarageScene] Ошибка загрузки /garage.glb:', error);
                    this.createFallbackEnvironment();
                    resolve(new THREE.Group());
                }
            );
        });
    }

    private setupLights() {
        // Фоновое освещение стен и потолка
        const ambient = new THREE.AmbientLight(0xdde6f0, 1.4);
        this.scene.add(ambient);

        // Основной верхний прожектор
        const mainLight = new THREE.DirectionalLight(0xfff8ee, 2.0);
        mainLight.position.set(6, 14, 8);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.bias = -0.0003;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 40;
        this.scene.add(mainLight);

        // Контровой свет сзади
        const backLight = new THREE.DirectionalLight(0x658bb3, 1.3);
        backLight.position.set(-8, 6, -8);
        this.scene.add(backLight);
    }

    private createFallbackEnvironment() {
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(45, 45),
            new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.8, metalness: 0.1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(35, 35, 0x4a5461, 0x262b33);
        grid.position.y = 0.005;
        this.scene.add(grid);
    }

    public applyConfig() {
        this.tankRoot.position.set(this.config.tankX, this.config.tankY, this.config.tankZ);
        this.tankRoot.rotation.y = this.config.tankRotY;
        this.tankRoot.scale.setScalar(this.config.tankScale);
    }

    public updateCamera() {
        const target = new THREE.Vector3(
            this.config.tankX,
            this.config.camTargetY,
            this.config.tankZ
        );

        const cosPitch = Math.cos(this.camPitch);
        const sinPitch = Math.sin(this.camPitch);

        const x = target.x + this.config.camDistance * cosPitch * Math.sin(this.camAngle);
        const y = target.y + this.config.camHeight + this.config.camDistance * sinPitch * 0.45;
        const z = target.z + this.config.camDistance * cosPitch * Math.cos(this.camAngle);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(target);
    }

    public update(dt: number) {
        if (this.config.autoRotate && !this.isDragging) {
            this.camAngle += this.config.autoRotateSpeed * dt;
            this.updateCamera();
        }
    }

    private setupControls() {
        window.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            const isInteractive = target.closest(
                'button, input, select, textarea, .garage-item, .nav-tab, #garage-debug-menu, #debug-menu, .top-bar, .garage-card, .menu-item'
            );
            if (isInteractive) return;

            this.isDragging = true;
            this.prevMouseX = e.clientX;
            this.prevMouseY = e.clientY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;

            const dx = e.clientX - this.prevMouseX;
            const dy = e.clientY - this.prevMouseY;

            this.camAngle -= dx * 0.007;
            this.camPitch += dy * 0.007;
            this.camPitch = Math.max(-0.25, Math.min(1.25, this.camPitch));

            this.prevMouseX = e.clientX;
            this.prevMouseY = e.clientY;

            this.updateCamera();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        window.addEventListener('wheel', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('#garage-debug-menu, #debug-menu, input, select, .garage-items-list')) return;

            this.config.camDistance += e.deltaY * 0.005;
            this.config.camDistance = Math.max(3.5, Math.min(30.0, this.config.camDistance));
            this.updateCamera();
        }, { passive: true });
    }

    private onResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    };

    private loadConfig(): GarageConfig {
        const saved = localStorage.getItem('retanki_garage_config');
        if (saved) {
            try {
                return { ...DEFAULT_GARAGE_CONFIG, ...JSON.parse(saved) };
            } catch {
                console.warn('[GarageScene] Ошибка парсинга конфига ангара');
            }
        }
        return { ...DEFAULT_GARAGE_CONFIG };
    }

    public saveConfig() {
        localStorage.setItem('retanki_garage_config', JSON.stringify(this.config));
        alert('Параметры ангара сохранены!');
    }

    public resetConfig() {
        localStorage.removeItem('retanki_garage_config');
        this.config = { ...DEFAULT_GARAGE_CONFIG };
        this.camAngle = Math.PI / 4;
        this.camPitch = 0.25;
        this.applyConfig();
        this.updateCamera();
    }

    public destroy() {
        window.removeEventListener('resize', this.onResize);
        if (this.garageMesh) {
            this.scene.remove(this.garageMesh);
            this.garageMesh = null;
        }
        while (this.tankRoot.children.length > 0) {
            this.tankRoot.remove(this.tankRoot.children[0]);
        }
    }
}
