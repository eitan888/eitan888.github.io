const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const invincibilityChargesDisplay = document.getElementById('invincibilityChargesDisplay');
const INVINCIBILITY_DURATION_FRAMES = 5 * 60; // 5 שניות כפול 60 פריימים לשנייה (בערך)

// Game settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Player constants - אלה היו חסרים בהגדרות הגלובליות שלך, אבל השתמשת בהם באובייקט השחקן
// אם יש לך קובץ ספרייט, הערכים האלה צריכים להתאים לו, או שתשתמש ב-PLAYER_WIDTH_FALLBACK וכו'.
// לצורך הדגמה, נניח שאין ספרייט כרגע, ואלה מידות השחקן.
// אם כן יש ספרייט, שנה את PLAYER_WIDTH ו-PLAYER_HEIGHT באובייקט player ל-PLAYER_FRAME_WIDTH ו-PLAYER_FRAME_HEIGHT
const PLAYER_FALLBACK_WIDTH = 40;
const PLAYER_FALLBACK_HEIGHT = 60;
const PLAYER_COLOR = 'cyan'; // צבע אם אין ספרייט
const GRAVITY = 0.8;
const JUMP_STRENGTH = -15;
const GROUND_HEIGHT = GAME_HEIGHT - 50;

const OBSTACLE_WIDTH_BASE = 30; // שיניתי שם כדי שיהיה ברור שזה בסיס
const OBSTACLE_HEIGHT_BASE = 50; // שיניתי שם
const OBSTACLE_COLOR = 'red';
const OBSTACLE_SPEED_INITIAL = 5;

const backgroundMusic = document.getElementById('backgroundMusic');
let musicStarted = false;

let score = 0;
let gameSpeed = OBSTACLE_SPEED_INITIAL;
let gameFrame = 0;
let gameRunning = true;
// let gameAssetsLoaded = false; // נראה שלא השתמשת בזה בסוף, אז נסיר אותו כרגע לפשטות

let lastScoreAtChargeGrant = 0;

// Background color settings
const backgroundColors = [
    '#2c3e50', '#34495e', '#7f8c8d', '#95a5a6',
    '#16a085', '#1abc9c', '#27ae60', '#2ecc71',
    '#d35400', '#e67e22', '#f39c12', '#f1c40f',
    '#8e44ad', '#9b59b6', '#2980b9', '#3498db',
    '#c0392b', '#e74c3c', '#d98880', '#f5b7b1',
    '#4A235A', '#5B2C6F', '#154360', '#1A5276',
    '#4E342E', '#6D4C41', '#3E2723',
    '#004D40', '#00695C'
];
let currentColorIndex = Math.floor(Math.random() * backgroundColors.length);
canvas.style.backgroundColor = backgroundColors[currentColorIndex];
let lastScoreThresholdForBackgroundChange = 0;


// --- Player Sprite (דוגמה אם תרצה להוסיף מאוחר יותר) ---
/*
const playerSpriteSheet = new Image();
playerSpriteSheet.src = 'player_sprites.png';
const PLAYER_FRAME_WIDTH = 50;
const PLAYER_FRAME_HEIGHT = 60;
const PLAYER_RUN_FRAMES = 4;
const PLAYER_ANIMATION_SPEED = 5;

playerSpriteSheet.onload = function() { gameAssetsLoaded = true; };
playerSpriteSheet.onerror = function() {
    console.error("Could not load player sprite sheet!");
    gameAssetsLoaded = true; // Or handle error differently
};
*/

