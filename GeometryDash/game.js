const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const invincibilityChargesDisplay = document.getElementById('invincibilityChargesDisplay');
const INVINCIBILITY_DURATION_FRAMES = 5 * 60;
const HIT_INVINCIBILITY_FRAMES = 3 * 60;
const SCREEN_SHAKE_FRAMES = 3 * 60;
const MAX_LIVES = 3;

const sfxJump = new Audio('sfx/jump.wav');
sfxJump.volume = 0.7;

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

const RAINBOW_SPARK_COLORS = [
    '#ff4d4d', // אדום
    '#ff9f4d', // כתום
    '#ffff4d', // צהוב
    '#4dff4d', // ירוק
    '#4d9fff', // כחול
    '#9f4dff'  // סגול
];

const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.3;
let musicStarted = false;



// בתחילת הקובץ game.js, מתחת לשאר הקבועים וטעינת ה-SFX

// --- Obstacle Sprites ---
const dragonImages = [];
const dragonImagePaths = [
    'img/dragon1.jpg',
    'img/dragon2.jpg',
    'img/dragon3.jpg',
    'img/dragon4.jpg',
    'img/dragon5.jpg',
];

// --- Player Sprite ---
const playerImage = new Image(); 
playerImage.src = 'img/soldier.png'; 
let imagesLoadedCount = 0;
let totalImagesToLoad = dragonImagePaths.length + 1;
let assetsLoaded = false; // דגל חדש לניהול טעינת נכסים

function onImageLoad() {
    imagesLoadedCount++;
    if (imagesLoadedCount === totalImagesToLoad) {
        assetsLoaded = true;
    }
}

// טעינת כל תמונות הדרקון
dragonImagePaths.forEach(path => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
        imagesLoadedCount++;
        if (imagesLoadedCount === totalImagesToLoad) {
            assetsLoaded = true; // כל התמונות נטענו
            // אם יש לך כאן פונקציה כמו `startGameWhenAssetsLoaded()`, זה המקום לקרוא לה
        }
    };
    img.onerror = () => {
        console.error(`Failed to load image: ${path}`);
        imagesLoadedCount++; // עדיין נספור גם אם נכשלה הטעינה
        if (imagesLoadedCount === totalImagesToLoad) {
            assetsLoaded = true;
        }
    };
    dragonImages.push(img);
});

playerImage.onload = onImageLoad; // <<<--- קריאה לפונקציית העזר
playerImage.onerror = () => {
    console.error(`Failed to load image: ${playerImage.src}`);
    onImageLoad(); // קריאה גם במקרה של שגיאה
};


let score = 0;
let gameSpeed = OBSTACLE_SPEED_INITIAL;
let gameFrame = 0;
let gameRunning = true;
// let gameAssetsLoaded = false; // נראה שלא השתמשת בזה בסוף, אז נסיר אותו כרגע לפשטות

