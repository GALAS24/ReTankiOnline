import * as THREE from 'three';

export class Renderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public sun!: THREE.DirectionalLight;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();

        // Классический бледно-голубой цвет неба из Танков Онлайн
        const fogColor = new THREE.Color(0x8cbbe3);
        this.scene.background = fogColor;
        this.scene.fog = new THREE.FogExp2(fogColor, 0.005);

        this.camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        // ВАЖНО: Защита от выцветания текстур в белый цвет
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        container.appendChild(this.renderer.domElement);

        this.setupLights();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private setupLights() {
        console.log(`[Graphics] Инициализация нормального освещения...`);

        // Снизили яркость до нормальных физических величин
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        this.scene.add(new THREE.HemisphereLight(0xcde1f5, 0x443a2f, 0.6));

        // Солнце
        this.sun = new THREE.DirectionalLight(0xfff6e6, 1.4);
        this.sun.position.set(50, 80, -35);
        this.sun.castShadow = true;

        this.sun.shadow.mapSize.set(2048, 2048);
        this.sun.shadow.camera.near = 5;
        this.sun.shadow.camera.far = 300;

        const sDist = 80;
        this.sun.shadow.camera.left = -sDist;
        this.sun.shadow.camera.right = sDist;
        this.sun.shadow.camera.top = sDist;
        this.sun.shadow.camera.bottom = -sDist;
        this.sun.shadow.bias = -0.001;

        this.scene.add(this.sun);
        this.scene.add(this.sun.target);
    }
}