// --- Player ---
let player = {
    x: 50,
    // אם יש לך ספרייט, שנה את width ו-height ל-PLAYER_FRAME_WIDTH/HEIGHT
    width: PLAYER_FALLBACK_WIDTH, // משתמש בערכי ברירת מחדל
    height: PLAYER_FALLBACK_HEIGHT,
    y: GROUND_HEIGHT - PLAYER_FALLBACK_HEIGHT, // התאמה לגובה ברירת המחדל
    velocityY: 0,
    isJumping: false,

    // currentFrame: 0, // למקרה שתוסיף ספרייט
    // framesElapsed: 0, // למקרה שתוסיף ספרייט
    // spriteSheet: playerSpriteSheet, // למקרה שתוסיף ספרייט

    invincibilityCharges: 0,
    isInvincible: false,
    invincibilityTimer: 0,

    draw: function() {
        let originalAlpha = ctx.globalAlpha;

        if (this.isInvincible) {
            ctx.globalAlpha = (Math.floor(gameFrame / 8) % 2 === 0) ? 0.6 : 0.9;
        }

        // ציור פשוט של ריבוע כרגע
        ctx.fillStyle = PLAYER_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // אם היה ספרייט:
        /*
        if (this.spriteSheet && this.spriteSheet.complete && this.spriteSheet.naturalHeight !== 0) {
            const sx = this.currentFrame * PLAYER_FRAME_WIDTH;
            const sy = 0;
            ctx.drawImage(
                this.spriteSheet,
                sx, sy, PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT,
                this.x, this.y, this.width, this.height
            );
        } else {
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        */
        ctx.globalAlpha = originalAlpha;
    },

    // updateAnimation: function() { // למקרה שתוסיף ספרייט
    //     this.framesElapsed++;
    //     if (this.framesElapsed >= PLAYER_ANIMATION_SPEED) {
    //         this.framesElapsed = 0;
    //         this.currentFrame = (this.currentFrame + 1) % PLAYER_RUN_FRAMES;
    //     }
    // },

    update: function() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        if (this.y + this.height > GROUND_HEIGHT) {
            this.y = GROUND_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }

        // if (this.spriteSheet) { // אם יש ספרייט
        //     this.updateAnimation();
        // }

        if (this.isInvincible) {
            this.invincibilityTimer--;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
            }
        }
    },

    jump: function() {
        if (!this.isJumping) {
            this.velocityY = JUMP_STRENGTH;
            this.isJumping = true;
        }
    }
};

// --- Obstacles ---
let obstacles = [];

function spawnObstacle() {
    const heightVariance = Math.random() * 60 - 20;
    const obsHeight = OBSTACLE_HEIGHT_BASE + heightVariance; // שימוש ב-OBSTACLE_HEIGHT_BASE
    obstacles.push({
        x: GAME_WIDTH,
        y: GROUND_HEIGHT - obsHeight,
        width: OBSTACLE_WIDTH_BASE + (Math.random() * 20 - 10), // שימוש ב-OBSTACLE_WIDTH_BASE
        height: obsHeight,
        color: OBSTACLE_COLOR
    });
}

function handleObstacles() {
    // Spawn logic
    let spawnFrequency = Math.max(30, (120 - Math.floor(gameSpeed * 5)));
    if (gameFrame % spawnFrequency === 0) {
        if (Math.random() < 0.6 + (gameSpeed / 50)) {
            spawnObstacle();
        }
    }

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw obstacle
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision detection
        if (
            !player.isInvincible &&
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }

        // Remove off-screen obstacles & update score & grant charges
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            scoreDisplay.textContent = `Score: ${score}`;

            // *** כאן הייתה הבעיה העיקרית: הלוגיקה של צבירת המטען הייתה חסרה ***
            // Grant invincibility charges
            if (score >= (lastScoreAtChargeGrant + 100)) {
                let chargesToGain = Math.floor(score / 100) - Math.floor(lastScoreAtChargeGrant / 100);
                if (chargesToGain > 0) {
                    player.invincibilityCharges += chargesToGain;
                    lastScoreAtChargeGrant = Math.floor(score / 100) * 100; // עדכן את הסף רק אם באמת ניתנו מטענים
                    updateInvincibilityChargesDisplay();
                }
            }

            // Change background color every 10 points
            if (score >= lastScoreThresholdForBackgroundChange + 10) {
                lastScoreThresholdForBackgroundChange += 10;
                let newColorIndex;
                do {
                    newColorIndex = Math.floor(Math.random() * backgroundColors.length);
                } while (newColorIndex === currentColorIndex && backgroundColors.length > 1);
                currentColorIndex = newColorIndex;
                if (gameRunning) {
                    canvas.style.backgroundColor = backgroundColors[currentColorIndex];
                }
            }
        }
    }
}

