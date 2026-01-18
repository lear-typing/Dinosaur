
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CONSTANTS ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GROUND_Y = 320;
const DINO_WIDTH = 44;
const DINO_HEIGHT = 47;
const DINO_START_X = 50;
const GRAVITY = 0.45; // Reduced from 0.6 for floatier feel
const BASE_JUMP_FORCE = -13; // Reduced from -15 to balance lower gravity
const BASE_SPEED = 4;
const SPEED_ACCELERATION = 0.0005; // Reduced from 0.001 for smoother ramp
const WIND_FORCE = 0.05; // For lerping speed

// Adjust canvas resolution
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// --- STATE MANAGEMENT ---
let difficultySpeed = BASE_SPEED;
let gameSpeed = BASE_SPEED;
let score = 0;
let coinsCollected = 0;
let isGameOver = false;
let isPlaying = false;
let frameCount = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;

// Weather State
const WEATHER_TYPES = {
    CLEAR: 'Clear',
    WINDY: 'Windy',
    RAINY: 'Rainy'
};
let currentWeather = WEATHER_TYPES.CLEAR;
let weatherTimer = 0;
let windDirection = 0; // -1 (Headwind), 1 (Tailwind)

// Inputs
const keys = {
    Space: false,
    ArrowUp: false,
    ArrowDown: false
};

// --- ASSETS & DRAWING HELPERS ---

function drawDino(ctx, x, y, w, h, isDucking) {
    ctx.fillStyle = '#00ff88';

    if (isDucking) {
        // --- DUCKING DINO (Green V2 + Clipping Fix) ---
        // Body (Lowered, height 15)
        ctx.fillRect(x, y + 10, 50, 15);
        // Tail
        ctx.fillRect(x - 15, y + 12, 15, 8);
        // Head (Lowered, forward)
        ctx.fillRect(x + 50, y + 5, 25, 15);
        // Snout
        ctx.fillRect(x + 70, y + 8, 15, 8);

        // Eye (White with pupil)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 58, y + 8, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 62, y + 8, 2, 6); // Pupil

        // Legs (Bottom at y+31)
        ctx.fillStyle = '#00cc6a';
        ctx.fillRect(x + 10, y + 25, 10, 6);
        ctx.fillRect(x + 30, y + 25, 10, 6);

    } else {
        // --- STANDING DINO (Green V2 + Clipping Fix) ---
        // Main Body
        ctx.fillRect(x, y + 18, 35, 20);
        // Neck
        ctx.fillRect(x + 15, y + 10, 15, 15);
        // Head (Big & Cute)
        ctx.fillRect(x + 15, y - 5, 30, 25);
        // Snout
        ctx.fillRect(x + 45, y + 5, 12, 12);
        // Tail
        ctx.fillRect(x - 12, y + 20, 12, 10);
        ctx.fillRect(x - 18, y + 15, 8, 8); // Tip

        // Arms
        ctx.fillStyle = '#00cc6a';
        ctx.fillRect(x + 38, y + 25, 8, 4);

        // Legs (Bottom at y+47)
        ctx.fillStyle = '#00cc6a';
        ctx.fillRect(x + 5, y + 38, 10, 9);
        ctx.fillRect(x + 22, y + 38, 10, 9);

        // Eye (Anime Style)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 28, y, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 34, y + 2, 4, 8); // Pupil
    }
}

function drawCactus(ctx, x, y, w, h) {
    ctx.fillStyle = '#ff0055'; // Neon Red/Pink
    ctx.fillRect(x, y, w, h);
    // Arms
    ctx.fillRect(x - 5, y + 10, 5, 10);
    ctx.fillRect(x + w, y + 5, 5, 10);
}

function drawPterodactyl(ctx, x, y, w, h, frame) {
    // Better Bird Shape
    const flapState = Math.floor(frame / 8) % 2; // 0: Up, 1: Down

    // Colors
    const bodyColor = '#ff9900';
    const wingColor = '#ffb347';
    const darkColor = '#cc7a00';

    ctx.fillStyle = bodyColor;

    // Body (Aerodynamic)
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 20, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(x + 40, y + 15, 8, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(x + 45, y + 15);
    ctx.lineTo(x + 60, y + 20);
    ctx.lineTo(x + 45, y + 22);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 42, y + 13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + 43, y + 13, 1, 0, Math.PI * 2);
    ctx.fill();

    // WINGS
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    if (flapState === 0) {
        // Wings UP
        ctx.moveTo(x + 25, y + 15); // Shoulder
        ctx.quadraticCurveTo(x + 10, y - 10, x - 5, y + 5); // Tip
        ctx.lineTo(x + 15, y + 15);
    } else {
        // Wings DOWN
        ctx.moveTo(x + 25, y + 18); // Shoulder
        ctx.quadraticCurveTo(x + 10, y + 40, x - 5, y + 25); // Tip
        ctx.lineTo(x + 15, y + 22);
    }
    ctx.fill();
}

