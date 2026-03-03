// Notification system
window.notify = {
    success: function(message, duration = 5000) {
        this.show(message, 'success', duration);
    },
    
    error: function(message, duration = 5000) {
        this.show(message, 'error', duration);
    },
    
    info: function(message, duration = 3000) {
        this.show(message, 'info', duration);
    },
    
    show: function(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(el => el.remove());
        
        const colors = {
            success: 'bg-green-500 border-green-600',
            error: 'bg-red-500 border-red-600',
            info: 'bg-blue-500 border-blue-600',
            warning: 'bg-yellow-500 border-yellow-600'
        };
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        const notification = document.createElement('div');
        notification.className = `notification-toast fixed top-6 right-6 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-xl border-l-4 z-50 transform translate-x-full opacity-0 transition-all duration-300`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type]} mr-3 text-xl"></i>
                <div>
                    <p class="font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-6 text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.remove('translate-x-full', 'opacity-0');
            notification.classList.add('translate-x-0', 'opacity-100');
        }, 10);
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.classList.add('translate-x-full', 'opacity-0');
                    setTimeout(() => {
                        if (notification.parentElement) {
                            notification.remove();
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return notification;
    }
};