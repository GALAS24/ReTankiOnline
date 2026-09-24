export class Router {
    private currentScreen: 'lobby' | 'garage' | 'battle' = 'lobby';

    // Храним выбранную экипировку (как в твоих прототипах 2009 года)
    public equipment = {
        hull: 'viking',
        turret: 'railgun',
        paint: 'metallic'
    };

    // Событие, которое срабатывает при нажатии "В БОЙ"
    public onBattleStart: (() => void) | null = null;
    // Событие при смене пушки/корпуса в гараже (чтобы обновить 3D-модель)
    public onEquipChange: (() => void) | null = null;

    constructor() {
        this.bindEvents();
    }

    private bindEvents() {
        // Навигация
        document.getElementById('btn-to-battle')?.addEventListener('click', () => {
            this.setScreen('battle');
            if (this.onBattleStart) this.onBattleStart();
        });

        document.getElementById('btn-to-garage')?.addEventListener('click', () => {
            this.setScreen('garage');
            // Здесь в будущем включим рендер 3D-гаража
        });

        document.getElementById('btn-garage-back')?.addEventListener('click', () => {
            this.setScreen('lobby');
        });

        // Логика переключения пушек/корпусов в Гараже
        const garageItems = document.querySelectorAll('.garage-item');
        garageItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const type = target.dataset.type; // 'hull' или 'turret'
                const id = target.dataset.id;

                if (type === 'hull' && id) this.equipment.hull = id;
                if (type === 'turret' && id) this.equipment.turret = id;

                if (this.onEquipChange) this.onEquipChange();
            });
        });
    }

    public setScreen(screenName: 'lobby' | 'garage' | 'battle') {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        // Показываем нужный
        document.getElementById(`${screenName}-screen`)?.classList.add('active');
        this.currentScreen = screenName;
    }
}