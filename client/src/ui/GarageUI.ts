export interface GarageItem {
    id: string;
    name: string;
    type: 'hulls' | 'turrets' | 'paints';
    previewUrl: string;
    desc: string;
    mod?: 'm0' | 'm1' | 'm2' | 'm3';
}

export const BASE_VEHICLES: GarageItem[] = [
    { id: 'wasp', name: 'Васп', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/wasp/m0/preview.png', desc: 'Сверхлегкий и маневренный корпус.' },
    { id: 'hornet', name: 'Хорнет', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/hornet/m0/preview.png', desc: 'Классический легкий танк.' },
    { id: 'hunter', name: 'Хантер', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/hunter/m0/preview.png', desc: 'Универсальный средний корпус.' },
    { id: 'viking', name: 'Викинг', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/viking/m0/preview.png', desc: 'Низкий силуэт и устойчивость.' },
    { id: 'dictator', name: 'Диктатор', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/dictator/m0/preview.png', desc: 'Высокая огневая позиция.' },
    { id: 'titan', name: 'Титан', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/titan/m0/preview.png', desc: 'Массивный и бронированный корпус.' },
    { id: 'mammoth', name: 'Мамонт', type: 'hulls', mod: 'm0', previewUrl: '/models/hulls/mammoth/m0/preview.png', desc: 'Тяжелейший танк прорыва.' },

    { id: 'smoky', name: 'Смоки', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/smoky/m0/preview.png', desc: 'Скорострельное универсальное орудие.' },
    { id: 'firebird', name: 'Огнемет', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/firebird/m0/preview.png', desc: 'Конусное поражение огнем.' },
    { id: 'twins', name: 'Твинс', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/twins/m0/preview.png', desc: 'Двуствольная скорострельная пушка.' },
    { id: 'railgun', name: 'Рельса', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/railgun/m0/preview.png', desc: 'Высокоточное пробивающее орудие.' },
    { id: 'isida', name: 'Изида', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/isida/m0/preview.png', desc: 'Нановихревой излучатель.' },
    { id: 'thunder', name: 'Гром', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/thunder/m0/preview.png', desc: 'Осколочно-фугасная пушка.' },
    { id: 'freeze', name: 'Фриз', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/freeze/m0/preview.png', desc: 'Замораживающее орудие.' },
    { id: 'ricochet', name: 'Рикошет', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/ricochet/m0/preview.png', desc: 'Плазменные рикошетящие заряды.' },
    { id: 'shaft', name: 'Шафт', type: 'turrets', mod: 'm0', previewUrl: '/models/turrets/shaft/m0/preview.png', desc: 'Снайперское орудие с прицелом.' }
];

const ALL_PAINT_DEFINITIONS: { id: string; name: string }[] = [
    { id: 'white', name: 'Белый' },
    { id: 'green', name: 'Зелёный' },
    { id: 'black', name: 'Черный' },
    { id: 'blue', name: 'Синий' },
    { id: 'red', name: 'Красный' },
    { id: 'orange', name: 'Оранжевый' },
    { id: 'acid', name: 'Кислота' },
    { id: 'amilia', name: 'Амели' },
    { id: 'anubis', name: 'Анубис' },
    { id: 'apple', name: 'Яблоко' },
    { id: 'arab', name: 'Арабика' },
    { id: 'barkhan', name: 'Бархан' },
    { id: 'besthelper', name: 'Хелпер' },
    { id: 'blink', name: 'Блик' },
    { id: 'blizzard', name: 'Метель' },
    { id: 'blueray', name: 'Синий луч' },
    { id: 'carbon', name: 'Карбон' },
    { id: 'champion', name: 'Чемпион' },
    { id: 'clay', name: 'Глина' },
    { id: 'creator', name: 'Создатель' },
    { id: 'digital', name: 'Цифра' },
    { id: 'dima', name: 'Дима' },
    { id: 'dirt', name: 'Грязь' },
    { id: 'dragon', name: 'Дракон' },
    { id: 'drug', name: 'Друг' },
    { id: 'electra', name: 'Электра' },
    { id: 'euro2012', name: 'Евро 2012' },
    { id: 'flame', name: 'Пламя' },
    { id: 'flash', name: 'Вспышка' },
    { id: 'flora', name: 'Флора' },
    { id: 'flow', name: 'Поток' },
    { id: 'flowers', name: 'Цветы' },
    { id: 'foreign', name: 'Иностранец' },
    { id: 'forester', name: 'Лесник' },
    { id: 'galaxy', name: 'Галактика' },
    { id: 'garland', name: 'Гирлянда' },
    { id: 'ginga', name: 'Гинга' },
    { id: 'halloween2020', name: 'Хэллоуин 2020' },
    { id: 'heartbeat', name: 'Пульс' },
    { id: 'helios', name: 'Гелиос' },
    { id: 'holiday', name: 'Праздник' },
    { id: 'inferno', name: 'Инферно' },
    { id: 'irbis', name: 'Ирбис' },
    { id: 'izumurud', name: 'Изумруд' },
    { id: 'jaguar', name: 'Ягуар' },
    { id: 'kedr', name: 'Кедр' },
    { id: 'khokhloma', name: 'Хохлома' },
    { id: 'krio', name: 'Крио' },
    { id: 'lava', name: 'Лава' },
    { id: 'lead', name: 'Свинец' },
    { id: 'marine', name: 'Морской' },
    { id: 'marsh', name: 'Болото' },
    { id: 'mary', name: 'Мэри' },
    { id: 'matrix', name: 'Матрица' },
    { id: 'metallic', name: 'Металлик' },
    { id: 'moderator', name: 'Модератор' },
    { id: 'moonwalker', name: 'Луноход' },
    { id: 'needles', name: 'Хвоя' },
    { id: 'nefrit', name: 'Нефрит' },
    { id: 'newyear2020', name: 'Новый Год 2020' },
    { id: 'newyear2021', name: 'Новый Год 2021' },
    { id: 'nightcity', name: 'Ночной город' },
    { id: 'nightmare', name: 'Кошмар' },
    { id: 'outburst', name: 'Всплеск' },
    { id: 'phenix', name: 'Феникс' },
    { id: 'plexus', name: 'Сплетение' },
    { id: 'prodigy', name: 'Продиджи' },
    { id: 'pumpkins', name: 'Тыквы' },
    { id: 'punk', name: 'Панк' },
    { id: 'python', name: 'Питон' },
    { id: 'radiance', name: 'Сияние' },
    { id: 'redl', name: 'Редл' },
    { id: 'reporter', name: 'Репортёр' },
    { id: 'rock', name: 'Скала' },
    { id: 'roger', name: 'Роджер' },
    { id: 'rosequartz', name: 'Розовый кварц' },
    { id: 'rust', name: 'Ржавчина' },
    { id: 'rustle', name: 'Шелест' },
    { id: 'safari', name: 'Сафари' },
    { id: 'savanna', name: 'Саванна' },
    { id: 'smokescreen', name: 'Дымовая завеса' },
    { id: 'space', name: 'Космос' },
    { id: 'spark', name: 'Искра' },
    { id: 'spectator', name: 'Спектатор' },
    { id: 'spectr', name: 'Спектр' },
    { id: 'spid', name: 'Скорость' },
    { id: 'standstone', name: 'Песчаник' },
    { id: 'storm', name: 'Буря' },
    { id: 'surf', name: 'Прибой' },
    { id: 'taiga', name: 'Тайга' },
    { id: 'tester', name: 'Тестер' },
    { id: 'thunderstorm', name: 'Гроза' },
    { id: 'tina', name: 'Тина' },
    { id: 'tot', name: 'Тот' },
    { id: 'triangles', name: 'Треугольники' },
    { id: 'tundra', name: 'Тундра' },
    { id: 'urban', name: 'Город' },
    { id: 'virus', name: 'Вирус' },
    { id: 'vlastelin', name: 'Властелин' },
    { id: 'witch', name: 'Ведьма' },
    { id: 'with_love', name: 'С любовью' },
    { id: 'zeus', name: 'Зевс' }
];

export class GarageUI {
    private currentTab: 'turrets' | 'hulls' | 'paints' = 'turrets';
    public items: GarageItem[] = [...BASE_VEHICLES];

    public equipped = {
        hull: 'viking',
        hullMod: 'm0' as 'm0' | 'm1' | 'm2' | 'm3',
        turret: 'smoky',
        turretMod: 'm0' as 'm0' | 'm1' | 'm2' | 'm3',
        paint: 'white'
    };

    public onSelectEquipment: ((type: 'hulls' | 'turrets' | 'paints', id: string, mod?: string) => void) | null = null;
    public onStartBattle: (() => void) | null = null;

    constructor() {
        this.populateInitialPaints();
        this.bindEvents();
        this.renderGrid();
        this.syncPaintFiles();
    }

    private populateInitialPaints() {
        ALL_PAINT_DEFINITIONS.forEach((p) => {
            this.items.push({
                id: p.id,
                name: p.name,
                type: 'paints',
                previewUrl: `/models/paints/${p.id}/preview.png`,
                desc: `Камуфляжное покрытие «${p.name}».`
            });
        });
    }

    /**
     * Построение цепочки путей поиска превью с учетом модификации m0..m3
     */
    private getFallbackPreviewChain(item: GarageItem): string[] {
        const mod = (item.mod || 'm0').toLowerCase();
        const id = item.id.toLowerCase();

        if (item.type === 'hulls' || item.type === 'turrets') {
            return [
                `/models/${item.type}/${id}/${mod}/preview.png`,
                `/models/${item.type}/${id}/preview_${mod}.png`,
                `/models/${item.type}/${id}_${mod}/preview.png`,
                `/models/${item.type}/${id}/${mod}.png`,
                `/models/${item.type}/${id}/${mod}/image.png`,
                `/models/${item.type}/${id}/preview.png`,
                `/models/${item.type}/${id}/image.png`,
                `/models/${item.type}/${id}.png`
            ];
        }

        return [
            `/models/paints/${id}/preview.png`,
            `/models/paints/${id}/preview.jpg`,
            `/models/paints/${id}/image.png`,
            `/models/paints/${id}/image.jpg`,
            `/paints/${id}/preview.png`,
            `/paints/${id}/image.png`,
            `/paints/${id}/image.jpg`
        ];
    }

    private async findPaintPreviewUrl(id: string): Promise<string | null> {
        const candidatePaths = [
            `/models/paints/${id}/preview.png`,
            `/models/paints/${id}/preview.jpg`,
            `/models/paints/${id}/image.png`,
            `/models/paints/${id}/image.jpg`,
            `/paints/${id}/preview.png`,
            `/paints/${id}/image.png`
        ];

        for (const path of candidatePaths) {
            try {
                const res = await fetch(path, { method: 'HEAD' });
                if (res.ok) return path;
            } catch {}
        }
        return null;
    }

    private async syncPaintFiles() {
        const verifiedPaints = await Promise.all(
            ALL_PAINT_DEFINITIONS.map(async (paint) => {
                const previewUrl = await this.findPaintPreviewUrl(paint.id);
                if (previewUrl) {
                    return {
                        id: paint.id,
                        name: paint.name,
                        type: 'paints' as const,
                        previewUrl: previewUrl,
                        desc: `Камуфляжное покрытие «${paint.name}».`
                    };
                }
                return null;
            })
        );

        this.items = this.items.filter((i) => i.type !== 'paints');
        const available = verifiedPaints.filter((p): p is GarageItem => p !== null);

        if (!available.some((p) => p.id === 'white')) {
            available.unshift({
                id: 'white',
                name: 'Белый',
                type: 'paints',
                previewUrl: '/models/paints/white/preview.png',
                desc: 'Базовое заводское покрытие.'
            });
        }

        this.items.push(...available);

        if (this.currentTab === 'paints') {
            this.renderGrid();
        }
    }

    private bindEvents() {
        document.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
                const target = e.currentTarget as HTMLElement;
                target.classList.add('active');
                this.currentTab = target.dataset.tab as any;
                this.renderGrid();
            });
        });

        document.getElementById('btn-garage-battle')?.addEventListener('click', () => {
            if (this.onStartBattle) this.onStartBattle();
        });
    }

    public renderGrid() {
        const grid = document.getElementById('garage-items-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const tabItems = this.items.filter((i) => i.type === this.currentTab);

        tabItems.forEach((item) => {
            const isInstalled =
                (item.type === 'hulls' && this.equipped.hull === item.id) ||
                (item.type === 'turrets' && this.equipped.turret === item.id) ||
                (item.type === 'paints' && this.equipped.paint === item.id);

            const card = document.createElement('div');
            card.className = `item-card ${isInstalled ? 'installed' : ''}`;

            const fallbackChain = this.getFallbackPreviewChain(item);

            const imgContainer = document.createElement('div');
            imgContainer.className = 'item-card-preview-box';
            imgContainer.style.position = 'relative';
            imgContainer.style.width = '100%';
            imgContainer.style.height = '72px';
            imgContainer.style.display = 'flex';
            imgContainer.style.alignItems = 'center';
            imgContainer.style.justifyContent = 'center';

            const img = document.createElement('img');
            img.className = 'item-card-preview';
            img.src = fallbackChain[0];
            img.alt = '';
            img.style.maxHeight = '100%';
            img.style.maxWidth = '100%';
            img.style.objectFit = 'contain';

            let step = 1;
            img.onerror = () => {
                if (step < fallbackChain.length) {
                    img.src = fallbackChain[step++];
                } else {
                    // Карточку не удаляем: показываем аккуратную плашку с модификацией
                    img.style.display = 'none';
                    const placeholder = document.createElement('div');
                    placeholder.className = 'card-placeholder-box';
                    placeholder.innerText = item.mod ? item.mod.toUpperCase() : '★';
                    placeholder.style.cssText = 'color:#60a5fa;font-weight:bold;font-size:18px;letter-spacing:1px;';
                    imgContainer.appendChild(placeholder);
                }
            };

            imgContainer.appendChild(img);

            // Бейдж модификации M0..M3 в углу карточки
            if (item.mod) {
                const badge = document.createElement('span');
                badge.className = 'card-mod-badge';
                badge.innerText = item.mod.toUpperCase();
                badge.style.cssText = 'position:absolute;bottom:2px;right:4px;font-size:10px;font-weight:bold;color:#38bdf8;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;';
                imgContainer.appendChild(badge);
            }

            const title = document.createElement('span');
            title.className = 'item-card-name';
            title.innerText = item.name;

            card.appendChild(imgContainer);
            card.appendChild(title);

            card.onclick = () => {
                if (item.type === 'hulls') {
                    this.equipped.hull = item.id;
                    this.equipped.hullMod = item.mod || 'm0';
                }
                if (item.type === 'turrets') {
                    this.equipped.turret = item.id;
                    this.equipped.turretMod = item.mod || 'm0';
                }
                if (item.type === 'paints') {
                    this.equipped.paint = item.id;
                }

                this.renderGrid();
                this.updateDetails(item, true);

                if (this.onSelectEquipment) {
                    this.onSelectEquipment(item.type, item.id, item.mod);
                }
            };

            grid.appendChild(card);
        });

        const activeItem = tabItems.find((i) =>
            (i.type === 'hulls' && this.equipped.hull === i.id) ||
            (i.type === 'turrets' && this.equipped.turret === i.id) ||
            (i.type === 'paints' && this.equipped.paint === i.id)
        ) || tabItems[0];

        if (activeItem) this.updateDetails(activeItem, true);
    }

    private updateDetails(item: GarageItem, isInstalled: boolean) {
        const nameEl = document.getElementById('detail-name') || document.getElementById('item-details-title');
        const descEl = document.getElementById('detail-desc') || document.getElementById('item-details-desc');
        const btn = document.getElementById('btn-install-item');

        if (nameEl) {
            nameEl.innerText = item.name.toUpperCase();
        }
        if (descEl) {
            descEl.innerText = item.desc;
        }

        // Интерактивный блок переключения M0, M1, M2, M3 в описании
        let modSelector = document.getElementById('detail-mod-selector');
        if (!modSelector && nameEl && nameEl.parentElement) {
            modSelector = document.createElement('div');
            modSelector.id = 'detail-mod-selector';
            modSelector.style.cssText = 'display:inline-flex;gap:6px;margin-left:12px;vertical-align:middle;';
            nameEl.parentElement.appendChild(modSelector);
        }

        if (modSelector) {
            modSelector.innerHTML = '';
            if (item.type === 'hulls' || item.type === 'turrets') {
                const mods: ('m0' | 'm1' | 'm2' | 'm3')[] = ['m0', 'm1', 'm2', 'm3'];
                const currentMod = item.mod || (item.type === 'hulls' ? this.equipped.hullMod : this.equipped.turretMod) || 'm0';

                mods.forEach((m) => {
                    const mBtn = document.createElement('button');
                    mBtn.innerText = m.toUpperCase();
                    const isCurrent = currentMod === m;
                    mBtn.style.cssText = `padding:2px 7px;font-size:11px;font-weight:bold;cursor:pointer;border-radius:3px;border:1px solid ${isCurrent ? '#38bdf8' : '#374151'};background:${isCurrent ? '#0284c7' : '#1f2937'};color:#fff;`;

                    mBtn.onclick = (e) => {
                        e.stopPropagation();
                        item.mod = m;
                        if (item.type === 'hulls') this.equipped.hullMod = m;
                        if (item.type === 'turrets') this.equipped.turretMod = m;

                        this.renderGrid();
                        this.updateDetails(item, true);

                        if (this.onSelectEquipment) {
                            this.onSelectEquipment(item.type, item.id, m);
                        }
                    };

                    modSelector!.appendChild(mBtn);
                });
            }
        }

        if (btn) {
            btn.innerText = isInstalled ? 'УСТАНОВЛЕНО' : 'УСТАНОВИТЬ';
            btn.className = `btn-install ${isInstalled ? 'active-item' : ''}`;
        }
    }
}
