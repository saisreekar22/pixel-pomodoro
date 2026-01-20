/**
 * PIXEL INCUBATOR - Core Logic
 * Theme: Retro Handheld Console
 */

/* --- CONFIG & ASSETS --- */
const ASSETS = {
    pets: ['cat', 'dog', 'slime', 'ghost', 'dino'],
    accessories: ['crown', 'headphones', 'glasses', 'hat', 'scarf'], // Filenames must match `acc_X.png`
    bg: ['grass', 'space', 'cloud', 'desert', 'forest']
};

const AUDIO = {
    tracks: [
        { name: 'White Noise', src: 'assets/audio/track_white_noise.mp3' },
        { name: 'Lofi Beats', src: 'assets/audio/track_lofi_beats.mp3' },
        { name: 'Rain Sounds', src: 'assets/audio/track_rain.mp3' }
    ]
};

const STATE = {
    timer: {
        active: false,
        startTime: null,
        durationMs: 25 * 60 * 1000,
        originalMinutes: 25
    },
    dex: [], // Array of collected pets
    view: 'home', // 'home', 'dex'
    dna: null, // Current incubating DNA

    // Audio State
    audio: {
        currentTrackIdx: 0,
        isPlaying: false,
        isMuted: false,
        element: new Audio()
    }
};

/* --- DOM --- */
const DOM = {
    screen: document.getElementById('lcd-screen'),
    bg: document.getElementById('lcd-bg'),
    canvas: document.getElementById('pet-canvas'),
    ctx: document.getElementById('pet-canvas').getContext('2d', { willReadFrequently: true }),
    timerDisp: document.getElementById('timer-display'),
    led: document.getElementById('power-led'),

    // NEW Controls
    slider: document.getElementById('time-slider'),
    timeVal: document.getElementById('time-val'),
    btnStart: document.getElementById('btn-start'),
    btnDex: document.getElementById('btn-dex'),

    // Music Controls
    musicIndicator: document.getElementById('music-indicator'),
    trackName: document.getElementById('track-name'),
    btnPrev: document.getElementById('btn-music-prev'),
    btnPlay: document.getElementById('btn-music-play'),
    btnNext: document.getElementById('btn-music-next'),
    btnMute: document.getElementById('btn-music-mute'),
    iconPlay: document.getElementById('icon-play'),
    iconPause: document.getElementById('icon-pause'),
    iconSound: document.getElementById('icon-sound'),
    iconMute: document.getElementById('icon-mute'),

    // UI Panels
    dexView: document.getElementById('view-dex'),
    dexGrid: document.getElementById('dex-grid'),
    closeDex: document.getElementById('close-dex'),

    modal: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalMsg: document.getElementById('modal-msg'),
    modalBtn: document.getElementById('modal-btn')
};

// Disable Smooth Smoothing for that Crisp Pixel Look
DOM.ctx.imageSmoothingEnabled = false;

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    setupControls();
    gameLoop();
    renderStage(); // Draw initial egg or idle state
});

function setupControls() {
    // Slider Logic
    DOM.slider.addEventListener('input', (e) => {
        const minutes = parseInt(e.target.value);
        DOM.timeVal.innerText = minutes;
        if (!STATE.timer.active) {
            updateTimerDisplay(minutes * 60 * 1000);
        }
    });

    // START / CANCEL Button Logic
    DOM.btnStart.addEventListener('click', () => {
        if (STATE.timer.active) {
            // Cancel
            stopTimer();
            DOM.btnStart.innerText = "START";
            DOM.btnStart.classList.remove('bg-red-500');
            DOM.btnStart.classList.add('bg-brand-accent');
        } else {
            // Start
            const mins = parseInt(DOM.slider.value);
            startTimer(mins);
            DOM.btnStart.innerText = "STOP";
            DOM.btnStart.classList.remove('bg-brand-accent');
            DOM.btnStart.classList.add('bg-red-500');
        }
    });

    // COLLECTION Button
    DOM.btnDex.addEventListener('click', () => {
        toggleDex();
    });

    // Modal Action
    DOM.modalBtn.addEventListener('click', () => {
        DOM.modal.classList.add('hidden');
    });

    DOM.closeDex.addEventListener('click', toggleDex);

    // --- MUSIC EVENTS ---
    initAudio();

    DOM.btnPlay.addEventListener('click', toggleMusic);
    DOM.btnPrev.addEventListener('click', () => changeTrack(-1));
    DOM.btnNext.addEventListener('click', () => changeTrack(1));
    DOM.btnMute.addEventListener('click', toggleMute);
    STATE.audio.element.addEventListener('ended', () => changeTrack(1)); // Auto next
}

