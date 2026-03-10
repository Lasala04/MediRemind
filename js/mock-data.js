// mock-data.js - Updated with CRUD operations
window.mockMedications = [
    {
        id: '1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'daily',
        time: '08:00',
        status: 'taken',
        lastTaken: 'Today, 8:05 AM',
        notes: 'Take with breakfast',
        createdAt: '2026-02-20T08:00:00.000Z'
    },
    {
        id: '2',
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'daily',
        time: '20:00',
        status: 'pending',
        lastTaken: 'Yesterday, 8:10 PM',
        notes: 'For blood pressure',
        createdAt: '2026-02-21T20:00:00.000Z'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Archived Medications (read-only store)
// ─────────────────────────────────────────────────────────────────────────────
window.archivedMedications = [];

// Medication Database CRUD Operations
window.medicationDB = {
    // Get all medications (sorted by createdAt descending — newest first)
    getAll: function() {
        const meds = JSON.parse(JSON.stringify(window.mockMedications));
        meds.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return meds;
    },
    
    // Get single medication
    getById: function(id) {
        return window.mockMedications.find(m => m.id === id);
    },
    
    // Add new medication (prepended so newest appears first)
    add: function(medicationData) {
        const newId = (Math.max(...window.mockMedications.map(m => parseInt(m.id)), 0) + 1).toString();
        const newMedication = {
            ...medicationData,
            id: newId,
            status: 'pending',
            lastTaken: 'Not taken yet',
            createdAt: new Date().toISOString()
        };
        window.mockMedications.unshift(newMedication);
        return newMedication;
    },
    
    // Update medication
    update: function(id, medicationData) {
        const index = window.mockMedications.findIndex(m => m.id === id);
        if (index > -1) {
            window.mockMedications[index] = {
                ...window.mockMedications[index],
                ...medicationData,
                id: id // Keep original ID
            };
            return window.mockMedications[index];
        }
        return null;
    },
    
    // Delete medication
    delete: function(id) {
        const index = window.mockMedications.findIndex(m => m.id === id);
        if (index > -1) {
            window.mockMedications.splice(index, 1);
            return true;
        }
        return false;
    },

    // Archive medication (move to read-only archive)
    archive: function(id) {
        const index = window.mockMedications.findIndex(m => m.id === id);
        if (index > -1) {
            const med = window.mockMedications.splice(index, 1)[0];
            med.archivedAt = new Date().toISOString();
            med.archiveReason = 'completed';
            window.archivedMedications.unshift(med);
            return med;
        }
        return null;
    },
    
    // Update medication status
    updateStatus: function(id, status) {
        const medication = this.getById(id);
        if (medication) {
            medication.status = status;
            const now = new Date();
            const options = { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            };
            const timeStr = now.toLocaleTimeString('en-US', options);
            
            medication.lastTaken = now.getDate() === new Date().getDate() 
                ? `Today, ${timeStr}`
                : now.getDate() === new Date().getDate() - 1
                ? `Yesterday, ${timeStr}`
                : `${Math.floor((new Date() - now) / (1000 * 60 * 60 * 24))} days ago`;
            
            return true;
        }
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Reminders (seeded into reminderDB on dashboard init)
// ─────────────────────────────────────────────────────────────────────────────
window.mockReminders = [
    {
        id: '1',
        medicationId: '1',
        medicationName: 'Metformin',
        medicationDosage: '500mg',
        time: '08:00',
        frequency: 'daily',
        types: ['email'],
        notes: 'Take with breakfast',
        status: 'active',
        snoozeUntil: null,
        createdAt: '2026-02-24T00:00:00.000Z'
    },
    {
        id: '2',
        medicationId: '2',
        medicationName: 'Lisinopril',
        medicationDosage: '10mg',
        time: '20:00',
        frequency: 'daily',
        types: ['email', 'sms'],
        notes: 'For blood pressure – track reading after taking',
        status: 'active',
        snoozeUntil: null,
        createdAt: '2026-02-24T00:00:00.000Z'
    }
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock Adherence History  (seeded into historyDB by reports.js on first open)
// 30-day deterministic history for Metformin & Lisinopril
// ─────────────────────────────────────────────────────────────────────────────
(function generateMockHistory() {
    const medDefs = [
        { id: '1', name: 'Metformin',   dosage: '500mg', time: '08:00', rate: 0.85 },
        { id: '2', name: 'Lisinopril',  dosage: '10mg',  time: '20:00', rate: 0.75 }
    ];

    // Deterministic pseudo-random so history stays consistent across page loads
    function seededRand(seed) {
        const x = Math.sin(seed + 1) * 10000;
        return x - Math.floor(x);
    }

    const history = [];
    const today   = new Date();
    let   hid     = 1;

    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const d = new Date(today);
        d.setDate(today.getDate() - dayOffset);
        const dateStr = d.toISOString().split('T')[0];

        medDefs.forEach((med, mIdx) => {
            const rand = seededRand(dayOffset * 10 + mIdx);

            let status, takenAt = null;

            if (dayOffset === 0) {
                // Today: reflect actual mockMedications status
                const live = (window.mockMedications || []).find(m => m.id === med.id);
                status = live ? live.status : 'pending';
                if (status === 'taken') {
                    const [h, m] = med.time.split(':').map(Number);
                    const td = new Date(d);
                    td.setHours(h, m + 5, 0, 0);
                    takenAt = td.toISOString();
                }
            } else if (rand < med.rate) {
                status = 'taken';
                const [h, m] = med.time.split(':').map(Number);
                const td = new Date(d);
                td.setHours(h, m + Math.floor(seededRand(dayOffset * 100 + mIdx) * 20), 0, 0);
                takenAt = td.toISOString();
            } else if (rand < med.rate + 0.1) {
                status = 'skipped';
            } else {
                status = 'missed';
            }

            history.push({
                id:               (hid++).toString(),
                medicationId:     med.id,
                medicationName:   med.name,
                medicationDosage: med.dosage,
                date:             dateStr,
                scheduledTime:    med.time,
                takenAt,
                status
            });
        });
    }

    window.mockHistory = history;
})();

// ─────────────────────────────────────────────────────────────────────────────
// History Database  (in-memory, populated by reports.js on init)
// ─────────────────────────────────────────────────────────────────────────────
window.historyDB = {
    data: [],

    getAll: function () {
        return JSON.parse(JSON.stringify(this.data));
    },

    getByDate: function (dateStr) {
        return this.data.filter(r => r.date === dateStr);
    },

    getByMedicationId: function (medId) {
        return this.data.filter(r => r.medicationId === medId);
    },

    /** Append a live status-change entry so history stays current. */
    recordStatusChange: function (medication, newStatus) {
        const today = new Date().toISOString().split('T')[0];
        const existing = this.data.find(
            r => r.date === today && r.medicationId === medication.id
        );
        if (existing) {
            existing.status = newStatus;
            existing.takenAt = newStatus === 'taken' ? new Date().toISOString() : null;
        } else {
            this.data.push({
                id:               (this.data.length + 1000).toString(),
                medicationId:     medication.id,
                medicationName:   medication.name,
                medicationDosage: medication.dosage,
                date:             today,
                scheduledTime:    medication.time,
                takenAt:          newStatus === 'taken' ? new Date().toISOString() : null,
                status:           newStatus
            });
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Legacy function for backward compatibility
window.loadMockMedications = function() {
    console.warn('loadMockMedications is deprecated. Use window.medications.load() instead.');
    if (window.medications && typeof window.medications.load === 'function') {
        window.medications.load();
    }
};

// Legacy delete function for backward compatibility
window.confirmDeleteMedication = function(id) {
    console.warn('confirmDeleteMedication is deprecated. Use window.medications.confirmDelete() instead.');
    if (window.medications && typeof window.medications.confirmDelete === 'function') {
        window.medications.confirmDelete(id);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Archived Medications Database (read-only access)
// ─────────────────────────────────────────────────────────────────────────────
window.archivedDB = {
    getAll: function() {
        return JSON.parse(JSON.stringify(window.archivedMedications));
    },
    getById: function(id) {
        return window.archivedMedications.find(m => m.id === id);
    },
    count: function() {
        return window.archivedMedications.length;
    }
};