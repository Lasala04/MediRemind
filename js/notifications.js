// Notification/Toast System - PROPER VERSION
class NotificationSystem {
    constructor() {
        this.container = null;
        this.init();
    }
    
    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-3 w-96 max-w-full';
        document.body.appendChild(this.container);
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('opacity-0', 'translate-x-full');
            notification.classList.add('opacity-100', 'translate-x-0');
        }, 10);
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }
        
        return notification;
    }
    
    createNotification(message, type) {
        const config = {
            success: { icon: 'fa-check-circle', bg: 'bg-green-500', border: 'border-green-600' },
            error: { icon: 'fa-exclamation-circle', bg: 'bg-red-500', border: 'border-red-600' },
            info: { icon: 'fa-info-circle', bg: 'bg-blue-500', border: 'border-blue-600' },
            warning: { icon: 'fa-exclamation-triangle', bg: 'bg-yellow-500', border: 'border-yellow-600' }
        };
        
        const { icon, bg, border } = config[type] || config.info;
        
        const notification = document.createElement('div');
        notification.className = `notification-toast ${bg} ${border} border-l-4 rounded-lg shadow-xl transform transition-all duration-300 opacity-0 translate-x-full`;
        notification.innerHTML = `
            <div class="p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas ${icon} text-white text-xl"></i>
                    </div>
                    <div class="ml-3 flex-1">
                        <p class="text-sm font-medium text-white">${message}</p>
                    </div>
                    <div class="ml-4 flex-shrink-0">
                        <button class="notification-close text-white hover:opacity-80">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => this.remove(notification));
        
        return notification;
    }
    
    remove(notification) {
        notification.classList.remove('opacity-100', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }
    
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }
    
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }
    
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
    
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }
}

// Create global instance
window.notify = new NotificationSystem();