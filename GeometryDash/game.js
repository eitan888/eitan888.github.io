const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');

// Game settings
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const PLAYER_COLOR = 'cyan';
const GRAVITY = 0.8;
const JUMP_STRENGTH = -15;
const GROUND_HEIGHT = GAME_HEIGHT - 50;

const OBSTACLE_WIDTH = 30;
const OBSTACLE_HEIGHT = 50; // Base height, will be varied
const OBSTACLE_COLOR = 'red';
const OBSTACLE_SPEED_INITIAL = 5; // Initial obstacle speed

const backgroundMusic = document.getElementById('backgroundMusic');
let musicStarted = false; // משתנה שיעזור לנו לדעת אם המוזיקה כבר התחילה

let score = 0;
let gameSpeed = OBSTACLE_SPEED_INITIAL;
let gameFrame = 0;
let gameRunning = true;

// Background color settings
const backgroundColors = [
    '#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', // כחולים-אפורים
    '#16a085', '#1abc9c', '#27ae60', '#2ecc71', // ירוקים-טורקיז
    '#d35400', '#e67e22', '#f39c12', '#f1c40f', // כתומים-צהובים
    '#8e44ad', '#9b59b6', '#2980b9', '#3498db', // סגולים-כחולים
    '#c0392b', '#e74c3c', '#d98880', '#f5b7b1', // אדומים-ורודים
    '#4A235A', '#5B2C6F', '#154360', '#1A5276', // גוונים כהים יותר
    '#4E342E', '#6D4C41', '#3E2723', // חומים
    '#004D40', '#00695C' // ירוקים עמוקים
];
let currentColorIndex = Math.floor(Math.random() * backgroundColors.length); // בחירת צבע התחלתי אקראי
let lastScoreThresholdForBackgroundChange = 0;
canvas.style.backgroundColor = backgroundColors[currentColorIndex]; // Set initial background


// --- Player ---
let player = {
    x: 50,
    y: GROUND_HEIGHT - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,

    draw: function() {
        ctx.fillStyle = PLAYER_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },

    update: function() {
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        if (this.y + this.height > GROUND_HEIGHT) {
            this.y = GROUND_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
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
    const heightVariance = Math.random() * 60 - 20; // Obstacles can be shorter or taller
    const obsHeight = OBSTACLE_HEIGHT + heightVariance;
    obstacles.push({
        x: GAME_WIDTH,
        y: GROUND_HEIGHT - obsHeight,
        width: OBSTACLE_WIDTH + (Math.random() * 20 - 10), // Slight width variation
        height: obsHeight,
        color: OBSTACLE_COLOR
    });
}

function handleObstacles() {
    if (gameFrame % Math.max(30, (120 - Math.floor(gameSpeed * 5))) === 0) { // Spawn rate increases with gameSpeed
        if (Math.random() < 0.6 + (gameSpeed / 50) ) { // Likelihood increases slightly with speed
             spawnObstacle();
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            scoreDisplay.textContent = `Score: ${score}`;

            // Change background color every 10 points
            if (score >= lastScoreThresholdForBackgroundChange + 10) { // שינית ל-10 נקודות
                lastScoreThresholdForBackgroundChange += 10; // שינית ל-10 נקודות

                let newColorIndex;
                do {
                    newColorIndex = Math.floor(Math.random() * backgroundColors.length);
                } while (newColorIndex === currentColorIndex && backgroundColors.length > 1); // ודא שהצבע החדש שונה מהנוכחי, אם יש יותר מצבע אחד

                currentColorIndex = newColorIndex;
                if (gameRunning) {
                    canvas.style.backgroundColor = backgroundColors[currentColorIndex];
                }
            }
        }
    }
}

// --- Ground ---
function drawGround() {
    ctx.fillStyle = '#666';
    ctx.fillRect(0, GROUND_HEIGHT, GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);
}

// --- Game Loop ---
function gameLoop(timestamp) {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawGround();
    player.update();
    player.draw();
    handleObstacles();

    gameFrame++;
    if (gameSpeed < 15) { // Cap max speed
        gameSpeed += 0.002; // Slightly slower acceleration
    }


    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
window.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && gameRunning) {
        player.jump();
        if (!musicStarted && backgroundMusic) { // בדוק אם המוזיקה עוד לא התחילה ויש אלמנט מוזיקה
            backgroundMusic.play().then(() => {
                musicStarted = true;
            }).catch(error => {
                console.error("Error trying to play music:", error);
                // ייתכן שהדפדפן חסם את הניגון האוטומטי גם כאן ללא אינטראקציה ישירה יותר.
            });
        }
    }
    if (e.code === 'Enter' && !gameRunning) {
        restartGame();
        // אם רוצים שהמוזיקה תתחיל מחדש או תמשיך אחרי restart
        if (musicStarted && backgroundMusic) {
            backgroundMusic.play().catch(error => console.error("Error playing music on restart:", error));
        }
    }
});

// --- Game Over & Restart ---
function gameOver() {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.font = '40px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);
    ctx.font = '20px Arial';
    ctx.fillText(`Final Score: ${score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
    ctx.fillText('Press ENTER to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);

    if (backgroundMusic) { // השהיית המוזיקה בסוף המשחק
        backgroundMusic.pause();
    }
}

function restartGame() {
    player.y = GROUND_HEIGHT - PLAYER_HEIGHT;
    player.velocityY = 0;
    player.isJumping = false;
    obstacles = [];
    score = 0;
    gameFrame = 0;
    gameSpeed = OBSTACLE_SPEED_INITIAL;
    gameRunning = true;

    musicStarted = false;
    if (backgroundMusic) {
        backgroundMusic.currentTime = 0; // להתחיל מההתחלה
        backgroundMusic.play().then(() => {
            musicStarted = true;
        }).catch(error => console.error("Error playing music on restart:", error));
    }
    lastScoreThresholdForBackgroundChange = 0;
    // בחירת צבע התחלתי אקראי גם בריסטרט
    let newColorIndex;
    do {
        newColorIndex = Math.floor(Math.random() * backgroundColors.length);
    } while (newColorIndex === currentColorIndex && backgroundColors.length > 1); // למקרה שרוצים לוודא שונה גם מהצבע האחרון של המשחק הקודם, אם כי פחות קריטי כאן
    currentColorIndex = newColorIndex;
    canvas.style.backgroundColor = backgroundColors[currentColorIndex];

    scoreDisplay.textContent = `Score: ${score}`;
    lastScoreThresholdForBackgroundChange = 0;
    currentColorIndex = 0;
    canvas.style.backgroundColor = backgroundColors[currentColorIndex]; // Reset to initial background color

    requestAnimationFrame(gameLoop);
}

// --- Start Game ---
requestAnimationFrame(gameLoop);