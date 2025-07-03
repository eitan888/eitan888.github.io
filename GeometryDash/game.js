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
const PARTICLE_COLORS = [
    '#ff7474', '#ffc974', '#fffb74', '#b3ff74', 
    '#74ffb3', '#74d7ff', '#7495ff', '#b374ff', '#ff74f0'
]; // פלטת צבעים בוהקים "קסומים"
let currentColorIndex = Math.floor(Math.random() * backgroundColors.length);
canvas.style.backgroundColor = backgroundColors[currentColorIndex];
let lastScoreThresholdForBackgroundChange = 0;

const ROTATION_SPEED = 0.15; // מהירות הסיבוב. אפשר לשנות כדי שיהיה מהיר או איטי יותר
const CEILING_OBSTACLE_COLOR = '#ff9a8c'; // לדוגמה, גוון אדום-כתום

let isGravityReversed = false;

let particles = [];

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
    // ... מאפיינים קיימים: x, width, height, velocityY וכו' ...
    x: 50,
    width: PLAYER_FALLBACK_WIDTH,
    height: PLAYER_FALLBACK_HEIGHT,
    y: GROUND_HEIGHT - PLAYER_FALLBACK_HEIGHT,
    velocityY: 0,
    isJumping: false,
    jumpsMade: 0,
    maxJumps: 2,
    rotation: 0,
    isSpinning: false,
    invincibilityCharges: 0,
    isInvincible: false,
    invincibilityTimer: 0,

    // --- פונקציית עדכון פיזיקה מתוקנת ---
    update: function() {
        // 1. החלת כוח משיכה בהתאם למצב
        this.velocityY += isGravityReversed ? -GRAVITY : GRAVITY;
        this.y += this.velocityY;


        // 2. בדיקת התנגשות עם קרקע (רגילה או הפוכה)
        const landedOnGround = !isGravityReversed && (this.y + this.height >= GROUND_HEIGHT);
        const landedOnCeiling = isGravityReversed && (this.y <= 0);

        if (landedOnGround || landedOnCeiling) {
            // אם נחת על הקרקע הרגילה, קבע אותו על הקרקע
            if (landedOnGround) {
                this.y = GROUND_HEIGHT - this.height;
            }
            // אם נחת על התקרה, קבע אותו על התקרה
            if (landedOnCeiling) {
                this.y = 0;
            }
            
            // איפוס כל משתני הקפיצה והסיבוב
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpsMade = 0;
            this.isSpinning = false;
            this.rotation = 0;

             if (gameFrame % 4 === 0) {
            spawnDustParticle();
        }
        }

        // עדכון סיבוב
        if (this.isSpinning) {
            this.rotation += ROTATION_SPEED;
        }

        // עדכון אלמוות
        if (this.isInvincible) {
            this.invincibilityTimer--;
            if (this.invincibilityTimer <= 0) {
                this.isInvincible = false;
            }
        }
    },

    // --- פונקציית קפיצה מתוקנת ---
    jump: function() {
        if (this.jumpsMade < this.maxJumps) {
            // כיוון הקפיצה תלוי בכוח המשיכה
            this.velocityY = isGravityReversed ? -JUMP_STRENGTH : JUMP_STRENGTH;
            this.isJumping = true;
            this.jumpsMade++;
            if (this.jumpsMade === 2) {
                this.isSpinning = true;
            }
        }
    },

    // --- פונקציית ציור מתוקנת ---
    draw: function() {
        ctx.save();
        try {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation);

            // אם כוח המשיכה הפוך, הפוך את הציור אנכית
            if (isGravityReversed) {
                ctx.scale(1, -1);
            }
            
            // לוגיקת הציור הרגילה
            let originalAlpha = ctx.globalAlpha;
            if (this.isInvincible) {
                ctx.globalAlpha = (Math.floor(gameFrame / 8) % 2 === 0) ? 0.6 : 0.9;
            }
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.globalAlpha = originalAlpha;
            
        } finally {
            ctx.restore();
        }
    }
};

// פונקציה זו מעדכנת ומציירת את כל החלקיקים בכל פריים
function handleParticles() {
    // אנחנו רצים על המערך מהסוף להתחלה כדי שנוכל למחוק ממנו איברים בבטחה
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        
        // עדכון מיקום ו"חיים"
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            // אם ה"חיים" של החלקיק נגמרו, הסר אותו מהמערך
            particles.splice(i, 1);
        } else {
            // צייר את החלקיק, עם אפקט "דעיכה" (fade out)
            ctx.globalAlpha = p.life / p.startLife; // השקיפות תלויה בזמן החיים שנותר
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.globalAlpha = 1.0; // אפס את השקיפות הגלובלית חזרה ל-1
        }
    }
}