function drawPit(ctx, x, y, w, h) {
    // Pit shows background
    // We handle this by clearing the rect in the main draw loop
}

function drawCoin(ctx, x, y, size, frame) {
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Spin effect
    const width = size * Math.abs(Math.sin(frame * 0.1));
    const xOffset = (size - width) / 2;

    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size / 2, width / 2, size / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '10px Arial';
    if (width > 5) ctx.fillText('$', x + size / 2, y + size / 2 + 4);
}

// --- CLASSES ---

class Dino {
    constructor() {
        this.x = DINO_START_X;
        this.y = GROUND_Y - DINO_HEIGHT;
        this.w = DINO_WIDTH;
        this.h = DINO_HEIGHT;
        this.vy = 0;
        this.isGrounded = true;
        this.isDucking = false;
        this.originalH = DINO_HEIGHT;
    }

    update(obstacles) {
        // Handle Weather Effects
        let currentJumpForce = BASE_JUMP_FORCE;
        if (currentWeather === WEATHER_TYPES.RAINY) {
            currentJumpForce = BASE_JUMP_FORCE * 0.85; // Slight reduction for warning
        }

        // INPUTS
        if ((keys['Space'] || keys['ArrowUp']) && this.isGrounded) {
            this.vy = currentJumpForce;
            this.isGrounded = false;
        }

        if (keys['ArrowDown']) {
            this.isDucking = true;
            this.h = this.originalH / 1.5;
            this.y += (this.originalH - this.h); // Push down instantly
        } else {
            this.isDucking = false;
            this.h = this.originalH; // Restore
        }

        // GRAVITY
        this.vy += GRAVITY;
        this.y += this.vy;

        // GROUND / PIT COLLISION
        let onGround = false;

        // check if over a pit
        let overPit = false;
        for (let obs of obstacles) {
            if (obs.type === 'pit') {
                // Check if dino's center is within pit
                const dinoCenter = this.x + this.w / 2;
                if (dinoCenter > obs.x && dinoCenter < obs.x + obs.w) {
                    overPit = true;
                }
            }
        }

        if (!overPit) {
            if (this.y + this.h >= GROUND_Y) {
                this.y = GROUND_Y - this.h;
                this.vy = 0;
                this.isGrounded = true;
                onGround = true;
            }
        } else {
            // Over pit, force gravity even if previously grounded
            this.isGrounded = false;
        }

        // Ceiling check
        if (this.y < 0) {
            this.y = 0;
            this.vy = 0;
        }

        // Fall off screen -> Game Over
        if (this.y > GAME_HEIGHT) {
            return true; // Died
        }
        return false;
    }

    draw() {
        drawDino(ctx, this.x, this.y, this.w, this.h, this.isDucking);
    }
}

class Obstacle {
    constructor(type, speed) {
        this.type = type;
        this.markedForDeletion = false;
        this.x = GAME_WIDTH + 100; // Spawn off screen

        if (type === 'cactus') {
            this.w = 30 + Math.random() * 20;
            this.h = 40 + Math.random() * 30;
            this.y = GROUND_Y - this.h;
        } else if (type === 'pterodactyl') {
            this.w = 50;
            this.h = 30;
            const heights = [GROUND_Y - 50, GROUND_Y - 90, GROUND_Y - 130];
            this.y = heights[Math.floor(Math.random() * heights.length)];
        } else if (type === 'pit') {
            this.w = 80 + Math.random() * 40;
            this.h = GAME_HEIGHT - GROUND_Y;
            this.y = GROUND_Y;
        }
    }

    update(speed) {
        let actualSpeed = speed;
        // Pterodactyls fly slightly faster/different relative speed?
        // Let's keep them synchronous with ground for readable gameplay, 
        // maybe later add independent speed.
        this.x -= actualSpeed;
        if (this.x + this.w < 0) this.markedForDeletion = true;
    }

    draw() {
        if (this.type === 'cactus') drawCactus(ctx, this.x, this.y, this.w, this.h);
        else if (this.type === 'pterodactyl') drawPterodactyl(ctx, this.x, this.y, this.w, this.h, frameCount);
        else if (this.type === 'pit') drawPit(ctx, this.x, this.y, this.w, this.h);
    }
}

