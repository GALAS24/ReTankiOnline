export interface BattlePlayerScore {
    name: string;
    rank: number;
    score: number;
    kills: number;
    deaths: number;
    ping: number;
    team?: 'red' | 'blue' | 'none';
    isLocal?: boolean;
}

export interface SupplyState {
    count: number;
    cooldown: number;
    maxCooldown: number;
    activeDuration: number;
}

export interface OverheadPlateData {
    name: string;
    screenX: number;
    screenY: number;
    scale: number;
    visible: boolean;
    opacity: number;
    hpRatio: number;
    team: 'red' | 'blue' | 'neutral';
    isLocal?: boolean;
    reloadRatio?: number;
    rank?: number;
    buffs?: { armor: boolean; damage: boolean; speed: boolean };
}

interface OverheadPlateElements {
    root: HTMLElement;
    rankIcon: HTMLElement;
    nick: HTMLElement;
    hpFill: HTMLElement;
    reloadFrame?: HTMLElement;
    reloadFill?: HTMLElement;
    buffsBox: HTMLElement;
}

export class BattleHUD {
    private container: HTMLElement;
    private styleElement: HTMLStyleElement;

    private platesContainer: HTMLElement;
    private overheadPlates: Map<string, OverheadPlateElements> = new Map();

    private hpBarFill!: HTMLElement;
    private hpText!: HTMLElement;
    private reloadBarFill!: HTMLElement;

    private fundValueText!: HTMLElement;
    private timerText!: HTMLElement;
    private scoreRedText!: HTMLElement;
    private scoreBlueText!: HTMLElement;
    private flagBlueStatus!: HTMLElement;
    private flagRedStatus!: HTMLElement;
    private goldNotification!: HTMLElement;

    private supplySlots: Map<number, { box: HTMLElement; counter: HTMLElement; cooldownShutter: HTMLElement }> = new Map();

    private killLogContainer!: HTMLElement;
    private tabScoreboard!: HTMLElement;
    private tabListRed!: HTMLElement;
    private tabListBlue!: HTMLElement;
    private tabListDM!: HTMLElement;

    public onActivateSupply?: (slotId: number) => void;

    constructor() {
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'retanki-hud-classic-flash-styles';
        this.styleElement.innerHTML = this.getHudCss();
        document.head.appendChild(this.styleElement);

        this.container = document.createElement('div');
        this.container.id = 'battle-hud-root';
        document.body.appendChild(this.container);

        this.platesContainer = document.createElement('div');
        this.platesContainer.id = 'overhead-plates-layer';
        this.container.appendChild(this.platesContainer);

        this.buildLayout();
        this.initEvents();
    }

