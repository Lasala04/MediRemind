// medications.js - Main medication management system
window.medications = {
    // Load and display medications
    load: function() {
        const medications = window.medicationDB.getAll();
        const container = document.getElementById('medications-list');
        if (!container) {
            console.warn('Medications container not found');
            return;
        }
        
        if (!medications || medications.length === 0) {
            this.renderEmptyState(container);
            this.updateStats(medications);
            return;
        }
        
        this.renderMedications(container, medications);
        this.updateStats(medications);
    },
    
    // Render empty state
    renderEmptyState: function(container) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-pills text-blue-300 text-3xl"></i>
                </div>
                <p class="text-lg font-medium text-gray-500">No medications yet</p>
                <p class="text-sm text-gray-400 mt-2">Add your first medication to get started with MediRemind</p>
                <button onclick="window.medicationForm.open()" 
                        class="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl">
                    <i class="fas fa-plus mr-2"></i> Add Your First Medication
                </button>
            </div>
        `;
    },
    
    // Render medications list
    renderMedications: function(container, medications) {
        container.innerHTML = medications.map(med => `
            <div class="medication-card bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex-1">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center mb-4 gap-3">
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <i class="fas fa-pills text-blue-600 text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-xl font-bold text-gray-800 truncate">${med.name}</h4>
                                <p class="text-gray-600">${med.dosage} • ${med.frequency}</p>
                            </div>
                            <button onclick="window.medications.toggleStatus('${med.id}')" 
                                    class="self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap 
                                           ${med.status === 'taken' ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' : 
                                             med.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200' : 
                                             'bg-red-100 text-red-800 border border-red-200 hover:bg-red-200'} transition">
                                ${med.status}
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                            <div class="flex items-center">
                                <i class="far fa-clock mr-3 text-blue-500"></i>
                                <div>
                                    <div class="font-medium">Scheduled Time</div>
                                    <div class="font-bold">${med.time}</div>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <i class="far fa-calendar-check mr-3 text-green-500"></i>
                                <div>
                                    <div class="font-medium">Last Taken</div>
                                    <div>${med.lastTaken}</div>
                                </div>
                            </div>
                        </div>
                        
                        ${med.notes ? `
                        <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div class="text-xs text-gray-500 mb-1">Notes</div>
                            <div class="text-sm text-gray-700">${med.notes}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex space-x-2 self-end sm:self-center">
                        <button onclick="window.reminders.openForm('${med.id}')" 
                                class="w-10 h-10 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center justify-center flex-shrink-0"
                                title="Set Reminder">
                            <i class="fas fa-bell"></i>
                        </button>
                        <button onclick="window.medicationForm.open(${JSON.stringify(med).replace(/"/g, '&quot;')})" 
                                class="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center flex-shrink-0"
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.medications.confirmArchive('${med.id}')" 
                                class="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center flex-shrink-0"
                                title="Archive">
                            <i class="fas fa-archive"></i>
                        </button>
                        <button onclick="window.medications.confirmDelete('${med.id}')" 
                                class="w-10 h-10 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center justify-center flex-shrink-0"
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },
    
    // Update dashboard statistics
    updateStats: function(medications) {
        // Update medication count
        const totalElement = document.getElementById('total-medications');
        if (totalElement) {
            totalElement.textContent = medications ? medications.length : 0;
        }
        
        // Update due today (simplified - all medications with pending status)
        const dueTodayElement = document.getElementById('due-today');
        if (dueTodayElement) {
            const pendingCount = medications ? medications.filter(m => m.status === 'pending').length : 0;
            dueTodayElement.textContent = pendingCount;
        }
        
        // Update adherence rate
        const adherenceElement = document.getElementById('adherence-rate');
        const adherenceBar = document.getElementById('adherence-bar');
        
        if (medications && medications.length > 0) {
            const takenCount = medications.filter(m => m.status === 'taken').length;
            const adherenceRate = Math.round((takenCount / medications.length) * 100);
            
            if (adherenceElement) {
                adherenceElement.textContent = `${adherenceRate}%`;
            }
            if (adherenceBar) {
                adherenceBar.style.width = `${adherenceRate}%`;
                // Update bar color based on adherence rate
                if (adherenceRate >= 80) {
                    adherenceBar.className = 'bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full';
                } else if (adherenceRate >= 50) {
                    adherenceBar.className = 'bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full';
                } else {
                    adherenceBar.className = 'bg-gradient-to-r from-red-400 to-red-500 h-2 rounded-full';
                }
            }
        } else {
            if (adherenceElement) adherenceElement.textContent = '0%';
            if (adherenceBar) {
                adherenceBar.style.width = '0%';
                adherenceBar.className = 'bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full';
            }
        }
    },
    
    // Toggle medication status (Pending → Taken → Missed → Pending)
    toggleStatus: function(id) {
        const medication = window.medicationDB.getById(id);
        if (!medication) {
            window.notify.error('Medication not found');
            return;
        }
        
        const statusOrder = ['pending', 'taken', 'missed'];
        const currentIndex = statusOrder.indexOf(medication.status);
        const nextIndex = (currentIndex + 1) % statusOrder.length;
        const nextStatus = statusOrder[nextIndex];
        
        if (window.medicationDB.updateStatus(id, nextStatus)) {
            const statusMessages = {
                'taken': 'Medication marked as taken',
                'missed': 'Medication marked as missed',
                'pending': 'Medication reset to pending'
            };
            window.notify.success(statusMessages[nextStatus]);

            // Priority 3: keep history DB in sync with live status changes
            if (window.reports && typeof window.reports.recordStatusChange === 'function') {
                window.reports.recordStatusChange(
                    window.medicationDB.getById(id),
                    nextStatus
                );
            }

            this.load(); // Refresh the display
        } else {
            window.notify.error('Failed to update medication status');
        }
    },
    
    // Confirm and delete medication
    confirmDelete: function(id) {
        const medication = window.medicationDB.getById(id);
        if (!medication) {
            window.notify.error('Medication not found');
            return;
        }
        
        window.modal.confirm(
            `Are you sure you want to delete <strong>${medication.name}</strong>? This action cannot be undone.`,
            () => {
                if (window.medicationDB.delete(id)) {
                    window.notify.success(`${medication.name} deleted successfully`);
                    this.load(); // Refresh the display
                } else {
                    window.notify.error('Failed to delete medication');
                }
            },
            {
                title: 'Delete Medication',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmClass: 'bg-red-500 hover:bg-red-600'
            }
        );
    },

    // Archive medication (move to read-only archive)
    confirmArchive: function(id) {
        const medication = window.medicationDB.getById(id);
        if (!medication) {
            window.notify.error('Medication not found');
            return;
        }

        window.modal.confirm(
            `Archive <strong>${medication.name}</strong>? It will be moved to archived records and preserved as read-only.`,
            () => {
                const archived = window.medicationDB.archive(id);
                if (archived) {
                    window.notify.success(`${medication.name} archived successfully`);
                    this.load();
                } else {
                    window.notify.error('Failed to archive medication');
                }
            },
            {
                title: 'Archive Medication',
                confirmText: 'Archive',
                cancelText: 'Cancel',
                confirmClass: 'bg-indigo-500 hover:bg-indigo-600'
            }
        );
    }
};

// Initialize medications when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.medications !== 'undefined' && typeof window.medications.load === 'function') {
        // Small delay to ensure all elements are ready
        setTimeout(() => {
            window.medications.load();
        }, 100);
    }
});