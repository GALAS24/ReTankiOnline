<!DOCTYPE html>
<html lang="ru-RU">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="description" content="ReTanki Online — легендарный танковый 3D-боевик в браузере. Классическая физика 2010-2014 годов, паркур, культовые пушки и корпуса на Three.js и WebGL!">
    <title>ReTanki Online — официальный портал проекта</title>
    <meta name="keywords" content="retanki, retanki online, ретанки, ретанки онлайн, старые танки онлайн, танки онлайн 2012, three.js tanki">
    
    <meta property="og:title" content="ReTanki Online — Возрождение легенды танковых боёв">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://retanki.online/">
    <meta property="og:image" content="images/scr_1.png">
    <meta property="og:description" content="Прими участие в классических танковых боях прямо в браузере!">

    <link rel="icon" href="images/favicon.ico" type="image/x-icon">
    <link rel="shortcut icon" href="images/favicon.ico">

    <!-- Оригинальные стили портала -->
    <link href="css/all.css" rel="stylesheet" type="text/css" media="all">
    <link href="css/styles.css" rel="stylesheet" type="text/css" media="all">

    <!-- Библиотека jQuery -->
    <script type="text/javascript" src="js/jquery.min.js"></script>

    <style>
        /* --- 1. КРУПНЫЙ ЛОГОТИП ПО ЦЕНТРУ --- */
        .header .logo {
            position: absolute !important;
            left: 50% !important;
            top: 10px !important;
            transform: translateX(-50%) !important;
            width: auto !important;
            height: auto !important;
            float: none !important;
            margin: 0 !important;
            z-index: 20;
            text-align: center;
        }

        .header .logo img {
            width: 205px !important;            /* Увеличенная оптимальная ширина фото */
            max-height: 125px !important;       /* Запас по высоте, чтобы не обрезалось */
            object-fit: contain;
            display: block;
            margin: 0 auto;
            filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.95));
            transition: transform 0.2s ease;
        }

        .header .logo img:hover {
            transform: scale(1.03);
        }

        /* Отступ блока со слоганом вниз, чтобы увеличенный логотип не перекрывал текст */
        #header .holder {
            margin-top: 25px !important;
        }

        /* --- 2. МЕНЮ СЛЕВА И ШТАМП «В РАЗРАБОТКЕ» --- */
        .menu-wrapper {
            position: relative;
            float: left;
            width: 175px;
            margin-left: 28px;
            margin-top: 18px;
            z-index: 10;
        }

        .menu-disabled {
            pointer-events: none !important;
            user-select: none !important;
            filter: grayscale(0.75) brightness(0.5);
            opacity: 0.55;
        }

        .under-dev-badge {
            position: absolute;
            top: 48%;
            left: 45%;                         /* Смещение строго по центру кнопок */
            transform: translate(-50%, -50%) rotate(-8deg);
            background: linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%);
            color: #fef08a;
            border: 2px dashed #fef08a;
            border-radius: 4px;
            padding: 8px 14px;
            font-family: 'Arial Black', Impact, sans-serif;
            font-size: 13px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            text-align: center;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.9), 0 0 10px rgba(185, 28, 28, 0.7);
            pointer-events: none;
            z-index: 35;
            white-space: nowrap;
            text-shadow: 1px 1px 2px #000;
        }

        /* --- 3. УВЕЛИЧЕННЫЕ СКРИНШОТЫ ИГРЫ --- */
        #screenshots {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            justify-content: center !important;
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;
        }

        #screenshots li {
            width: 172px !important;            /* Увеличенная ширина карточки фото */
            height: 108px !important;           /* Увеличенная высота */
            overflow: hidden !important;
            border: 2px solid #3c424a !important;
            border-radius: 4px !important;
            background: #000 !important;
            box-shadow: 0 3px 8px rgba(0,0,0,0.7) !important;
        }

        #screenshots li a {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
        }

        #screenshots li img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            transition: transform 0.25s ease !important;
        }

        #screenshots li img:hover {
            transform: scale(1.08) !important;
        }

        /* --- 4. ВИДЕОПЛЕЕР YOUTUBE --- */
        .video-box {
            width: 584px;
            margin: 0 auto 20px auto;
        }

        .video-responsive-box {
            position: relative;
            width: 584px;
            height: 366px;
            background: #000;
            border: 2px solid #3c424a;
            border-radius: 4px;
            overflow: hidden;
        }

        .video-responsive-box iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .video-fallback-bar {
            background: rgba(15, 17, 21, 0.95);
            padding: 8px 12px;
            text-align: center;
            font-size: 12px;
            border-top: 1px solid #2a2f35;
            color: #bbb;
        }

        .video-fallback-bar a {
            color: #38bdf8;
            text-decoration: underline;
            font-weight: bold;
            margin-left: 6px;
        }

        .video-fallback-bar a:hover {
            color: #7dd3fc;
        }

        /* --- 5. КНОПКА СТАРТА И СТАТУС --- */
        .btn-play-pulse {
            animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
            0% { filter: drop-shadow(0 0 4px #44aa22); }
            50% { filter: drop-shadow(0 0 14px #66dd33); }
            100% { filter: drop-shadow(0 0 4px #44aa22); }
        }

        .server-status-pill {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #22c55e;
            margin-right: 6px;
            box-shadow: 0 0 6px #22c55e;
        }

        /* --- 6. ДОПОЛНЕНИЯ ИЗ ФАЙЛА TANKI ONLINE --- */
        body { margin: 0; overflow: hidden; background: #000; font-family: 'Trebuchet MS', Tahoma, sans-serif; user-select: none; }
        
        #top-bar {
            position: absolute; top: 0; left: 0; width: 100%; height: 42px;
            background: linear-gradient(180deg, #3a3d40 0%, #1e2022 100%);
            border-bottom: 2px solid #5a5e63; display: flex; align-items: center; justify-content: space-between;
            padding: 0 16px; box-sizing: border-box; z-index: 10;
        }
        .logo-text { font-size: 18px; font-weight: bold; color: #e5b326; letter-spacing: 1px; }
        
        .retro-btn {
            background: linear-gradient(180deg, #5c636a 0%, #2f343a 100%);
            border: 1px solid #7c858e; border-radius: 3px; color: #fff;
            padding: 5px 12px; font-size: 13px; font-weight: bold; cursor: pointer; margin-left: 8px;
        }
        .retro-btn:hover { background: linear-gradient(180deg, #6e767e 0%, #3a4047 100%); color: #ffe680; }
        .retro-btn.active { background: #204d1d; border-color: #55bb33; color: #7aff52; }

        /* Окно Гаража */
        #garage-window {
            position: absolute; top: 55px; left: 50%; transform: translateX(-50%);
            width: 740px; height: 460px; background: rgba(24, 26, 29, 0.96);
            border: 2px solid #5a6068; border-radius: 4px; box-shadow: 0 0 25px rgba(0,0,0,0.9);
            display: none; flex-direction: column; z-index: 20; color: #ddd;
        }
        .window-header {
            background: #222528; padding: 10px 14px; font-weight: bold; color: #e5b326;
            border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;
        }
        .garage-body { display: flex; flex: 1; overflow: hidden; padding: 12px; gap: 12px; }
        .garage-col { flex: 1; background: #16181a; border: 1px solid #33383e; border-radius: 3px; display: flex; flex-direction: column; padding: 8px; }
        .garage-col h3 { margin: 0 0 8px 0; font-size: 13px; text-align: center; color: #8fa0b5; border-bottom: 1px solid #282c31; padding-bottom: 4px; }
        .item-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
        .item-card {
            background: #21252a; border: 1px solid #3d434d; margin-bottom: 6px; padding: 8px 10px;
            border-radius: 3px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold;
        }
        .item-card:hover { background: #2f353d; color: #fff; }
        .item-card.active { border-color: #44aa22; background: #1c3319; color: #7aff52; }

        /* Боевой HUD */
        #hud-container {
            position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%);
            display: flex; flex-direction: column; align-items: center; gap: 6px; pointer-events: none;
        }
        .bar-wrap {
            width: 280px; height: 16px; background: rgba(15, 15, 15, 0.85);
            border: 2px solid #444; border-radius: 2px; overflow: hidden; position: relative;
            box-shadow: 0 2px 6px rgba(0,0,0,0.8);
        }
        .bar-fill-hp { width: 100%; height: 100%; background: linear-gradient(90deg, #388e3c, #66bb6a); transition: width 0.15s; }
        .bar-fill-reload { width: 100%; height: 100%; background: #44bb22; }
        .bar-text {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            font-size: 11px; font-weight: bold; color: #fff; text-shadow: 1px 1px 2px #000;
        }

        #bot-ui {
            position: absolute; transform: translate(-50%, -100%); pointer-events: none;
            display: flex; flex-direction: column; align-items: center; gap: 3px;
        }
        .bot-name { font-size: 12px; font-weight: bold; color: #ff5555; text-shadow: 1px 1px 2px #000; }
        .bot-bar-wrap { width: 120px; height: 9px; background: #222; border: 1px solid #000; border-radius: 1px; overflow: hidden; }
        .bot-bar-fill { width: 100%; height: 100%; background: #dd2222; transition: width 0.1s; }

        .dmg-popup {
            position: absolute; font-weight: 900; font-size: 22px; color: #ffea00;
            text-shadow: 0 0 6px #ff3300, 2px 2px 3px #000; pointer-events: none;
            animation: floatUp 0.85s ease-out forwards;
        }
        .dmg-popup.crit { font-size: 30px; color: #ff1100; text-shadow: 0 0 10px #ffff00, 2px 2px 4px #000; }
        @keyframes floatUp {
            0% { opacity: 1; transform: translate(-50%, 0) scale(0.8); }
            40% { transform: translate(-50%, -30px) scale(1.2); }
            100% { opacity: 0; transform: translate(-50%, -60px) scale(1); }
        }

        #flip-tip {
            position: absolute; top: 70px; left: 50%; transform: translateX(-50%);
            background: rgba(180, 20, 20, 0.85); color: #fff; padding: 6px 14px;
            border-radius: 3px; font-weight: bold; font-size: 13px; display: none;
            border: 1px solid #ff4444; z-index: 15; text-shadow: 1px 1px 2px #000;
        }
        #crosshair {
            position: absolute; top: 50%; left: 50%; width: 6px; height: 6px;
            background: #fff; border-radius: 50%; transform: translate(-50%, -50%);
            opacity: 0.8; pointer-events: none;
        }
        #hud-controls {
            position: absolute; bottom: 12px; left: 12px; color: #ccc;
            font-size: 12px; background: rgba(0,0,0,0.65); padding: 8px 12px; border-radius: 3px; line-height: 1.5;
        }
    </style>
    <!-- Three.js + GLTFLoader -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <!-- Полноценный 3D физический движок Cannon.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>
</head>
<body>

<!-- Лайтбокс просмотра скриншотов -->
<div class="lightbox" id="lightbox" aria-modal="true" role="dialog" aria-label="Просмотр скриншотов" tabindex="-1">
    <div class="lightbox__backdrop" data-close=""></div>
    <div class="lightbox__dialog">
        <div class="lightbox__stage">
            <div class="lightbox__spinner" id="lbSpinner" aria-hidden="true">
                <div class="spinner" aria-label="Загрузка"></div>
            </div>
            <div class="lightbox__placeholder"></div>
            <img class="lightbox__img" id="lbImg" alt="">
            <button class="lightbox__btn lightbox__prev" id="lbPrev" aria-label="Предыдущее">‹</button>
            <button class="lightbox__btn lightbox__next" id="lbNext" aria-label="Следующее">›</button>
        </div>
        <button class="lightbox__close" id="lbClose" aria-label="Закрыть">✕</button>
        <div class="lightbox__counter" id="lbCounter" aria-live="polite"></div>
    </div>
</div>

<div id="main">
    <div id="header">
        <div class="header">
            <ul class="icons">
                <li><img src="images/ico02.gif" alt="ico"></li>
            </ul>

            <!-- ЛЕВОЕ МЕНЮ (ОТКЛЮЧЕНО + ПЛАШКА) -->
            <div class="menu-wrapper">
                <div class="under-dev-badge">В РАЗРАБОТКЕ</div>
                <ul id="menu" class="menu-disabled">
                    <li><a href="#" class="btn-ratings" tabindex="-1">РЕЙТИНГИ</a></li>
                    <li><a href="#" class="btn-begin" tabindex="-1">КАК НАЧАТЬ</a></li>
                    <li><a href="#" class="btn-article" tabindex="-1">СТАТЬИ</a></li>
                    <li><a href="#" class="btn-blog" tabindex="-1">БЛОГ</a></li>
                    <li><a href="#" class="btn-forum" tabindex="-1">ФОРУМ</a></li>
                    <li><a href="#" class="btn-userecho" tabindex="-1">ВАШИ ИДЕИ</a></li>
                </ul>
            </div>

            <!-- УВЕЛИЧЕННЫЙ ЛОГОТИП ПО ЦЕНТРУ -->
            <h1 class="logo">
                <a href="/">
                    <img src="images/logo.png" alt="ReTanki Online">
                </a>
            </h1>

            <!-- ПРАВАЯ ПАНЕЛЬ СЕРВЕРОВ И КНОПКА СТАРТА -->
            <div class="info">
                <div class="server">
                    <div class="btn-not" id="serverStatusText">
                        <span class="server-status-pill"></span>Сервер онлайн
                    </div>
                    
                    <a href="/client/" id="startButton" class="btn btn-play-pulse" title="Начать игру">Начать игру</a>

                    <div class="item">
                        <strong class="title">Сервер</strong>
                        <div class="part">
                            <div id="currentServer">
                                <span>1</span>
                                <ul>
                                    <li><img src="images/item1.gif" alt=""></li>
                                    <li><img src="images/item1.gif" alt=""></li>
                                    <li><img src="images/item1.gif" alt=""></li>
                                    <li><img src="images/item1.gif" alt=""></li>
                                </ul>
                                <a href="#" class="play players"></a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Счётчики онлайна -->
                <div class="all">
                    <ul>
                        <li>
                            <strong class="text-all">Всего игроков</strong>
                            <p id="statTotal">1 420</p>
                        </li>
                        <li>
                            <strong class="text-online">В онлайне</strong>
                            <p id="statOnline">84</p>
                        </li>
                        <li>
                            <strong class="text-battle">В битвах</strong>
                            <p id="statInBattles">68</p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Центральный слоган под шапкой -->
        <div class="holder">
            <strong class="slogan"></strong>
            <div class="box">
                <div class="t">&nbsp;</div>
                <div class="c">
                    <div class="text">
                        <p><b>ReTanki Online</b> — фанатское воссоздание легендарного танкового 3D-боевика золотой эпохи 2010–2014 годов. Честная физика подвески, паркур, любимые пушки, корпуса и динамичные битвы прямо в вашем браузере!</p>
                    </div>
                </div>
                <div class="b">&nbsp;</div>
            </div>
        </div>
    </div>

    <!-- Основной контент страницы -->
    <div id="content">
        <div class="content" style="margin-top:-20px;">
            
            <!-- БЛОК ВИДЕО (YOUTUBE) -->
            <div class="video-box">
                <h2>ВИДЕО ИГРЫ</h2><br>
                <div class="video-responsive-box">
                    <iframe 
                        src="https://www.youtube.com/embed/HumrCfjoLKE?autoplay=0&rel=0&modestbranding=1" 
                        title="ReTanki Online — Трейлер" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>
                    <div class="video-fallback-bar">
                        Если видео не воспроизводится в браузере: 
                        <a href="https://youtu.be/HumrCfjoLKE" target="_blank" rel="noopener noreferrer">Смотреть трейлер на YouTube ↗</a>
                    </div>
                </div>
            </div>

            <table class="sharebuttons">
                <tbody>
                    <tr>
                        <td width="20%" align="left" style="padding-right:3px"></td>
                    </tr>
                </tbody>
            </table>

            <!-- СКРИНШОТЫ ИГРЫ (УВЕЛИЧЕННЫЕ КАРТОЧКИ) -->
            <div class="screen-box">
                <h2 style="padding-bottom:8px;">СКРИНШОТЫ ИГРЫ</h2>
                <ul id="screenshots">
                    <li><a href="images/scr_1.png" target="_blank"><img src="images/scr_1.png" alt="Скриншот 1"></a></li>
                    <li><a href="images/scr_2.png" target="_blank"><img src="images/scr_2.png" alt="Скриншот 2"></a></li>
                    <li><a href="images/scr_3.png" target="_blank"><img src="images/scr_3.png" alt="Скриншот 3"></a></li>
                    <li><a href="images/scr_4.png" target="_blank"><img src="images/scr_4.png" alt="Скриншот 4"></a></li>
                    <li><a href="images/scr_5.png" target="_blank"><img src="images/scr_5.png" alt="Скриншот 5"></a></li>
                    <li><a href="images/scr_6.png" target="_blank"><img src="images/scr_6.png" alt="Скриншот 6"></a></li>
                </ul>
            </div>

            <!-- График загрузки серверов временно отключен -->
        </div>

        <!-- САЙДБАР (БЕЗ НОВОСТЕЙ, ТОЛЬКО СООБЩЕСТВО) -->
        <div class="sidebar">
            <div class="news-box" style="margin: 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 4px;">
                <h2>СООБЩЕСТВО</h2>
                <p style="color: #bbb; font-size: 13px; line-height: 1.5; margin-top: 10px;">
                    Следите за обновлениями, общайтесь с другими танкистами и участвуйте в тестировании игры:
                </p>
                <br>
                <ul class="ico-list">
                    <li><a href="https://vk.com/" target="_blank" class="ico6">ВКонтакте</a></li>
                </ul>
            </div>
        </div>
    </div>

    <!-- Футер -->
    <div id="footer">
        <div class="footer">
            <div class="holder">
                <div class="copy">
                    <p>© <b>ReTanki Online</b> 2026. Некоммерческий фанатский проект.<br>
                    Все права на оригинальные ресурсы и концепцию принадлежат Alternativa Games.</p>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="top-bar">
    <div class="logo-text">RETANKI ONLINE // RIGIDBODY</div>
    <div>
        <button class="retro-btn" onclick="resetTankOrientation()">ПЕРЕВЕРНУТЬ [R]</button>
        <button class="retro-btn" onclick="toggleGarage()">ГАРАЖ [G]</button>
    </div>
</div>

<div id="flip-tip">ТАНК ПЕРЕВЕРНУТ! Нажмите [ R ], чтобы встать на гусеницы</div>

<div id="bot-ui">
    <div class="bot-name">БОТ [МАМОНТ]</div>
    <div class="bot-bar-wrap"><div id="bot-hp-bar" class="bot-bar-fill"></div></div>
</div>

<div id="garage-window">
    <div class="window-header">
        <span>ГАРАЖ ВООРУЖЕНИЯ</span>
        <button class="retro-btn" onclick="toggleGarage()">В БОЙ ✖</button>
    </div>
    <div class="garage-body">
        <div class="garage-col">
            <h3>КОРПУСА</h3>
            <ul class="item-list">
                <li class="item-card" onclick="selectEquipment('hull', 'hornet', this)">Хорнет [1.0т]</li>
                <li class="item-card active" onclick="selectEquipment('hull', 'viking', this)">Викинг [2.3т]</li>
                <li class="item-card" onclick="selectEquipment('hull', 'mammoth', this)">Мамонт [4.5т]</li>
            </ul>
        </div>
        <div class="garage-col">
            <h3>ПУШКИ</h3>
            <ul class="item-list">
                <li class="item-card" onclick="selectEquipment('turret', 'smoky', this)">Смоки</li>
                <li class="item-card active" onclick="selectEquipment('turret', 'railgun', this)">Рельса</li>
                <li class="item-card" onclick="selectEquipment('turret', 'thunder', this)">Гром</li>
            </ul>
        </div>
        <div class="garage-col">
            <h3>КРАСКИ</h3>
            <ul class="item-list">
                <li class="item-card active" onclick="selectEquipment('paint', 'green', this)">Зелёный</li>
                <li class="item-card" onclick="selectEquipment('paint', 'flora', this)">Флора</li>
                <li class="item-card" onclick="selectEquipment('paint', 'metallic', this)">Металлик</li>
                <li class="item-card" onclick="selectEquipment('paint', 'lava', this)">Лава</li>
            </ul>
        </div>
    </div>
</div>

<div id="hud-container">
    <div class="bar-wrap">
        <div id="hp-bar" class="bar-fill-hp"></div>
        <div id="hp-text" class="bar-text">1200 / 1200</div>
    </div>
    <div class="bar-wrap">
        <div id="reload-bar" class="bar-fill-reload"></div>
        <div id="reload-text" class="bar-text">ГОТОВ</div>
    </div>
</div>

<div id="crosshair"></div>
<div id="hud-controls">
    <b>W,A,S,D</b>: Управление | <b>Стрелки / Z,X</b>: Башня | <b>Пробел</b>: Огонь<br>
    <b>R</b>: Перевернуться на гусеницы | <b>G</b>: Гараж | <b>Колёсико</b>: Зум камеры
</div>

<script>
    // =========================================================
    // 1. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА
    // =========================================================
    const hpBarEl = document.getElementById('hp-bar');
    const hpTextEl = document.getElementById('hp-text');
    const reloadBarEl = document.getElementById('reload-bar');
    const reloadTextEl = document.getElementById('reload-text');
    const botUiEl = document.getElementById('bot-ui');
    const botHpBarEl = document.getElementById('bot-hp-bar');
    const garageWindow = document.getElementById('garage-window');
    const flipTipEl = document.getElementById('flip-tip');

    let garageOpen = false;

    // =========================================================
    // 2. ФИЗИЧЕСКИЙ МИР (CANNON.JS)
    // =========================================================
    const physicsWorld = new CANNON.World();
    physicsWorld.gravity.set(0, -18.0, 0); // Уверенная аркадная гравитация
    physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
    physicsWorld.defaultContactMaterial.friction = 0.5;
    physicsWorld.defaultContactMaterial.restitution = 0.05;

    // Земля (Ground Plane)
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    physicsWorld.addBody(groundBody);

    // =========================================================
    // 3. ТРЕХМЕРНАЯ ГРАФИЧЕСКАЯ СЦЕНА (THREE.JS)
    // =========================================================
    const scene = new THREE.Scene();
    const fogColor = new THREE.Color(0x7da4c7);
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(fogColor, 0.0045);

    const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xcde1f5, 0x443a2f, 0.45));
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const sun = new THREE.DirectionalLight(0xfff6e6, 0.85);
    sun.position.set(35, 70, -25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 250;
    const sDist = 55;
    sun.shadow.camera.left = -sDist; sun.shadow.camera.right = sDist;
    sun.shadow.camera.top = sDist; sun.shadow.camera.bottom = -sDist;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    scene.add(sun.target);

    // =========================================================
    // 4. КАРТА И ПАРКУР-АРЕНА С РАМПАМИ И БЛОКАМИ
    // =========================================================
    const gltfLoader = new THREE.GLTFLoader();

    function addStaticObstacle(x, y, z, w, h, d, rotX = 0, rotY = 0, rotZ = 0) {
        // Графика
        const mat = new THREE.MeshLambertMaterial({ color: 0x72777b });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rotX, rotY, rotZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Физика (Твердое тело с формой Box)
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
        body.position.set(x, y, z);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
        body.quaternion.set(q.x, q.y, q.z, q.w);
        physicsWorld.addBody(body);
    }

    // Попытка загрузить внешнюю карту map.glb
    gltfLoader.load('/map.glb', (gltf) => {
        const mapMesh = gltf.scene;
        mapMesh.traverse((n) => {
            if (n.isMesh) {
                n.castShadow = true;
                n.receiveShadow = true;
                // Создаем для мешей карты габаритные физические боксы
                const box = new THREE.Box3().setFromObject(n);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                if (size.y > 0.4 && size.x > 0.4) {
                    const b = new CANNON.Body({ mass: 0 });
                    b.addShape(new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)));
                    b.position.set(center.x, center.y, center.z);
                    physicsWorld.addBody(b);
                }
            }
        });
        scene.add(mapMesh);
    }, undefined, () => {
        // Резервная тренировочная паркур-арена
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(350, 350), new THREE.MeshLambertMaterial({ color: 0x827753 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // РАМПА 1: Подъем на платформу (Паркур)
        addStaticObstacle(0, 1.6, 10, 10, 0.8, 16, 0.35, 0, 0);
        // Платформа на вершине рампы
        addStaticObstacle(0, 4.0, 24, 16, 1.0, 16);

        // Препятствия и блоки разной высоты
        addStaticObstacle(-16, 0.6, 10, 8, 1.2, 8); // Низкий преодолимый блок
        addStaticObstacle(16, 2.0, 10, 8, 4.0, 8);  // Высокая стена
    });

    // =========================================================
    // 5. ПАРАМЕТРЫ КОРПУСОВ И ПУШЕК
    // =========================================================
    const TANK_SPECS = {
        hulls: {
            "hornet": {
                hp: 900, mass: 1.2,
                w: 2.6, h: 0.9, l: 4.6,
                driveForce: 18000, maxSpeed: 13.0, turnTorque: 9500,
                mountY: 0.55, mountZ: -0.2, rotY: Math.PI, scale: 4.8
            },
            "viking": {
                hp: 1200, mass: 2.4,
                w: 3.0, h: 0.95, l: 5.0,
                driveForce: 28000, maxSpeed: 10.5, turnTorque: 14000,
                mountY: 0.55, mountZ: -0.4, rotY: Math.PI, scale: 5.2
            },
            "mammoth": {
                hp: 2000, mass: 4.8,
                w: 3.3, h: 1.1, l: 5.4,
                driveForce: 42000, maxSpeed: 7.2, turnTorque: 19000,
                mountY: 0.65, mountZ: 0.6, rotY: Math.PI, scale: 5.4
            }
        },
        turrets: {
            "smoky": {
                damage: 130, critChance: 0.20, critDamage: 320,
                reloadTime: 1.2, chargeTime: 0,
                impactImpulse: 2500, recoilImpulse: 1200,
                maxTurretSpeed: 2.6, turretAccel: 8.0,
                pivotZ: 0.65, pivotY: 0, rotY: Math.PI, scale: 3.2
            },
            "railgun": {
                damage: 750, reloadTime: 5.1, chargeTime: 1.15,
                impactImpulse: 8500, recoilImpulse: 4500, // Может опрокинуть легкий танк
                maxTurretSpeed: 1.6, turretAccel: 3.2,
                pivotZ: 1.15, pivotY: 0, rotY: Math.PI, scale: 4.6
            },
            "thunder": {
                damage: 420, splashRadius: 7.0, reloadTime: 2.3, chargeTime: 0,
                impactImpulse: 4500, recoilImpulse: 2200,
                maxTurretSpeed: 2.0, turretAccel: 5.0,
                pivotZ: 0.35, pivotY: 0, rotY: Math.PI, scale: 3.6
            }
        }
    };

    const PAINT_TINTS = { 'green': 0x4e6b2f, 'flora': 0x3d5028, 'metallic': 0x7b8b99, 'lava': 0x99381e };

    function updateHUDHealth() {
        if (!hpTextEl || !localTank) return;
        const maxHp = TANK_SPECS.hulls[localTank.currentHull].hp;
        hpTextEl.innerText = `${maxHp} / ${maxHp}`;
    }

    // =========================================================
    // 6. КЛАСС ТАНКА: RIGID BODY И МОНОЛИТНАЯ ИЕРАРХИЯ
    // =========================================================
    class PhysicsTank {
        constructor(startX, startY, startZ, isBot = false) {
            this.isBot = isBot;
            this.currentHull = isBot ? 'mammoth' : 'viking';
            this.currentTurret = isBot ? 'thunder' : 'railgun';
            this.currentPaint = isBot ? 'lava' : 'green';

            // --- 1. ФИЗИЧЕСКОЕ ТЕЛО (CANNON.BODY) ---
            const hSpec = TANK_SPECS.hulls[this.currentHull];
            this.body = new CANNON.Body({
                mass: hSpec.mass * 1000,
                linearDamping: 0.15,
                angularDamping: 0.45
            });
            // Форма корпуса — твердотельный параллелепипед
            this.bodyShape = new CANNON.Box(new CANNON.Vec3(hSpec.w / 2, hSpec.h / 2, hSpec.l / 2));
            this.body.addShape(this.bodyShape);
            this.body.position.set(startX, startY, startZ);
            physicsWorld.addBody(this.body);

            // --- 2. ЕДИНАЯ ГРАФИЧЕСКАЯ ИЕРАРХИЯ THREE.JS ---
            this.root = new THREE.Group();
            
            // Визуальный меш корпуса (смещен вниз на половину высоты, чтобы днище касалось грунта)
            this.hullVisual = new THREE.Group();
            this.root.add(this.hullVisual);

            // Башня является ДОЧЕРНИМ объектом корпуса! Всегда следует за его положением и креном
            this.turretMount = new THREE.Group();
            this.root.add(this.turretMount);

            this.turretWrapper = new THREE.Group();
            this.turretMount.add(this.turretWrapper);

            this.chargeLight = new THREE.PointLight(0x33ccff, 0, 8);
            this.chargeLight.position.set(0, 0, 2.5);
            this.turretWrapper.add(this.chargeLight);

            this.turretRecoilOffset = 0;
            this.turretYaw = 0;
            this.turretAngularVelocity = 0;

            scene.add(this.root);

            this.setHull(this.currentHull);
            this.setTurret(this.currentTurret);
        }

        applyPaint(group) {
            const tintHex = PAINT_TINTS[this.currentPaint] || PAINT_TINTS['green'];
            group.traverse((n) => {
                if (n.isMesh && n.material) {
                    n.castShadow = true; n.receiveShadow = true;
                    n.material.color = new THREE.Color(tintHex);
                    n.material.roughness = 0.70;
                    n.material.metalness = 0.15;
                    n.material.needsUpdate = true;
                }
            });
        }

        setHull(hullName) {
            this.currentHull = hullName;
            const hSpec = TANK_SPECS.hulls[hullName];

            // Обновляем массу и форму тела в Cannon.js
            this.body.mass = hSpec.mass * 1000;
            this.body.updateMassProperties();

            gltfLoader.load(`/models/hulls/${hullName}.glb`, (gltf) => {
                while (this.hullVisual.children.length > 0) this.hullVisual.remove(this.hullVisual.children[0]);
                const mesh = gltf.scene;

                // Нормализация масштаба модели
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.z);
                if (maxDim > 10.0) {
                    const s = hSpec.scale / maxDim;
                    mesh.scale.set(s, s, s);
                }
                box.setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.set(-center.x, -hSpec.h / 2, -center.z);
                mesh.rotation.y = hSpec.rotY;

                this.applyPaint(mesh);
                this.hullVisual.add(mesh);

                // Узел башни монтируется точно на крышу корпуса
                this.turretMount.position.set(0, hSpec.mountY, hSpec.mountZ);
            });
            if (!this.isBot) updateHUDHealth();
        }

        setTurret(turretName) {
            this.currentTurret = turretName;
            const tSpec = TANK_SPECS.turrets[turretName];

            gltfLoader.load(`/models/turrets/${turretName}.glb`, (gltf) => {
                while (this.turretWrapper.children.length > 0) this.turretWrapper.remove(this.turretWrapper.children[0]);
                const mesh = gltf.scene;
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.z, size.y);
                if (maxDim > 10.0) {
                    const s = tSpec.scale / maxDim;
                    mesh.scale.set(s, s, s);
                }
                box.setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.set(-center.x, -box.min.y, -center.z);

                this.applyPaint(mesh);
                this.turretWrapper.add(mesh);
                this.turretWrapper.add(this.chargeLight);

                this.updateTurretOffset();
            });
        }

        updateTurretOffset() {
            const tSpec = TANK_SPECS.turrets[this.currentTurret];
            if (tSpec) {
                this.turretWrapper.position.set(0, tSpec.pivotY, tSpec.pivotZ - this.turretRecoilOffset);
                this.turretWrapper.rotation.y = tSpec.rotY;
            }
        }

        setPaint(paintName) {
            this.currentPaint = paintName;
            this.applyPaint(this.hullVisual);
            this.applyPaint(this.turretWrapper);
        }

        // Проверка касания гусениц с поверхностью (лучевая диагностика)
        checkGroundContact() {
            const hSpec = TANK_SPECS.hulls[this.currentHull];
            const down = this.body.vectorToWorldFrame(new CANNON.Vec3(0, -1, 0));
            
            // Проверяем, смотрит ли днище вниз (танк не перевернут)
            const isUpright = down.y < -0.4;
            if (!isUpright) return { inContact: false, isUpright: false };

            // 4 точки гусениц
            const offsets = [
                new CANNON.Vec3(-hSpec.w * 0.45, 0,  hSpec.l * 0.45),
                new CANNON.Vec3( hSpec.w * 0.45, 0,  hSpec.l * 0.45),
                new CANNON.Vec3(-hSpec.w * 0.45, 0, -hSpec.l * 0.45),
                new CANNON.Vec3( hSpec.w * 0.45, 0, -hSpec.l * 0.45)
            ];

            let hitCount = 0;
            for (let off of offsets) {
                const from = this.body.pointToWorldFrame(off);
                const to = from.vadd(down.scale(hSpec.h * 0.75));
                const res = new CANNON.RaycastResult();
                physicsWorld.rayTest(from, to, res);
                if (res.hasHit) hitCount++;
            }

            return { inContact: hitCount > 0, isUpright: true };
        }

        // Физическое обновление движения и гусеничной тяги
        update(dt, driveInput, turnInput) {
            const hSpec = TANK_SPECS.hulls[this.currentHull];
            const contact = this.checkGroundContact();

            if (!this.isBot) {
                flipTipEl.style.display = (!contact.isUpright) ? 'block' : 'none';
            }

            // Гусеницы работают только при контакте с грунтом/рампой
            if (contact.inContact && contact.isUpright) {
                // Локальный вектор направления вперед
                const forward = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
                const currentVel = this.body.velocity;
                const speed = currentVel.dot(forward);

                // 1. Сила тяги гусениц вдоль направления танка
                if (driveInput !== 0) {
                    if ((driveInput > 0 && speed < hSpec.maxSpeed) || (driveInput < 0 && speed > -hSpec.maxSpeed * 0.6)) {
                        const force = forward.scale(hSpec.driveForce * driveInput);
                        this.body.applyForce(force, this.body.position);
                    }
                } else {
                    // Торможение при отпущенных клавишах
                    const brakeForce = forward.scale(-speed * hSpec.mass * 800);
                    this.body.applyForce(brakeForce, this.body.position);
                }

                // 2. Гусеничный разворот на месте (крутящий момент)
                if (turnInput !== 0) {
                    const up = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0));
                    const torque = up.scale(hSpec.turnTorque * turnInput);
                    this.body.applyTorque(torque);
                }

                // 3. Боковое сопротивление заносу гусениц
                const right = this.body.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0));
                const lateralSpeed = currentVel.dot(right);
                const lateralDamp = right.scale(-lateralSpeed * hSpec.mass * 1200);
                this.body.applyForce(lateralDamp, this.body.position);
            }

            // Вращение башни
            this.turretMount.rotation.y = this.turretYaw;

            // Синхронизация графического контейнера Three.js с физическим телом Cannon.js
            this.root.position.copy(this.body.position);
            this.root.quaternion.copy(this.body.quaternion);

            this.turretRecoilOffset = THREE.MathUtils.damp(this.turretRecoilOffset, 0, 10, dt);
            this.updateTurretOffset();
        }
    }

    // Игрок и Бот-мишень
    const localTank = new PhysicsTank(0, 2.0, -6, false);
    const botTank = new PhysicsTank(0, 2.0, 24, true);

    // Функция быстрого переворота на гусеницы (R)
    function resetTankOrientation() {
        const p = localTank.body.position;
        localTank.body.position.set(p.x, p.y + 2.0, p.z);
        localTank.body.velocity.set(0, 0, 0);
        localTank.body.angularVelocity.set(0, 0, 0);
        // Сбрасываем поворот на горизонтальный, сохраняя направление взгляда
        const euler = new THREE.Euler().setFromQuaternion(localTank.root.quaternion, 'YXZ');
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
        localTank.body.quaternion.set(q.x, q.y, q.z, q.w);
    }

    // =========================================================
    // 7. СТРЕЛЬБА И ПЕРЕДАЧА ФИЗИЧЕСКИХ ИМПУЛЬСОВ
    // =========================================================
    let isCharging = false;
    let isReloading = false;
    let reloadTimer = 0;
    let totalReloadTime = 1;
    let chargeTimer = 0;
    let totalChargeTime = 0;

    let botMaxHp = 1500;
    let botCurrentHp = 1500;
    let isBotDead = false;

    function showDamagePopup(amount, isCrit, worldPos) {
        const el = document.createElement('div');
        el.className = `dmg-popup ${isCrit ? 'crit' : ''}`;
        el.innerText = isCrit ? `-${amount} КРИТ!` : `-${amount}`;
        document.body.appendChild(el);

        const proj = worldPos.clone().project(camera);
        const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-(proj.y * 0.5) + 0.5) * window.innerHeight;
        el.style.left = `${sx}px`;
        el.style.top = `${sy}px`;

        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 850);
    }

    function damageBot(amount, isCrit, hitPoint, impulseVec) {
        if (isBotDead) return;
        botCurrentHp = Math.max(0, botCurrentHp - amount);
        botHpBarEl.style.width = `${(botCurrentHp / botMaxHp) * 100}%`;

        showDamagePopup(amount, isCrit, hitPoint);

        // Физический удар в точку соударения (может качнуть или перевернуть бота)
        if (impulseVec) {
            const cImpulse = new CANNON.Vec3(impulseVec.x, impulseVec.y, impulseVec.z);
            const cPoint = new CANNON.Vec3(hitPoint.x, hitPoint.y, hitPoint.z);
            botTank.body.applyImpulse(cImpulse, cPoint);
        }

        if (botCurrentHp <= 0) {
            isBotDead = true;
            botUiEl.style.display = 'none';
            botTank.root.visible = false;
            botTank.body.position.set(0, -50, 0);

            setTimeout(() => {
                botCurrentHp = botMaxHp;
                botHpBarEl.style.width = '100%';
                botTank.body.position.set(0, 2.0, 24);
                botTank.body.velocity.set(0, 0, 0);
                botTank.body.angularVelocity.set(0, 0, 0);
                botTank.body.quaternion.set(0, 0, 0, 1);
                botTank.root.visible = true;
                botUiEl.style.display = 'flex';
                isBotDead = false;
            }, 3000);
        }
    }

    function checkHitOnBot(rayOrigin, rayDir, maxDist) {
        if (isBotDead) return null;
        const botBox = new THREE.Box3().setFromObject(botTank.root);
        const ray = new THREE.Ray(rayOrigin, rayDir);
        const hit = new THREE.Vector3();
        if (ray.intersectBox(botBox, hit)) {
            if (rayOrigin.distanceTo(hit) <= maxDist) return hit;
        }
        return null;
    }

    function executeShot() {
        const tSpec = TANK_SPECS.turrets[localTank.currentTurret];

        // Направление выстрела вычисляется из абсолютной ориентации башни
        const turretWorldQuat = new THREE.Quaternion();
        localTank.turretMount.getWorldQuaternion(turretWorldQuat);
        const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(turretWorldQuat);

        const muzzlePos = new THREE.Vector3();
        localTank.turretWrapper.getWorldPosition(muzzlePos);
        muzzlePos.addScaledVector(dir, 3.5);

        // 1. Физическая отдача орудия (толкает танк назад и раскачивает корпус)
        const recoilImpulse = dir.clone().multiplyScalar(-tSpec.recoilImpulse);
        localTank.body.applyImpulse(
            new CANNON.Vec3(recoilImpulse.x, recoilImpulse.y, recoilImpulse.z),
            new CANNON.Vec3(muzzlePos.x, muzzlePos.y, muzzlePos.z)
        );
        localTank.turretRecoilOffset = 0.35;

        // 2. Отрисовка луча и проверка попадания
        const hitPoint = checkHitOnBot(muzzlePos, dir, 150);
        const endPoint = hitPoint || muzzlePos.clone().addScaledVector(dir, 100);

        // Трассер
        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([muzzlePos, endPoint]),
            new THREE.LineBasicMaterial({ color: (localTank.currentTurret === 'railgun') ? 0x00e1ff : 0xffaa00, linewidth: 2 })
        );
        scene.add(line);
        setTimeout(() => scene.remove(line), 60);

        if (hitPoint) {
            const impactVec = dir.clone().multiplyScalar(tSpec.impactImpulse);
            damageBot(tSpec.damage, localTank.currentTurret === 'railgun', hitPoint, impactVec);
        }

        isReloading = true;
        reloadTimer = 0;
        totalReloadTime = tSpec.reloadTime;
    }

    function triggerFire() {
        if (isReloading || isCharging) return;
        const tSpec = TANK_SPECS.turrets[localTank.currentTurret];
        if (tSpec.chargeTime > 0) {
            isCharging = true;
            chargeTimer = 0;
            totalChargeTime = tSpec.chargeTime;
            localTank.chargeLight.intensity = 0.5;
        } else {
            executeShot();
        }
    }

    // =========================================================
    // 8. ГАРАЖ И УПРАВЛЕНИЕ
    // =========================================================
    function toggleGarage() {
        garageOpen = !garageOpen;
        garageWindow.style.display = garageOpen ? 'flex' : 'none';
    }

    function selectEquipment(cat, name, el) {
        for (let c of el.parentElement.children) c.classList.remove('active');
        el.classList.add('active');

        if (cat === 'hull') localTank.setHull(name);
        if (cat === 'turret') localTank.setTurret(name);
        if (cat === 'paint') localTank.setPaint(name);
    }

    const keys = {};
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR' || e.code === 'KeyF') resetTankOrientation();
        if (e.code === 'KeyG') toggleGarage();
        if (e.code === 'Space' && !garageOpen) triggerFire();
        if (!garageOpen) keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => keys[e.code] = false);

    let camDist = 14.0;
    let camHeight = 6.0;
    window.addEventListener('wheel', (e) => {
        camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.008, 4.0, 30.0);
    });

    // =========================================================
    // 9. ГЛАВНЫЙ ИГРОВОЙ ЦИКЛ
    // =========================================================
    const clock = new THREE.Clock();
    const currentCamPos = new THREE.Vector3(0, 15, -15);
    const currentCamTarget = new THREE.Vector3(0, 1, 0);

    function animate() {
        requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.1);

        // Шаг физического симулятора Cannon.js (60 FPS с субшагами)
        physicsWorld.step(1 / 60, dt, 3);

        // Перезарядка орудий
        if (isCharging) {
            chargeTimer += dt;
            const p = Math.min(1.0, chargeTimer / totalChargeTime);
            reloadBarEl.style.width = `${p * 100}%`;
            reloadBarEl.style.background = '#ffaa00';
            reloadTextEl.innerText = `ЗАРЯД ${(p * 100).toFixed(0)}%`;
            localTank.chargeLight.intensity = p * 1.5;

            if (chargeTimer >= totalChargeTime) {
                isCharging = false;
                localTank.chargeLight.intensity = 0;
                executeShot();
            }
        } else if (isReloading) {
            reloadTimer += dt;
            const p = Math.min(1.0, reloadTimer / totalReloadTime);
            reloadBarEl.style.width = `${p * 100}%`;
            reloadBarEl.style.background = '#00bcd4';
            reloadTextEl.innerText = `ПЕРЕЗАРЯДКА ${(p * 100).toFixed(0)}%`;

            if (reloadTimer >= totalReloadTime) {
                isReloading = false;
                reloadBarEl.style.width = '100%';
                reloadBarEl.style.background = '#44bb22';
                reloadTextEl.innerText = 'ГОТОВ';
            }
        }

        // Ввод управления
        let driveInput = 0;
        let turnInput = 0;
        if (!garageOpen) {
            if (keys['KeyW'] || keys['ArrowUp']) driveInput += 1.0;
            if (keys['KeyS'] || keys['ArrowDown']) driveInput -= 1.0;
            if (keys['KeyA']) turnInput += 1.0;
            if (keys['KeyD']) turnInput -= 1.0;

            const tSpec = TANK_SPECS.turrets[localTank.currentTurret];
            let targetTurretSpeed = 0;
            if (keys['ArrowLeft'] || keys['KeyZ']) targetTurretSpeed += tSpec.maxTurretSpeed;
            if (keys['ArrowRight'] || keys['KeyX']) targetTurretSpeed -= tSpec.maxTurretSpeed;
            if (keys['KeyC']) localTank.turretYaw = THREE.MathUtils.damp(localTank.turretYaw, 0, 5.0, dt);

            localTank.turretAngularVelocity = THREE.MathUtils.damp(localTank.turretAngularVelocity, targetTurretSpeed, tSpec.turretAccel, dt);
            localTank.turretYaw += localTank.turretAngularVelocity * dt;
        }

        // Обновление танков
        localTank.update(dt, driveInput, turnInput);
        botTank.update(dt, 0, 0);

        // Камера третьего лица (плавно следует за танком с учетом любого наклона)
        const tankPos = localTank.root.position;
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(localTank.root.quaternion);
        
        const targetCamX = tankPos.x - forward.x * camDist;
        const targetCamZ = tankPos.z - forward.z * camDist;
        const targetCamY = tankPos.y + camHeight;

        currentCamPos.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
        currentCamTarget.lerp(new THREE.Vector3(tankPos.x, tankPos.y + 1.2, tankPos.z), 0.18);

        camera.position.copy(currentCamPos);
        camera.lookAt(currentCamTarget);

        // UI индикатора над ботом
        if (!isBotDead) {
            const bPos = botTank.root.position.clone().add(new THREE.Vector3(0, 3.0, 0));
            const bProj = bPos.project(camera);
            if (bProj.z < 1) {
                botUiEl.style.display = 'flex';
                botUiEl.style.left = `${(bProj.x * 0.5 + 0.5) * window.innerWidth}px`;
                botUiEl.style.top = `${(-(bProj.y * 0.5) + 0.5) * window.innerHeight}px`;
            } else {
                botUiEl.style.display = 'none';
            }
        }

        sun.position.set(tankPos.x + 35, 70, tankPos.z - 25);
        sun.target.position.copy(tankPos);

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
</script>
<!-- Скрипты сайта -->
<script type="text/javascript" src="js/site.js"></script>
<script type="text/javascript" src="js/lightbox-gallery.js"></script>

</body>
</html>