let lastScoreAtChargeGrant = 0;
let lives = MAX_LIVES;
let screenShakeTimer = 0;

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
const DUST_COLORS  = [
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

// --- Player Animation Constants (מותאם ל-soldier.jpg) ---
const PLAYER_FRAME_WIDTH = 80;
const PLAYER_FRAME_HEIGHT = 140
const PLAYER_RUN_FRAMES_COUNT = 3; // כל 6 הפריימים משמשים לריצה
const PLAYER_ANIMATION_SPEED = 5;  // 5 פריימים של המשחק לכל פריים אנימציה

// קואורדינטות Y בתוך קובץ ה-Sprite Sheet
const PLAYER_RUN_SPRITE_Y = 0;
const PLAYER_JUMP_SPRITE_Y = 300; // השורה השנייה משמשת כ"קפיצה"
const PLAYER_SOURCE_FRAME_HEIGHT = 400
const SOURCE_FRAME_HEIGHT = 400;

// --- Player ---
// --- Player Object (גרסה מתוקנת ומלאה) ---
// --- Player Object (גרסה משודרגת עם אנימציה) ---
let player = {
    x: 50,
    // שימוש בקבועים החדשים של האנימציה
    width: PLAYER_FRAME_WIDTH,
    height: PLAYER_FRAME_HEIGHT,
    y: GROUND_HEIGHT - PLAYER_FRAME_HEIGHT,
    velocityY: 0,
    
    // מאפיינים קיימים
    isJumping: false,
    jumpsMade: 0,
    maxJumps: 2,
    rotation: 0,
    isSpinning: false,
    invincibilityCharges: 0,
    isInvincible: false,
    invincibilityTimer: 0,

    // --- חדש: מאפייני אנימציה ---
    spriteSheet: playerImage, // התמונה שטענו
    currentFrame: 0,          // הפריים הנוכחי באנימציה (0, 1, 2...)
    animationTimer: 0,        // מונה פנימי לתיאום מהירות האנימציה
    // ----------------------------

    update: function() {
        // 1. פיזיקה (כמו קודם)
        this.velocityY += isGravityReversed ? -GRAVITY : GRAVITY;
        this.y += this.velocityY;

        // 2. התנגשות בקרקע/תקרה (כמו קודם)
        const landedOnGround = !isGravityReversed && (this.y + this.height >= GROUND_HEIGHT);
        const landedOnCeiling = isGravityReversed && (this.y <= 0);

        if (landedOnGround || landedOnCeiling) {
            // ... (כל לוגיקת הנחיתה הקיימת, כולל איפוסים וחלקיקי אבק) ...
            if (landedOnGround) this.y = GROUND_HEIGHT - this.height;
            if (landedOnCeiling) this.y = 0;
            // if (this.isJumping) playSound(sfxLand); // הפעל צליל נחיתה
            if (this.isJumping) spawnLandingDustCloud(landedOnCeiling);
            this.velocityY = 0;
            this.isJumping = false;
            this.jumpsMade = 0;
            this.isSpinning = false;
            this.rotation = 0;
            
            if (gameFrame % 2 === 0) spawnDustParticle();
        }

        // 3. עדכון סיבוב (כמו קודם)
        if (this.isSpinning) this.rotation += ROTATION_SPEED;

        // 4. עדכון אלמוות (כמו קודם)
        if (this.isInvincible) {
            this.invincibilityTimer--;
    if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.invincibilityTimer = 0;
    }
        }

        // 5. --- חדש: עדכון לוגיקת האנימציה ---
        this.updateAnimation(landedOnGround || landedOnCeiling);
    },

    updateAnimation: function(isOnGround) {
        if (isOnGround) {
            // אם על הקרקע -> הפעל אנימציית ריצה
            this.animationTimer++;
            if (this.animationTimer > PLAYER_ANIMATION_SPEED) {
                this.animationTimer = 0;
                this.currentFrame = (this.currentFrame + 1) % PLAYER_RUN_FRAMES_COUNT;
            }
        } else {
            // אם באוויר -> הצג פריים קפיצה בודד
            // (נניח שפריים הקפיצה הוא הפריים הראשון בשורת הקפיצה)
            this.currentFrame = 0; 
        }
    },

    jump: function() {
        if (this.jumpsMade < this.maxJumps) {
            // ... (כל לוגיקת הקפיצה הקיימת, כולל צליל וניצוצות) ...
            this.velocityY = isGravityReversed ? -JUMP_STRENGTH : JUMP_STRENGTH;
            this.isJumping = true;
            this.jumpsMade++;
            playSound(sfxJump);
            if (this.jumpsMade === 2) {
                this.isSpinning = true;
                for (let i = 0; i < 159; i++) spawnSparkParticle();
            }
        }
    },

    draw: function() {
    ctx.save();
    try {
        
        // --- 1. טרנספורמציות (הזזה, סיבוב, היפוך כוח כבידה) ---
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation); 
        if (isGravityReversed) {
            ctx.scale(1, -1);
        }

        // --- 2. שקיפות (אלמוות) ---
        let originalAlpha = ctx.globalAlpha;
        if (this.isInvincible) {
            ctx.globalAlpha = (Math.floor(gameFrame / 8) % 2 === 0) ? 0.6 : 0.9;
        }

        // --- 3. חישוב מיקום החיתוך (Source Coordinates) ---
        let sx, sy;


        // console.log("Width")
        // console.log(this.spriteSheet.width)
        // console.log("Highet")
        // console.log(this.spriteSheet.height)

        // חישוב מידות פריים בודד: רוחב התמונה / 3 פריימים, גובה התמונה / 2 שורות
        const SOURCE_FRAME_WIDTH = 360;
        const SOURCE_FRAME_HEIGHT = 460;
         

        if (this.isJumping) {
            // אם קופצים, השתמש בשורת הקפיצה
            sx = this.currentFrame * SOURCE_FRAME_WIDTH;
            sy = 431
        } else {
            // אם רצים, השתמש בשורת הריצה
            sx = this.currentFrame * SOURCE_FRAME_WIDTH;
            sy = PLAYER_RUN_SPRITE_Y;  // 0
        }

        // --- 4. ציור הפריים (Draw Image) ---
        ctx.drawImage(
            this.spriteSheet,
            sx, sy,                          // נקודת X ו-Y להתחיל ממנה *לחתוך*
            SOURCE_FRAME_WIDTH,              // רוחב החיתוך (133)
            SOURCE_FRAME_HEIGHT,             // גובה החיתוך (300)
            -this.width / 2,                 // איפה לצייר על הקנבס (X)
            -this.height / 3,                // איפה לצייר על הקנבס (Y)
            this.width,                      // רוחב הציור (Destination Width, שהוא 50)
            this.height                      // גובה הציור (Destination Height, שהוא 112)
        );
        
        ctx.globalAlpha = originalAlpha;
        // ציור תיבת התנגשות (debug)
     
    } finally {
        ctx.restore();
    }
}
};

