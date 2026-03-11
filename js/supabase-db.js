// supabase-db.js — Supabase data-access layer (cache-and-sync)
// Fetches user data from Supabase into existing in-memory arrays on init.
// All reads remain synchronous (from cache). Mutations write-through to Supabase.
// Falls back gracefully to mock data if Supabase is unavailable.

window.supabaseDB = (function () {

    var _userId = null;
    var _initialized = false;

    // Fire-and-forget Supabase write — logs errors, never blocks UI
    function _bg(promise) {
        if (!promise || typeof promise.then !== 'function') return;
        promise.then(function (res) {
            if (res && res.error) console.error('[supabaseDB] write-through:', res.error.message);
        }).catch(function (err) {
            console.error('[supabaseDB] write-through:', err.message || err);
        });
    }

    // ── Ensure the authenticated user has a profiles row ───────────────
    // Covers the case where signup profile-insert silently failed and
    // the medications FK targets profiles(id) instead of auth.users(id).
    var _profileVerified = false;

    async function _ensureProfile(userId) {
        if (_profileVerified) return;
        try {
            var { data } = await window.supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .maybeSingle();
            if (!data) {
                // Profile missing — create a minimal row so FK is satisfied
                var userRes = await window.supabase.auth.getUser();
                var meta = (userRes.data && userRes.data.user && userRes.data.user.user_metadata) || {};
                await window.supabase.from('profiles').upsert([{
                    id:        userId,
                    full_name: meta.full_name || 'User',
                    phone:     meta.phone || '',
                    timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone
                }], { onConflict: 'id' });
            }
            _profileVerified = true;
        } catch (err) {
            console.warn('[supabaseDB] _ensureProfile:', err.message);
        }
    }

    // ── Always-fresh user ID for write operations ──────────────────────
    async function _freshUserId() {
        var res = await window.supabase.auth.getUser();
        if (!res.data || !res.data.user) {
            throw new Error('Not authenticated \u2014 please log in again');
        }
        _userId = res.data.user.id;
        return _userId;
    }

    // ── Mapping: DB rows (snake_case) → frontend shape (camelCase) ─────────

    function _mapMed(row) {
        return {
            id:        row.id,
            name:      row.name,
            dosage:    row.dosage,
            frequency: row.frequency,
            time:      row.time,
            status:    row.status || 'pending',
            lastTaken: row.last_taken || 'Not taken yet',
            notes:     row.notes || '',
            createdAt: row.created_at
        };
    }

    function _mapArchived(row) {
        return {
            id:            row.id,
            name:          row.name,
            dosage:        row.dosage,
            frequency:     row.frequency,
            time:          row.time,
            status:        row.status || 'pending',
            lastTaken:     row.last_taken || 'Not taken yet',
            notes:         row.notes || '',
            archivedAt:    row.archived_at,
            archiveReason: row.archive_reason || 'completed',
            createdAt:     row.created_at
        };
    }

    function _mapReminder(row) {
        return {
            id:               row.id,
            medicationId:     row.medication_id,
            medicationName:   row.medication_name,
            medicationDosage: row.medication_dosage || '',
            time:             row.time,
            frequency:        row.frequency || 'daily',
            types:            row.types || ['email'],
            notes:            row.notes || '',
            status:           row.status || 'active',
            snoozeUntil:      row.snooze_until || null,
            createdAt:        row.created_at
        };
    }

    function _mapHistory(row) {
        return {
            id:               row.id,
            medicationId:     row.medication_id,
            medicationName:   row.medication_name,
            medicationDosage: row.medication_dosage || '',
            date:             row.date,
            scheduledTime:    row.scheduled_time,
            takenAt:          row.taken_at || null,
            status:           row.status || 'pending'
        };
    }

    // ── Init: fetch all user data & populate in-memory stores ──────────────

    async function init() {
        if (!window.supabase) return false;
        if (_initialized) return true;

        try {
            var userRes = await window.supabase.auth.getUser();
            if (!userRes.data || !userRes.data.user) return false;
            _userId = userRes.data.user.id;

            // Parallel fetch of all four data domains
            var results = await Promise.all([
                window.supabase
                    .from('medications').select('*')
                    .eq('user_id', _userId).eq('is_archived', false)
                    .order('created_at', { ascending: false }),

                window.supabase
                    .from('medications').select('*')
                    .eq('user_id', _userId).eq('is_archived', true)
                    .order('archived_at', { ascending: false }),

                window.supabase
                    .from('reminders').select('*')
                    .eq('user_id', _userId),

                window.supabase
                    .from('adherence_history').select('*')
                    .eq('user_id', _userId)
                    .gte('date', _cutoffDate())
                    .order('date', { ascending: true })
            ]);

            var meds     = results[0]; if (meds.error) throw meds.error;
            var archived = results[1]; if (archived.error) throw archived.error;
            var rems     = results[2]; if (rems.error) throw rems.error;
            var hist     = results[3]; if (hist.error) throw hist.error;

            // ── Populate in-memory arrays ──────────────────────────────────

            // Active medications → window.mockMedications
            window.mockMedications.length = 0;
            (meds.data || []).forEach(function (r) {
                window.mockMedications.push(_mapMed(r));
            });

            // Archived medications → window.archivedMedications
            window.archivedMedications.length = 0;
            (archived.data || []).forEach(function (r) {
                window.archivedMedications.push(_mapArchived(r));
            });

            // Reminders → window.mockReminders (consumed by reminders.init())
            window.mockReminders = (rems.data || []).map(_mapReminder);

            // History → window.mockHistory (consumed by reports.init())
            window.mockHistory = (hist.data || []).map(_mapHistory);

            // ── Patch mutation methods for write-through ───────────────────
            _patchMedicationDB();
            _patchReminderDB();
            _patchHistoryDB();

            // Persist Supabase data to localStorage as backup
            if (typeof window._persistMedications === 'function') {
                window._persistMedications();
            }

            _initialized = true;
            return true;

        } catch (err) {
            console.warn('[supabaseDB] Init failed — falling back to mock data:', err.message);
            return false;
        }
    }

    function _cutoffDate() {
        var d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Patch: medicationDB  (defined in mock-data.js)
    // ═══════════════════════════════════════════════════════════════════════

    function _patchMedicationDB() {
        var db = window.medicationDB;

        // ── add ────────────────────────────────────────────────────────────
        db.add = async function (data) {
            // Always fetch a fresh, server-validated user ID before every write
            var uid = await _freshUserId();

            // Guarantee the profiles row exists (covers silent signup failure)
            await _ensureProfile(uid);

            var id = crypto.randomUUID();
            var med = {
                id:        id,
                name:      data.name,
                dosage:    data.dosage,
                frequency: data.frequency,
                time:      data.time,
                status:    'pending',
                lastTaken: 'Not taken yet',
                notes:     data.notes || '',
                createdAt: new Date().toISOString()
            };

            var res = await window.supabase.from('medications').insert([{
                id:          id,
                user_id:     uid,
                name:        data.name,
                dosage:      data.dosage,
                frequency:   data.frequency,
                time:        data.time,
                status:      'pending',
                last_taken:  'Not taken yet',
                notes:       data.notes || '',
                is_archived: false
            }]).select();

            if (res.error) {
                console.error('[supabaseDB] add failed:', res.error.message, '| user_id was:', uid);
                throw new Error(res.error.message);
            }
            if (!res.data || res.data.length === 0) {
                console.error('[supabaseDB] add returned no rows — possible RLS block');
                throw new Error('Insert failed — access denied or conflict');
            }

            // Only add to in-memory array after Supabase confirms success
            window.mockMedications.unshift(med);
            if (typeof window._persistMedications === 'function') window._persistMedications();
            return med;
        };

        // ── update ─────────────────────────────────────────────────────────
        db.update = async function (id, data) {
            // Always fetch a fresh, server-validated user ID before every write
            var uid = await _freshUserId();

            // Guarantee the profiles row exists
            await _ensureProfile(uid);

            var idx = window.mockMedications.findIndex(function (m) { return m.id === id; });
            if (idx === -1) return null;

            var updates = { updated_at: new Date().toISOString() };
            if (data.name !== undefined)      updates.name      = data.name;
            if (data.dosage !== undefined)    updates.dosage    = data.dosage;
            if (data.frequency !== undefined) updates.frequency = data.frequency;
            if (data.time !== undefined)      updates.time      = data.time;
            if (data.notes !== undefined)     updates.notes     = data.notes;

            var res = await window.supabase.from('medications').update(updates)
                .eq('id', id)
                .eq('user_id', uid)
                .select();

            if (res.error) {
                console.error('[supabaseDB] update failed:', res.error.message, '| user_id was:', uid);
                throw new Error(res.error.message);
            }
            if (!res.data || res.data.length === 0) {
                console.error('[supabaseDB] update returned no rows — possible RLS block or row not found');
                throw new Error('Update failed — row not found or access denied');
            }

            // Only apply in-memory update after Supabase confirms success
            window.mockMedications[idx] = Object.assign(
                {}, window.mockMedications[idx], data, { id: id }
            );
            if (typeof window._persistMedications === 'function') window._persistMedications();
            return window.mockMedications[idx];
        };

        // ── delete ─────────────────────────────────────────────────────────
        db.delete = function (id) {
            var idx = window.mockMedications.findIndex(function (m) { return m.id === id; });
            if (idx === -1) return false;
            window.mockMedications.splice(idx, 1);

            _bg(window.supabase.from('medications').delete().eq('id', id));

            if (typeof window._persistMedications === 'function') window._persistMedications();
            return true;
        };

        // ── updateStatus ───────────────────────────────────────────────────
        db.updateStatus = function (id, status) {
            var med = this.getById(id);
            if (!med) return false;

            med.status = status;
            var now     = new Date();
            var timeStr = now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: true
            });
            med.lastTaken = 'Today, ' + timeStr;

            _bg(window.supabase.from('medications').update({
                status:     status,
                last_taken: med.lastTaken,
                updated_at: now.toISOString()
            }).eq('id', id));

            if (typeof window._persistMedications === 'function') window._persistMedications();
            return true;
        };

        // ── archive ────────────────────────────────────────────────────────
        db.archive = function (id) {
            var idx = window.mockMedications.findIndex(function (m) { return m.id === id; });
            if (idx === -1) return null;

            var med = window.mockMedications.splice(idx, 1)[0];
            med.archivedAt    = new Date().toISOString();
            med.archiveReason = 'completed';
            window.archivedMedications.unshift(med);

            _bg(window.supabase.from('medications').update({
                is_archived:    true,
                archived_at:    med.archivedAt,
                archive_reason: 'completed',
                updated_at:     med.archivedAt
            }).eq('id', id));

            if (typeof window._persistMedications === 'function') window._persistMedications();
            return med;
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Patch: reminderDB  (defined in reminders.js)
    // ═══════════════════════════════════════════════════════════════════════

    function _patchReminderDB() {
        var db = window.reminderDB;

        // ── add ────────────────────────────────────────────────────────────
        db.add = function (data) {
            var id = crypto.randomUUID();
            var reminder = {
                id:               id,
                medicationId:     data.medicationId,
                medicationName:   data.medicationName,
                medicationDosage: data.medicationDosage || '',
                time:             data.time,
                frequency:        data.frequency || 'daily',
                types:            data.types || ['email'],
                notes:            data.notes || '',
                status:           'active',
                snoozeUntil:      null,
                createdAt:        new Date().toISOString()
            };
            this.data.push(reminder);

            _bg(window.supabase.from('reminders').insert([{
                id:                id,
                user_id:           _userId,
                medication_id:     data.medicationId,
                medication_name:   data.medicationName,
                medication_dosage: data.medicationDosage || '',
                time:              data.time,
                frequency:         data.frequency || 'daily',
                types:             data.types || ['email'],
                notes:             data.notes || '',
                status:            'active',
                snooze_until:      null
            }]));

            return reminder;
        };

        // ── update ─────────────────────────────────────────────────────────
        db.update = function (id, reminderData) {
            var idx = this.data.findIndex(function (r) { return r.id === id; });
            if (idx === -1) return null;
            this.data[idx] = Object.assign({}, this.data[idx], reminderData, { id: id });

            var updates = {};
            if (reminderData.time !== undefined)      updates.time      = reminderData.time;
            if (reminderData.frequency !== undefined)  updates.frequency  = reminderData.frequency;
            if (reminderData.types !== undefined)      updates.types      = reminderData.types;
            if (reminderData.notes !== undefined)      updates.notes      = reminderData.notes;
            if (Object.keys(updates).length > 0) {
                _bg(window.supabase.from('reminders').update(updates).eq('id', id));
            }

            return this.data[idx];
        };

        // ── delete ─────────────────────────────────────────────────────────
        db.delete = function (id) {
            var idx = this.data.findIndex(function (r) { return r.id === id; });
            if (idx === -1) return false;
            this.data.splice(idx, 1);

            _bg(window.supabase.from('reminders').delete().eq('id', id));

            return true;
        };

        // ── snooze ─────────────────────────────────────────────────────────
        db.snooze = function (id, minutes) {
            var reminder = this.getById(id);
            if (!reminder) return false;

            var snoozeUntil = new Date();
            snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
            reminder.status      = 'snoozed';
            reminder.snoozeUntil = snoozeUntil.toISOString();

            _bg(window.supabase.from('reminders').update({
                status:       'snoozed',
                snooze_until: reminder.snoozeUntil
            }).eq('id', id));

            return true;
        };

        // ── dismiss ────────────────────────────────────────────────────────
        db.dismiss = function (id) {
            var reminder = this.getById(id);
            if (!reminder) return false;

            reminder.status      = 'dismissed';
            reminder.dismissedAt = new Date().toISOString();

            _bg(window.supabase.from('reminders').update({
                status:       'dismissed',
                dismissed_at: reminder.dismissedAt
            }).eq('id', id));

            return true;
        };

        // ── reactivate ─────────────────────────────────────────────────────
        db.reactivate = function (id) {
            var reminder = this.getById(id);
            if (!reminder) return false;

            reminder.status      = 'active';
            reminder.snoozeUntil = null;

            _bg(window.supabase.from('reminders').update({
                status:       'active',
                snooze_until: null
            }).eq('id', id));

            return true;
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Patch: historyDB  (defined in mock-data.js)
    // ═══════════════════════════════════════════════════════════════════════

    function _patchHistoryDB() {
        var db = window.historyDB;

        db.recordStatusChange = function (medication, newStatus) {
            var today    = new Date().toISOString().split('T')[0];
            var existing = this.data.find(function (r) {
                return r.date === today && r.medicationId === medication.id;
            });

            if (existing) {
                existing.status  = newStatus;
                existing.takenAt = newStatus === 'taken' ? new Date().toISOString() : null;

                _bg(window.supabase.from('adherence_history').update({
                    status:   newStatus,
                    taken_at: existing.takenAt
                }).eq('id', existing.id));

            } else {
                var id     = crypto.randomUUID();
                var record = {
                    id:               id,
                    medicationId:     medication.id,
                    medicationName:   medication.name,
                    medicationDosage: medication.dosage,
                    date:             today,
                    scheduledTime:    medication.time,
                    takenAt:          newStatus === 'taken' ? new Date().toISOString() : null,
                    status:           newStatus
                };
                this.data.push(record);

                _bg(window.supabase.from('adherence_history').insert([{
                    id:                id,
                    user_id:           _userId,
                    medication_id:     medication.id,
                    medication_name:   medication.name,
                    medication_dosage: medication.dosage,
                    date:              today,
                    scheduled_time:    medication.time,
                    taken_at:          record.takenAt,
                    status:            newStatus
                }]));
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════════════

    function reset() {
        _userId = null;
        _initialized = false;
        _profileVerified = false;
    }

    return { init: init, reset: reset };

})();
