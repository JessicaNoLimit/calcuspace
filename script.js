// ============ CALCULADORA ============

const OPERADORES = ['+', '-', '*', '/'];
const MAX_OPERACION = 15;
const MAX_HISTORIAL = 10;
const MAX_FAVORITES = 10;
const MAX_DIGITOS_NUMERO = 14;
const THEME_KEY = 'theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const AUDIO_MUTE_KEY = 'audioMuted';
const TOAST_DURATION = 10000;
const NUMBER_TOAST_PROBABILITY = 0.08;
const NUMBER_TOAST_RATE_LIMIT = 4500;
const PHRASES = [
    'En el espacio nadie puede oirte sumar... pero el resultado siempre llega.',
    'Un agujero negro divide entre cero todo lo que toca.',
    'La gravedad no falla, solo redondea hacia abajo.',
    'Los planetas hacen orbitas, yo hago operaciones.',
    'Dato curioso: Venus gira al reves. Igual que cuando te equivocas de signo.',
    'Si piensas en infinito, recuerda cerrar parentesis.',
    'La Via Lactea tiene miles de millones de estrellas y tu clavaste ese calculo.',
    'Un meteoro tarda menos en caer que un error en propagarse.',
    'Pi es infinito, pero este resultado si cabe en pantalla.',
    'Neptuno tarda 165 anos en orbitar el Sol. Tu tardaste menos en calcular esto.',
    '2 + 2 es 4 aqui y en Andromeda.',
    'Cuando dudas, aplica orden de operaciones. Tambien en la vida galactica.',
    'Dividir entre cero abre un portal interdimensional.',
    'Pi nunca termina... como el debugging.',
    'El Sol contiene el 99.8% de la masa del sistema solar.',
    '404: cerebro not found.',
    'Saturno podria flotar en agua (si tuvieras una banera gigante).',
    'Los agujeros negros tambien tienen limites... tus variables globales no.',
    'La luz del Sol tarda 8 minutos en llegar a la Tierra.',
    'NaN detected: Numero Alienigena No identificado.',
    'En el espacio no hay CSS, pero todo flota igual.',
    'Las estrellas de neutrones giran mas rapido que tu ventilador.',
    'Math.random() decide tu destino.',
    'Un ano en Mercurio dura 88 dias terrestres.',
    'Tu calculadora es mas potente que el ordenador del Apollo 11.',
    'Infinity no es un numero, es una actitud.',
    'La Via Lactea tiene mas de 100 mil millones de estrellas.',
    'console.log es el telescopio del desarrollador.',
    'Error 500: el universo no respondio.',
    'En Jupiter caben mas de 1.300 Tierras.',
    'Las variables tambien necesitan espacio personal.',
    'Pluton sigue siendo cool.',
    'Un byte es pequeno, pero poderoso.',
    'El tiempo se dilata... como tus commits a ultima hora.',
    'Los cometas tienen colas mas largas que tus arrays.',
    'return; es una salida elegante del cosmos.',
    'El Big Bang fue el primer deploy.',
    'Tus bugs viajan a velocidad de la luz.',
    'const es para siempre.',
    'La gravedad no es un error, es una feature.',
    'Un parseFloat al dia mantiene el caos lejos.',
    'La materia oscura tambien oculta bugs.',
];

let toastTimer = null;
let lastNumericToastTime = 0;
let lastPhraseIndex = -1;
// Memoria simple
let memoryValue = 0;

// Favoritos (persistidos)
const FAV_KEY = 'calc_favorites';
let favorites = [];

