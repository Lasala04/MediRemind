// export.js — Priority 3: Export Data (CSV & PDF)
// Depends on: mock-data.js (historyDB, medicationDB), jsPDF CDN (window.jspdf)

window.exportData = {

    // ── CSV ────────────────────────────────────────────────────────────────────
    toCSV: function (type) {
        let csvContent, fileName;

        if (type === 'history') {
            const rows    = window.historyDB.getAll()
                .sort((a, b) => b.date.localeCompare(a.date));
            const headers = ['Date', 'Medication', 'Dosage', 'Scheduled Time', 'Status', 'Taken At'];
            const body    = rows.map(r => [
                r.date,
                r.medicationName,
                r.medicationDosage,
                r.scheduledTime,
                r.status,
                r.takenAt ? new Date(r.takenAt).toLocaleString() : '-'
            ]);
            csvContent = this._buildCSV(headers, body);
            fileName   = `MediRemind_History_${this._today()}.csv`;

        } else if (type === 'medications') {
            const meds    = window.medicationDB.getAll();
            const headers = ['Name', 'Dosage', 'Frequency', 'Scheduled Time', 'Current Status', 'Notes'];
            const body    = meds.map(m => [
                m.name, m.dosage, m.frequency, m.time, m.status, m.notes || ''
            ]);
            csvContent = this._buildCSV(headers, body);
            fileName   = `MediRemind_Medications_${this._today()}.csv`;

        } else {
            window.notify.warning('Unknown export type: ' + type);
            return;
        }

        this._downloadBlob(csvContent, fileName, 'text/csv;charset=utf-8;');
        window.notify.success(`CSV exported successfully: ${fileName}`);
    },

    // ── PDF ────────────────────────────────────────────────────────────────────
    toPDF: function (type) {
        // jsPDF loaded via CDN — available as window.jspdf.jsPDF
        const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFCtor) {
            window.notify.error('PDF library not loaded. Please check your internet connection and refresh.');
            return;
        }

        const doc = new jsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        this._pdfHeader(doc, type);

        let y = 38;

        if (type === 'adherence') {
            y = this._pdfAdherence(doc, y);
        } else if (type === 'history') {
            y = this._pdfHistory(doc, y);
        }

        const fileName = `MediRemind_${type.charAt(0).toUpperCase() + type.slice(1)}_Report_${this._today()}.pdf`;
        doc.save(fileName);
        window.notify.success(`PDF exported successfully: ${fileName}`);
    },

    // ── PDF Sections ──────────────────────────────────────────────────────────
    _pdfHeader: function (doc, type) {
        // Blue banner
        doc.setFillColor(124, 58, 237);      // purple-700
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('MediRemind', 15, 13);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const subtitle = type === 'adherence' ? 'Adherence Report' : 'Medication History Report';
        doc.text(subtitle, 15, 21);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 210 - 15, 21, { align: 'right' });
        doc.setTextColor(30, 30, 30);
    },

    _pdfAdherence: function (doc, y) {
        const history = window.historyDB.getAll();
        const total   = history.length;
        const taken   = history.filter(h => h.status === 'taken').length;
        const skipped = history.filter(h => h.status === 'skipped').length;
        const missed  = history.filter(h => h.status === 'missed').length;
        const rate    = total > 0 ? Math.round((taken / total) * 100) : 0;

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Overall Adherence Summary — Last 30 Days', 15, y);
        y += 8;

        const summaryRows = [
            ['Overall Adherence Rate', `${rate}%`],
            ['Total Scheduled Doses',  `${total}`],
            ['Doses Taken',            `${taken}`],
            ['Doses Skipped',          `${skipped}`],
            ['Doses Missed',           `${missed}`]
        ];

        if (doc.autoTable) {
            doc.autoTable({
                startY:     y,
                head:       [['Metric', 'Value']],
                body:       summaryRows,
                theme:      'striped',
                headStyles: { fillColor: [124, 58, 237] },
                margin:     { left: 15, right: 15 }
            });
            y = doc.lastAutoTable.finalY + 10;
        } else {
            summaryRows.forEach(row => {
                doc.setFontSize(10);
                doc.text(`${row[0]}: ${row[1]}`, 15, y);
                y += 7;
            });
        }

        // Per-medication breakdown
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Per-Medication Breakdown', 15, y);
        y += 6;

        const meds    = window.medicationDB.getAll();
        const medRows = meds.map(med => {
            const mh  = history.filter(h => h.medicationId === med.id);
            const mt  = mh.length;
            const mtk = mh.filter(h => h.status === 'taken').length;
            const mr  = mt > 0 ? Math.round((mtk / mt) * 100) : 0;
            return [med.name, med.dosage, `${mr}%`, `${mtk} / ${mt}`];
        });

        if (doc.autoTable) {
            doc.autoTable({
                startY:     y,
                head:       [['Medication', 'Dosage', 'Adherence Rate', 'Doses Taken / Total']],
                body:       medRows,
                theme:      'striped',
                headStyles: { fillColor: [124, 58, 237] },
                margin:     { left: 15, right: 15 }
            });
            y = doc.lastAutoTable.finalY + 10;
        } else {
            medRows.forEach(row => {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(row.join('  |  '), 15, y);
                y += 6;
            });
        }

        return y;
    },

    _pdfHistory: function (doc, y) {
        const history = window.historyDB.getAll()
            .sort((a, b) => b.date.localeCompare(a.date));

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Medication History — Last 30 Days', 15, y);
        y += 8;

        const rows = history.map(r => [
            r.date,
            r.medicationName,
            r.medicationDosage,
            r.scheduledTime,
            r.status.charAt(0).toUpperCase() + r.status.slice(1),
            r.takenAt
                ? new Date(r.takenAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '—'
        ]);

        if (doc.autoTable) {
            doc.autoTable({
                startY:       y,
                head:         [['Date', 'Medication', 'Dosage', 'Scheduled', 'Status', 'Taken At']],
                body:         rows,
                theme:        'striped',
                headStyles:   { fillColor: [124, 58, 237] },
                margin:       { left: 15, right: 15 },
                styles:       { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 25 }, 2: { cellWidth: 18 }, 3: { cellWidth: 20 }, 4: { cellWidth: 22 }, 5: { cellWidth: 22 } }
            });
            y = doc.lastAutoTable.finalY + 5;
        } else {
            rows.forEach(row => {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text(row.join(' | '), 15, y);
                y += 6;
                if (y > 270) { doc.addPage(); y = 20; }
            });
        }

        return y;
    },

    // ── Utilities ────────────────────────────────────────────────────────────
    _buildCSV: function (headers, rows) {
        const escape = v => `"${String(v).replace(/"/g, '""')}"`;
        return [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n');
    },

    _downloadBlob: function (content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    _today: function () {
        return new Date().toISOString().split('T')[0];
    }
};