function updateTimerDisplay(ms) {
    const sec = Math.ceil(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    DOM.timerDisp.innerText = `${m}:${s.toString().padStart(2, '0')}`;
}

/* --- GAME LOOP (Animation & Timer) --- */
function gameLoop() {
    if (STATE.timer.active) {
        const now = Date.now();
        const elapsed = now - STATE.timer.startTime;
        const remaining = STATE.timer.durationMs - elapsed;

        if (remaining <= 0) {
            updateTimerDisplay(0);
            hatchEgg();
        } else {
            updateTimerDisplay(remaining);

            // Blink LED
            DOM.led.style.backgroundColor = (Math.floor(now / 500) % 2 === 0) ? '#ff5d5d' : '#550000';

            // Animate Egg (Wobble)
            const wobble = Math.sin(now / 100) * 3;
            DOM.canvas.style.transform = `rotate(${wobble}deg)`;
        }
    } else {
        DOM.led.style.backgroundColor = '#550000'; // Dim
        DOM.canvas.style.transform = 'rotate(0deg)';
        // DOM.timerDisp.innerText = "READY"; // Or keep showing slider val
    }

    requestAnimationFrame(gameLoop);
}

/* --- LOGIC: TIMER --- */
function startTimer(minutes) {
    STATE.timer.active = true;
    STATE.timer.durationMs = minutes * 60 * 1000;
    // For Debugging: Uncomment to speed up
    // STATE.timer.durationMs = 5000;
    STATE.timer.startTime = Date.now();
    STATE.timer.originalMinutes = minutes;

    // Draw Egg
    drawSprite('assets/egg_base.png');
    saveState();
}

function stopTimer() {
    STATE.timer.active = false;
    saveState();
    renderStage(); // Reset to idle

    // Reset Button UI just in case
    DOM.btnStart.innerText = "START";
    DOM.btnStart.classList.remove('bg-red-500');
    DOM.btnStart.classList.add('bg-brand-accent');
}

async function hatchEgg() {
    stopTimer();

    // 1. Crack Animation
    await drawSprite('assets/egg_cracked.png');

    // 2. Generate DNA
    const pet = generatePet();

    // 3. Show Modal
    setTimeout(() => {
        // Draw the pet on canvas so we can see it
        renderPetToCanvas(pet);

        DOM.modalTitle.innerText = "HATCHED!";
        DOM.modalMsg.innerHTML = `You discovered a <br/><span class="text-brand-accent uppercase font-bold">${pet.colorName} ${pet.species}</span>!`;
        DOM.modal.classList.remove('hidden');

        // Add to collection
        addToDex(pet);
    }, 1000);
}

/* --- PET ENGINE (Updated with Transparency Fix) --- */
function generatePet() {
    const species = ASSETS.pets[Math.floor(Math.random() * ASSETS.pets.length)];
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    const bg = ASSETS.bg[Math.floor(Math.random() * ASSETS.bg.length)];

    // 30% Chance of Accessory
    const hasAcc = Math.random() > 0.7;
    const acc = hasAcc ? ASSETS.accessories[Math.floor(Math.random() * ASSETS.accessories.length)] : null;

    return {
        id: Date.now(),
        species,
        colorHex: palette.hex,
        colorName: palette.name,
        accessory: acc,
        bg,
        date: new Date().toLocaleDateString()
    };
}

// THE KEY FUNCTION: Procedural Tinting
function renderPetToCanvas(pet) {
    const ctx = DOM.ctx;
    const img = new Image();
    img.src = `assets/pet_${pet.species}.png`;

    img.onload = () => {
        ctx.clearRect(0, 0, 32, 32);
        ctx.drawImage(img, 0, 0, 32, 32);

        // Tinting Logic (Replace White with Color)
        const frame = ctx.getImageData(0, 0, 32, 32);
        const d = frame.data;

        // Convert hex to rgb
        const r = parseInt(pet.colorHex.slice(1, 3), 16);
        const g = parseInt(pet.colorHex.slice(3, 5), 16);
        const b = parseInt(pet.colorHex.slice(5, 7), 16);

        for (let i = 0; i < d.length; i += 4) {
            // Skip transparent pixels
            if (d[i + 3] === 0) continue;

            // Check if pixel is whiteish (The body)
            // Note: Since we have outlines (black), we only want to tint the light parts.
            // Also need to be careful not to tint the "transparent" parts (handled above)
            if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) {
                d[i] = r;
                d[i + 1] = g;
                d[i + 2] = b;
                // keep alpha d[i+3]
            }
        }
        ctx.putImageData(frame, 0, 0);

        // Draw Accessory on top if exists
        if (pet.accessory) {
            const accImg = new Image();
            accImg.src = `assets/acc_${pet.accessory}.png`;
            accImg.onload = () => {
                ctx.drawImage(accImg, 0, 0, 32, 32);
            };
        }

        // Update BG
        DOM.bg.style.backgroundImage = `url('assets/bg_${pet.bg}.png')`;
    };
}

function drawSprite(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            DOM.ctx.clearRect(0, 0, 32, 32);
            DOM.ctx.drawImage(img, 0, 0, 32, 32);
            resolve();
        };
    });
}

function renderStage() {
    if (!STATE.timer.active) {
        // Idle Animation (Just show the last pet or a random egg?)
        drawSprite('assets/egg_base.png');
    }
}

/* --- DEX (Inventory) --- */
function addToDex(pet) {
    STATE.dex.unshift(pet);
    saveState();
    renderDex();
}