const ThemeManager = {
    toggleButton: null,

    init() {
        this.toggleButton = document.getElementById('theme-toggle');
        const savedTheme = this.getSavedTheme();
        this.applyTheme(savedTheme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK);

        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleTheme());
        }
    },

    getSavedTheme() {
        try {
            return localStorage.getItem(THEME_KEY);
        } catch (error) {
            return null;
        }
    },

    saveTheme(theme) {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            // Ignorar fallo de persistencia sin romper la UI.
        }
    },

    applyTheme(theme) {
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(theme === THEME_LIGHT ? 'theme-light' : 'theme-dark');
        this.updateToggleA11y(theme);
    },

    toggleTheme() {
        const isLight = document.body.classList.contains('theme-light');
        const nextTheme = isLight ? THEME_DARK : THEME_LIGHT;
        this.applyTheme(nextTheme);
        this.saveTheme(nextTheme);
    },

    updateToggleA11y(currentTheme) {
        if (!this.toggleButton) return;
        const activateLight = currentTheme !== THEME_LIGHT;
        this.toggleButton.setAttribute(
            'aria-label',
            activateLight ? 'Activar tema claro' : 'Activar tema oscuro'
        );
        this.toggleButton.title = activateLight ? 'Activar tema claro' : 'Activar tema oscuro';
    },
};

