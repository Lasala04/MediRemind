// loader.js — Full-screen loading overlay
window.loader = (function () {
    function _getOrCreate() {
        let el = document.getElementById('mr-loader-overlay');
        if (!el) {
            el = document.createElement('div');
            el.id = 'mr-loader-overlay';
            el.style.cssText = [
                'position:fixed', 'inset:0', 'z-index:9999',
                'display:flex', 'flex-direction:column',
                'align-items:center', 'justify-content:center',
                'background:rgba(0,0,0,0.45)', 'backdrop-filter:blur(3px)',
                'opacity:0', 'transition:opacity .2s ease'
            ].join(';');
            el.innerHTML = `
                <div style="background:var(--mr-surface,#fff);border-radius:1rem;padding:2rem 2.5rem;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2)">
                    <i class="fas fa-circle-notch fa-spin" style="font-size:2rem;color:var(--mr-blue,#3b82f6);margin-bottom:.75rem"></i>
                    <p id="mr-loader-msg" style="margin:0;font-weight:600;color:var(--mr-text,#1a1a2e)">Loading…</p>
                </div>`;
            document.body.appendChild(el);
        }
        return el;
    }

    return {
        show: function (msg) {
            const el = _getOrCreate();
            const msgEl = el.querySelector('#mr-loader-msg');
            if (msgEl) msgEl.textContent = msg || 'Loading…';
            el.style.display = 'flex';
            requestAnimationFrame(() => { el.style.opacity = '1'; });
        },
        hide: function () {
            const el = document.getElementById('mr-loader-overlay');
            if (!el) return;
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, 200);
        }
    };
})();