// פונקציית עזר לניגון אפקטים קוליים
function playSound(sound) {
    sound.currentTime = 0; // החזר את הצליל להתחלה
    sound.play().catch(error => console.error(`Error playing sound ${sound.src}:`, error));
}

// פונקציה זו מעדכנת ומציירת את כל החלקיקים בכל פריים
function handleParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        } else {
            ctx.globalAlpha = p.life / p.startLife; // אפקט דעיכה
            ctx.fillStyle = p.color;
            
            // --- שינוי לצייר עיגולים במקום ריבועים ---
            ctx.beginPath(); // התחל ציור נתיב חדש
            // צייר עיגול. size מייצג קוטר, לכן נשתמש בחצי ממנו לרדיוס.
            ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); 
            ctx.fill(); // מלא את העיגול בצבע
            // -----------------------------------------

            ctx.globalAlpha = 1.0; // אפס שקיפות גלובלית
        }
    }
}

// פונקציה שיוצרת חלקיק ניצוץ בודד
function spawnSparkParticle() {
    // 1. הגדלת טווח הגודל
    const size = Math.random() * 6 + 4; // גודל חדש: בין 4 ל-10 פיקסלים

    // 2. זמן חיים מעט ארוך יותר
    const life = Math.random() * 20 + 30; // "חיים" בין 30 ל-50 פריימים

    // 3. בחירת צבע אקראי מפלטת הקשת
    const color = RAINBOW_SPARK_COLORS[Math.floor(Math.random() * RAINBOW_SPARK_COLORS.length)];

    // מיקום התחלתי: סביב מרכז השחקן
    const spawnX = player.x + player.width / 2 + (Math.random() * 10 - 5);
    const spawnY = player.y + player.height / 2 + (Math.random() * 10 - 5);

    // 4. מהירות גבוהה יותר להתפוצצות בולטת
    const angle = Math.random() * 2 * Math.PI; // זווית אקראית
    const speed = Math.random() * 4 + 2; // מהירות חדשה: בין 2 ל-6
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

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

function spawnDustParticle() {
    const size = Math.random() * 5 + 3;
    const life = Math.random() * 30 + 50;
    
    // שימוש בפלטת הצבעים החדשה של האבק
    const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)];

    // --- שינוי במיקום ובתנועה ---
    const spawnX = player.x; // עדיין מהצד השמאלי
    
    // מיקום Y אקראי לאורך כל צידו השמאלי של השחקן
    const spawnY = player.y + Math.random() * player.height;

    const vx = -(Math.random() * 2.0 + 0.5); // מהירות אופקית מעט גדולה יותר
    const vy = (Math.random() - 0.5) * 1.5; // מהירות אנכית אקראית (מעט למעלה או למטה)
    // --- סוף השינוי ---

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