const SoundManager = {
    audioContext: null,
    soundToggleButton: null,
    isMuted: false,
    isUnlocked: false,

    init() {
        this.soundToggleButton = document.getElementById('sound-toggle');
        this.isMuted = this.getStoredMuteState();
        this.applyMuteClass();
        this.updateA11y();

        if (this.soundToggleButton) {
            this.soundToggleButton.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        this.setupUnlockListeners();
    },

    getStoredMuteState() {
        try {
            return localStorage.getItem(AUDIO_MUTE_KEY) === 'true';
        } catch (error) {
            return false;
        }
    },

    saveMuteState() {
        try {
            localStorage.setItem(AUDIO_MUTE_KEY, String(this.isMuted));
        } catch (error) {
            // Ignorar fallo de almacenamiento.
        }
    },

    applyMuteClass() {
        document.body.classList.toggle('sound-muted', this.isMuted);
    },

    updateA11y() {
        if (!this.soundToggleButton) return;
        const action = this.isMuted ? 'Activar sonido' : 'Silenciar sonido';
        this.soundToggleButton.setAttribute('aria-label', action);
        this.soundToggleButton.title = action;
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.applyMuteClass();
        this.updateA11y();
        this.saveMuteState();
    },

    setupUnlockListeners() {
        const unlock = () => this.unlockAudio();
        document.addEventListener('pointerdown', unlock, { once: true });
        document.addEventListener('keydown', unlock, { once: true });
        document.addEventListener('touchstart', unlock, { once: true });
    },

    unlockAudio() {
        this.ensureAudioContext();
        if (!this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        this.isUnlocked = true;
    },

    ensureAudioContext() {
        if (this.audioContext) return;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this.audioContext = new Ctx();
    },

    createTone({ frequency, type = 'sine', duration = 0.08, volume = 0.05, delay = 0 }) {
        if (this.isMuted) return;

        this.ensureAudioContext();
        if (!this.audioContext || !this.isUnlocked) return;

        const startAt = this.audioContext.currentTime + delay;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startAt);

        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(startAt);
        osc.stop(startAt + duration + 0.01);
    },

    playTap() {
        this.createTone({
            frequency: 450,
            type: 'triangle',
            duration: 0.05,
            volume: 0.03,
        });
    },

    playSuccess() {
        this.createTone({
            frequency: 620,
            type: 'sine',
            duration: 0.08,
            volume: 0.05,
            delay: 0,
        });
        this.createTone({
            frequency: 840,
            type: 'sine',
            duration: 0.1,
            volume: 0.05,
            delay: 0.09,
        });
    },

    playError() {
        this.createTone({
            frequency: 170,
            type: 'sawtooth',
            duration: 0.13,
            volume: 0.05,
        });
    },
};

function getRandomPhrase() {
    if (PHRASES.length <= 1) return PHRASES[0] || '';

    let index = Math.floor(Math.random() * PHRASES.length);
    if (index === lastPhraseIndex) {
        index = (index + 1 + Math.floor(Math.random() * (PHRASES.length - 1))) % PHRASES.length;
    }

    lastPhraseIndex = index;
    return PHRASES[index];
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast || !message) return;

    toast.textContent = message;
    toast.classList.remove('toast-visible');
    void toast.offsetWidth;
    toast.classList.add('toast-visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, TOAST_DURATION);
}

function maybeShowNumericToast() {
    const now = Date.now();
    if (now - lastNumericToastTime < NUMBER_TOAST_RATE_LIMIT) return;
    if (Math.random() > NUMBER_TOAST_PROBABILITY) return;

    lastNumericToastTime = now;
    showToast(getRandomPhrase());
}

function setupToastTriggers() {
    document.querySelectorAll('button[data-numeric]').forEach((button) => {
        button.addEventListener('click', () => {
            if (/^[0-9]$/.test(button.dataset.numeric || '')) {
                maybeShowNumericToast();
            }
        });
    });

    const equalButton = document.querySelector('button.igual');
    if (equalButton) {
        equalButton.addEventListener('click', () => {
            showToast(getRandomPhrase());
        });
    }
}

function setupSoundTriggers() {
    document.querySelectorAll('.botones button').forEach((button) => {
        button.addEventListener('click', () => {
            SoundManager.playTap();
        });
    });

    const equalButton = document.querySelector('button.igual');
    if (equalButton) {
        equalButton.addEventListener('click', () => {
            const result = calculadora.resultado;
            const hasError = result === 'Error' || !Number.isFinite(Number(result));

            if (hasError) {
                SoundManager.playError();
            } else {
                SoundManager.playSuccess();
            }
        });
    }
}

function pushWithFifoLimit(list, item, maxItems) {
    if (list.length >= maxItems) {
        list.shift();
    }
    list.push(item);
}

class Calculadora {
    constructor() {
        this.operacion = '';
        this.resultado = null;
        this.historial = [];
        this.hayPuntoDespuesDeOperador = true;
    }

    agregarNumero(numero) {
        if (/^[0-9]$/.test(numero) && !this.puedeAgregarDigito()) {
            showToast('Número demasiado grande 🚫');
            return;
        }

        if (numero === '.') {
            if (!this.hayPuntoDespuesDeOperador) return;

            if (this.operacion === '') {
                if (!this.puedeAgregarDigito()) {
                    showToast('Número demasiado grande 🚫');
                    return;
                }
                this.operacion = '0.';
                this.hayPuntoDespuesDeOperador = false;
                return;
            }

            const ultimoCaracter = this.operacion[this.operacion.length - 1];
            if (OPERADORES.includes(ultimoCaracter)) {
                if (!this.puedeAgregarDigito()) {
                    showToast('Número demasiado grande 🚫');
                    return;
                }
                this.operacion += '0.';
                this.hayPuntoDespuesDeOperador = false;
                return;
            }
        }

        if (this.operacion.length < MAX_OPERACION) {
            this.operacion += numero;
        }
    }

    agregarOperador(operador) {
        const ultimoCaracter = this.operacion[this.operacion.length - 1];
        if (this.operacion.length > 0 && !isNaN(ultimoCaracter)) {
            this.operacion += operador;
            this.hayPuntoDespuesDeOperador = true;
        }
    }

    backspace() {
        if (this.operacion.length === 0) return;

        const ultimoCaracter = this.operacion[this.operacion.length - 1];
        this.operacion = this.operacion.slice(0, -1);

        if (OPERADORES.includes(ultimoCaracter) || ultimoCaracter === '.') {
            this.hayPuntoDespuesDeOperador = true;
        }
    }

    calcular() {
        try {
            // Caso normal: existe una operacion con operador -> evaluamos
            if (OPERADORES.some((operador) => this.operacion.includes(operador))) {
                // Guardar operador y operando derecho para repetir '='
                const opIndex = Math.max(...OPERADORES.map(o => this.operacion.lastIndexOf(o)));
                if (opIndex > -1) {
                    this.lastOperator = this.operacion[opIndex];
                    const rhs = this.operacion.slice(opIndex + 1);
                    this.lastOperand = parseFloat(rhs);
                }

                this.resultado = eval(this.operacion);
                pushWithFifoLimit(this.historial, `${this.operacion} = ${this.resultado}`, MAX_HISTORIAL);
                this.operacion = '';
                this.hayPuntoDespuesDeOperador = true;
            } else if (this.operacion !== '') {
                // Solo un número en pantalla -> lo convertimos a resultado
                this.resultado = parseFloat(this.operacion);
            } else if (this.operacion === '' && this.lastOperator && this.lastOperand !== undefined && this.resultado !== null) {
                // Repetir la última operación usando resultado actual como lhs
                const lhs = parseFloat(this.resultado);
                const op = this.lastOperator;
                const rhs = this.lastOperand;

                if (op === '/' && rhs === 0) {
                    showToast('Error: división por 0');
                    this.resultado = 'Error';
                } else {
                    // Safe compute
                    let res = lhs;
                    if (op === '+') res = lhs + rhs;
                    if (op === '-') res = lhs - rhs;
                    if (op === '*') res = lhs * rhs;
                    if (op === '/') res = lhs / rhs;
                    this.resultado = res;
                    pushWithFifoLimit(this.historial, `${lhs} ${op} ${rhs} = ${this.resultado}`, MAX_HISTORIAL);
                }
            }
        } catch (error) {
            this.resultado = 'Error';
        }
    }

    limpiar() {
        this.operacion = '';
        this.resultado = null;
        this.hayPuntoDespuesDeOperador = true;
        // limpiar estado de repetir '=' también
        this.lastOperator = null;
        this.lastOperand = null;
    }

    usarDelHistorial(valor) {
        this.operacion = valor.toString();
        this.hayPuntoDespuesDeOperador = !this.operacion.includes('.');
    }

    obtenerNumeroActual() {
        let ultimoIndiceOperador = -1;

        for (let i = 0; i < OPERADORES.length; i += 1) {
            const indice = this.operacion.lastIndexOf(OPERADORES[i]);
            if (indice > ultimoIndiceOperador) {
                ultimoIndiceOperador = indice;
            }
        }

        return this.operacion.slice(ultimoIndiceOperador + 1);
    }

    puedeAgregarDigito() {
        const numeroActual = this.obtenerNumeroActual();
        const cantidadDigitos = (numeroActual.match(/\d/g) || []).length;
        return cantidadDigitos < MAX_DIGITOS_NUMERO;
    }
}

const calculadora = new Calculadora();

// ============ UI: PANTALLA + HISTORIAL ============

function actualizarPantalla() {
    const pantallaOperacion = document.getElementById('pantalla-operacion');
    const pantallaResultado = document.getElementById('pantalla-resultado');

    pantallaOperacion.textContent = calculadora.operacion;
    pantallaResultado.classList.remove('resultado-vacio');

    if (calculadora.resultado !== null && calculadora.resultado !== undefined) {
        pantallaResultado.textContent = calculadora.resultado;
    } else if (calculadora.operacion === '') {
        pantallaResultado.textContent = 'Listo para calcular ✨';
        pantallaResultado.classList.add('resultado-vacio');
    } else {
        pantallaResultado.textContent = '';
    }
}

function crearEntradaHistorial(operacion) {
    const container = document.createElement('div');
    container.className = 'historial-entry';
    container.style.padding = '8px';
    container.style.margin = '4px 0';
    container.style.borderRadius = '4px';
    container.style.transition = 'background-color 0.2s';

    const text = document.createElement('div');
    text.className = 'history-item';
    text.style.flex = '1';
    text.style.cursor = 'pointer';
    text.textContent = operacion;
    text.title = 'Click para usar este resultado';

    text.addEventListener('click', () => {
        const partes = operacion.split(' = ');
        if (partes.length === 2) {
            calculadora.usarDelHistorial(partes[1]);
            actualizarPantalla();
        }
    });

    const star = document.createElement('span');
    star.className = 'fav-star';
    star.innerHTML = '&#9734;';
    star.style.marginLeft = '8px';

    // datos para identificar
    const parts = operacion.split(' = ');
    const expr = parts[0] || operacion;
    const result = parts[1] || '';
    star.dataset.expr = expr;
    star.dataset.result = result;

    const isFav = favorites.some(f => f.expr === expr && String(f.result) === String(result));
    if (isFav) star.classList.add('favorited');

    star.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavoriteEntry(expr, result);
        renderFavorites();
        mostrarHistorial();
    });

    container.addEventListener('mouseover', () => { container.style.backgroundColor = 'rgba(0, 255, 255, 0.2)'; });
    container.addEventListener('mouseout', () => { container.style.backgroundColor = 'transparent'; });

    container.appendChild(text);
    container.appendChild(star);
    return container;
}

