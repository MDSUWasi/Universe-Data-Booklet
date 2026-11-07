/* Full-screen moving starfield, independent of all other modules. */
'use strict';

(function () {
    const Starfield = {
        canvas: null,
        ctx: null,
        stars: [],
        rafId: null,
        running: false,
        dpr: 1,
        width: 0,
        height: 0,
        pointer: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        pan: { x: 0, y: 0 },
        _frameInterval: 1000 / 40,
        _time: 0,
        _lastFrame: 0,
        PALETTE: ['#E07A5F', '#8F00FF', '#B200ED', '#F2CC8F', '#FFFFFF'],

        init() {
            const canvas = document.getElementById('starfield');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            this.canvas = canvas;
            this.ctx = ctx;
            this.resize();
            this.spawn();
            this.bindInput();
            this.bindLifecycle();
            this.start();
        },

        spawn() {
            const count = window.innerWidth <= 600 ? 80 : window.innerWidth <= 960 ? 120 : 180;
            this.stars = [];
            for (let i = 0; i < count; i++) {
                this.stars.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    r: Math.random() * 1.8 + 0.5,
                    o: Math.random() * 0.8 + 0.2,
                    v: Math.random() * 0.5 + 0.2,
                    c: this.PALETTE[Math.floor(Math.random() * this.PALETTE.length)],
                    tw: Math.random() * Math.PI * 2
                });
            }
        },

        bindInput() {
            window.addEventListener('mousemove', evt => {
                this.target.x = evt.clientX;
                this.target.y = evt.clientY;
            }, { passive: true });
        },

        bindLifecycle() {
            window.addEventListener('resize', () => {
                this.resize();
                this.spawn();
            }, { passive: true });
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.pause(); else this.start();
            });
        },

        resize() {
            this.dpr = window.devicePixelRatio || 1;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width * this.dpr;
            this.canvas.height = this.height * this.dpr;
            this.canvas.style.width = this.width + 'px';
            this.canvas.style.height = this.height + 'px';
            this.ctx.scale(this.dpr, this.dpr);
        },

        start() {
            if (this.running) return;
            this.running = true;
            this._loop();
        },

        pause() {
            this.running = false;
            if (this.rafId) cancelAnimationFrame(this.rafId);
        },

        _loop(timestamp = 0) {
            if (!this.running) return;
            this.rafId = requestAnimationFrame(t => this._loop(t));
            const dt = timestamp - this._lastFrame;
            this._lastFrame = timestamp;
            if (dt < this._frameInterval) return;
            this._update(dt);
            this._draw();
        },

        _update(dt) {
            this._time += dt * 0.001;
            this.pan.x += (this.target.x - this.pan.x) * 0.05;
            this.pan.y += (this.target.y - this.pan.y) * 0.05;
            this.stars.forEach(star => {
                star.y -= star.v * 0.5;
                if (star.y < 0) {
                    star.y = this.height;
                    star.x = Math.random() * this.width;
                }
                star.tw += dt * 0.005;
                star.o = 0.4 + Math.sin(star.tw) * 0.3;
                star.x += (this.pan.x - star.x) * 0.0001;
            });
        },

        _draw() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.fillStyle = '#FFFFFF';
            this.stars.forEach(star => {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r * (0.6 + Math.abs(Math.sin(this._time))), 0, Math.PI * 2);
                ctx.fillStyle = star.c;
                ctx.globalAlpha = star.o;
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
    };

    window.Starfield = Starfield;
})();