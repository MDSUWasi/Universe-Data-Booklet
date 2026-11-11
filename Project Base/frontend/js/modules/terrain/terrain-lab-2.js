/* 3D Terrain Lab part 2: pointer interaction and resize.
   Classic script: extends window.TerrainLab. */
'use strict';

(function () {
    const T = window.TerrainLab;

    T.bindPointer = function (canvas) {
        canvas.addEventListener('pointerdown', event => {
            this.pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', event => {
            if (!this.pointer || this.pointer.id !== event.pointerId) return;
            this.rotationY += (event.clientX - this.pointer.x) * 0.008;
            this.rotationX = Math.max(-1.35, Math.min(-0.15, this.rotationX + (event.clientY - this.pointer.y) * 0.006));
            this.pointer.x = event.clientX;
            this.pointer.y = event.clientY;
            this.render();
        });
        const endDrag = event => { if (this.pointer && this.pointer.id === event.pointerId) this.pointer = null; };
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);
        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            this.camera.position.multiplyScalar(event.deltaY > 0 ? 1.08 : 0.92);
            this.camera.position.clampLength(1.7, 6);
            this.render();
        }, { passive: false });
    };

    T.resize = function () {
        if (!this.renderer || !this.camera) return;
        const canvas = this.renderer.domElement;
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.render();
    };
})();