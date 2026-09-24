import * as THREE from 'three';

export interface ZoneConfigData {
    groundY: number;
    dropZones: { type: string; x: number; z: number }[];
    goldSpots: { x: number; z: number }[];
    spawns: { x: number; y: number; z: number }[];
}

export class ZoneEditorUI {
    private container: HTMLDivElement;
    public currentConfig: ZoneConfigData;
    private onSaveToServer?: (cfg: ZoneConfigData) => void;
    private onLiveUpdate?: (cfg: ZoneConfigData) => void;
    private isVisible: boolean = false;

    constructor(
        initialConfig: ZoneConfigData,
        onLiveUpdate?: (cfg: ZoneConfigData) => void,
        onSaveToServer?: (cfg: ZoneConfigData) => void
    ) {
        this.currentConfig = initialConfig;
        this.onLiveUpdate = onLiveUpdate;
        this.onSaveToServer = onSaveToServer;

        this.container = document.createElement('div');
        this.initUI();
    }

    private initUI() {
        this.container.id = 'zone-editor-ui';
        this.container.style.cssText = `
            position: fixed;
            right: 20px;
            top: 20px;
            width: 380px;
            max-height: 85vh;
            overflow-y: auto;
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid #38bdf8;
            border-radius: 10px;
            padding: 16px;
            color: #f8fafc;
            font-family: sans-serif;
            font-size: 13px;
            z-index: 99999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            display: none;
        `;

        this.render();
        document.body.appendChild(this.container);

        window.addEventListener('keydown', (e) => {
            if (e.code === 'F7') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
    }

    private render() {
        this.container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                <h3 style="margin: 0; color: #38bdf8; font-size: 16px;">Редактор Зон и Спавнов [F7]</h3>
                <button id="ze-close" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer;">✕</button>
            </div>

            <!-- Базовая высота пола арены -->
            <div style="background: #1e293b; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                <label style="font-weight: bold; color: #facc15;">Базовая высота пола (Ground Y):</label>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                    <input type="range" id="ze-groundY" min="0" max="15" step="0.01" value="${this.currentConfig.groundY}" style="flex: 1;">
                    <input type="number" id="ze-groundY-num" step="0.01" value="${this.currentConfig.groundY}" style="width: 70px; background: #0f172a; border: 1px solid #475569; color: #fff; padding: 3px; border-radius: 4px;">
                </div>
            </div>

            <!-- Дроп-зоны -->
            <div style="margin-bottom: 12px;">
                <h4 style="margin: 0 0 6px 0; color: #4ade80;">Зоны дропов:</h4>
                <div id="ze-drop-list">
                    ${this.currentConfig.dropZones.map((z, i) => `
                        <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                            <span style="width: 60px; font-weight: bold;">${z.type}:</span>
                            X: <input type="number" step="0.5" class="ze-drop-x" data-idx="${i}" value="${z.x}" style="width: 60px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px;">
                            Z: <input type="number" step="0.5" class="ze-drop-z" data-idx="${i}" value="${z.z}" style="width: 60px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px;">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Золотые зоны -->
            <div style="margin-bottom: 16px;">
                <h4 style="margin: 0 0 6px 0; color: #fbbf24;">Точки Голда:</h4>
                <div id="ze-gold-list">
                    ${this.currentConfig.goldSpots.map((g, i) => `
                        <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 4px;">
                            <span style="width: 60px;">Точка ${i + 1}:</span>
                            X: <input type="number" step="0.5" class="ze-gold-x" data-idx="${i}" value="${g.x}" style="width: 60px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px;">
                            Z: <input type="number" step="0.5" class="ze-gold-z" data-idx="${i}" value="${g.z}" style="width: 60px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px;">
                        </div>
                    `).join('')}
                </div>
            </div>

            <button id="ze-save-btn" style="width: 100%; padding: 10px; background: #22c55e; border: none; border-radius: 6px; color: #000; font-weight: bold; cursor: pointer; transition: 0.2s;">
                💾 Записать в файлы проекта (Server & Client)
            </button>
        `;

        this.bindEvents();
    }

    private bindEvents() {
        const gYRange = this.container.querySelector('#ze-groundY') as HTMLInputElement;
        const gYNum = this.container.querySelector('#ze-groundY-num') as HTMLInputElement;
        const closeBtn = this.container.querySelector('#ze-close') as HTMLButtonElement;
        const saveBtn = this.container.querySelector('#ze-save-btn') as HTMLButtonElement;

        closeBtn.onclick = () => this.toggle();

        const updateGY = (val: number) => {
            this.currentConfig.groundY = val;
            gYRange.value = val.toString();
            gYNum.value = val.toString();
            this.onLiveUpdate?.(this.currentConfig);
        };

        gYRange.oninput = () => updateGY(parseFloat(gYRange.value));
        gYNum.oninput = () => updateGY(parseFloat(gYNum.value));

        this.container.querySelectorAll('.ze-drop-x').forEach(inp => {
            inp.addEventListener('input', (e: any) => {
                const idx = parseInt(e.target.dataset.idx);
                this.currentConfig.dropZones[idx].x = parseFloat(e.target.value) || 0;
                this.onLiveUpdate?.(this.currentConfig);
            });
        });

        this.container.querySelectorAll('.ze-drop-z').forEach(inp => {
            inp.addEventListener('input', (e: any) => {
                const idx = parseInt(e.target.dataset.idx);
                this.currentConfig.dropZones[idx].z = parseFloat(e.target.value) || 0;
                this.onLiveUpdate?.(this.currentConfig);
            });
        });

        this.container.querySelectorAll('.ze-gold-x').forEach(inp => {
            inp.addEventListener('input', (e: any) => {
                const idx = parseInt(e.target.dataset.idx);
                this.currentConfig.goldSpots[idx].x = parseFloat(e.target.value) || 0;
                this.onLiveUpdate?.(this.currentConfig);
            });
        });

        this.container.querySelectorAll('.ze-gold-z').forEach(inp => {
            inp.addEventListener('input', (e: any) => {
                const idx = parseInt(e.target.dataset.idx);
                this.currentConfig.goldSpots[idx].z = parseFloat(e.target.value) || 0;
                this.onLiveUpdate?.(this.currentConfig);
            });
        });

        saveBtn.onclick = () => {
            saveBtn.innerText = 'Сохранение...';
            this.onSaveToServer?.(this.currentConfig);
            setTimeout(() => {
                saveBtn.innerText = '✓ Сохранено в Room.ts и DropBoxManager.ts';
                setTimeout(() => saveBtn.innerText = '💾 Записать в файлы проекта (Server & Client)', 2500);
            }, 600);
        };
    }
}