function mostrarHistorial() {
    const historialDiv = document.getElementById('historial');
    historialDiv.innerHTML = '';

    calculadora.historial.slice().reverse().forEach((operacion) => {
        historialDiv.appendChild(crearEntradaHistorial(operacion));
    });
}

// Favoritos: load/save and render
function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAV_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        favorites = Array.isArray(parsed) ? parsed : [];
    } catch (e) { favorites = []; }
    if (favorites.length > MAX_FAVORITES) {
        favorites = favorites.slice(-MAX_FAVORITES);
        saveFavorites();
    }
}

function saveFavorites() {
    favorites = favorites.slice(-MAX_FAVORITES);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch (e) {}
}

function toggleFavoriteEntry(expr, result) {
    const idx = favorites.findIndex(f => f.expr === expr && String(f.result) === String(result));
    if (idx >= 0) {
        favorites.splice(idx, 1);
        showToast('Favorito eliminado');
    } else {
        pushWithFifoLimit(favorites, { expr, result, timestamp: Date.now() }, MAX_FAVORITES);
        showToast('Favorito guardado');
    }
    saveFavorites();
}

function renderFavorites() {
    const favDiv = document.getElementById('favorites');
    if (!favDiv) return;
    favDiv.innerHTML = '';
    favorites.forEach((f) => {
        const item = document.createElement('div');
        item.className = 'historial-entry';
        item.style.padding = '8px';
        item.style.margin = '4px 0';
        item.style.borderRadius = '4px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';

            const left = document.createElement('div');
            left.className = 'favorite-item';
            left.textContent = `${f.expr} = ${f.result}`;
            left.style.cursor = 'pointer';
            left.addEventListener('click', () => {
                calculadora.usarDelHistorial(f.result);
                actualizarPantalla();
            });

        const star = document.createElement('span');
        star.className = 'fav-star favorited';
        star.innerHTML = '&#9733;';
        star.addEventListener('click', () => {
            toggleFavoriteEntry(f.expr, f.result);
            renderFavorites();
            mostrarHistorial();
        });

        item.appendChild(left);
        item.appendChild(star);
        favDiv.appendChild(item);
    });
}

