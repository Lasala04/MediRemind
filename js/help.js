/* ============================================================
   help.js — Priority 4: Help & Support Section
   Exposes: window.helpSupport
   ============================================================ */

window.helpSupport = (function () {

    /* ── FAQ Data ───────────────────────────────────────────────── */
    const _faqs = [
        {
            q: 'How do I add a new medication?',
            a: 'Click the <strong>Add Medication</strong> button on the dashboard or in the sidebar menu. Fill in the medication name, dosage, frequency, and scheduled time. Click <em>Save Medication</em> to add it to your list.'
        },
        {
            q: 'How do I mark a medication as taken?',
            a: 'On each medication card, click the status badge (e.g., <strong>Pending</strong>) to cycle through the statuses: <em>Pending → Taken → Missed</em>. The dashboard stats and adherence chart update instantly.'
        },
        {
            q: 'How do I set a reminder for a medication?',
            a: 'Click the <strong>bell (🔔) button</strong> on any medication card, or use <em>Set Reminder</em> from the reminder form. Choose the time, frequency, and whether to receive Email and/or SMS notifications, then click <em>Set Reminder</em>.'
        },
        {
            q: 'How do I snooze or dismiss a reminder?',
            a: 'In the <strong>Upcoming Reminders</strong> modal (accessible from the sidebar menu), each reminder card has a <em>Snooze</em> button (15 min / 30 min / 1 hour) and a <em>Dismiss</em> button. Dismissed reminders are removed from the active list.'
        },
        {
            q: 'What does the Adherence Rate show?',
            a: 'The Adherence Rate is the percentage of your scheduled doses that you marked as <em>Taken</em> over the last 30 days. Green ≥ 80 %, Yellow ≥ 50 %, Red < 50 %. It updates every time you change a medication status.'
        },
        {
            q: 'How do I view my medication history?',
            a: 'Click <strong>Reports</strong> in the sidebar menu, then select the <em>Medication History</em> tab. You can filter by medication or status to find specific entries.'
        },
        {
            q: 'How do I export my data?',
            a: 'Open <strong>View Reports</strong>, go to the <em>Export Data</em> tab, and choose CSV or PDF. CSV exports work with Excel and Google Sheets; PDF exports are formatted reports suited for doctor visits. Exports cover the last 30 days.'
        },
        {
            q: 'How do I update my email or phone number?',
            a: 'Click your name / the <strong>Profile</strong> button in the navigation bar. On the <em>Profile</em> tab, edit your Full Name, Email, or Phone Number and click <em>Save Profile Changes</em>. An email change will require confirmation via the new address.'
        },
        {
            q: 'Where are my settings stored?',
            a: 'Notification preferences and reminder defaults are saved to your browser\'s <em>localStorage</em> and persist between sessions on this device. Profile data (name, email, phone) is stored securely in Supabase.'
        },
        {
            q: 'Is my data private and secure?',
            a: 'Yes. Authentication and profile data are handled by <strong>Supabase</strong>, which uses industry-standard encryption. Medication data in this demo is stored locally in-memory and does not leave your browser unless connected to a live Supabase project.'
        }
    ];

    /* ── Getting-Started Steps ──────────────────────────────────── */
    const _steps = [
        {
            icon: 'fa-user-plus',
            color: 'indigo',
            title: 'Create an Account',
            body: 'Click <em>Get Started Free</em> on the home screen, fill in your name, email, and a password. A phone number is optional — required only for SMS reminders.'
        },
        {
            icon: 'fa-pills',
            color: 'blue',
            title: 'Add Your Medications',
            body: 'After login, click <em>Add Medication</em>. Enter the name, dosage (e.g., 500 mg), how often you take it, and the time of day. Add notes for special instructions.'
        },
        {
            icon: 'fa-bell',
            color: 'green',
            title: 'Set Up Reminders',
            body: 'Tap the bell icon on any medication card to create a reminder. Select delivery via Email, SMS, or both. MediRemind will display upcoming reminders on your dashboard.'
        },
        {
            icon: 'fa-check-circle',
            color: 'teal',
            title: 'Track Your Doses',
            body: 'Each day, click the status badge on each medication to mark it as <em>Taken</em>. If you miss a dose, mark it <em>Missed</em>. Your adherence score updates in real-time.'
        },
        {
            icon: 'fa-chart-line',
            color: 'purple',
            title: 'Review Your Progress',
            body: 'Open <em>View Reports</em> to see adherence charts (daily / weekly / monthly), browse your full medication history, and export data to share with your healthcare provider.'
        }
    ];

    /* ── Panel open / close ─────────────────────────────────────── */
    function open() {
        const panel = document.getElementById('help-panel');
        if (!panel) return;
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        _render();
    }

    function close() {
        const panel = document.getElementById('help-panel');
        if (!panel) return;
        panel.classList.add('hidden');
        panel.style.display = 'none';
        document.body.style.overflow = '';
    }

    /* ── Render all content ─────────────────────────────────────── */
    function _render() {
        _renderGettingStarted();
        _renderFAQ();
    }

    /* ── Getting Started ────────────────────────────────────────── */
    function _renderGettingStarted() {
        const container = document.getElementById('help-getting-started');
        if (!container) return;

        const colorMap = {
            indigo: 'bg-indigo-100 text-indigo-600',
            blue:   'bg-blue-100 text-blue-600',
            green:  'bg-green-100 text-green-600',
            teal:   'bg-teal-100 text-teal-600',
            purple: 'bg-purple-100 text-purple-600'
        };

        container.innerHTML = _steps.map((step, i) => `
            <div class="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 rounded-xl ${colorMap[step.color] || 'bg-gray-100 text-gray-600'} flex items-center justify-center">
                        <i class="fas ${step.icon} text-xl"></i>
                    </div>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wide">Step ${i + 1}</span>
                    </div>
                    <h4 class="font-bold text-gray-800 mb-1">${step.title}</h4>
                    <p class="text-sm text-gray-600 leading-relaxed">${step.body}</p>
                </div>
            </div>
        `).join('');
    }

    /* ── FAQ accordion ──────────────────────────────────────────── */
    function _renderFAQ() {
        const container = document.getElementById('help-faq-list');
        if (!container) return;

        container.innerHTML = _faqs.map((faq, i) => `
            <div class="faq-item border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <button class="w-full text-left flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition"
                        onclick="window.helpSupport.toggleFAQ(${i})">
                    <span class="font-semibold text-gray-800 pr-4">${faq.q}</span>
                    <i id="faq-icon-${i}" class="fas fa-chevron-down text-gray-400 flex-shrink-0 transition-transform duration-200"></i>
                </button>
                <div id="faq-answer-${i}" class="hidden bg-gray-50 px-5 pb-4 pt-0 border-t border-gray-100">
                    <p class="text-sm text-gray-700 leading-relaxed mt-3">${faq.a}</p>
                </div>
            </div>
        `).join('');
    }

    /* ── Toggle FAQ item ────────────────────────────────────────── */
    function toggleFAQ(index) {
        const answer = document.getElementById(`faq-answer-${index}`);
        const icon   = document.getElementById(`faq-icon-${index}`);
        if (!answer || !icon) return;

        const isOpen = !answer.classList.contains('hidden');
        answer.classList.toggle('hidden', isOpen);
        icon.style.transform = isOpen ? '' : 'rotate(180deg)';
    }

    /* ── Init ───────────────────────────────────────────────────── */
    function init() {
        console.log('✅ helpSupport initialized');
    }

    return { open, close, toggleFAQ, init };

})();
