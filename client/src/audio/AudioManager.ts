export interface PlaySoundOptions {
    channel?: string;
    volume?: number;
    fadeOldTime?: number;
    allowOverlap?: boolean;
    maxPolyphony?: number;
    detune?: number;
    [key: string]: any;
}

interface ActiveLoop {
    source: AudioBufferSourceNode;
    gain: GainNode;
    volume: number;
    isStopping: boolean;
    stopTimer?: any;
}

export class AudioManager {
    private static instance: AudioManager;
    private ctx: AudioContext | null = null;
    private masterGain!: GainNode;

    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private activeLoops: Map<string, ActiveLoop> = new Map();
    private pendingLoops: Set<string> = new Set();

    // Подсистема двигателя танка
    private engineIdleSource: AudioBufferSourceNode | null = null;
    private engineIdleGain: GainNode | null = null;

    private engineMotionSource: AudioBufferSourceNode | null = null;
    private engineMotionGain: GainNode | null = null;
    private motionStopTimer: any = null;

    private engineAccelSource: AudioBufferSourceNode | null = null;
    private engineAccelGain: GainNode | null = null;

    private engineState: 'stopped' | 'idle' | 'motion' | 'dead' = 'stopped';
    private isEngineActive: boolean = false;

    private constructor() {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.85;
            this.masterGain.connect(this.ctx.destination);
        }
    }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public async preload(urls: string[]): Promise<void> {
        if (!this.ctx) return;
        const loadPromises = urls.map(async (url) => {
            if (this.audioBuffers.has(url)) return;
            try {
                const res = await fetch(url);
                if (!res.ok) return;
                const arrayBuffer = await res.arrayBuffer();
                const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
                this.audioBuffers.set(url, audioBuffer);
            } catch (e) {
                console.warn(`[AudioManager] Ошибка предзагрузки: ${url}`, e);
            }
        });
        await Promise.all(loadPromises);
    }

    public play(url: string, options: PlaySoundOptions = {}) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const buffer = this.audioBuffers.get(url);
        if (!buffer) {
            this.fetchAndPlayOneShot(url, options.volume ?? 1.0, options.detune);
            return;
        }

        this.playDecodedBuffer(buffer, options.volume ?? 1.0, options.detune);
    }

    private playDecodedBuffer(buffer: AudioBuffer, volume: number, detune?: number) {
        if (!this.ctx) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        if (detune && source.detune) {
            source.detune.value = detune;
        }

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(0);
    }

    private async fetchAndPlayOneShot(url: string, volume: number, detune?: number) {
        if (!this.ctx) return;
        try {
            const res = await fetch(url);
            if (!res.ok) return;
            const arrayBuf = await res.arrayBuffer();
            const decoded = await this.ctx.decodeAudioData(arrayBuf);
            this.audioBuffers.set(url, decoded);
            this.playDecodedBuffer(decoded, volume, detune);
        } catch { }
    }

    public playLoop(url: string, channelId: string, volume: number = 1.0) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const existing = this.activeLoops.get(channelId);
        if (existing) {
            if (existing.isStopping) {
                clearTimeout(existing.stopTimer);
                existing.isStopping = false;
                const now = this.ctx.currentTime;
                existing.gain.gain.cancelScheduledValues(now);
                existing.gain.gain.setValueAtTime(existing.gain.gain.value, now);
                existing.gain.gain.linearRampToValueAtTime(volume, now + 0.04);
            }
            return;
        }

        if (this.pendingLoops.has(channelId)) return;

        const buffer = this.audioBuffers.get(url);
        if (!buffer) {
            this.pendingLoops.add(channelId);
            fetch(url)
                .then(r => (r.ok ? r.arrayBuffer() : null))
                .then(buf => (buf ? this.ctx!.decodeAudioData(buf) : null))
                .then(decoded => {
                    this.pendingLoops.delete(channelId);
                    if (decoded) {
                        this.audioBuffers.set(url, decoded);
                        if (!this.activeLoops.has(channelId)) {
                            this.startLoopBuffer(decoded, channelId, volume);
                        }
                    }
                })
                .catch(() => this.pendingLoops.delete(channelId));
            return;
        }

        this.startLoopBuffer(buffer, channelId, volume);
    }

    private startLoopBuffer(buffer: AudioBuffer, channelId: string, volume: number) {
        if (!this.ctx || this.activeLoops.has(channelId)) return;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.04);

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(0);

        this.activeLoops.set(channelId, {
            source,
            gain,
            volume,
            isStopping: false
        });
    }

    /**
     * Быстрая остановка зацикленного звука без щелчков и наслоений
     */
    public stop(channelId: string, fadeDuration: number = 0.08) {
        this.pendingLoops.delete(channelId);

        const loop = this.activeLoops.get(channelId);
        if (!loop || !this.ctx) return;

        if (loop.isStopping) return;
        loop.isStopping = true;

        const now = this.ctx.currentTime;
        loop.gain.gain.cancelScheduledValues(now);
        loop.gain.gain.setValueAtTime(loop.gain.gain.value, now);
        loop.gain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

        loop.stopTimer = setTimeout(() => {
            try {
                loop.source.stop();
                loop.source.disconnect();
            } catch { }
            this.activeLoops.delete(channelId);
        }, fadeDuration * 1000);
    }

    // ==========================================
    // ПОДСИСТЕМА ДВИГАТЕЛЯ ТАНКА
    // ==========================================

    public async startTankEngine() {
        if (this.isEngineActive || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        const urls = [
            '/models/hulls/engine_idle.mp3',
            '/models/hulls/engine_accelerate.mp3',
            '/models/hulls/engine_motion.mp3'
        ];
        await this.preload(urls);

        const idleBuf = this.audioBuffers.get('/models/hulls/engine_idle.mp3');
        if (!idleBuf) return;

        // Постоянный канал холостого хода
        this.engineIdleGain = this.ctx.createGain();
        this.engineIdleGain.gain.value = 0.65;
        this.engineIdleSource = this.ctx.createBufferSource();
        this.engineIdleSource.buffer = idleBuf;
        this.engineIdleSource.loop = true;
        this.engineIdleSource.connect(this.engineIdleGain);
        this.engineIdleGain.connect(this.masterGain);
        this.engineIdleSource.start(0);

        this.engineState = 'idle';
        this.isEngineActive = true;
    }

    /**
     * Запуск движения строго с начала трека и быстрое затухание при остановке
     */
    public updateEngineState(isMoving: boolean, isDead: boolean = false) {
        if (!this.isEngineActive || !this.ctx || !this.engineIdleGain) return;

        const targetState = isDead ? 'dead' : (isMoving ? 'motion' : 'idle');
        if (this.engineState === targetState) return;
        this.engineState = targetState;

        const now = this.ctx.currentTime;
        const FADE_TIME = 0.08; // Быстрое, чистое затухание без щелчков

        if (targetState === 'dead') {
            this.killAccelerateSound(FADE_TIME);
            this.stopMotionSound(FADE_TIME);

            this.engineIdleGain.gain.cancelScheduledValues(now);
            this.engineIdleGain.gain.setValueAtTime(this.engineIdleGain.gain.value, now);
            this.engineIdleGain.gain.linearRampToValueAtTime(0.0001, now + FADE_TIME);
            return;
        }

        if (targetState === 'motion') {
            // 1. Быстро приглушаем холостой ход
            this.engineIdleGain.gain.cancelScheduledValues(now);
            this.engineIdleGain.gain.setValueAtTime(this.engineIdleGain.gain.value, now);
            this.engineIdleGain.gain.linearRampToValueAtTime(0.04, now + FADE_TIME);

            // 2. Воспроизводим разгон с начала
            this.killAccelerateSound(0.02);
            const accelBuf = this.audioBuffers.get('/models/hulls/engine_accelerate.mp3');
            if (accelBuf) {
                const src = this.ctx.createBufferSource();
                src.buffer = accelBuf;
                const g = this.ctx.createGain();
                g.gain.value = 0.75;
                src.connect(g);
                g.connect(this.masterGain);
                src.start(0);
                this.engineAccelSource = src;
                this.engineAccelGain = g;
            }

            // 3. Звук движения СТРОГО С НАЧАЛА (start(0))
            if (this.motionStopTimer) {
                clearTimeout(this.motionStopTimer);
                this.motionStopTimer = null;
            }
            try {
                this.engineMotionSource?.stop();
                this.engineMotionSource?.disconnect();
            } catch { }

            const motionBuf = this.audioBuffers.get('/models/hulls/engine_motion.mp3');
            if (motionBuf) {
                this.engineMotionGain = this.ctx.createGain();
                this.engineMotionGain.gain.setValueAtTime(0.0001, now);
                this.engineMotionGain.gain.linearRampToValueAtTime(0.70, now + FADE_TIME);

                this.engineMotionSource = this.ctx.createBufferSource();
                this.engineMotionSource.buffer = motionBuf;
                this.engineMotionSource.loop = true;
                this.engineMotionSource.connect(this.engineMotionGain);
                this.engineMotionGain.connect(this.masterGain);

                // Запуск дорожки с самого начала
                this.engineMotionSource.start(0);
            }
        } else {
            // targetState === 'idle' (клавиша движения отпущена)
            // 1. Быстро глушим разгон
            this.killAccelerateSound(FADE_TIME);

            // 2. Быстро глушим движение и полностью выключаем узел
            this.stopMotionSound(FADE_TIME);

            // 3. Возвращаем холостой ход
            this.engineIdleGain.gain.cancelScheduledValues(now);
            this.engineIdleGain.gain.setValueAtTime(this.engineIdleGain.gain.value, now);
            this.engineIdleGain.gain.linearRampToValueAtTime(0.65, now + FADE_TIME);
        }
    }

    private stopMotionSound(fadeDuration: number) {
        if (!this.engineMotionSource || !this.engineMotionGain || !this.ctx) return;

        const now = this.ctx.currentTime;
        const currentSrc = this.engineMotionSource;
        const currentGain = this.engineMotionGain;

        currentGain.gain.cancelScheduledValues(now);
        currentGain.gain.setValueAtTime(currentGain.gain.value, now);
        currentGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

        this.motionStopTimer = setTimeout(() => {
            try {
                currentSrc.stop();
                currentSrc.disconnect();
            } catch { }
            if (this.engineMotionSource === currentSrc) {
                this.engineMotionSource = null;
                this.engineMotionGain = null;
            }
        }, fadeDuration * 1000);
    }

    private killAccelerateSound(fadeDuration: number) {
        if (this.engineAccelSource && this.engineAccelGain && this.ctx) {
            const now = this.ctx.currentTime;
            const src = this.engineAccelSource;
            const g = this.engineAccelGain;

            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

            setTimeout(() => {
                try {
                    src.stop();
                    src.disconnect();
                } catch { }
            }, fadeDuration * 1000);

            this.engineAccelSource = null;
            this.engineAccelGain = null;
        }
    }

    public stopTankEngine() {
        if (!this.isEngineActive) return;
        this.killAccelerateSound(0.02);
        this.stopMotionSound(0.02);
        try {
            this.engineIdleSource?.stop();
            this.engineIdleSource?.disconnect();
        } catch { }
        this.isEngineActive = false;
        this.engineState = 'stopped';
    }
}