// פונקציה שיוצרת חלקיק אבק בודד (גרסה משופרת)
function spawnDustParticle() {
    // 1. הגדלת טווח הגודל האקראי
    const size = Math.random() * 5 + 3; // גודל חדש: בין 3 ל-8 פיקסלים

    // 2. בחירת צבע אקראי מהפלטה החדשה שלנו
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];

    // אפשר להאריך מעט את "זמן החיים" כדי שיראו אותם יותר זמן
    const life = Math.random() * 30 + 50; // "חיים" בין 50 ל-80 פריימים

    // --- שאר הלוגיקה נשארת זהה ---
    const spawnX = player.x;
    const spawnY = isGravityReversed ? player.y : player.y + player.height;

    const vx = -(Math.random() * 1.5 + 0.5);
    const vy = isGravityReversed ? (Math.random() * 1) : -(Math.random() * 1);

    particles.push({
        x: spawnX,
        y: spawnY,
        vx: vx,
        vy: vy,
        size: size,
        life: life,
        startLife: life,
        color: color
    });
}

// --- Obstacles ---
let obstacles = [];

function spawnGroundObstacle() {
    const heightVariance = Math.random() * 60 - 20;
    const obsHeight = OBSTACLE_HEIGHT_BASE + heightVariance;
    obstacles.push({
        type: 'ground', // נוסיף "סוג" כדי שיהיה ברור, למקרה שנרצה בעתיד
        x: GAME_WIDTH,
        y: GROUND_HEIGHT - obsHeight, // המיקום מחושב מהקרקע כלפי מעלה
        width: OBSTACLE_WIDTH_BASE + (Math.random() * 20 - 10),
        height: obsHeight,
        color: OBSTACLE_COLOR
    });
}

function updateGravityState() {
    if (score >= 300 && score < 600) {
        isGravityReversed = true;
    } else {
        isGravityReversed = false;
    }
}

// פונקציה חדשה שיוצרת מכשול שיורד מהתקרה
function spawnCeilingObstacle() {
    const heightVariance = Math.random() * 70 + 30; // כמה נמוך המכשול יורד
    const obsHeight = OBSTACLE_HEIGHT_BASE + heightVariance;
    obstacles.push({
        type: 'ceiling', // סוג: תקרה
        x: GAME_WIDTH,
        y: 0, // המיקום מתחיל מ-0 (החלק העליון של הקנבס)
        width: OBSTACLE_WIDTH_BASE + (Math.random() * 20 - 10),
        height: obsHeight,
        color: CEILING_OBSTACLE_COLOR // צבע שונה
    });
}

// פונקציית "מאסטר" חדשה שבוחרת איזה מכשול ליצור
function spawnObstacle() {
    // תנאי חדש: בדוק את הניקוד הנוכחי
    if (score < 300) {
        // אם הניקוד נמוך מ-300, צור *רק* מכשולי קרקע
        spawnGroundObstacle();
    } else {
        // אם הניקוד הוא 300 או יותר, הפעל את הלוגיקה האקראית
        // שמאפשרת גם יצירה של מכשולי תקרה.
        if (Math.random() < 0.6) { // 70% סיכוי למכשול קרקע
            spawnGroundObstacle();
        } else { // 30% סיכוי למכשול תקרה
            spawnCeilingObstacle();
        }
    }
}

function handleObstacles() {
    // Spawn logic
    let spawnFrequency = Math.max(30, (120 - Math.floor(gameSpeed * 5)));
    if (gameFrame % spawnFrequency === 0) {
        if (Math.random() < 0.6 + (gameSpeed / 50)) {
            // קריאה לפונקציית המאסטר החדשה. זה השינוי היחיד כאן.
            spawnObstacle(); 
        }
    }

    // --- שאר הפונקציה נשאר זהה לחלוטין! ---
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw obstacle
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // לוגיקת ההתנגשות נשארת זהה ועובדת עבור שני סוגי המכשולים
        if (
            !player.isInvincible &&
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }

        // הסרת מכשולים ועדכון ניקוד
        if (obs.x + obs.width < 0) {
            // ... כל הלוגיקה הקיימת של עדכון ניקוד, צבירת מטענים ושינוי רקע ...
            // נשארת בדיוק כפי שהיא.
            obstacles.splice(i, 1);
            score += 10;
            scoreDisplay.textContent = `Score: ${score}`;
            updateGravityState();

            if (score >= (lastScoreAtChargeGrant + 100)) {
                let chargesToGain = Math.floor(score / 100) - Math.floor(lastScoreAtChargeGrant / 100);
                if (chargesToGain > 0) {
                    player.invincibilityCharges += chargesToGain;
                    lastScoreAtChargeGrant = Math.floor(score / 100) * 100;
                    updateInvincibilityChargesDisplay();
                }
            }

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
    handleParticles();
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

    isGravityReversed = false;
    particles = [];

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