// ============ ANIMACIONES ============

const FX_CONFIG = {
    ENABLED: true,
    RATE_LIMIT: 250,
    SHOCKWAVE_RATE_LIMIT: 200,
    UFO_ENABLED: true,
    UFO_INTERVAL: 30000,
};

const FXSystem = {
    lastFxTime: 0,
    lastShockwaveTime: 0,
    fxLayer: null,
    shockwaveColors: ['#00ffff', '#ff00ff', '#00ff64', '#8b2db3'],
    effectTypes: ['fx-glow', 'fx-pulse', 'fx-stars', 'fx-nebula', 'fx-shimmer'],

    init() {
        if (!FX_CONFIG.ENABLED) return;

        this.fxLayer = document.getElementById('fx-layer');
        if (!this.fxLayer) return;

        this.attachNumericButtonListeners();
        this.attachAllButtonListeners();

        if (FX_CONFIG.UFO_ENABLED) {
            this.startPeriodicUFO();
        }
    },

    attachNumericButtonListeners() {
        document.querySelectorAll('button[data-numeric]').forEach((btn) => {
            btn.addEventListener('click', () => this.triggerEffect(btn));
        });
    },

    attachAllButtonListeners() {
        document.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', () => this.triggerShockwave(btn));
        });
    },

    triggerEffect(originElement = null) {
        const now = Date.now();
        if (now - this.lastFxTime < FX_CONFIG.RATE_LIMIT) return;
        this.lastFxTime = now;

        const effectType = this.effectTypes[Math.floor(Math.random() * this.effectTypes.length)];
        const fx = document.createElement('div');
        fx.className = `fx ${effectType}`;

        if (originElement) {
            const rect = originElement.getBoundingClientRect();
            fx.style.left = `${rect.left + rect.width / 2 + Math.random() * 60 - 30}px`;
            fx.style.top = `${rect.top + rect.height / 2 + Math.random() * 60 - 30}px`;
        } else {
            fx.style.left = `${Math.random() * window.innerWidth}px`;
            fx.style.top = `${Math.random() * window.innerHeight}px`;
        }

        this.fxLayer.appendChild(fx);
        fx.addEventListener('animationend', () => fx.remove(), { once: true });
    },

    triggerShockwave(buttonElement) {
        const now = Date.now();
        if (now - this.lastShockwaveTime < FX_CONFIG.SHOCKWAVE_RATE_LIMIT) return;
        this.lastShockwaveTime = now;

        const rect = buttonElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const color = this.shockwaveColors[Math.floor(Math.random() * this.shockwaveColors.length)];

        this.createShockwave(centerX, centerY, color);
        this.createStarburst(centerX, centerY, color);
    },

    // Permite disparar el shockwave/starburst en coordenadas arbitrarias.
    // Antes: el manejador de teclado solo llamaba a `triggerEffect()`
    // (que crea elementos con clases como `fx-glow`, `fx-pulse`, etc.),
    // pero NO disparaba el `shockwave`/`starburst` que se activa en
    // los clicks de ratón. Esa ausencia hacía que la animación con
    // teclado pareciera más pequeña/menos intensa.
    // Solución: reutilizar las mismas animaciones del click —las
    // clases `.shockwave` y las partículas— llamando a las mismas
    // funciones (`createShockwave`, `createStarburst`) desde aquí.
    // De este modo se mantiene la misma escala, opacidad, duración
    // y easing sin duplicar CSS ni tocar la animación del ratón.
    triggerShockwaveAt(x, y) {
        const now = Date.now();
        if (now - this.lastShockwaveTime < FX_CONFIG.SHOCKWAVE_RATE_LIMIT) return;
        this.lastShockwaveTime = now;

        const color = this.shockwaveColors[Math.floor(Math.random() * this.shockwaveColors.length)];
        this.createShockwave(x, y, color);
        this.createStarburst(x, y, color);
    },

    createShockwave(x, y, color) {
        const shockwave = document.createElement('div');
        shockwave.className = 'shockwave';
        shockwave.style.borderColor = color;
        shockwave.style.left = `${x - 50}px`;
        shockwave.style.top = `${y - 50}px`;
        shockwave.style.boxShadow = `0 0 30px ${color}, inset 0 0 30px ${color}`;

        this.fxLayer.appendChild(shockwave);
        shockwave.addEventListener('animationend', () => shockwave.remove(), { once: true });
    },

    createStarburst(x, y, color) {
        const particleCount = Math.floor(Math.random() * 7) + 8;
        const angleStep = 360 / particleCount;

        for (let i = 0; i < particleCount; i += 1) {
            const angle = (angleStep * i + Math.random() * 20 - 10) * (Math.PI / 180);
            const distance = 80 + Math.random() * 60;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;

            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.backgroundColor = color;
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.boxShadow = `0 0 8px ${color}`;
            this.fxLayer.appendChild(particle);

            this.animateParticle(particle, endX, endY);
        }
    },

    // RequestAnimationFrame mantiene la expansion suave del starburst.
    animateParticle(particle, endX, endY) {
        let startTime = null;
        const duration = 550;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            particle.style.transform = `translate(${endX * progress}px, ${endY * progress}px)`;
            particle.style.opacity = `${1 - progress}`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };

        requestAnimationFrame(animate);
    },

    startPeriodicUFO() {
        this.spawnUFO();
        setInterval(() => this.spawnUFO(), FX_CONFIG.UFO_INTERVAL);
    },

    spawnUFO() {
        const ufo = document.createElement('div');
        ufo.className = 'fx-ufo';

        if (Math.random() > 0.5) {
            ufo.style.top = '-100px';
            ufo.style.left = `${Math.random() * window.innerWidth}px`;
            ufo.classList.add('ufo-from-top');
        } else {
            ufo.style.left = '-100px';
            ufo.style.top = `${Math.random() * window.innerHeight}px`;
            ufo.classList.add('ufo-from-left');
        }

        this.fxLayer.appendChild(ufo);
        ufo.addEventListener('animationend', () => ufo.remove(), { once: true });
    },
};