function spawnLandingDustCloud(isCeiling) {
    const DUST_CLOUD_COLORS = ['#d4c5a9', '#c8b89a', '#b8a888', '#e0d5c0', '#f0ebe0', '#ffffff', '#cfcfcf'];
    const count = 800;
    const footX = player.x + player.width / 2;
    const footY = isCeiling ? player.y : player.y + player.height;

    for (let i = 0; i < count; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const spreadX = (Math.random() * player.width * 1.0) * side;
        const size = Math.random() * 4 + 8;
        const life = Math.random() * 30 + 80;
        const vx = (Math.random() * 3.5 + 0.8) * side;
        const vy = isCeiling ? (Math.random() * 2 + 0.8) : -(Math.random() * 3 + 0.8);
        const color = DUST_CLOUD_COLORS[Math.floor(Math.random() * DUST_CLOUD_COLORS.length)];
        particles.push({
            x: footX + spreadX, y: footY,
            vx, vy, size, life, startLife: life, color
        });
    }
}

// --- Obstacles ---
let obstacles = [];

function spawnGroundObstacle() {
    const heightVariance = Math.random() * 60 - 20;
    const obsHeight = OBSTACLE_HEIGHT_BASE + heightVariance;
    obstacles.push({
        type: 'ground',
        x: GAME_WIDTH,
        y: GROUND_HEIGHT - obsHeight,
        width: OBSTACLE_WIDTH_BASE + (Math.random() * 20 - 10),
        height: obsHeight,
        color: OBSTACLE_COLOR,
        // כאן אין isDragon: true, כי זהו מכשול מלבני רגיל
        // image: null 
    });
}