function toggleDex() {
    DOM.dexView.classList.toggle('hidden');
    if (!DOM.dexView.classList.contains('hidden')) {
        renderDex();
    }
}

function renderDex() {
    DOM.dexGrid.innerHTML = '';
    STATE.dex.forEach(pet => {
        const card = document.createElement('div');
        card.className = "bg-white/80 p-2 rounded border-2 border-brand-text/10 flex flex-col items-center gap-1";

        // Mini Canvas for the Dex Item
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 32;
        miniCanvas.height = 32;
        miniCanvas.className = "w-16 h-16 pixelated";
        card.appendChild(miniCanvas);

        // Reuse our render logic for the mini canvas
        // (We need to adapt `renderPetToCanvas` to accept a target context, 
        // to avoid duplicating logic. For now, inline simplified version)

        const ctx = miniCanvas.getContext('2d');
        const img = new Image();
        img.src = `assets/pet_${pet.species}.png`;
        img.onload = () => {
            ctx.drawImage(img, 0, 0, 32, 32);
            const frame = ctx.getImageData(0, 0, 32, 32);
            const d = frame.data;
            const r = parseInt(pet.colorHex.slice(1, 3), 16);
            const g = parseInt(pet.colorHex.slice(3, 5), 16);
            const b = parseInt(pet.colorHex.slice(5, 7), 16);
            for (let i = 0; i < d.length; i += 4) {
                if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) {
                    d[i] = r; d[i + 1] = g; d[i + 2] = b;
                }
            }
            ctx.putImageData(frame, 0, 0);
            if (pet.accessory) {
                const accImg = new Image();
                accImg.src = `assets/acc_${pet.accessory}.png`;
                accImg.onload = () => ctx.drawImage(accImg, 0, 0, 32, 32);
            }
        };

        const lbl = document.createElement('span');
        lbl.className = "text-[0.5rem] font-pixel text-brand-text truncate w-full text-center";
        lbl.innerText = pet.species;
        card.appendChild(lbl);

        DOM.dexGrid.appendChild(card);
    });
}

function saveState() {
    localStorage.setItem('pixelIncubatorState', JSON.stringify({
        dex: STATE.dex,
        // timer state if needed
    }));
}

function loadState() {
    const saved = localStorage.getItem('pixelIncubatorState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.dex) STATE.dex = parsed.dex;
        } catch (e) { console.log(e); }
    }
}
/* --- AUDIO LOGIC --- */
function initAudio() {
    // Set initial track
    const track = AUDIO.tracks[STATE.audio.currentTrackIdx];
    STATE.audio.element.src = track.src;
    STATE.audio.element.loop = true; // Optional: loop single track or auto-next using 'ended' event
    updateAudioUI();
}

function toggleMusic() {
    if (STATE.audio.isPlaying) {
        STATE.audio.element.pause();
        STATE.audio.isPlaying = false;
    } else {
        STATE.audio.element.play().catch(e => console.log("Audio play failed (user interaction needed):", e));
        STATE.audio.isPlaying = true;
    }
    updateAudioUI();
}

function changeTrack(direction) {
    STATE.audio.currentTrackIdx += direction;
    // Wrap around
    if (STATE.audio.currentTrackIdx < 0) STATE.audio.currentTrackIdx = AUDIO.tracks.length - 1;
    if (STATE.audio.currentTrackIdx >= AUDIO.tracks.length) STATE.audio.currentTrackIdx = 0;

    const track = AUDIO.tracks[STATE.audio.currentTrackIdx];
    STATE.audio.element.src = track.src;
    STATE.audio.element.loop = true; // Ensure loop persists

    if (STATE.audio.isPlaying) {
        STATE.audio.element.play();
    }
    updateAudioUI();
}

function toggleMute() {
    STATE.audio.isMuted = !STATE.audio.isMuted;
    STATE.audio.element.muted = STATE.audio.isMuted;
    updateAudioUI();
}

function updateAudioUI() {
    const track = AUDIO.tracks[STATE.audio.currentTrackIdx];
    DOM.trackName.innerText = track.name.toUpperCase();

    // Play/Pause Icon
    if (STATE.audio.isPlaying) {
        DOM.iconPlay.classList.add('hidden');
        DOM.iconPause.classList.remove('hidden');
        DOM.musicIndicator.classList.add('bg-brand-accent', 'animate-pulse');
        DOM.musicIndicator.classList.remove('bg-brand-text/20');
    } else {
        DOM.iconPlay.classList.remove('hidden');
        DOM.iconPause.classList.add('hidden');
        DOM.musicIndicator.classList.remove('bg-brand-accent', 'animate-pulse');
        DOM.musicIndicator.classList.add('bg-brand-text/20');
    }

    // Mute Icon
    if (STATE.audio.isMuted) {
        DOM.iconSound.classList.add('hidden');
        DOM.iconMute.classList.remove('hidden');
    } else {
        DOM.iconSound.classList.remove('hidden');
        DOM.iconMute.classList.add('hidden');
    }
}
