const canvas = document.getElementById('cosmos-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
let meteors = [];
let particles = [];

const STAR_COUNT = 100;
const METEOR_COUNT = 3;
const METEOR_SPEED = 8;
const FRAME_INTERVAL = 1000 / 30; // cap at ~30fps to reduce CPU load
let _lastFrame = 0;

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
}

window.addEventListener('resize', resize);

function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            opacity: Math.random(),
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

function spawnMeteor() {
    meteors.push({
        x: Math.random() * width,
        y: -10,
        length: Math.random() * 100 + 50,
        speed: Math.random() * METEOR_SPEED + 5,
        angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
        opacity: 1
    });
}

function initParticles() {
    particles = [];
    for(let i=0; i<12; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 100 + 50,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5,
            alpha: Math.random() * 0.1
        });
    }
}

let themeColors = null;
let themeColorsTs = 0;
function getThemeColors() {
    const now = Date.now();
    if (themeColors && now - themeColorsTs < 5000) return themeColors;
    const style = getComputedStyle(document.body);
    themeColors = {
        primary: style.getPropertyValue('--primary').trim(),
        secondary: style.getPropertyValue('--secondary').trim(),
        bg: style.getPropertyValue('--bg-color').trim()
    };
    themeColorsTs = now;
    return themeColors;
}

function animate(timestamp) {
    requestAnimationFrame(animate);
    const dt = timestamp - _lastFrame;
    if (dt < FRAME_INTERVAL) return;
    _lastFrame = timestamp - (dt % FRAME_INTERVAL);

    const colors = getThemeColors();
    
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if(p.x < -p.radius) p.x = width + p.radius;
        if(p.x > width + p.radius) p.x = -p.radius;
        if(p.y < -p.radius) p.y = height + p.radius;
        if(p.y > height + p.radius) p.y = -p.radius;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        gradient.addColorStop(0, colors.primary + '33');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    stars.forEach(star => {
        star.y -= star.speed;
        if (star.y < 0) star.y = height;

        ctx.globalAlpha = star.opacity;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });

    if (Math.random() < 0.015) spawnMeteor();

    for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
        m.opacity -= 0.01;

        if (m.opacity <= 0 || m.x > width || m.y > height) {
            meteors.splice(i, 1);
            continue;
        }

        const gradient = ctx.createLinearGradient(m.x, m.y, m.x - Math.cos(m.angle)*m.length, m.y - Math.sin(m.angle)*m.length);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, 'transparent');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - Math.cos(m.angle)*m.length, m.y - Math.sin(m.angle)*m.length);
        ctx.stroke();
    }
}

resize();
initParticles();
requestAnimationFrame(animate);