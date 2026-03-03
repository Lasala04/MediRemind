/* ============================================================
   profile.js — Priority 4: Profile Management & Settings
   Exposes: window.userProfile
   ============================================================ */

window.userProfile = (function () {

    /* ── Internal State ────────────────────────────────────────── */
    const SETTINGS_KEY = 'mediremind_settings';

    const _defaultSettings = {
        emailNotifications: true,
        smsNotifications:   false,
        defaultReminderTime: '08:00',
        defaultFrequency:   'daily',
        advanceNoticeMin:   15,
        snoozeDurationMin:  15,
        autoMarkMissed:     true
    };

    let _settings    = _loadSettings();
    let _currentTab  = 'profile';
    let _userData    = null;   // cached Supabase user object

    /* ── Persistence helpers ───────────────────────────────────── */
    function _loadSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? Object.assign({}, _defaultSettings, JSON.parse(raw)) : Object.assign({}, _defaultSettings);
        } catch {
            return Object.assign({}, _defaultSettings);
        }
    }

    function _saveSettings(newSettings) {
        _settings = Object.assign({}, _settings, newSettings);
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(_settings));
        } catch (e) {
            console.warn('Could not persist settings:', e);
        }
    }

    /* ── Panel open / close ────────────────────────────────────── */
    function open() {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        _currentTab = 'profile';
        _fetchAndRender();
    }

    function close() {
        const panel = document.getElementById('profile-panel');
        if (!panel) return;
        panel.classList.add('hidden');
        panel.style.display = 'none';
        document.body.style.overflow = '';
    }

    /* ── Tab switching ─────────────────────────────────────────── */
    function showTab(tab) {
        _currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('#profile-panel .profile-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.remove('profile-tab-inactive');
                btn.classList.add('profile-tab-active');
            } else {
                btn.classList.remove('profile-tab-active');
                btn.classList.add('profile-tab-inactive');
            }
        });

        // Update panes
        document.querySelectorAll('#profile-panel .profile-tab-pane').forEach(pane => {
            if (pane.dataset.pane === tab) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        });

        if (tab === 'profile')  _renderProfileTab();
        if (tab === 'settings') _renderSettingsTab();
    }

    /* ── Fetch user data from Supabase then render ─────────────── */
    async function _fetchAndRender() {
        _userData = null;

        // Try to load from Supabase
        if (window.supabase) {
            try {
                const { data } = await window.supabase.auth.getUser();
                if (data?.user) {
                    _userData = data.user;

                    // Also fetch extended profile row
                    const { data: profileRow } = await window.supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', _userData.id)
                        .single();

                    if (profileRow) {
                        _userData._profile = profileRow;
                    }
                }
            } catch (err) {
                console.warn('Could not fetch Supabase user — showing mock profile:', err.message);
            }
        }

        // Fall through to render whichever tab is active
        showTab(_currentTab);
    }

    /* ── Profile Tab ───────────────────────────────────────────── */
    function _renderProfileTab() {
        const container = document.getElementById('profile-tab-content');
        if (!container) return;

        const name  = _userData?._profile?.full_name
                   || _userData?.user_metadata?.full_name
                   || 'User';
        const email = _userData?.email  || '(no email)';
        const phone = _userData?._profile?.phone
                   || _userData?.user_metadata?.phone
                   || '';
        const joinedRaw = _userData?.created_at;
        const joined = joinedRaw
            ? new Date(joinedRaw).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
            : 'N/A';

        container.innerHTML = `
            <!-- Avatar + summary -->
            <div class="flex items-center gap-5 mb-8">
                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                            flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-lg">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${_escHtml(name)}</h3>
                    <p class="text-gray-500 text-sm">${_escHtml(email)}</p>
                    <span class="inline-block mt-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        <i class="fas fa-calendar-alt mr-1"></i>Member since ${joined}
                    </span>
                </div>
            </div>

            <!-- Edit form -->
            <form onsubmit="event.preventDefault(); window.userProfile.saveProfile();" class="space-y-5">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                        <i class="fas fa-user mr-1 text-indigo-400"></i>Full Name
                    </label>
                    <input id="profile-name" type="text" value="${_escHtml(name)}"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                           placeholder="Your full name">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                        <i class="fas fa-envelope mr-1 text-indigo-400"></i>Email Address
                    </label>
                    <input id="profile-email" type="email" value="${_escHtml(email)}"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                           placeholder="you@example.com">
                    <p class="text-xs text-gray-400 mt-1">
                        <i class="fas fa-info-circle mr-1"></i>Changing email will send a confirmation link to the new address.
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">
                        <i class="fas fa-phone mr-1 text-indigo-400"></i>Phone Number
                        <span class="text-gray-400 font-normal">(SMS reminders)</span>
                    </label>
                    <input id="profile-phone" type="tel" value="${_escHtml(phone)}"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                           placeholder="+1 555 000 0000">
                </div>

                <button type="submit"
                        id="save-profile-btn"
                        class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold
                               hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg">
                    <i class="fas fa-save mr-2"></i>Save Profile Changes
                </button>
            </form>

            <!-- Divider -->
            <div class="border-t border-gray-100 my-8"></div>

            <!-- Password change -->
            <div>
                <h4 class="text-base font-bold text-gray-800 mb-4">
                    <i class="fas fa-lock mr-2 text-indigo-400"></i>Change Password
                </h4>
                <form onsubmit="event.preventDefault(); window.userProfile.changePassword();" class="space-y-4">
                    <input id="profile-new-password" type="password" placeholder="New password (min. 6 characters)"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition">
                    <input id="profile-confirm-password" type="password" placeholder="Confirm new password"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition">
                    <button type="submit"
                            class="w-full border-2 border-indigo-400 text-indigo-700 py-3 rounded-xl font-semibold
                                   hover:bg-indigo-50 transition">
                        <i class="fas fa-key mr-2"></i>Update Password
                    </button>
                </form>
            </div>

            <!-- Divider -->
            <div class="border-t border-gray-100 my-8"></div>

            <!-- Danger zone -->
            <div class="bg-red-50 border border-red-100 rounded-xl p-5">
                <h4 class="text-sm font-bold text-red-700 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Danger Zone
                </h4>
                <p class="text-sm text-red-600 mb-4">
                    Logging out will end your current session. All data in this demo is stored locally and will persist.
                </p>
                <button onclick="window.userProfile.close(); window.logout();"
                        class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition shadow">
                    <i class="fas fa-sign-out-alt mr-2"></i>Sign Out
                </button>
            </div>
        `;
    }

    /* ── Settings Tab ──────────────────────────────────────────── */
    function _renderSettingsTab() {
        const container = document.getElementById('settings-tab-content');
        if (!container) return;

        const s = _settings;

        container.innerHTML = `
            <!-- Notification Channels -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-1">
                    <i class="fas fa-bell mr-2 text-indigo-400"></i>Notification Channels
                </h4>
                <p class="text-sm text-gray-500 mb-5">Choose how you want to receive medication reminders.</p>

                <div class="space-y-4">
                    <!-- Email toggle -->
                    <label class="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-envelope text-indigo-600"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">Email Notifications</p>
                                <p class="text-xs text-gray-500">Receive reminders to your registered email</p>
                            </div>
                        </div>
                        <div class="relative">
                            <input type="checkbox" id="setting-email-notif" class="sr-only peer"
                                   ${s.emailNotifications ? 'checked' : ''}
                                   onchange="window.userProfile._onSettingChange('emailNotifications', this.checked)">
                            <div class="w-12 h-6 bg-gray-200 peer-checked:bg-indigo-500 rounded-full transition peer-focus:ring-2 peer-focus:ring-indigo-300"></div>
                            <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-6"></div>
                        </div>
                    </label>

                    <!-- SMS toggle -->
                    <label class="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-sms text-green-600"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">SMS Notifications</p>
                                <p class="text-xs text-gray-500">Receive text messages to your phone number</p>
                            </div>
                        </div>
                        <div class="relative">
                            <input type="checkbox" id="setting-sms-notif" class="sr-only peer"
                                   ${s.smsNotifications ? 'checked' : ''}
                                   onchange="window.userProfile._onSettingChange('smsNotifications', this.checked)">
                            <div class="w-12 h-6 bg-gray-200 peer-checked:bg-green-500 rounded-full transition peer-focus:ring-2 peer-focus:ring-green-300"></div>
                            <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-6"></div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Reminder Defaults -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-1">
                    <i class="fas fa-clock mr-2 text-indigo-400"></i>Reminder Defaults
                </h4>
                <p class="text-sm text-gray-500 mb-5">Default values pre-filled when setting a new reminder.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Default Reminder Time</label>
                        <input type="time" id="setting-default-time" value="${s.defaultReminderTime}"
                               onchange="window.userProfile._onSettingChange('defaultReminderTime', this.value)"
                               class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Default Frequency</label>
                        <select id="setting-default-freq"
                                onchange="window.userProfile._onSettingChange('defaultFrequency', this.value)"
                                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white">
                            <option value="once"    ${s.defaultFrequency === 'once'    ? 'selected':''}>Once</option>
                            <option value="daily"   ${s.defaultFrequency === 'daily'   ? 'selected':''}>Daily</option>
                            <option value="weekly"  ${s.defaultFrequency === 'weekly'  ? 'selected':''}>Weekly</option>
                            <option value="monthly" ${s.defaultFrequency === 'monthly' ? 'selected':''}>Monthly</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Advanced Preferences -->
            <div class="bg-white rounded-2xl border border-gray-200 p-6 mb-5 shadow-sm">
                <h4 class="font-bold text-gray-800 mb-1">
                    <i class="fas fa-sliders-h mr-2 text-indigo-400"></i>Advanced Preferences
                </h4>
                <p class="text-sm text-gray-500 mb-5">Fine-tune how the app behaves for reminders and dose tracking.</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            Advance Notice
                            <span class="text-gray-400 font-normal">(minutes before dose)</span>
                        </label>
                        <select id="setting-advance"
                                onchange="window.userProfile._onSettingChange('advanceNoticeMin', parseInt(this.value))"
                                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white">
                            <option value="0"  ${s.advanceNoticeMin ===  0 ? 'selected':''}>At scheduled time</option>
                            <option value="5"  ${s.advanceNoticeMin ===  5 ? 'selected':''}>5 minutes before</option>
                            <option value="10" ${s.advanceNoticeMin === 10 ? 'selected':''}>10 minutes before</option>
                            <option value="15" ${s.advanceNoticeMin === 15 ? 'selected':''}>15 minutes before</option>
                            <option value="30" ${s.advanceNoticeMin === 30 ? 'selected':''}>30 minutes before</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">
                            Default Snooze Duration
                        </label>
                        <select id="setting-snooze"
                                onchange="window.userProfile._onSettingChange('snoozeDurationMin', parseInt(this.value))"
                                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 transition bg-white">
                            <option value="5"  ${s.snoozeDurationMin ===  5 ? 'selected':''}>5 minutes</option>
                            <option value="10" ${s.snoozeDurationMin === 10 ? 'selected':''}>10 minutes</option>
                            <option value="15" ${s.snoozeDurationMin === 15 ? 'selected':''}>15 minutes</option>
                            <option value="30" ${s.snoozeDurationMin === 30 ? 'selected':''}>30 minutes</option>
                            <option value="60" ${s.snoozeDurationMin === 60 ? 'selected':''}>1 hour</option>
                        </select>
                    </div>
                </div>

                <!-- Auto mark missed toggle -->
                <div class="mt-5">
                    <label class="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-times-circle text-red-500"></i>
                            </div>
                            <div>
                                <p class="font-medium text-gray-800">Auto-mark as Missed</p>
                                <p class="text-xs text-gray-500">Automatically mark overdue doses as missed after 2 hours</p>
                            </div>
                        </div>
                        <div class="relative">
                            <input type="checkbox" id="setting-auto-missed" class="sr-only peer"
                                   ${s.autoMarkMissed ? 'checked' : ''}
                                   onchange="window.userProfile._onSettingChange('autoMarkMissed', this.checked)">
                            <div class="w-12 h-6 bg-gray-200 peer-checked:bg-red-400 rounded-full transition peer-focus:ring-2 peer-focus:ring-red-300"></div>
                            <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-6"></div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Reset -->
            <div class="flex justify-end">
                <button onclick="window.userProfile.resetSettings()"
                        class="text-sm text-gray-500 hover:text-red-600 flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition">
                    <i class="fas fa-undo"></i> Reset to defaults
                </button>
            </div>
        `;
    }

    /* ── Live setting change (auto-save) ───────────────────────── */
    function _onSettingChange(key, value) {
        _saveSettings({ [key]: value });
        // Show subtle confirmation
        _flashSaved();
    }

    function _flashSaved() {
        let flash = document.getElementById('settings-saved-flash');
        if (!flash) {
            flash = document.createElement('div');
            flash.id = 'settings-saved-flash';
            flash.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-5 py-2 rounded-full shadow-lg z-[200] transition-opacity duration-300';
            flash.textContent = '✓ Preferences saved';
            document.body.appendChild(flash);
        }
        flash.style.opacity = '1';
        clearTimeout(flash._timer);
        flash._timer = setTimeout(() => { flash.style.opacity = '0'; }, 1800);
    }

    /* ── Save Profile ──────────────────────────────────────────── */
    async function saveProfile() {
        const name  = document.getElementById('profile-name')?.value.trim();
        const email = document.getElementById('profile-email')?.value.trim();
        const phone = document.getElementById('profile-phone')?.value.trim();

        if (!name) { window.notify.warning('Name cannot be empty.'); return; }
        if (!email) { window.notify.warning('Email cannot be empty.'); return; }

        const btn = document.getElementById('save-profile-btn');
        if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving…'; btn.disabled = true; }

        let saved = false;

        if (window.supabase && _userData) {
            try {
                // Update auth metadata (name + phone)
                const updates = { data: { full_name: name, phone: phone || null } };

                // Only send email update if it changed (triggers confirmation email)
                if (email !== (_userData.email || '')) {
                    updates.email = email;
                }

                const { error: authErr } = await window.supabase.auth.updateUser(updates);
                if (authErr) throw new Error(authErr.message);

                // Update profiles table
                const { error: profErr } = await window.supabase
                    .from('profiles')
                    .update({ full_name: name, phone: phone || null })
                    .eq('id', _userData.id);

                if (profErr) console.warn('Profile table update:', profErr.message);

                // Update cached data
                if (_userData.user_metadata) {
                    _userData.user_metadata.full_name = name;
                    _userData.user_metadata.phone = phone;
                }
                if (_userData._profile) {
                    _userData._profile.full_name = name;
                    _userData._profile.phone = phone;
                }

                saved = true;

                if (email !== (_userData.email || '')) {
                    window.notify.info('A confirmation link has been sent to your new email address.', 6000);
                } else {
                    window.notify.success('Profile updated successfully!');
                }

                // Re-render avatar/name
                _renderProfileTab();

            } catch (err) {
                window.notify.error('Save failed: ' + err.message);
            }
        } else {
            // Mock / offline mode — just update cached object
            if (!_userData) _userData = {};
            if (!_userData.user_metadata) _userData.user_metadata = {};
            _userData.user_metadata.full_name = name;
            _userData.user_metadata.phone     = phone;
            if (!_userData._profile) _userData._profile = {};
            _userData._profile.full_name = name;
            _userData._profile.phone     = phone;
            saved = true;
            window.notify.success('Profile saved locally (demo mode).');
            _renderProfileTab();
        }

        if (btn && !saved) {
            btn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Profile Changes';
            btn.disabled = false;
        }
    }

    /* ── Change Password ───────────────────────────────────────── */
    async function changePassword() {
        const newPw  = document.getElementById('profile-new-password')?.value;
        const confPw = document.getElementById('profile-confirm-password')?.value;

        if (!newPw || newPw.length < 6) {
            window.notify.warning('Password must be at least 6 characters.');
            return;
        }

        if (newPw !== confPw) {
            window.notify.warning('Passwords do not match.');
            return;
        }

        if (window.supabase) {
            try {
                const { error } = await window.supabase.auth.updateUser({ password: newPw });
                if (error) throw new Error(error.message);
                window.notify.success('Password updated successfully!');
                document.getElementById('profile-new-password').value = '';
                document.getElementById('profile-confirm-password').value = '';
            } catch (err) {
                window.notify.error('Password update failed: ' + err.message);
            }
        } else {
            window.notify.info('Password change unavailable in demo mode.');
        }
    }

    /* ── Reset Settings ─────────────────────────────────────────── */
    function resetSettings() {
        if (!window.modal) return;
        window.modal.confirm(
            'Are you sure you want to reset all preferences to their defaults?',
            () => {
                _settings = Object.assign({}, _defaultSettings);
                try { localStorage.removeItem(SETTINGS_KEY); } catch {}
                _renderSettingsTab();
                window.notify.info('Preferences reset to defaults.');
            },
            { confirmText: 'Reset', confirmClass: 'red', title: 'Reset Preferences' }
        );
    }

    /* ── Public API  ────────────────────────────────────────────── */
    function getSettings() {
        return Object.assign({}, _settings);
    }

    /* ── Utility ────────────────────────────────────────────────── */
    function _escHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ── Init ───────────────────────────────────────────────────── */
    function init() {
        // Nothing to seed — settings loaded from localStorage on module init
        console.log('✅ userProfile initialized | settings:', _settings);
    }

    return {
        open,
        close,
        showTab,
        saveProfile,
        changePassword,
        resetSettings,
        getSettings,
        init,
        // exposed for inline onchange handlers
        _onSettingChange,
        _renderProfileTab,
        _renderSettingsTab
    };

})();