const MouseTrail = {
    lastX: 0,
    lastY: 0,
    threshold: 8,
    fxLayer: null,

    init() {
        this.fxLayer = document.getElementById('fx-layer');
        if (!this.fxLayer) return;

        document.addEventListener('mousemove', (event) => {
            const dx = event.clientX - this.lastX;
            const dy = event.clientY - this.lastY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.threshold) {
                this.createStar(event.clientX, event.clientY);
                this.lastX = event.clientX;
                this.lastY = event.clientY;
            }
        });
    },

    createStar(x, y) {
        const star = document.createElement('div');
        star.className = 'mouse-star';
        star.textContent = '\u2605';
        star.style.left = `${x - 6}px`;
        star.style.top = `${y - 6}px`;
        star.style.position = 'fixed';
        star.style.pointerEvents = 'none';
        star.style.zIndex = '0';
        star.style.fontSize = '14px';
        star.style.fontWeight = 'bold';
        star.style.color = '#00ffff';
        star.style.textShadow = '0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(255,0,255,0.6)';

        this.fxLayer.appendChild(star);

        const startTime = Date.now();
        const duration = 500;

        const animate = () => {
            const progress = Math.min((Date.now() - startTime) / duration, 1);
            star.style.opacity = `${1 - progress}`;
            star.style.transform = `translateY(${-30 * progress}px)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                star.remove();
            }
        };

        requestAnimationFrame(animate);
    },
};

// ============ EVENTOS ============

function manejarTeclado(event) {
    const tecla = event.key;

    if (!isNaN(tecla) || tecla === '.') {
        SoundManager.playTap();
        calculadora.agregarNumero(tecla);
        FXSystem.triggerEffect();

        // Si la tecla es un dígito numérico, además disparamos el
        // shockwave y starburst en una posición aleatoria para igualar
        // la intensidad/escala/duración del click del ratón.
        if (/^[0-9]$/.test(tecla)) {
            const randX = Math.random() * window.innerWidth;
            const randY = Math.random() * window.innerHeight;
            FXSystem.triggerShockwaveAt(randX, randY);
            maybeShowNumericToast();
        }
    } else if (tecla === '+') {
        SoundManager.playTap();
        calculadora.agregarOperador('+');
    } else if (tecla === '-') {
        SoundManager.playTap();
        calculadora.agregarOperador('-');
    } else if (tecla === '*') {
        SoundManager.playTap();
        calculadora.agregarOperador('*');
    } else if (tecla === '/') {
        event.preventDefault();
        SoundManager.playTap();
        calculadora.agregarOperador('/');
    } else if (tecla === 'Enter') {
        event.preventDefault();
        calculadora.calcular();
        showToast(getRandomPhrase());

        const result = calculadora.resultado;
        const hasError = result === 'Error' || !Number.isFinite(Number(result));
        if (hasError) {
            SoundManager.playError();
        } else {
            SoundManager.playSuccess();
        }
    } else if (tecla === 'Backspace') {
        event.preventDefault();
        SoundManager.playTap();
        calculadora.backspace();
    } else if (tecla === 'Escape') {
        SoundManager.playTap();
        calculadora.limpiar();
    }

    actualizarPantalla();
    mostrarHistorial();
}

function inicializar() {
    ThemeManager.init();
    SoundManager.init();
    actualizarPantalla();
    FXSystem.init();
    MouseTrail.init();
    setupToastTriggers();
    setupSoundTriggers();
    document.addEventListener('keydown', manejarTeclado);

    // Inicializar memoria UI
    const mc = document.getElementById('mc');
    const mr = document.getElementById('mr');
    const mp = document.getElementById('mp');
    const mm = document.getElementById('mm');
    const memInd = document.getElementById('memory-indicator');

    function isValidDisplayNumber() {
        const pantalla = document.getElementById('pantalla-resultado');
        if (!pantalla) return false;
        const txt = pantalla.textContent;
        if (!txt || txt === 'Listo para calcular ✨' || txt === 'Error') return false;
        const n = parseFloat(txt);
        return !Number.isNaN(n) && Number.isFinite(n);
    }

    function updateMemoryIndicator() {
        if (!memInd) return;
        memInd.style.display = (memoryValue !== 0) ? 'flex' : 'none';
    }

    if (mc) mc.addEventListener('click', () => {
        memoryValue = 0; updateMemoryIndicator(); showToast('Memoria borrada');
    });
    if (mr) mr.addEventListener('click', () => {
        if (!isValidDisplayNumber()) {
            showToast('No hay valor válido');
            return;
        }
        // mostrar memoryValue en pantalla (sin añadir al historial)
        calculadora.operacion = String(memoryValue);
        calculadora.hayPuntoDespuesDeOperador = !String(memoryValue).includes('.');
        actualizarPantalla();
    });
    if (mp) mp.addEventListener('click', () => {
        if (!isValidDisplayNumber()) { showToast('No hay valor válido'); return; }
        const val = parseFloat(document.getElementById('pantalla-resultado').textContent);
        memoryValue += val;
        updateMemoryIndicator();
        showToast(`Memoria: +${val}`);
    });
    if (mm) mm.addEventListener('click', () => {
        if (!isValidDisplayNumber()) { showToast('No hay valor válido'); return; }
        const val = parseFloat(document.getElementById('pantalla-resultado').textContent);
        memoryValue -= val;
        updateMemoryIndicator();
        showToast(`Memoria: -${val}`);
    });

    updateMemoryIndicator();

    // Favoritos inicial
    loadFavorites();
    renderFavorites();

    // pestañas historial/favoritos
    const tabHistory = document.getElementById('tab-history');
    const tabFavs = document.getElementById('tab-favs');
    const histDiv = document.getElementById('historial');
    const favDiv = document.getElementById('favorites');
    if (tabHistory && tabFavs) {
        tabHistory.addEventListener('click', () => { tabHistory.classList.add('active'); tabFavs.classList.remove('active'); if(histDiv) histDiv.style.display='block'; if(favDiv) favDiv.style.display='none'; });
        tabFavs.addEventListener('click', () => { tabFavs.classList.add('active'); tabHistory.classList.remove('active'); if(histDiv) histDiv.style.display='none'; if(favDiv) favDiv.style.display='block'; });
    }

    // Help overlay
    const helpBtn = document.getElementById('help-shortcut');
    const helpOverlay = document.getElementById('help-overlay');
    const helpClose = document.getElementById('help-close');

    function openHelp() {
        if (!helpOverlay) return;
        helpOverlay.classList.add('visible');
        helpOverlay.setAttribute('aria-hidden', 'false');
        if (helpClose) helpClose.focus();
    }
    function closeHelp() {
        if (!helpOverlay) return;
        helpOverlay.classList.remove('visible');
        helpOverlay.setAttribute('aria-hidden', 'true');
    }

    if (helpBtn) helpBtn.addEventListener('click', openHelp);
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    if (helpOverlay) {
        helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) closeHelp(); });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeHelp(); } });

    // ensure historial rendered initially
    mostrarHistorial();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}

window.calculadora = calculadora;
window.actualizarPantalla = actualizarPantalla;
window.mostrarHistorial = mostrarHistorial;
window.showToast = showToast;
window.getRandomPhrase = getRandomPhrase;
