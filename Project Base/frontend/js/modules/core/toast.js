/* Toast notifications, independent of any other module. */
'use strict';

(function () {
    const Toast = {
        root: null,
        queue: [],

        init() {
            this.root = document.getElementById('toast-root');
        },

        show(msg, dur = 3000) {
            if (!this.root) return;
            const el = document.createElement('div');
            el.className = 'toast';
            el.textContent = msg;
            this.root.appendChild(el);
            this.queue.push(el);
            setTimeout(() => {
                el.classList.add('out');
                setTimeout(() => el.remove(), 280);
            }, dur);
        }
    };

    window.Toast = Toast;
})();