import * as THREE from 'three';

export class SpriteSheetCutter {
    private static instance: SpriteSheetCutter;
    private cache: Map<string, THREE.CanvasTexture[]> = new Map();
    private pendingPromises: Map<string, Promise<THREE.CanvasTexture[]>> = new Map();

    private constructor() {}

    public static getInstance(): SpriteSheetCutter {
        if (!SpriteSheetCutter.instance) {
            SpriteSheetCutter.instance = new SpriteSheetCutter();
        }
        return SpriteSheetCutter.instance;
    }

    /**
     * Автоматически нарезает полоску любой длины на массив отдельных квадратных текстур
     */
    public async slice(url: string, explicitFrames?: number): Promise<THREE.CanvasTexture[]> {
        if (this.cache.has(url)) {
            return this.cache.get(url)!;
        }

        if (this.pendingPromises.has(url)) {
            return this.pendingPromises.get(url)!;
        }

        const promise = new Promise<THREE.CanvasTexture[]>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const w = img.naturalWidth;
                const h = img.naturalHeight;

                const isHorizontal = (w >= h) || url.includes('firebird') || url.includes('shot.png');
                const frameSize = isHorizontal ? h : w;
                const frameCount = explicitFrames || Math.max(1, Math.round(isHorizontal ? w / h : h / w));
                const step = isHorizontal ? w / frameCount : h / frameCount;

                const textures: THREE.CanvasTexture[] = [];

                for (let i = 0; i < frameCount; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = frameSize;
                    canvas.height = frameSize;
                    const ctx = canvas.getContext('2d', { willReadFrequently: false });

                    if (ctx) {
                        ctx.imageSmoothingEnabled = false;

                        const sx = isHorizontal ? Math.round(i * step) : 0;
                        const sy = isHorizontal ? 0 : Math.round(i * step);
                        const sw = isHorizontal ? Math.round(step) : frameSize;
                        const sh = isHorizontal ? frameSize : Math.round(step);

                        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, frameSize, frameSize);

                        const tex = new THREE.CanvasTexture(canvas);
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.minFilter = THREE.LinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        tex.generateMipmaps = false;
                        tex.needsUpdate = true;

                        textures.push(tex);
                    }
                }

                this.cache.set(url, textures);
                this.pendingPromises.delete(url);
                resolve(textures);
            };

            img.onerror = (err) => {
                this.pendingPromises.delete(url);
                console.warn(`[SpriteSheetCutter] Не удалось загрузить текстуру: ${url}`, err);
                reject(err);
            };

            img.src = url;
        });

        this.pendingPromises.set(url, promise);
        return promise;
    }

    public preload(urls: string[]) {
        for (const u of urls) {
            this.slice(u).catch(() => {});
        }
    }

    public getFramesSync(url: string): THREE.CanvasTexture[] | null {
        return this.cache.get(url) || null;
    }
}