// פונקציה חדשה שיוצרת מכשול דרקון
function spawnDragonObstacle(isCeiling) {
    const imageIndex = Math.floor(Math.random() * dragonImages.length);
    const dragonImg = dragonImages[imageIndex];

    const dragonWidth = 60; // התאם את אלה לפי גודל הדרקונים בתמונות שלך
    const dragonHeight = 80;

    let obstacleY;
    if (isCeiling) {
        obstacleY = 0;
    } else {
        obstacleY = GROUND_HEIGHT - dragonHeight;
    }

    obstacles.push({
        type: isCeiling ? 'ceiling' : 'ground',
        x: GAME_WIDTH,
        y: obstacleY,
        width: dragonWidth,
        height: dragonHeight,
        color: 'transparent', // הצבע לא ייראה, אבל טוב להגדיר
        isDragon: true,      // <<< חשוב: מסמן שזה דרקון
        image: dragonImg     // <<< חשוב: מקשר לתמונה
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
    const heightVariance = Math.random() * 70 + 30;
    const obsHeight = OBSTACLE_HEIGHT_BASE + heightVariance;
    obstacles.push({
        type: 'ceiling',
        x: GAME_WIDTH,
        y: 0,
        width: OBSTACLE_WIDTH_BASE + (Math.random() * 20 - 10),
        height: obsHeight,
        color: CEILING_OBSTACLE_COLOR,
        // כאן אין isDragon: true, כי זהו מכשול מלבני רגיל
        // image: null 
    });
}

// פונקציית "מאסטר" חדשה שבוחרת איזה מכשול ליצור
// פונקציית "מאסטר" שבוחרת איזה מכשול ליצור
function spawnObstacle() {
    if (score < 300) {
        // מתחת ל-300 נקודות: צור דרקונים בלבד (או שילוב דרקונים/מלבנים לפי רצונך)
        // לצורך הדוגמה הזו, נצור רק דרקונים בשלב זה
        const isCeilingDragon = Math.random() < 0.5; // 50% סיכוי לדרקון תקרה / קרקע
        spawnDragonObstacle(isCeilingDragon);
    } else if (score >= 300 && score < 610) {
        // בין 300 ל-609 נקודות: חזור למכשולי מלבן רגילים (קרקע/תקרה)
        if (Math.random() < 0.6) {
            spawnGroundObstacle();
        } else {
            spawnCeilingObstacle();
        }
    } else { // מעל 610 נקודות: שוב דרקונים, אבל אולי מסוג שונה או קצב שונה
        // כאן אתה יכול להחליט אם ליצור דרקונים שונים, או לחזור על הלוגיקה ממתחת ל-300
        const isCeilingDragon = Math.random() < 0.5;
        spawnDragonObstacle(isCeilingDragon);
    }
}

function handleObstacles() {
    // Spawn logic - נשאר ללא שינוי
    let spawnFrequency = Math.max(30, (120 - Math.floor(gameSpeed * 5)));
    if (gameFrame % spawnFrequency === 0) {
        if (Math.random() < 0.6 + (gameSpeed / 50)) {
            spawnObstacle(); 
        }
    }

    // לולאה על כל המכשולים
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // ######################################################
        // ### כאן נמצא התיקון המרכזי - לוגיקת הציור ###
        // ######################################################

        if (obs.isDragon && obs.image && obs.image.complete) {
            // אם המכשול הוא דרקון, יש לו תמונה והיא נטענה - צייר את התמונה
            ctx.drawImage(obs.image, obs.x, obs.y, obs.width, obs.height);
        } else {
            // אחרת (אם זה מכשול מלבני רגיל) - צייר מלבן צבעוני
            ctx.fillStyle = obs.color;
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        }

        // ######################################################
        // ### סוף התיקון ###
        // ######################################################

// תיבת התנגשות מדויקת - מותאמת לגוף החייל בלבד
const hitboxX = player.x + 25;      // מתחיל יותר ימינה (אחרי הרובה)
const hitboxY = player.y + 10;      // מתחיל קצת למטה מהראש
const hitboxWidth = 40;             // רק רוחב הגוף (בלי הרובה)
const hitboxHeight = player.height - 20; // כל הגובה פחות ראש קטן

if (
    !player.isInvincible &&
    hitboxX < obs.x + obs.width &&
    hitboxX + hitboxWidth > obs.x &&
    hitboxY < obs.y + obs.height &&
    hitboxY + hitboxHeight > obs.y
) {
            takeDamage();
        }

        // הסרת מכשולים ועדכון ניקוד - נשאר ללא שינוי
        if (obs.x + obs.width < 0) {
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

    if (!assetsLoaded) {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading assets...', GAME_WIDTH / 2, GAME_HEIGHT / 2);
        requestAnimationFrame(gameLoop);
        return; // אל תמשיך לולאה עד שהכל נטען
    }


    // רעידת מסך
    ctx.save();
    if (screenShakeTimer > 0) {
        const intensity = Math.min(screenShakeTimer / 20, 1) * 7;
        ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
        screenShakeTimer--;
    }

    ctx.clearRect(-20, -20, GAME_WIDTH + 40, GAME_HEIGHT + 40);

    drawGround();
    handleParticles();
    player.update();
    player.draw();
    handleObstacles();
    drawLives();

    ctx.restore();

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

// --- Lives ---
function drawLives() {
    const heartSize = 20;
    const padding = 6;
    for (let i = 0; i < MAX_LIVES; i++) {
        ctx.font = heartSize + 'px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = i < lives ? '#e74c3c' : '#555';
        ctx.fillText('❤', 10 + i * (heartSize + padding), 28);
    }
}

function takeDamage() {
    lives--;
    if (lives <= 0) {
        gameOver();
        return;
    }
    // פגיעה - הפוך לבלתי פגיע ורעד מסך
    player.isInvincible = true;
    player.invincibilityTimer = HIT_INVINCIBILITY_FRAMES;
    screenShakeTimer = SCREEN_SHAKE_FRAMES;
}

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
    lives = MAX_LIVES;
    screenShakeTimer = 0;
    player.currentFrame = 0;
    player.animationTimer = 0;
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