// UI Update for Invincibility Charges
function updateInvincibilityChargesDisplay() {
    invincibilityChargesDisplay.textContent = `Invincibility Charges: ${player.invincibilityCharges}`;
}

// --- Ground ---
function drawGround() {
    ctx.fillStyle = '#666';
    ctx.fillRect(0, GROUND_HEIGHT, GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
}

// --- Game Loop ---
function gameLoop() { // הסרתי את timestamp כי לא השתמשת בו
    if (!gameRunning) return;

    // אם היית משתמש ב-gameAssetsLoaded, כאן הייתה הבדיקה
    // if (!gameAssetsLoaded) {
    //     ctx.fillStyle = 'white';
    //     ctx.font = '20px Arial';
    //     ctx.textAlign = 'center';
    //     ctx.fillText('Loading assets...', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    //     requestAnimationFrame(gameLoop);
    //     return;
    // }

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawGround();
    player.update();
    player.draw();
    handleObstacles();

    gameFrame++;
    if (gameSpeed < 15) {
        gameSpeed += 0.002;
    }

    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
window.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && gameRunning) {
        player.jump();
        if (!musicStarted && backgroundMusic) {
            backgroundMusic.play().then(() => {
                musicStarted = true;
            }).catch(error => {
                console.error("Error trying to play music:", error);
            });
        }
    }
    if (e.code === 'KeyR' && gameRunning) {
        if (player.invincibilityCharges > 0 && !player.isInvincible) {
            player.invincibilityCharges--;
            player.isInvincible = true;
            player.invincibilityTimer = INVINCIBILITY_DURATION_FRAMES;
            updateInvincibilityChargesDisplay();
        }
    }
    if (e.code === 'Enter' && !gameRunning) {
        // if (gameAssetsLoaded) { // אם היית משתמש בזה
            restartGame();
        // }
    }
});

// --- Game Over & Restart ---
function gameOver() {
    gameRunning = false;
    if (backgroundMusic) {
        backgroundMusic.pause();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
    ctx.fillText('Press ENTER to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50);
}

function restartGame() {
    // Reset player
    player.y = GROUND_HEIGHT - player.height; // השתמש בגובה השחקן הנוכחי
    player.velocityY = 0;
    player.isJumping = false;
    // player.currentFrame = 0; // אם יש ספרייט
    // player.framesElapsed = 0; // אם יש ספרייט

    player.invincibilityCharges = 0;
    player.isInvincible = false;
    player.invincibilityTimer = 0;
    lastScoreAtChargeGrant = 0;
    updateInvincibilityChargesDisplay();

    // Reset game state
    obstacles = [];
    score = 0;
    gameFrame = 0;
    gameSpeed = OBSTACLE_SPEED_INITIAL;
    scoreDisplay.textContent = `Score: ${score}`;

    // Reset background
    lastScoreThresholdForBackgroundChange = 0;
    // אין צורך לאפס את currentColorIndex ל-0 אם רוצים צבע אקראי בהתחלה
    let newColorIndex;
    do {
        newColorIndex = Math.floor(Math.random() * backgroundColors.length);
    } while (newColorIndex === currentColorIndex && backgroundColors.length > 1);
    currentColorIndex = newColorIndex;
    canvas.style.backgroundColor = backgroundColors[currentColorIndex];


    // Restart music
    musicStarted = false; // אפשר לאפס כדי שהמוזיקה תתחיל מחדש בלחיצה הראשונה
    if (backgroundMusic) {
        backgroundMusic.currentTime = 0;
        // אין צורך לקרוא ל-play כאן אם רוצים שיתחיל בלחיצה, הלוגיקה ב-keydown תטפל בזה
    }

    gameRunning = true;
    requestAnimationFrame(gameLoop);
}

updateInvincibilityChargesDisplay(); // עדכון ראשוני לתצוגת המטענים
requestAnimationFrame(gameLoop);