    private buildLayout() {
        const layout = document.createElement('div');
        layout.innerHTML = `
            <!-- ВЕРХНЯЯ СТЕКЛЯННАЯ ПАНЕЛЬ СЧЕТА И ФОНДА (Glass_lClass, Glass_cClass, Glass_rClass) -->
            <div class="hud-top-bar">
                <div class="hud-fund-plate">
                    <span class="hud-crystal-icon"></span>
                    <span id="hud-fund-val" class="hud-fund-num">0</span>
                </div>

                <div id="hud-match-score" class="hud-score-glass-container">
                    <div class="glass-left-cap"></div>
                    <div class="glass-center-body">
                        <div class="team-block blue-block">
                            <img src="/battle/ctf/flag_blue.png" class="flag-ico" alt="Blue" onerror="this.style.display='none'"/>
                            <span id="flag-blue-status" class="flag-badge">ДОМА</span>
                            <span id="hud-score-blue" class="score-val team-blue">0</span>
                        </div>

                        <div class="timer-center-block">
                            <span id="hud-match-timer" class="match-time-text">15:00</span>
                        </div>

                        <div class="team-block red-block">
                            <span id="hud-score-red" class="score-val team-red">0</span>
                            <span id="flag-red-status" class="flag-badge">ДОМА</span>
                            <img src="/battle/ctf/flag_red.png" class="flag-ico" alt="Red" onerror="this.style.display='none'"/>
                        </div>
                    </div>
                    <div class="glass-right-cap"></div>
                </div>
            </div>

            <!-- БАННЕР ГОЛДА -->
            <div id="hud-gold-alert" class="hud-gold-alert-plate">
                <img src="/battle/supplies/Gold.webp" class="gold-box-ico" alt="Gold" onerror="this.src='/battle/hud/crystal.png'" />
                <span class="gold-alert-msg">СКОРО БУДЕТ СБРОШЕН ЗОЛОТОЙ ЯЩИК</span>
            </div>

            <!-- КИЛЛФИД СПРАВА ВВЕРХУ -->
            <div id="hud-kill-log" class="hud-killfeed-layer"></div>

            <!-- СТАТУС ТАНКА: ХП И ПЕРЕЗАРЯДКА (ЛЕВЫЙ НИЖНИЙ УГОЛ) -->
            <div class="hud-tank-status-plate">
                <div class="tank-bars-container">
                    <div class="hp-bar-socket">
                        <div id="hud-hp-fill" class="hp-segmented-fill" style="width: 100%;"></div>
                        <div id="hud-hp-text" class="hp-counter-label">2000 / 2000</div>
                    </div>
                    <div class="reload-bar-socket">
                        <div id="hud-reload-fill" class="reload-fluid-fill" style="width: 100%;"></div>
                    </div>
                </div>
            </div>

            <!-- ПРИПАСЫ 1 - 5 (НИЖНИЙ ЦЕНТР) -->
            <div class="hud-supplies-panel">
                <div class="supply-box" data-slot="1">
                    <span class="supply-key-tag">1</span>
                    <img src="/battle/supplies/Repair.webp" class="supply-icon" alt="Ремкомплект" onerror="this.src='/battle/hud/buff_health.png'"/>
                    <span class="supply-counter-num">0</span>
                    <div class="supply-cd-shutter"></div>
                </div>
                <div class="supply-box" data-slot="2">
                    <span class="supply-key-tag">2</span>
                    <img src="/battle/supplies/Armor.webp" class="supply-icon" alt="Броня" onerror="this.src='/battle/hud/buff_armor.png'"/>
                    <span class="supply-counter-num">0</span>
                    <div class="supply-cd-shutter"></div>
                </div>
                <div class="supply-box" data-slot="3">
                    <span class="supply-key-tag">3</span>
                    <img src="/battle/supplies/Damage.webp" class="supply-icon" alt="Урон" onerror="this.src='/battle/hud/buff_damage.png'"/>
                    <span class="supply-counter-num">0</span>
                    <div class="supply-cd-shutter"></div>
                </div>
                <div class="supply-box" data-slot="4">
                    <span class="supply-key-tag">4</span>
                    <img src="/battle/supplies/Speed.webp" class="supply-icon" alt="Нитро" onerror="this.src='/battle/hud/buff_nitro.png'"/>
                    <span class="supply-counter-num">0</span>
                    <div class="supply-cd-shutter"></div>
                </div>
                <div class="supply-box" data-slot="5">
                    <span class="supply-key-tag">5</span>
                    <img src="/battle/supplies/Mine.webp" class="supply-icon" alt="Мина" onerror="this.src='/battle/hud/buff_armor.png'"/>
                    <span class="supply-counter-num">0</span>
                    <div class="supply-cd-shutter"></div>
                </div>
            </div>

            <!-- ОКНО СТАТИСТИКИ [TAB] -->
            <div id="hud-tab-dialog" class="hud-tab-modal">
                <div class="tab-title-bar">
                    <span class="tab-header-txt">СТАТИСТИКА БИТВЫ</span>
                    <span id="tab-limits" class="tab-limits-txt">Фонд: 0 | Время: 15:00</span>
                </div>
                <div class="tab-columns-container">
                    <div id="tab-col-blue" class="tab-team-column blue-theme">
                        <div class="team-col-header">СИНИЕ</div>
                        <div class="table-legend">
                            <span class="col-lbl-name">Игрок</span>
                            <span class="col-lbl-score">Очки</span>
                            <span class="col-lbl-kd">У / С</span>
                            <span class="col-lbl-ping">Пинг</span>
                        </div>
                        <div id="tab-list-blue" class="player-list-scroll"></div>
                    </div>
                    <div id="tab-col-red" class="tab-team-column red-theme">
                        <div class="team-col-header">КРАСНЫЕ</div>
                        <div class="table-legend">
                            <span class="col-lbl-name">Игрок</span>
                            <span class="col-lbl-score">Очки</span>
                            <span class="col-lbl-kd">У / С</span>
                            <span class="col-lbl-ping">Пинг</span>
                        </div>
                        <div id="tab-list-red" class="player-list-scroll"></div>
                    </div>
                    <div id="tab-col-dm" class="tab-team-column dm-theme" style="display:none;">
                        <div class="team-col-header">ТАБЛИЦА БОЯ (DM)</div>
                        <div class="table-legend">
                            <span class="col-lbl-name">Игрок</span>
                            <span class="col-lbl-score">Очки</span>
                            <span class="col-lbl-kd">У / С</span>
                            <span class="col-lbl-ping">Пинг</span>
                        </div>
                        <div id="tab-list-dm" class="player-list-scroll"></div>
                    </div>
                </div>
            </div>
        `;
        this.container.appendChild(layout);

        this.hpBarFill = document.getElementById('hud-hp-fill')!;
        this.hpText = document.getElementById('hud-hp-text')!;
        this.reloadBarFill = document.getElementById('hud-reload-fill')!;

        this.fundValueText = document.getElementById('hud-fund-val')!;
        this.timerText = document.getElementById('hud-match-timer')!;
        this.scoreRedText = document.getElementById('hud-score-red')!;
        this.scoreBlueText = document.getElementById('hud-score-blue')!;
        this.flagBlueStatus = document.getElementById('flag-blue-status')!;
        this.flagRedStatus = document.getElementById('flag-red-status')!;
        this.goldNotification = document.getElementById('hud-gold-alert')!;

        this.killLogContainer = document.getElementById('hud-kill-log')!;
        this.tabScoreboard = document.getElementById('hud-tab-dialog')!;
        this.tabListBlue = document.getElementById('tab-list-blue')!;
        this.tabListRed = document.getElementById('tab-list-red')!;
        this.tabListDM = document.getElementById('tab-list-dm')!;

        for (let i = 1; i <= 5; i++) {
            const slotEl = this.container.querySelector(`.supply-box[data-slot="${i}"]`) as HTMLElement;
            if (slotEl) {
                this.supplySlots.set(i, {
                    box: slotEl,
                    counter: slotEl.querySelector('.supply-counter-num')!,
                    cooldownShutter: slotEl.querySelector('.supply-cd-shutter')!
                });

                slotEl.onclick = () => {
                    if (this.onActivateSupply) this.onActivateSupply(i);
                };
            }
        }
    }