class Coin {
    constructor(speed) {
        this.size = 30;
        this.x = GAME_WIDTH + Math.random() * 200;
        this.y = GROUND_Y - 50 - Math.random() * 150;
        this.markedForDeletion = false;
        this.collected = false;
    }

    update(speed) {
        this.x -= speed;
        if (this.x + this.size < 0) this.markedForDeletion = true;
    }

    draw() {
        if (this.collected) return;
        drawCoin(ctx, this.x, this.y, this.size, frameCount);
    }
}

class Particle {
    constructor(type) {
        this.x = Math.random() * GAME_WIDTH;
        this.y = Math.random() * GAME_HEIGHT;
        this.type = type; // 'rain'
        this.markedForDeletion = false;
        this.speedY = 5 + Math.random() * 5;
        this.speedX = -2 + Math.random() * 1;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;

        if (this.type === 'rain') {
            if (this.y > GAME_HEIGHT) {
                this.y = -10;
                this.x = Math.random() * GAME_WIDTH;
            }
        }
    }

    draw() {
        ctx.fillStyle = 'rgba(174, 194, 224, 0.6)';
        ctx.fillRect(this.x, this.y, 2, 8);
    }
}

class Cloud {
    constructor() {
        this.x = GAME_WIDTH + Math.random() * 200;
        this.y = Math.random() * (GAME_HEIGHT / 2); // Top half only
        this.w = 60 + Math.random() * 40;
        this.h = 30 + Math.random() * 20;
        this.speed = 0.5 + Math.random() * 1; // Parallax effect (slower than game)
        this.markedForDeletion = false;

        // Random shapes (3 circles)
        this.parts = [
            { rx: 0, ry: 0, r: this.h / 2 },
            { rx: this.w * 0.3, ry: -this.h * 0.2, r: this.h * 0.6 },
            { rx: this.w * 0.6, ry: this.h * 0.1, r: this.h * 0.4 }
        ];
    }

