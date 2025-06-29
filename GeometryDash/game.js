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

const ROTATION_SPEED = 0.15; // מהירות הסיבוב. אפשר לשנות כדי שיהיה מהיר או איטי יותר


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
// --- Player Object (גרסה מתוקנת ומלאה) ---
let player = {
    x: 50,
    width: PLAYER_FALLBACK_WIDTH,   // השתמש בקבועים שהגדרת למעלה
    height: PLAYER_FALLBACK_HEIGHT,
    y: GROUND_HEIGHT - PLAYER_FALLBACK_HEIGHT,
    velocityY: 0,
    isJumping: false,

    // מאפיינים לקפיצה כפולה
    jumpsMade: 0,
    maxJumps: 2,

    // מאפייני סיבוב
    rotation: 0,
    isSpinning: false,

    // מאפייני אלמוות
    invincibilityCharges: 0,
    isInvincible: false,
    invincibilityTimer: 0,


    // --- פונקציית ציור מתוקנת ומלאה ---
    draw: function() {
        // המטרה: לסובב רק את השחקן, בלי להשפיע על שאר המשחק.
        // לשם כך, אנחנו מבצעים סדרה של פעולות מבודדות:

        // 1. שמירת המצב הנוכחי של הקנבס (כמו מיקום וזווית)
        ctx.save(); 

        try { // שימוש ב-try...finally כדי להבטיח ש-restore ייקרא תמיד
            // 2. הזזת נקודת הייחוס (0,0) של הקנבס אל *מרכז* השחקן.
            //    כל פעולת סיבוב תתבצע סביב נקודה זו.
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

            // 3. סיבוב הקנבס כולו בזווית הרצויה.
            ctx.rotate(this.rotation);

            // --- לוגיקת הציור עצמה, כולל אפקט אלמוות ---
            // כעת, כשאנחנו מציירים, אנחנו מציירים ביחס למרכז המסובב.
            let originalAlpha = ctx.globalAlpha;
            if (this.isInvincible) {
                // אפקט הבהוב
                ctx.globalAlpha = (Math.floor(gameFrame / 8) % 2 === 0) ? 0.6 : 0.9;
            }

            ctx.fillStyle = PLAYER_COLOR;
            
            // 4. צייר את המלבן כך שהמרכז שלו יהיה על נקודת הייחוס החדשה (0,0).
            //    לכן מציירים אותו מהנקודה שהיא "חצי רוחב אחורה" ו"חצי גובה למעלה".
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

            // אם היית משתמש בספרייט, היית מצייר אותו כאן באותו אופן:
            // ctx.drawImage(this.spriteSheet, sx, sy, sWidth, sHeight, -this.width / 2, -this.height / 2, this.width, this.height);
            
            ctx.globalAlpha = originalAlpha; // שחזור שקיפות למקרה ששונתה

        } finally {
            // 5. שחזור המצב המקורי של הקנבס.
            //    זה מבטל את ה-translate וה-rotate שעשינו, כך ששאר האלמנטים יצויירו נכון.
            //    זהו השלב הקריטי שמונע מהמשחק "להשתגע".
            ctx.restore(); 
        }

        // --- דיבאגינג (אפשר להסיר את ההערה אם הבעיה נמשכת) ---
        // console.log(`Draw Frame: x=${this.x.toFixed(1)}, y=${this.y.toFixed(1)}, rotation=${this.rotation.toFixed(2)}`);
    },

    // --- שאר הפונקציות של השחקן (ללא שינוי מהפעם הקודמת) ---
    update: function() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        // התנגשות עם הקרקע
        if (this.y + this.height >= GROUND_HEIGHT) {
            this.y = GROUND_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpsMade = 0;
            this.isSpinning = false;
            this.rotation = 0;
        }

        if (this.isSpinning) {
            this.rotation += ROTATION_SPEED;
        }

        if (this.isInvincible) {
            this.invincibilityTimer--;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
            }
        }
    },

    jump: function() {
        if (this.jumpsMade < this.maxJumps) {
            this.velocityY = JUMP_STRENGTH;
            this.isJumping = true;
            this.jumpsMade++;
            if (this.jumpsMade === 2) {
                this.isSpinning = true;
            }
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
    player.jumpsMade = 0
    player.isSpinning = false; // <<<--- איפוס מצב סיבוב
    player.rotation = 0;       // <<<--- איפוס זווית סיבוב
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