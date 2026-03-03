// Modal System - PROPER VERSION
class ModalSystem {
    constructor() {
        this.currentModal = null;
        this.init();
    }
    
    init() {
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'modal-backdrop';
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden';
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop && this.currentModal?.closable !== false) {
                this.close();
            }
        });
        document.body.appendChild(backdrop);
        
        // Create container
        const container = document.createElement('div');
        container.id = 'modal-container';
        container.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 hidden';
        document.body.appendChild(container);
        
        // Escape key listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal && this.currentModal.closable !== false) {
                this.close();
            }
        });
    }
    
    open(content, options = {}) {
        this.close();
        
        const { title = '', size = 'md', closable = true } = options;
        
        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
            full: 'max-w-full mx-4'
        };
        
        const modal = document.createElement('div');
        modal.className = `modal-content bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} transform scale-95 opacity-0 transition-all duration-300`;
        modal.innerHTML = `
            ${title || closable ? `
            <div class="modal-header flex justify-between items-center p-6 border-b">
                ${title ? `<h3 class="text-xl font-bold text-gray-800">${title}</h3>` : '<div></div>'}
                ${closable ? `
                <button class="modal-close text-gray-400 hover:text-gray-600 text-2xl">
                    <i class="fas fa-times"></i>
                </button>
                ` : ''}
            </div>
            ` : ''}
            <div class="modal-body p-6">
                ${content}
            </div>
        `;
        
        this.currentModal = { element: modal, closable };
        
        // Close button
        if (closable) {
            modal.querySelector('.modal-close')?.addEventListener('click', () => this.close());
        }
        
        // Add to DOM
        const container = document.getElementById('modal-container');
        container.innerHTML = '';
        container.appendChild(modal);
        
        // Show with animation
        document.getElementById('modal-backdrop').classList.remove('hidden');
        container.classList.remove('hidden');
        
        setTimeout(() => {
            modal.classList.remove('scale-95', 'opacity-0');
            modal.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        return modal;
    }
    
    close() {
        if (!this.currentModal) return;
        
        const modal = this.currentModal.element;
        modal.classList.remove('scale-100', 'opacity-100');
        modal.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            const container = document.getElementById('modal-container');
            container.classList.add('hidden');
            container.innerHTML = '';
            document.getElementById('modal-backdrop').classList.add('hidden');
            this.currentModal = null;
        }, 300);
    }
    
    confirm(message, onConfirm, options = {}) {
        // Store callback so serialization is not needed — avoids arrow-function toString issues
        this._pendingConfirm = onConfirm;

        const {
            title       = 'Confirm',
            confirmText = 'Confirm',
            cancelText  = 'Cancel',
            confirmClass = 'bg-blue-500 hover:bg-blue-600'
        } = options;

        const iconColor = confirmClass.includes('red') ? 'bg-red-100' : 'bg-blue-100';
        const iconName  = confirmClass.includes('red') ? 'fa-exclamation-triangle text-red-500' : 'fa-question text-blue-500';

        const content = `
            <div class="text-center py-4">
                <div class="w-16 h-16 ${iconColor} rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas ${iconName} text-2xl"></i>
                </div>
                <p class="text-gray-700 leading-relaxed">${message}</p>
            </div>
            <div class="flex space-x-3 mt-6">
                <button onclick="window.modal.close()"
                        class="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition">
                    ${cancelText}
                </button>
                <button onclick="window.modal._runConfirm()"
                        class="flex-1 py-3 ${confirmClass} text-white rounded-xl font-medium transition">
                    ${confirmText}
                </button>
            </div>
        `;

        return this.open(content, { title, size: 'sm' });
    }

    _runConfirm() {
        if (typeof this._pendingConfirm === 'function') {
            const fn = this._pendingConfirm;
            this._pendingConfirm = null;
            this.close();
            fn();
        }
    }
}

// Create global instance
window.modal = new ModalSystem();