    update() {
        this.x -= this.speed; // Independent speed from gameSpeed? 
        // Or should they move with gameSpeed but slower (parallax)?
        // If "gameSpeed" works, they move relative to camera. 
        // Usually clouds move slowly even if you stand still, 
        // but when running, they move faster.
        // Let's make them move at factor of gameSpeed.
        this.x -= gameSpeed * 0.2;

        if (this.x + this.w < -100) this.markedForDeletion = true;
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.parts.forEach(p => {
            ctx.beginPath();
            ctx.arc(this.x + p.rx, this.y + p.ry, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}



class Tree {
    constructor() {
        this.x = GAME_WIDTH + Math.random() * 200;
        this.w = 20 + Math.random() * 10;
        this.h = 40 + Math.random() * 30;
        this.y = GROUND_Y - this.h; // Plant exactly on ground
        this.speedFactor = 0.5;
        this.markedForDeletion = false;
    }

    update(baseSpeed) {
        this.x -= baseSpeed * this.speedFactor;
        if (this.x + this.w < -100) this.markedForDeletion = true;
    }

    draw() {
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(this.x + this.w / 3, this.y + this.h / 2, this.w / 3, this.h / 2);
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y);
        ctx.lineTo(this.x, this.y + this.h / 2 + 10);
        ctx.lineTo(this.x + this.w, this.y + this.h / 2 + 10);
        ctx.fill();
    }
}

class GroundDetail {
    constructor() {
        this.x = GAME_WIDTH + Math.random() * 50;
        this.y = GROUND_Y + Math.random() * (GAME_HEIGHT - GROUND_Y);
        this.w = 2 + Math.random() * 3;
        this.h = 2;
        this.markedForDeletion = false;
        this.color = Math.random() > 0.5 ? '#999' : '#888'; // Grey specs
    }
    update(speed) {
        this.x -= speed;
        if (this.x < -10) this.markedForDeletion = true;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

// --- GAME INSTANCES ---
let dino;
let obstacles = [];
let coins = [];
let particles = [];
let clouds = [];
let trees = [];
let groundDetails = [];
let obstacleTimer = 0;
let nextObstacleDistance = 0;
let distanceSinceLastSpawn = 0;
let coinTimer = 0;
let cloudTimer = 0;
let treeTimer = 0;
let groundTimer = 0;

// --- GAME LOOP ---
function start() {
    isPlaying = true;
    isGameOver = false;
    score = 0;
    coinsCollected = 0;
    difficultySpeed = BASE_SPEED;
    gameSpeed = BASE_SPEED;
    frameCount = 0;

    dino = new Dino();
    obstacles = [];
    coins = [];
    particles = [];
    clouds = [];
    trees = [];
    groundDetails = [];

    // Initial Environment
    for (let i = 0; i < 3; i++) clouds.push(new Cloud());
    for (let i = 0; i < 5; i++) trees.push(new Tree());
    for (let i = 0; i < 20; i++) { // Pre-seed ground
        let g = new GroundDetail();
        g.x = Math.random() * GAME_WIDTH;
        groundDetails.push(g);
    }

    currentWeather = WEATHER_TYPES.CLEAR;
    weatherTimer = 0;

    // UI Updates
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    updateWeatherUI();

    animate();
}

function updateWeatherUI() {
    const el = document.getElementById('weather-indicator');
    let text = '☀️ Clear';
    if (currentWeather === WEATHER_TYPES.WINDY) text = (windDirection > 0 ? '💨 Tailwind' : '🌬️ Headwind');
    else if (currentWeather === WEATHER_TYPES.RAINY) text = '🌧️ Rain';

    el.innerText = text;

    const warningEl = document.getElementById('rain-warning');
    if (currentWeather === WEATHER_TYPES.RAINY) {
        warningEl.classList.remove('hidden');
    } else {
        warningEl.classList.add('hidden');
    }
}

function handleWeather() {
    weatherTimer++;
    if (weatherTimer > 600) {
        weatherTimer = 0;
        const rand = Math.random();
        if (rand < 0.5) currentWeather = WEATHER_TYPES.CLEAR;
        else if (rand < 0.75) {
            currentWeather = WEATHER_TYPES.WINDY;
            windDirection = Math.random() > 0.5 ? 1 : -1;
        }
        else currentWeather = WEATHER_TYPES.RAINY;

        updateWeatherUI();
    }

    // Rain Particles
    if (currentWeather === WEATHER_TYPES.RAINY) {
        if (particles.length < 100) {
            particles.push(new Particle('rain'));
        }
    } else {
        particles = [];
    }
    particles.forEach(p => p.update());
}

function setNextObstacleDistance() {
    // Logic:
    // Min safe gap needs to increase with speed (jump parabola is wider)
    // Approx jump duration ~40 frames?
    // safeGap = speed * 45 (buffer)
    const minSafeGap = gameSpeed * 50;

    // Max gap decreases as difficulty increases to make it denser
    // Initial max gap huge (e.g. 1500), min gap at speed 4 is ~200
    // We want to reduce "extra" empty space.
    // difficulty factor: 0.0 at start, increasing...
    const difficultyFactor = Math.min((difficultySpeed - BASE_SPEED) / 5, 1); // 0 to 1 scaling

    const extraGapMax = 1200 * (1 - difficultyFactor);
    const extraGapMin = 300 * (1 - difficultyFactor);

    const randomGap = extraGapMin + Math.random() * (extraGapMax - extraGapMin);

    nextObstacleDistance = minSafeGap + randomGap;
}

function spawnObstacles() {
    // Instead of timer, we track distance traveled
    distanceSinceLastSpawn += gameSpeed;

    if (distanceSinceLastSpawn > nextObstacleDistance) {
        distanceSinceLastSpawn = 0;
        setNextObstacleDistance();

        const rand = Math.random();
        let type = 'cactus';
        // Difficulty progression for types
        if (score > 100 && rand > 0.6) type = 'pterodactyl';
        if (score > 300 && rand > 0.9) type = 'pit';

        obstacles.push(new Obstacle(type, gameSpeed));
    }
}

function spawnCoins() {
    coinTimer++;
    if (coinTimer > 100) {
        coinTimer = 0;
        if (Math.random() > 0.5) {
            coins.push(new Coin(gameSpeed));
        }
    }
}

function checkCollisions() {
    // 1. Obstacles
    const dinoHitbox = {
        x: dino.x + 10,
        y: dino.y + 10,
        w: dino.w - 20,
        h: dino.h - 20
    };

    for (let obs of obstacles) {
        if (obs.type === 'pit') continue; // Pit handled in Dino update

        const obsHitbox = {
            x: obs.x + 5,
            y: obs.y + 5,
            w: obs.w - 10,
            h: obs.h - 10
        };

        if (
            dinoHitbox.x < obsHitbox.x + obsHitbox.w &&
            dinoHitbox.x + dinoHitbox.w > obsHitbox.x &&
            dinoHitbox.y < obsHitbox.y + obsHitbox.h &&
            dinoHitbox.y + dinoHitbox.h > obsHitbox.y
        ) {
            return true; // Collision
        }
    }

    // 2. Coins
    for (let coin of coins) {
        if (coin.collected) continue;
        const distX = Math.abs((coin.x + coin.size / 2) - (dino.x + dino.w / 2));
        const distY = Math.abs((coin.y + coin.size / 2) - (dino.y + dino.h / 2));

        if (distX < (dino.w / 2 + coin.size / 2) && distY < (dino.h / 2 + coin.size / 2)) {
            coin.collected = true;
            coinsCollected++;
        }
    }

    return false;
}

function gameOver() {
    isGameOver = true;
    isPlaying = false;
    cancelAnimationFrame(animationId);

    const finalScore = Math.floor(score) + (coinsCollected * 10);
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('dinoHighScore', highScore);
    }

    document.getElementById('final-score').innerText =
        `${Math.floor(score)} pts + ${coinsCollected}x10 🪙 = ${finalScore}`;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

let animationId;
function animate() {
    if (!isPlaying) return;

    frameCount++;
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // --- UPDATES ---

    // 1. Calculate Game Speed
    // 1. Calculate Game Speed
    // Removed Wind physics per user request (consistent speed)
    gameSpeed = difficultySpeed;
    if (gameSpeed < 3) gameSpeed = 3; // Min speed cap

    // 2. Weather Updates
    handleWeather();

    // 3. Dino
    if (dino.update(obstacles)) {
        gameOver();
        return;
    }

    // 4. Spawners
    spawnObstacles();
    spawnCoins();

    cloudTimer++;
    if (cloudTimer > 300) {
        cloudTimer = 0;
        clouds.push(new Cloud());
    }

    treeTimer++;
    if (treeTimer > 150) {
        treeTimer = 0;
        trees.push(new Tree());
    }

    // Ground details
    groundTimer++;
    if (groundTimer > 10) {
        groundTimer = 0;
        groundDetails.push(new GroundDetail());
    }

    // 5. Move Entities
    obstacles.forEach(o => o.update(gameSpeed));
    coins.forEach(c => c.update(gameSpeed));
    clouds.forEach(c => c.update());
    trees.forEach(t => t.update(gameSpeed));
    groundDetails.forEach(g => g.update(gameSpeed));

    // 6. Cleanup
    obstacles = obstacles.filter(o => !o.markedForDeletion);
    coins = coins.filter(c => !c.markedForDeletion);
    clouds = clouds.filter(c => !c.markedForDeletion);
    trees = trees.filter(t => !t.markedForDeletion);
    groundDetails = groundDetails.filter(g => !g.markedForDeletion);

    // 7. Collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }

    // 8. Progress
    difficultySpeed += SPEED_ACCELERATION;
    score += gameSpeed * 0.01;

    // UI Update
    document.getElementById('score').innerText = Math.floor(score).toString().padStart(5, '0');
    document.getElementById('coins').innerText = `🪙 ${coinsCollected}`;

    // --- DRAWING ---

    // Ground
    ctx.fillStyle = '#aaa';
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

    // Ground Details
    groundDetails.forEach(g => g.draw());

    // Background
    clouds.forEach(c => c.draw());
    trees.forEach(t => t.draw());

    // Pits (cut holes)
    for (let obs of obstacles) {
        if (obs.type === 'pit') {
            ctx.clearRect(obs.x, obs.y, obs.w, obs.h);
        }
    }

    obstacles.forEach(o => o.draw());
    coins.forEach(c => c.draw());
    dino.draw();
    particles.forEach(p => p.draw());

    animationId = requestAnimationFrame(animate);
}

// --- INPUT LISTENERS ---
window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault(); // Stop page scrolling
    }

    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;

    // Any key to start/restart
    if (!isPlaying) {
        // Optional: slight delay after death to prevent accidental restarts? 
        // For now, executing user request directly.
        start();
    }
});
window.addEventListener('keyup', e => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// UI Buttons
document.getElementById('restart-btn').addEventListener('click', start);
document.body.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
        if (!isPlaying) start();
    }
});
document.body.addEventListener('touchstart', (e) => {
    // e.preventDefault(); // Prevent scrolling?
    keys['Space'] = true;
    if (!isPlaying) start();
});
document.body.addEventListener('touchend', () => keys['Space'] = false);

// Initial Draw
const bannerDino = new Dino();
bannerDino.draw();
ctx.fillStyle = '#aaa';
ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 2);
