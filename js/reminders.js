// reminders.js - Priority 2: Reminder System
// Handles: Set Reminder Modal, Upcoming Reminders List, Snooze/Dismiss functionality

// ─────────────────────────────────────────────────────────────────────────────
// Reminder Data Store (in-memory, seeded from mock-data.js)
// ─────────────────────────────────────────────────────────────────────────────
window.reminderDB = {
    data: [], // Populated on init from window.mockReminders

    // ── CRUD ─────────────────────────────────────────────────────────────────

    getAll: function () {
        return JSON.parse(JSON.stringify(this.data));
    },

    getById: function (id) {
        return this.data.find(r => r.id === id);
    },

    getByMedicationId: function (medId) {
        return this.data.filter(r => r.medicationId === medId);
    },

    add: function (reminderData) {
        const existingIds = this.data.map(r => parseInt(r.id)).filter(n => !isNaN(n));
        const newId = (existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1).toString();

        const newReminder = {
            ...reminderData,
            id: newId,
            status: 'active',
            snoozeUntil: null,
            createdAt: new Date().toISOString()
        };

        this.data.push(newReminder);
        return newReminder;
    },

    update: function (id, reminderData) {
        const index = this.data.findIndex(r => r.id === id);
        if (index > -1) {
            this.data[index] = { ...this.data[index], ...reminderData, id };
            return this.data[index];
        }
        return null;
    },

    delete: function (id) {
        const index = this.data.findIndex(r => r.id === id);
        if (index > -1) {
            this.data.splice(index, 1);
            return true;
        }
        return false;
    },

    // ── Status Transitions ────────────────────────────────────────────────────

    snooze: function (id, minutes) {
        const reminder = this.getById(id);
        if (reminder) {
            const snoozeUntil = new Date();
            snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
            reminder.status = 'snoozed';
            reminder.snoozeUntil = snoozeUntil.toISOString();
            return true;
        }
        return false;
    },

    dismiss: function (id) {
        const reminder = this.getById(id);
        if (reminder) {
            reminder.status = 'dismissed';
            reminder.dismissedAt = new Date().toISOString();
            return true;
        }
        return false;
    },

    reactivate: function (id) {
        const reminder = this.getById(id);
        if (reminder) {
            reminder.status = 'active';
            reminder.snoozeUntil = null;
            return true;
        }
        return false;
    },

    // ── Queries ───────────────────────────────────────────────────────────────

    /** Returns non-dismissed reminders, excluding still-snoozed ones, sorted by next fire time. */
    getUpcoming: function () {
        const now = new Date();
        return this.data
            .filter(r => {
                if (r.status === 'dismissed') return false;
                if (r.status === 'snoozed' && r.snoozeUntil && new Date(r.snoozeUntil) > now) {
                    return true; // keep snoozed – UI will show countdown
                }
                // Re-activate snoozed reminders whose snooze has expired
                if (r.status === 'snoozed' && r.snoozeUntil && new Date(r.snoozeUntil) <= now) {
                    r.status = 'active';
                    r.snoozeUntil = null;
                }
                return true;
            })
            .sort((a, b) => this.getNextReminderTime(a) - this.getNextReminderTime(b));
    },

    /** Calculates the next wall-clock time this reminder fires (today or tomorrow). */
    getNextReminderTime: function (reminder) {
        if (reminder.status === 'snoozed' && reminder.snoozeUntil) {
            return new Date(reminder.snoozeUntil);
        }
        const now = new Date();
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Reminder UI System
// ─────────────────────────────────────────────────────────────────────────────
window.reminders = {

    // ── UPCOMING REMINDERS MODAL ────────────────────────────────────────────

    /** Opens the centered modal overlay showing all upcoming reminders. */
    openUpcomingModal: function () {
        this.renderUpcoming();
        const overlay = document.getElementById('upcoming-reminders-overlay');
        if (overlay) overlay.classList.remove('hidden');
    },

    /** Closes the upcoming reminders modal overlay. */
    closeUpcomingModal: function () {
        const overlay = document.getElementById('upcoming-reminders-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    // ── FORM MODAL ────────────────────────────────────────────────────────────

    /** Opens the Set Reminder modal, optionally pre-selecting a medication. */
    openForm: function (medicationId = null) {
        const medications = window.medicationDB.getAll();

        if (medications.length === 0) {
            window.notify.warning('Please add a medication first before setting a reminder.');
            return;
        }

        // Pre-fill time from medication if one is given
        const preTime = medicationId
            ? (window.medicationDB.getById(medicationId)?.time || '08:00')
            : '08:00';

        const formContent = `
            <div class="space-y-5">
                <!-- Header -->
                <div class="text-center pb-2">
                    <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-bell text-green-500 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">Set a Reminder</h3>
                    <p class="text-gray-500 text-sm mt-1">Configure when and how you want to be notified</p>
                </div>

                <!-- Medication Select -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-pills text-blue-400 mr-1"></i> Medication
                        <span class="text-red-500">*</span>
                    </label>
                    <select id="reminder-medication-id"
                            class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-gray-700">
                        <option value="">— Select a medication —</option>
                        ${medications.map(m => `
                            <option value="${m.id}" ${medicationId === m.id ? 'selected' : ''}>
                                ${m.name} · ${m.dosage}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Time & Frequency -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-clock text-green-400 mr-1"></i> Reminder Time
                            <span class="text-red-500">*</span>
                        </label>
                        <input type="time" id="reminder-time" value="${preTime}"
                               class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-gray-700">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            <i class="fas fa-redo text-green-400 mr-1"></i> Frequency
                            <span class="text-red-500">*</span>
                        </label>
                        <select id="reminder-frequency"
                                class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-gray-700">
                            <option value="daily">Daily</option>
                            <option value="twice-daily">Twice Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="as-needed">As Needed</option>
                        </select>
                    </div>
                </div>

                <!-- Notification Type -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-bullhorn text-green-400 mr-1"></i> Notification Type
                        <span class="text-red-500">*</span>
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                        <label class="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors"
                               id="label-email">
                            <input type="checkbox" id="reminder-type-email" value="email"
                                   class="w-4 h-4 accent-green-500" checked
                                   onchange="window.reminders.syncTypeLabel('email')">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-envelope text-blue-500"></i>
                                <span class="font-medium text-gray-700 text-sm">Email</span>
                            </div>
                        </label>
                        <label class="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors"
                               id="label-sms">
                            <input type="checkbox" id="reminder-type-sms" value="sms"
                                   class="w-4 h-4 accent-green-500"
                                   onchange="window.reminders.syncTypeLabel('sms')">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-comment-dots text-purple-500"></i>
                                <span class="font-medium text-gray-700 text-sm">SMS</span>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- Notes -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">
                        <i class="fas fa-sticky-note text-green-400 mr-1"></i> Notes
                        <span class="text-gray-400 text-xs font-normal">(optional)</span>
                    </label>
                    <textarea id="reminder-notes" rows="2"
                              placeholder="e.g., Take with food, Check blood pressure first…"
                              class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-100 transition text-gray-700 resize-none"></textarea>
                </div>

                <!-- Actions -->
                <div class="flex gap-3 pt-2">
                    <button onclick="window.modal.close()"
                            class="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button onclick="window.reminders.save()"
                            class="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition shadow-md hover:shadow-lg">
                        <i class="fas fa-bell mr-2"></i>Set Reminder
                    </button>
                </div>
            </div>
        `;

        window.modal.open(formContent, { title: 'Set Reminder', size: 'lg' });
        // Sync checkbox border colors on initial render
        setTimeout(() => {
            window.reminders.syncTypeLabel('email');
            window.reminders.syncTypeLabel('sms');
        }, 50);
    },

    /** Toggles the visual active state of a notification-type label. */
    syncTypeLabel: function (type) {
        const checkbox = document.getElementById(`reminder-type-${type}`);
        const label = document.getElementById(`label-${type}`);
        if (!checkbox || !label) return;
        if (checkbox.checked) {
            label.classList.add('border-green-500', 'bg-green-50');
            label.classList.remove('border-gray-200');
        } else {
            label.classList.remove('border-green-500', 'bg-green-50');
            label.classList.add('border-gray-200');
        }
    },

    // ── SAVE ──────────────────────────────────────────────────────────────────

    save: function () {
        const medicationId = document.getElementById('reminder-medication-id')?.value;
        const time = document.getElementById('reminder-time')?.value;
        const frequency = document.getElementById('reminder-frequency')?.value;
        const emailChecked = document.getElementById('reminder-type-email')?.checked;
        const smsChecked = document.getElementById('reminder-type-sms')?.checked;
        const notes = document.getElementById('reminder-notes')?.value.trim();

        // Validation
        if (!medicationId) {
            window.notify.warning('Please select a medication.');
            return;
        }
        if (!time) {
            window.notify.warning('Please set a reminder time.');
            return;
        }
        if (!emailChecked && !smsChecked) {
            window.notify.warning('Please select at least one notification type (Email or SMS).');
            return;
        }

        // Check for duplicate reminder on same medication + time combination
        const duplicates = window.reminderDB.getByMedicationId(medicationId)
            .filter(r => r.time === time && r.status !== 'dismissed');

        if (duplicates.length > 0) {
            window.notify.warning('A reminder for this medication at this time already exists.');
            return;
        }

        const med = window.medicationDB.getById(medicationId);
        const types = [];
        if (emailChecked) types.push('email');
        if (smsChecked) types.push('sms');

        window.reminderDB.add({
            medicationId,
            medicationName: med?.name || 'Unknown',
            medicationDosage: med?.dosage || '',
            time,
            frequency,
            types,
            notes: notes || ''
        });

        window.modal.close();
        window.notify.success(
            `Reminder set for <strong>${med?.name || 'medication'}</strong> at ${this.formatTime(time)} via ${types.join(' & ')}.`
        );
        this.renderUpcoming();
        this.updateReminderCount();
    },

    // ── SNOOZE ────────────────────────────────────────────────────────────────

    /** Opens the snooze options sub-modal for a specific reminder. */
    openSnoozeOptions: function (id) {
        const reminder = window.reminderDB.getById(id);
        if (!reminder) return;

        const content = `
            <div class="text-center py-2">
                <div class="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-clock text-yellow-500 text-2xl"></i>
                </div>
                <p class="text-gray-600 mb-1 text-sm">Snooze reminder for</p>
                <p class="font-bold text-gray-800 mb-6">${reminder.medicationName}</p>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="window.reminders.snooze('${id}', 15); window.modal.close();"
                            class="py-3 border-2 border-yellow-300 text-yellow-700 rounded-xl hover:bg-yellow-50 font-semibold transition text-sm">
                        <i class="fas fa-clock block mb-1 text-lg"></i>15 min
                    </button>
                    <button onclick="window.reminders.snooze('${id}', 30); window.modal.close();"
                            class="py-3 border-2 border-yellow-300 text-yellow-700 rounded-xl hover:bg-yellow-50 font-semibold transition text-sm">
                        <i class="fas fa-clock block mb-1 text-lg"></i>30 min
                    </button>
                    <button onclick="window.reminders.snooze('${id}', 60); window.modal.close();"
                            class="py-3 bg-yellow-400 text-white rounded-xl hover:bg-yellow-500 font-semibold transition text-sm shadow">
                        <i class="fas fa-clock block mb-1 text-lg"></i>1 hour
                    </button>
                </div>
                <button onclick="window.modal.close()"
                        class="mt-4 text-sm text-gray-400 hover:text-gray-600 transition">
                    Cancel
                </button>
            </div>
        `;

        window.modal.open(content, { title: 'Snooze Reminder', size: 'sm' });
    },

    snooze: function (id, minutes) {
        if (window.reminderDB.snooze(id, minutes)) {
            const label = minutes < 60 ? `${minutes} minutes` : '1 hour';
            window.notify.info(`Reminder snoozed for ${label}.`);
            this.renderUpcoming();
        }
    },

    // ── DISMISS ───────────────────────────────────────────────────────────────

    dismiss: function (id) {
        const reminder = window.reminderDB.getById(id);
        if (!reminder) return;

        window.modal.confirm(
            `Dismiss the reminder for <strong>${reminder.medicationName}</strong> today?`,
            () => {
                if (window.reminderDB.dismiss(id)) {
                    window.notify.success(`Reminder for ${reminder.medicationName} dismissed.`);
                    this.renderUpcoming();
                    this.updateReminderCount();
                }
            },
            {
                title: 'Dismiss Reminder',
                confirmText: 'Dismiss',
                cancelText: 'Keep',
                confirmClass: 'bg-gray-500 hover:bg-gray-600'
            }
        );
    },

    // ── DELETE ────────────────────────────────────────────────────────────────

    delete: function (id) {
        const reminder = window.reminderDB.getById(id);
        if (!reminder) return;

        window.modal.confirm(
            `Permanently delete the reminder for <strong>${reminder.medicationName}</strong>?`,
            () => {
                if (window.reminderDB.delete(id)) {
                    window.notify.success(`Reminder deleted.`);
                    this.renderUpcoming();
                    this.updateReminderCount();
                }
            },
            {
                title: 'Delete Reminder',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmClass: 'bg-red-500 hover:bg-red-600'
            }
        );
    },

    // ── RENDER UPCOMING LIST ──────────────────────────────────────────────────

    renderUpcoming: function () {
        const container = document.getElementById('upcoming-reminders');
        if (!container) return;

        const upcoming = window.reminderDB.getUpcoming();

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
                    <i class="fas fa-bell-slash text-3xl mb-3 opacity-30"></i>
                    <p class="text-sm font-medium">No active reminders</p>
                    <button onclick="window.reminders.openForm()"
                            class="mt-3 text-xs text-green-600 hover:underline font-semibold">
                        + Set a reminder
                    </button>
                </div>
            `;
            return;
        }

        const now = new Date();

        container.innerHTML = upcoming.map(reminder => {
            const isSnoozed = reminder.status === 'snoozed';
            const nextTime = window.reminderDB.getNextReminderTime(reminder);
            const diffMs = nextTime - now;
            const minutesUntil = Math.round(diffMs / 60000);
            const isOverdue = diffMs < 0 && !isSnoozed;

            // ── Time badge ───────────────────────────────────────────────────
            let timeBadge;
            if (isSnoozed) {
                const snoozeEnd = new Date(reminder.snoozeUntil);
                const snoozeMin = Math.max(0, Math.round((snoozeEnd - now) / 60000));
                timeBadge = `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                <i class="fas fa-clock"></i> Snoozed · ${snoozeMin}m left
                             </span>`;
            } else if (isOverdue) {
                timeBadge = `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                <i class="fas fa-exclamation-circle"></i> Overdue
                             </span>`;
            } else if (minutesUntil <= 60) {
                timeBadge = `<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                <i class="fas fa-check-circle"></i> In ${minutesUntil}m
                             </span>`;
            } else {
                const h = Math.floor(minutesUntil / 60);
                const m = minutesUntil % 60;
                const label = m > 0 ? `${h}h ${m}m` : `${h}h`;
                timeBadge = `<span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                <i class="fas fa-clock"></i> In ${label}
                             </span>`;
            }

            // ── Card border color ────────────────────────────────────────────
            const cardBorder = isOverdue
                ? 'border-red-200 bg-red-50'
                : isSnoozed
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-gray-200 bg-white';

            // ── Notification type icons ───────────────────────────────────────
            const typeIcons = (reminder.types || []).map(t =>
                t === 'email'
                    ? '<span title="Email" class="bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 text-xs"><i class="fas fa-envelope"></i></span>'
                    : '<span title="SMS" class="bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 text-xs"><i class="fas fa-comment-dots"></i></span>'
            ).join('');

            // ── Frequency chip ────────────────────────────────────────────────
            const freqMap = {
                'daily': 'Daily', 'twice-daily': '2× Daily',
                'weekly': 'Weekly', 'monthly': 'Monthly', 'as-needed': 'As Needed'
            };
            const freqLabel = freqMap[reminder.frequency] || reminder.frequency;

            return `
                <div class="reminder-card border rounded-xl p-3 ${cardBorder} transition-all duration-200 hover:shadow-sm">
                    <!-- Top row: name + type badges -->
                    <div class="flex justify-between items-start mb-1.5">
                        <div class="flex-1 min-w-0 pr-2">
                            <p class="font-bold text-gray-800 text-sm leading-tight truncate">${reminder.medicationName}</p>
                            <p class="text-gray-500 text-xs mt-0.5">${reminder.medicationDosage} · ${this.formatTime(reminder.time)} · ${freqLabel}</p>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">${typeIcons}</div>
                    </div>

                    <!-- Middle row: time badge -->
                    <div class="mb-2">${timeBadge}</div>

                    ${reminder.notes ? `<p class="text-xs text-gray-400 italic mb-2 truncate">${reminder.notes}</p>` : ''}

                    <!-- Action row -->
                    <div class="flex gap-1.5">
                        <button onclick="window.reminders.openSnoozeOptions('${reminder.id}')"
                                class="flex-1 text-xs py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition font-semibold">
                            <i class="fas fa-clock mr-1"></i>Snooze
                        </button>
                        <button onclick="window.reminders.dismiss('${reminder.id}')"
                                class="flex-1 text-xs py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-semibold">
                            <i class="fas fa-check mr-1"></i>Dismiss
                        </button>
                        <button onclick="window.reminders.delete('${reminder.id}')"
                                class="text-xs px-2 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                                title="Delete reminder">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ── STAT COUNTER ──────────────────────────────────────────────────────────

    /** Updates the "Active Reminders" counter in the stats grid. */
    updateReminderCount: function () {
        const el = document.getElementById('active-reminders-count');
        if (!el) return;
        el.textContent = window.reminderDB.getUpcoming().length;
    },

    // ── UTILITY ───────────────────────────────────────────────────────────────

    /** Converts "HH:MM" 24h string to "h:MM AM/PM". */
    formatTime: function (time) {
        if (!time) return '';
        const [h, m] = time.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
    },

    // ── CLEANUP ───────────────────────────────────────────────────────────────

    /** Clears timers and resets state. Called on logout. */
    cleanup: function () {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    },

    // ── INIT ──────────────────────────────────────────────────────────────────

    /** Bootstraps the reminder system. Call this from initDashboard(). */
    init: function () {
        // Clear any previous interval (e.g. re-login without page reload)
        this.cleanup();

        // Seed from mock data
        window.reminderDB.data = Array.isArray(window.mockReminders)
            ? JSON.parse(JSON.stringify(window.mockReminders))
            : [];

        this.renderUpcoming();
        this.updateReminderCount();

        // Close the upcoming-reminders modal on Escape (only bind once)
        if (!this._escListenerAdded) {
            this._escListenerAdded = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const overlay = document.getElementById('upcoming-reminders-overlay');
                    if (overlay && !overlay.classList.contains('hidden')) {
                        this.closeUpcomingModal();
                    }
                }
            });
        }

        // Refresh the upcoming list every 60 seconds so countdowns stay accurate
        this._intervalId = setInterval(() => {
            this.renderUpcoming();
            this.updateReminderCount();
        }, 60000);
    }
};