    private initEvents() {
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code === 'Tab') {
                e.preventDefault();
                this.setTabVisible(true);
            }
            if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
                const num = parseInt(e.code.replace('Digit', ''), 10);
                if (this.onActivateSupply) this.onActivateSupply(num);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                this.setTabVisible(false);
            }
        });
    }

    public setVisible(show: boolean) {
        this.container.style.display = show ? 'block' : 'none';
    }

    public setTabVisible(show: boolean) {
        this.tabScoreboard.style.display = show ? 'flex' : 'none';
    }

    public updateOverheadPlate(id: string, data: OverheadPlateData) {
        let plate = this.overheadPlates.get(id);

        if (!plate) {
            const root = document.createElement('div');
            root.className = 'hud-overhead-unit';
            root.innerHTML = `
                <div class="unit-buff-icons"></div>
                <div class="unit-nameplate">
                    <span class="unit-rank-badge"></span>
                    <span class="unit-nickname"></span>
                </div>
                <div class="unit-bars-socket">
                    <div class="unit-hp-frame">
                        <div class="unit-hp-fill" style="width: 100%;"></div>
                    </div>
                    ${data.isLocal ? `
                    <div class="unit-reload-frame">
                        <div class="unit-reload-fill" style="width: 100%;"></div>
                    </div>` : ''}
                </div>
            `;
            this.platesContainer.appendChild(root);

            plate = {
                root,
                rankIcon: root.querySelector('.unit-rank-badge')!,
                nick: root.querySelector('.unit-nickname')!,
                hpFill: root.querySelector('.unit-hp-fill')!,
                reloadFrame: root.querySelector('.unit-reload-frame') || undefined,
                reloadFill: root.querySelector('.unit-reload-fill') || undefined,
                buffsBox: root.querySelector('.unit-buff-icons')!
            };
            this.overheadPlates.set(id, plate);
        }

        if (!data.visible || data.opacity <= 0.01) {
            plate.root.style.display = 'none';
            return;
        }

        plate.root.style.display = 'flex';
        plate.root.style.opacity = data.opacity.toFixed(2);
        plate.root.style.transform = `translate(-50%, -100%) translate(${data.screenX.toFixed(1)}px, ${data.screenY.toFixed(1)}px) scale(${data.scale.toFixed(2)})`;

        plate.nick.innerText = data.name;
        plate.nick.className = `unit-nickname team-${data.team}`;

        const rankNum = data.rank || 4;
        plate.rankIcon.style.backgroundImage = `url('/battle/ranks/rank_${rankNum}.png')`;

        const hpPct = `${Math.max(0, Math.min(1, data.hpRatio)) * 100}%`;
        plate.hpFill.style.width = hpPct;

        if (data.hpRatio <= 0.25) {
            plate.hpFill.style.background = 'linear-gradient(180deg, #ff3b30 0%, #b91c1c 50%, #7f1d1d 100%)';
        } else if (data.hpRatio <= 0.5) {
            plate.hpFill.style.background = 'linear-gradient(180deg, #facc15 0%, #ca8a04 50%, #854d0e 100%)';
        } else {
            plate.hpFill.style.background = 'linear-gradient(180deg, #4ade80 0%, #16a34a 50%, #14532d 100%)';
        }

        if (plate.reloadFill && data.reloadRatio !== undefined) {
            plate.reloadFill.style.width = `${Math.max(0, Math.min(1, data.reloadRatio)) * 100}%`;
        }

        if (data.buffs) {
            plate.buffsBox.innerHTML = '';
            if (data.buffs.armor) plate.buffsBox.innerHTML += `<img src="/battle/hud/buff_armor.png" class="buff-mini-img"/>`;
            if (data.buffs.damage) plate.buffsBox.innerHTML += `<img src="/battle/hud/buff_damage.png" class="buff-mini-img"/>`;
            if (data.buffs.speed) plate.buffsBox.innerHTML += `<img src="/battle/hud/buff_nitro.png" class="buff-mini-img"/>`;
        }
    }

    public removeOverheadPlate(id: string) {
        const plate = this.overheadPlates.get(id);
        if (plate) {
            plate.root.remove();
            this.overheadPlates.delete(id);
        }
    }

    public setHealth(current: number, max: number) {
        const ratio = Math.max(0, Math.min(1, current / max));
        this.hpBarFill.style.width = `${(ratio * 100).toFixed(1)}%`;
        this.hpText.innerText = `${Math.ceil(current)} / ${max}`;

        if (ratio <= 0.25) {
            this.hpBarFill.style.background = 'linear-gradient(180deg, #ff3b30 0%, #b91c1c 50%, #7f1d1d 100%)';
        } else if (ratio <= 0.5) {
            this.hpBarFill.style.background = 'linear-gradient(180deg, #facc15 0%, #ca8a04 50%, #854d0e 100%)';
        } else {
            this.hpBarFill.style.background = 'linear-gradient(180deg, #4ade80 0%, #16a34a 50%, #14532d 100%)';
        }
    }

    public setReloadProgress(progress: number) {
        const p = Math.max(0, Math.min(1, progress));
        this.reloadBarFill.style.width = `${(p * 100).toFixed(1)}%`;
    }

    public updateMatchState(
        fund: number,
        timerSeconds: number,
        blueScore: number = 0,
        redScore: number = 0,
        isDM: boolean = false,
        blueFlagState: 'home' | 'carried' | 'dropped' = 'home',
        redFlagState: 'home' | 'carried' | 'dropped' = 'home'
    ) {
        this.fundValueText.innerText = fund.toLocaleString();

        const mins = Math.floor(timerSeconds / 60);
        const secs = Math.floor(timerSeconds % 60);
        this.timerText.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const scorePlate = document.getElementById('hud-match-score')!;
        if (isDM) {
            scorePlate.classList.add('dm-mode');
        } else {
            scorePlate.classList.remove('dm-mode');
            this.scoreBlueText.innerText = blueScore.toString();
            this.scoreRedText.innerText = redScore.toString();

            const stateNames = { home: 'ДОМА', carried: 'ВЗЯТ', dropped: 'ПОТЕРЯН' };
            this.flagBlueStatus.innerText = stateNames[blueFlagState];
            this.flagRedStatus.innerText = stateNames[redFlagState];

            this.flagBlueStatus.className = `flag-badge status-${blueFlagState}`;
            this.flagRedStatus.className = `flag-badge status-${redFlagState}`;
        }
    }

    public showGoldBoxAlert(durationSeconds: number = 6.0) {
        this.goldNotification.classList.add('active-alert');
        setTimeout(() => {
            this.goldNotification.classList.remove('active-alert');
        }, durationSeconds * 1000);
    }

    public updateSupplySlot(slotId: number, state: SupplyState) {
        const slot = this.supplySlots.get(slotId);
        if (!slot) return;

        slot.counter.innerText = state.count.toString();
        slot.box.classList.toggle('disabled', state.count <= 0);
        slot.box.classList.toggle('active-buff', state.activeDuration > 0);

        if (state.cooldown > 0 && state.maxCooldown > 0) {
            const pct = (state.cooldown / state.maxCooldown) * 100;
            slot.cooldownShutter.style.height = `${pct}%`;
            slot.box.classList.add('cooldown');
        } else {
            slot.cooldownShutter.style.height = '0%';
            slot.box.classList.remove('cooldown');
        }
    }

    public pushKillFeed(killer: string, victim: string, weapon: string = 'smoky') {
        const row = document.createElement('div');
        row.className = 'killfeed-row';
        row.innerHTML = `
            <span class="killer-nick">${killer}</span>
            <span class="weapon-tag-icon ico-${weapon.toLowerCase()}"></span>
            <span class="victim-nick">${victim}</span>
        `;
        this.killLogContainer.appendChild(row);

        setTimeout(() => {
            row.classList.add('evaporate');
            setTimeout(() => row.remove(), 600);
        }, 4500);
    }

    public renderScoreboard(players: BattlePlayerScore[], isDM: boolean = false) {
        const colBlue = document.getElementById('tab-col-blue')!;
        const colRed = document.getElementById('tab-col-red')!;
        const colDm = document.getElementById('tab-col-dm')!;

        if (isDM) {
            colBlue.style.display = 'none';
            colRed.style.display = 'none';
            colDm.style.display = 'flex';
            this.tabListDM.innerHTML = '';
            players.sort((a, b) => b.score - a.score).forEach(p => this.tabListDM.appendChild(this.createPlayerRow(p)));
        } else {
            colBlue.style.display = 'flex';
            colRed.style.display = 'flex';
            colDm.style.display = 'none';

            this.tabListBlue.innerHTML = '';
            this.tabListRed.innerHTML = '';

            const blue = players.filter(p => p.team === 'blue').sort((a, b) => b.score - a.score);
            const red = players.filter(p => p.team === 'red').sort((a, b) => b.score - a.score);

            blue.forEach(p => this.tabListBlue.appendChild(this.createPlayerRow(p)));
            red.forEach(p => this.tabListRed.appendChild(this.createPlayerRow(p)));
        }
    }

    private createPlayerRow(p: BattlePlayerScore): HTMLElement {
        const row = document.createElement('div');
        row.className = `score-row ${p.isLocal ? 'my-row' : ''}`;
        row.innerHTML = `
            <span class="col-name">${p.name}</span>
            <span class="col-score">${p.score}</span>
            <span class="col-kd">${p.kills} / ${p.deaths}</span>
            <span class="col-ping">${p.ping}мс</span>
        `;
        return row;
    }

    public destroy() {
        this.container.remove();
        this.styleElement.remove();
    }

    private getHudCss(): string {
        return `
            #battle-hud-root {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                pointer-events: none;
                user-select: none;
                font-family: Arial, Tahoma, Verdana, sans-serif;
                font-weight: 700;
                color: #ffffff;
                z-index: 10000;
                overflow: hidden;
            }

            #overhead-plates-layer {
                position: absolute;
                inset: 0;
                pointer-events: none;
            }

            /* 3D-ПЛАШКИ НАД ТАНКАМИ */
            .hud-overhead-unit {
                position: absolute;
                top: 0;
                left: 0;
                display: none;
                flex-direction: column;
                align-items: center;
                width: 140px;
                pointer-events: none;
                transform-origin: bottom center;
                transition: opacity 0.12s linear;
            }
            .unit-buff-icons {
                display: flex;
                gap: 4px;
                margin-bottom: 2px;
                height: 18px;
            }
            .buff-mini-img {
                width: 18px;
                height: 18px;
                object-fit: contain;
                filter: drop-shadow(0 1px 2px #000);
            }
            .unit-nameplate {
                display: flex;
                align-items: center;
                gap: 5px;
                margin-bottom: 3px;
            }
            .unit-rank-badge {
                width: 16px;
                height: 16px;
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
                display: inline-block;
                filter: drop-shadow(0 1px 2px #000);
            }
            .unit-nickname {
                font-size: 12px;
                letter-spacing: 0.3px;
                text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.95);
            }
            .unit-nickname.team-blue { color: #58a6ff; }
            .unit-nickname.team-red { color: #ff5e5e; }
            .unit-nickname.team-neutral { color: #ffffff; }

            .unit-bars-socket {
                width: 100%;
                background: rgba(10, 14, 18, 0.95);
                border: 1px solid #475569;
                border-radius: 2px;
                padding: 1px;
                display: flex;
                flex-direction: column;
                gap: 2px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.85);
            }
            .unit-hp-frame {
                position: relative;
                width: 100%;
                height: 7px;
                background: #0f172a;
                overflow: hidden;
            }
            .unit-hp-fill {
                height: 100%;
                background: linear-gradient(180deg, #4ade80 0%, #16a34a 50%, #14532d 100%);
                transition: width 0.05s linear;
            }
            .unit-reload-frame {
                position: relative;
                width: 100%;
                height: 3px;
                background: #020617;
                overflow: hidden;
            }
            .unit-reload-fill {
                height: 100%;
                background: linear-gradient(180deg, #fde047 0%, #eab308 50%, #a16207 100%);
                transition: width 0.05s linear;
            }

            /* ВЕРХНЯЯ СТЕКЛЯННАЯ ПАНЕЛЬ СЧЕТА ТО */
            .hud-top-bar {
                position: absolute;
                top: 8px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 16px;
            }
            .hud-fund-plate {
                background: linear-gradient(180deg, #2b353e 0%, #182026 50%, #0d1216 100%);
                border: 2px solid #55626e;
                border-radius: 4px;
                padding: 4px 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.2);
            }
            .hud-crystal-icon {
                width: 16px;
                height: 16px;
                background: url('/battle/hud/crystal.png') no-repeat center / contain;
                display: inline-block;
                filter: drop-shadow(0 0 4px #00e5ff);
            }
            .hud-fund-num {
                font-size: 15px;
                color: #e2f1fc;
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 2px #000;
            }
            .hud-score-glass-container {
                display: flex;
                align-items: stretch;
                box-shadow: 0 4px 14px rgba(0,0,0,0.8);
            }
            .glass-left-cap {
                width: 16px;
                background: url('/battle/hud/glass_left.png') no-repeat right center / contain;
            }
            .glass-center-body {
                background: url('/battle/hud/glass_center.png') repeat-x center;
                background-color: rgba(20, 27, 33, 0.9);
                padding: 4px 16px;
                display: flex;
                align-items: center;
                gap: 14px;
            }
            .glass-right-cap {
                width: 16px;
                background: url('/battle/hud/glass_right.png') no-repeat left center / contain;
            }
            .hud-score-glass-container.dm-mode .team-block { display: none; }
            .team-block { display: flex; align-items: center; gap: 8px; }
            .flag-ico {
                width: 18px;
                height: 24px;
                object-fit: contain;
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.8));
            }
            .flag-badge {
                font-size: 10px;
                letter-spacing: 0.5px;
                padding: 1px 4px;
                border-radius: 2px;
                background: rgba(0,0,0,0.6);
            }
            .status-home { color: #86efac; }
            .status-carried { color: #fde047; animation: blink-flag 1s infinite alternate; }
            .status-dropped { color: #f87171; }
            @keyframes blink-flag { from { opacity: 0.4; } to { opacity: 1.0; } }
            .score-val { font-size: 22px; text-shadow: 1px 2px 4px #000; }
            .score-val.team-blue { color: #38bdf8; }
            .score-val.team-red { color: #f87171; }
            .match-time-text { font-size: 14px; color: #cbd5e1; text-shadow: 1px 1px 2px #000; }

            /* БАННЕР ГОЛДА */
            .hud-gold-alert-plate {
                position: absolute;
                top: 72px;
                left: 50%;
                transform: translateX(-50%) scale(0.9);
                background: linear-gradient(180deg, #2b1d06 0%, #170f03 100%);
                border: 2px solid #eab308;
                border-radius: 4px;
                padding: 8px 24px;
                display: none;
                align-items: center;
                gap: 12px;
                box-shadow: 0 0 25px rgba(234, 179, 8, 0.5), inset 0 0 10px rgba(234, 179, 8, 0.25);
            }
            .hud-gold-alert-plate.active-alert {
                display: flex;
                animation: gold-pulse 1.2s infinite alternate;
            }
            .gold-box-ico { width: 32px; height: 32px; object-fit: contain; }
            .gold-alert-msg {
                font-size: 17px;
                color: #fef08a;
                letter-spacing: 1.5px;
                text-shadow: 0 0 8px #ca8a04, 1px 1px 2px #000;
            }
            @keyframes gold-pulse {
                from { transform: translateX(-50%) scale(0.98); box-shadow: 0 0 15px rgba(234, 179, 8, 0.4); }
                to { transform: translateX(-50%) scale(1.03); box-shadow: 0 0 30px rgba(234, 179, 8, 0.85); }
            }

            /* КИЛЛФИД */
            .hud-killfeed-layer {
                position: absolute;
                top: 16px;
                right: 18px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                align-items: flex-end;
            }
            .killfeed-row {
                background: rgba(15, 20, 26, 0.88);
                border: 1px solid rgba(80, 95, 110, 0.5);
                border-radius: 3px;
                padding: 4px 10px;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.6);
                transition: opacity 0.5s ease, transform 0.5s ease;
            }
            .killfeed-row.evaporate { opacity: 0; transform: translateX(25px); }
            .killer-nick { color: #f8fafc; text-shadow: 1px 1px 2px #000; }
            .victim-nick { color: #cbd5e1; opacity: 0.85; }
            .weapon-tag-icon {
                width: 22px;
                height: 12px;
                background: #cbd5e1;
                clip-path: polygon(0 40%, 70% 40%, 70% 20%, 100% 50%, 70% 80%, 70% 60%, 0 60%);
            }

            /* СТАТУС ТАНКА (ЛЕВЫЙ НИЖНИЙ УГОЛ) */
            .hud-tank-status-plate {
                position: absolute;
                bottom: 24px;
                left: 28px;
            }
            .tank-bars-container {
                background: linear-gradient(180deg, #242c34 0%, #151b20 50%, #0d1114 100%);
                border: 2px solid #4a5764;
                border-radius: 4px;
                padding: 8px 10px;
                width: 240px;
                display: flex;
                flex-direction: column;
                gap: 6px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.15);
            }
            .hp-bar-socket {
                position: relative;
                height: 22px;
                background: #090c0e;
                border: 1px solid #1a2228;
                border-radius: 2px;
                box-shadow: inset 0 1px 4px rgba(0,0,0,0.9);
                overflow: hidden;
            }
            .hp-segmented-fill {
                height: 100%;
                background: linear-gradient(180deg, #4ade80 0%, #16a34a 50%, #14532d 100%);
                transition: width 0.08s linear;
            }
            .hp-counter-label {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                color: #ffffff;
                text-shadow: 1px 1px 2px #000, 0 0 3px #000;
                letter-spacing: 0.5px;
                pointer-events: none;
            }
            .reload-bar-socket {
                position: relative;
                height: 8px;
                background: #090c0e;
                border: 1px solid #334155;
                border-radius: 1px;
                overflow: hidden;
            }
            .reload-fluid-fill {
                height: 100%;
                background: linear-gradient(180deg, #fde047 0%, #eab308 50%, #a16207 100%);
                transition: width 0.05s linear;
            }

            /* ПРИПАСЫ */
            .hud-supplies-panel {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 8px;
                pointer-events: auto;
            }
            .supply-box {
                position: relative;
                width: 54px;
                height: 54px;
                background: linear-gradient(180deg, #2b353f 0%, #192026 50%, #0e1216 100%);
                border: 2px solid #52606e;
                border-radius: 4px;
                cursor: pointer;
                box-shadow: 0 4px 14px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.08s, border-color 0.12s;
            }
            .supply-box:hover {
                transform: translateY(-3px);
                border-color: #38bdf8;
            }
            .supply-box.disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .supply-box.active-buff {
                border-color: #4ade80;
                box-shadow: 0 0 14px rgba(74, 222, 128, 0.65), inset 0 0 6px rgba(74, 222, 128, 0.4);
            }
            .supply-key-tag {
                position: absolute;
                top: 2px;
                left: 5px;
                font-size: 11px;
                color: #94a3b8;
                text-shadow: 1px 1px 2px #000;
            }
            .supply-counter-num {
                position: absolute;
                bottom: 2px;
                right: 5px;
                font-size: 11px;
                color: #fef08a;
                text-shadow: 1px 1px 2px #000;
            }
            .supply-icon {
                width: 38px;
                height: 38px;
                object-fit: contain;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));
            }
            .supply-cd-shutter {
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 0%;
                background: rgba(0, 0, 0, 0.72);
                border-top: 2px solid #38bdf8;
                pointer-events: none;
                transition: height 0.08s linear;
            }

            /* TAB */
            .hud-tab-modal {
                display: none;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 780px;
                background: rgba(15, 20, 26, 0.96);
                border: 2px solid #475569;
                border-radius: 6px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.95);
                flex-direction: column;
                padding: 16px;
                pointer-events: auto;
            }
            .tab-title-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 2px solid #334155;
                padding-bottom: 8px;
                margin-bottom: 12px;
            }
            .tab-header-txt { font-size: 16px; color: #f8fafc; letter-spacing: 1px; }
            .tab-limits-txt { font-size: 13px; color: #94a3b8; }
            .tab-columns-container { display: flex; gap: 16px; }
            .tab-team-column {
                flex: 1;
                display: flex;
                flex-direction: column;
                background: #0b0f14;
                border: 1px solid #1e293b;
                border-radius: 4px;
                overflow: hidden;
            }
            .team-col-header { padding: 6px 12px; font-size: 13px; letter-spacing: 0.5px; }
            .blue-theme .team-col-header { background: #1e3a8a; color: #93c5fd; }
            .red-theme .team-col-header { background: #7f1d1d; color: #fca5a5; }
            .dm-theme .team-col-header { background: #334155; color: #f1f5f9; }
            .table-legend {
                display: flex;
                padding: 4px 10px;
                background: #131920;
                font-size: 11px;
                color: #64748b;
                border-bottom: 1px solid #1e293b;
            }
            .player-list-scroll {
                display: flex;
                flex-direction: column;
                min-height: 180px;
                max-height: 260px;
                overflow-y: auto;
            }
            .score-row {
                display: flex;
                padding: 6px 10px;
                font-size: 12px;
                border-bottom: 1px solid #141b22;
                color: #e2e8f0;
            }
            .score-row.my-row {
                background: rgba(56, 189, 248, 0.18);
                color: #38bdf8;
            }
            .col-lbl-name, .col-name { flex: 2; text-align: left; }
            .col-lbl-score, .col-score { flex: 1; text-align: center; }
            .col-lbl-kd, .col-kd { flex: 1; text-align: center; }
            .col-lbl-ping, .col-ping { flex: 1; text-align: right; }
        `;
    }
}