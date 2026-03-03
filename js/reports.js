// reports.js — Priority 3: Reports & Analytics
// Features: Adherence Charts (daily/weekly/monthly), Medication History Timeline

window.reports = (function () {

    // ── Private State ──────────────────────────────────────────────────────────
    let _chart          = null;
    let _currentPeriod  = 'weekly';
    let _historyStatus  = 'all';
    let _historyMed     = 'all';
    let _initialized    = false;

    // ── Init (seed historyDB once) ─────────────────────────────────────────────
    function _init() {
        if (_initialized) return;
        if (window.mockHistory && window.historyDB && window.historyDB.data.length === 0) {
            window.historyDB.data = JSON.parse(JSON.stringify(window.mockHistory));
            console.log('✅ historyDB seeded with', window.historyDB.data.length, 'records');
        }
        _initialized = true;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    function _fmtDate(dateStr) {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short', day: 'numeric'
        });
    }

    function _statusStyle(status) {
        const map = {
            taken:   { bg: 'bg-green-100',  text: 'text-green-700',  dot: '#10b981' },
            skipped: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: '#f59e0b' },
            missed:  { bg: 'bg-red-100',    text: 'text-red-700',    dot: '#ef4444' },
            pending: { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: '#9ca3af' }
        };
        return map[status] || map.pending;
    }

    function _destroyChart() {
        if (_chart) { _chart.destroy(); _chart = null; }
    }

    // ── Adherence Data Builders ────────────────────────────────────────────────
    function _buildDailyData() {
        const today = new Date();
        const days  = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        const labels = days.map(_fmtDate);
        const taken   = [];
        const skipped = [];
        const missed  = [];
        days.forEach(day => {
            const recs = window.historyDB.getByDate(day);
            taken.push(recs.filter(r => r.status === 'taken').length);
            skipped.push(recs.filter(r => r.status === 'skipped').length);
            missed.push(recs.filter(r => r.status === 'missed').length);
        });
        return { labels, taken, skipped, missed };
    }

    function _buildWeeklyData() {
        const today = new Date();
        const weeks = [];
        for (let w = 3; w >= 0; w--) {
            const wEnd   = new Date(today);
            wEnd.setDate(today.getDate() - w * 7);
            const wStart = new Date(wEnd);
            wStart.setDate(wEnd.getDate() - 6);

            const label = `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            let t = 0, s = 0, m = 0;
            for (let d = 0; d <= 6; d++) {
                const day = new Date(wStart);
                day.setDate(wStart.getDate() + d);
                const recs = window.historyDB.getByDate(day.toISOString().split('T')[0]);
                t += recs.filter(r => r.status === 'taken').length;
                s += recs.filter(r => r.status === 'skipped').length;
                m += recs.filter(r => r.status === 'missed').length;
            }
            weeks.push({ label, t, s, m });
        }
        return {
            labels:  weeks.map(w => w.label),
            taken:   weeks.map(w => w.t),
            skipped: weeks.map(w => w.s),
            missed:  weeks.map(w => w.m)
        };
    }

    function _buildMonthlyData() {
        const today  = new Date();
        const months = [];
        for (let mo = 2; mo >= 0; mo--) {
            const d     = new Date(today.getFullYear(), today.getMonth() - mo, 1);
            const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const yr    = d.getFullYear();
            const mn    = d.getMonth();
            let t = 0, s = 0, m = 0;
            window.historyDB.getAll().forEach(r => {
                const rd = new Date(r.date + 'T00:00:00');
                if (rd.getFullYear() === yr && rd.getMonth() === mn) {
                    if (r.status === 'taken')   t++;
                    else if (r.status === 'skipped') s++;
                    else if (r.status === 'missed')  m++;
                }
            });
            months.push({ label, t, s, m });
        }
        return {
            labels:  months.map(m => m.label),
            taken:   months.map(m => m.t),
            skipped: months.map(m => m.s),
            missed:  months.map(m => m.m)
        };
    }

    // ── Chart Render ──────────────────────────────────────────────────────────
    function _renderChart(period) {
        _currentPeriod = period;
        _destroyChart();

        const canvas = document.getElementById('adherence-chart-canvas');
        if (!canvas) return;

        if (typeof Chart === 'undefined') {
            canvas.parentElement.innerHTML =
                '<p class="text-center text-gray-400 py-10"><i class="fas fa-exclamation-triangle mr-2"></i>Chart library not loaded. Please refresh.</p>';
            return;
        }

        const data = period === 'daily'   ? _buildDailyData()
                   : period === 'monthly' ? _buildMonthlyData()
                   :                        _buildWeeklyData();

        _chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels:   data.labels,
                datasets: [
                    {
                        label:           'Taken',
                        data:            data.taken,
                        backgroundColor: 'rgba(16, 185, 129, 0.85)',
                        borderColor:     '#10b981',
                        borderWidth:     1,
                        borderRadius:    5
                    },
                    {
                        label:           'Skipped',
                        data:            data.skipped,
                        backgroundColor: 'rgba(245, 158, 11, 0.85)',
                        borderColor:     '#f59e0b',
                        borderWidth:     1,
                        borderRadius:    5
                    },
                    {
                        label:           'Missed',
                        data:            data.missed,
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        borderColor:     '#ef4444',
                        borderWidth:     1,
                        borderRadius:    5
                    }
                ]
            },
            options: {
                responsive:          true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels:   { usePointStyle: true, padding: 20, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: function (ctx) {
                                const i   = ctx[0].dataIndex;
                                const tot = (data.taken[i] || 0) + (data.skipped[i] || 0) + (data.missed[i] || 0);
                                const pct = tot > 0 ? Math.round(((data.taken[i] || 0) / tot) * 100) : 0;
                                return [`Adherence: ${pct}%`];
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: false, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });

        _updateSummary(data);
    }

    function _updateSummary(data) {
        const el = document.getElementById('adherence-summary');
        if (!el) return;
        const tot  = data.taken.reduce((a,b)=>a+b,0) + data.skipped.reduce((a,b)=>a+b,0) + data.missed.reduce((a,b)=>a+b,0);
        const tk   = data.taken.reduce((a,b)=>a+b,0);
        const sk   = data.skipped.reduce((a,b)=>a+b,0);
        const mi   = data.missed.reduce((a,b)=>a+b,0);
        const rate = tot > 0 ? Math.round((tk / tot) * 100) : 0;
        const rateColor = rate >= 80 ? 'text-green-600 bg-green-50 border-green-100'
                        : rate >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-100'
                        :              'text-red-600 bg-red-50 border-red-100';

        el.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                <div class="text-center p-4 rounded-xl border ${rateColor}">
                    <p class="text-3xl font-bold">${rate}%</p>
                    <p class="text-xs font-semibold mt-1 uppercase tracking-wide">Adherence Rate</p>
                </div>
                <div class="text-center p-4 rounded-xl border bg-blue-50 border-blue-100 text-blue-600">
                    <p class="text-3xl font-bold">${tk}</p>
                    <p class="text-xs font-semibold mt-1 uppercase tracking-wide">Doses Taken</p>
                </div>
                <div class="text-center p-4 rounded-xl border bg-yellow-50 border-yellow-100 text-yellow-600">
                    <p class="text-3xl font-bold">${sk}</p>
                    <p class="text-xs font-semibold mt-1 uppercase tracking-wide">Skipped</p>
                </div>
                <div class="text-center p-4 rounded-xl border bg-red-50 border-red-100 text-red-600">
                    <p class="text-3xl font-bold">${mi}</p>
                    <p class="text-xs font-semibold mt-1 uppercase tracking-wide">Missed</p>
                </div>
            </div>
        `;
    }

    // ── History Render ────────────────────────────────────────────────────────
    function _renderHistory() {
        const container = document.getElementById('history-list');
        if (!container) return;

        let records = window.historyDB.getAll();

        if (_historyStatus !== 'all') records = records.filter(r => r.status === _historyStatus);
        if (_historyMed    !== 'all') records = records.filter(r => r.medicationId === _historyMed);

        records.sort((a, b) => {
            const dc = b.date.localeCompare(a.date);
            return dc !== 0 ? dc : b.scheduledTime.localeCompare(a.scheduledTime);
        });

        if (records.length === 0) {
            container.innerHTML = `
                <div class="text-center py-16 text-gray-400">
                    <i class="fas fa-history text-5xl mb-4 opacity-20"></i>
                    <p class="font-medium text-gray-500">No records found</p>
                    <p class="text-sm mt-1">Try adjusting the filters above</p>
                </div>
            `;
            return;
        }

        // Group by date
        const groups = {};
        records.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });

        const todayStr     = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        const html = Object.entries(groups).map(([date, recs]) => {
            const dateLabel = date === todayStr     ? 'Today'
                            : date === yesterdayStr ? 'Yesterday'
                            : new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long', month: 'long', day: 'numeric'
                              });

            const dayTaken = recs.filter(r => r.status === 'taken').length;
            const dayTotal = recs.length;
            const dayRate  = dayTotal > 0 ? Math.round((dayTaken / dayTotal) * 100) : 0;
            const rateBadge = dayRate >= 80 ? 'bg-green-100 text-green-700'
                            : dayRate >= 50 ? 'bg-yellow-100 text-yellow-700'
                            :                 'bg-red-100 text-red-700';

            const entries = recs.map(r => {
                const col      = _statusStyle(r.status);
                const takenAt  = r.takenAt
                    ? new Date(r.takenAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : null;
                return `
                    <div class="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${col.dot}"></span>
                        <div class="flex-1 min-w-0">
                            <span class="font-semibold text-gray-800 text-sm">${r.medicationName}</span>
                            <span class="text-gray-400 text-xs ml-1.5">${r.medicationDosage}</span>
                        </div>
                        <span class="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
                            <i class="far fa-clock mr-1"></i>${r.scheduledTime}
                            ${takenAt ? `<span class="text-green-600 ml-1">(taken ${takenAt})</span>` : ''}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${col.bg} ${col.text}">
                            ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                    </div>
                `;
            }).join('');

            return `
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-2 sticky top-0 bg-white py-2 z-10">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-purple-400"></div>
                            <h4 class="font-semibold text-gray-700 text-sm">${dateLabel}</h4>
                        </div>
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${rateBadge}">
                            ${dayTaken}/${dayTotal} taken
                        </span>
                    </div>
                    <div class="space-y-1.5 pl-4 border-l-2 border-gray-100">${entries}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function _populateMedFilter() {
        const sel = document.getElementById('history-med-filter');
        if (!sel) return;
        const meds = window.medicationDB.getAll();
        sel.innerHTML = `<option value="all">All Medications</option>` +
            meds.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    }

    // ── Period Button State ───────────────────────────────────────────────────
    function _refreshPeriodBtns(period) {
        document.querySelectorAll('.period-btn').forEach(btn => {
            const active = btn.dataset.period === period;
            btn.classList.toggle('period-btn-active',   active);
            btn.classList.toggle('period-btn-inactive', !active);
        });
    }

    // ── Public API ─────────────────────────────────────────────────────────────
    return {

        init: function () {
            _init();
        },

        open: function () {
            _init();
            const panel = document.getElementById('reports-panel');
            if (!panel) { console.error('reports-panel element not found in DOM'); return; }
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            document.body.classList.add('overflow-hidden');
            this.showTab('adherence');
        },

        close: function () {
            _destroyChart();
            const panel = document.getElementById('reports-panel');
            if (panel) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
            document.body.classList.remove('overflow-hidden');
        },

        showTab: function (tab) {
            // Update tab buttons
            document.querySelectorAll('.report-tab-btn').forEach(btn => {
                const active = btn.dataset.tab === tab;
                btn.classList.toggle('report-tab-active',   active);
                btn.classList.toggle('report-tab-inactive', !active);
            });
            // Show correct pane
            document.querySelectorAll('.report-tab-pane').forEach(pane => {
                pane.classList.toggle('hidden', pane.dataset.pane !== tab);
            });

            if (tab === 'adherence') {
                _refreshPeriodBtns(_currentPeriod);
                setTimeout(() => _renderChart(_currentPeriod), 60);
            } else if (tab === 'history') {
                _historyStatus = 'all';
                _historyMed    = 'all';
                // Reset filter selects
                const statsEl = document.getElementById('history-status-filter');
                const medEl   = document.getElementById('history-med-filter');
                if (statsEl) statsEl.value = 'all';
                if (medEl)   medEl.value   = 'all';
                setTimeout(() => { _populateMedFilter(); _renderHistory(); }, 60);
            }
            // export tab needs no init
        },

        changePeriod: function (period) {
            _currentPeriod = period;
            _refreshPeriodBtns(period);
            _destroyChart();
            // Re-get canvas (it might have been re-rendered)
            setTimeout(() => _renderChart(period), 30);
        },

        filterHistory: function (type, value) {
            if (type === 'status') _historyStatus = value;
            if (type === 'med')    _historyMed    = value;
            _renderHistory();
        },

        /** Called by medications.js when a status changes, so history stays live. */
        recordStatusChange: function (medication, newStatus) {
            _init();
            if (window.historyDB) {
                window.historyDB.recordStatusChange(medication, newStatus);
            }
        }
    };

})();

console.log('✅ reports.js loaded');
