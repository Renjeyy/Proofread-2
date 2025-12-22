let currentAnalysisResults = null;
let currentAnalysisFeature = null;
let currentAnalysisFilename = null;
let folderToDeleteName = null;
let currentUserId = null;
let allUsersForDropdown = [];
let currentLogId = null;
let allTasks = [];
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth();
let currentEditLogId = null;

const folderGrid = document.getElementById("folder-grid");
const folderModal = document.getElementById("folder-modal");
const saveModal = document.getElementById("save-modal");
const shareModal = document.getElementById("share-modal");
const folderSelectDropdown = document.getElementById("folder-select-dropdown");
const folderHistoryDetail = document.getElementById("folder-history-detail");

function sortReviewData(data) {
    const priority = { 'Proofreading': 1, 'Koherensi': 2, 'Struktur': 3 };
    return data.sort((a, b) => {
        const pa = priority[a.kategori] || 99;
        const pb = priority[b.kategori] || 99;
        return pa - pb;
    });
}

function closeSaveModalForce() {
    const modal = document.getElementById("save-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function showCustomMessage(data, type = 'success', callback = null) {
    const modal = document.getElementById("custom-message-modal");
    if (!modal) {
        const message = typeof data === 'string' ? data : data.message || 'Terjadi kesalahan.';
        alert(message);
        return;
    }

    const titleElem = document.getElementById("custom-message-title");
    const textElem = document.getElementById("custom-message-text");
    
    // Perbaikan: Cari elemen details dan tombol secara aman
    const detailsElem = document.getElementById("custom-message-details"); 
    // Perbaikan: Cari tombol di dalam modal karena di HTML tidak ada ID-nya
    const okBtn = modal.querySelector('button.login-btn') || modal.querySelector('button'); 

    let title, message, details;

    if (typeof data === 'object' && data !== null) {
        title = data.title || 'Pemberitahuan';
        message = data.message;
        details = data.details;
    } else {
        title = 'Pemberitahuan';
        message = data;
        details = null;
    }

    if (titleElem) titleElem.textContent = title;

    // Logika aman untuk Details (Cek jika elemen ada)
    if (detailsElem) {
        if (details && typeof details === 'object') {
            let detailsHTML = '';
            for (const key in details) {
                detailsHTML += `
                    <p style="margin: 0.5rem 0; font-size: 1rem;">
                        <strong>${key}:</strong> ${details[key]}
                    </p>
                `;
            }
            detailsElem.innerHTML = detailsHTML;
            detailsElem.style.display = 'block';
            if (textElem) textElem.style.display = 'none';
        } else {
            detailsElem.style.display = 'none';
            if (textElem) {
                textElem.textContent = message || '';
                textElem.style.display = 'block';
            }
        }
    } else {
        // Fallback jika detailsElem tidak ada di HTML
        if (textElem) {
            textElem.innerHTML = message || ''; 
            if (details && typeof details === 'object') {
                 // Gabungkan details ke textElem jika elemen details tidak ada
                 let extraText = '<br><br>';
                 for (const key in details) {
                    extraText += `<b>${key}:</b> ${details[key]}<br>`;
                 }
                 textElem.innerHTML += extraText;
            }
            textElem.style.display = 'block';
        }
    }

    if (okBtn) {
        if (type === 'success') {
            okBtn.style.backgroundColor = '#4CAF50'; 
        } else if (type === 'error') {
            okBtn.style.backgroundColor = '#C62828'; 
        } else {
            okBtn.style.backgroundColor = '#1976D2'; 
        }

        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);

        newOkBtn.onclick = () => {
            modal.classList.add("hidden");
            if (typeof callback === 'function') {
                callback();
            }
        };
    }

    modal.classList.remove("hidden");
}

function showCustomConfirm(message, callback, title = 'Konfirmasi') {
    const modal = document.getElementById("custom-confirm-modal");
    const titleElem = document.getElementById("custom-confirm-title");
    const textElem = document.getElementById("custom-confirm-text");
    const okBtn = document.getElementById("custom-confirm-ok-btn");
    const cancelBtn = document.getElementById("custom-confirm-cancel-btn");

    if (!modal) {
        if (confirm(message)) {
            callback(true);
        }
        return;
    }

    titleElem.textContent = title;
    textElem.innerHTML = message;
    
    okBtn.style.backgroundColor = 'var(--danger)';
    
    const closeModal = () => {
        modal.classList.add("hidden");
        okBtn.onclick = null;
        cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
        closeModal();
        if (typeof callback === 'function') {
            callback(true);
        }
    };

    cancelBtn.onclick = () => {
        closeModal();
        if (typeof callback === 'function') {
            callback(false);
        }
    };

    modal.classList.remove("hidden");
}

function showError(message) {
    showCustomMessage(message, 'error');
}

function clearError() {
}

async function loadUsersForDropdown() {
    try {
        const response = await fetch("/api/get_all_users");
        if (!response.ok) {
            throw new Error("Gagal memuat daftar user untuk dropdown.");
        }
        allUsersForDropdown = await response.json();
    } catch (error) {
        console.error("loadUsersForDropdown error:", error);
    }
}

async function logAnalysisStart(filename, featureType) {
    try {
        const response = await fetch('/api/log_analysis_start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename, feature_type: featureType })
        });
        if (!response.ok) {
            return null;
        }
        const result = await response.json();
        return result.log_id;
    } catch (error) {
        console.error("Gagal start log:", error);
        return null;
    }
}

async function logAnalysisEnd(logId, status) {
    if (!logId) return;
    try {
        await fetch('/api/log_analysis_end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log_id: logId, status: status })
        });
    } catch (error) {
        console.error("Gagal mencatat end log:", error);
    }
}

function collectRowActionsFromTable() {
    let tempActions = JSON.parse(sessionStorage.getItem('tempRowActions') || '{}');
    if (Object.keys(tempActions).length > 0) {
        sessionStorage.removeItem('tempRowActions');
        return tempActions;
    }

    const actions = {};
    const table = document.querySelector('.results-table-wrapper table');
    if (!table) return actions;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, index) => {
        const rowId = index + 1;
        const checkbox = row.querySelector('.action-checkbox');
        const dropdown = row.querySelector('.action-dropdown');

        if (checkbox && dropdown) {
            actions[rowId] = {
                is_ganti: checkbox.checked,
                pic_user_id: dropdown.value ? parseInt(dropdown.value) : null
            };
        }
    });
    return actions;
}

function createTable(data, headers, existingComments = [], actions = {}) {
    if (!data || data.length === 0) {
        return "<p>Tidak ada data untuk ditampilkan.</p>";
    }

    let a = 1;
    let head = "<tr>";
    head += `<th style="width: 40px; vertical-align: middle; text-align: center; padding: 12px; border: 1px solid #e0e0e0;">No.</th>`; 

    let customHeaders = {
        "Kata/Frasa Salah": "Salah",
        "Perbaikan Sesuai KBBI": "Perbaikan",
        "Pada Kalimat": "Konteks Kalimat",
        "Ditemukan di Halaman": "Halaman",
        "Kalimat Awal": "Kalimat Asli",
        "Kalimat Revisi": "Kalimat Revisi",
        "Kata yang Direvisi": "Perubahan",
        "kategori": "Jenis Masalah",
        "masalah": "Teks Bermasalah",
        "saran": "Saran Perbaikan",
        "penjelasan": "Penjelasan / Alasan",
        "lokasi": "Lokasi",
        "apakah_ganti": "Ganti?", 
        "pic_proofread": "PIC", 
        "finalize": "Finalize",
        "Sub-bab Referensi pada Dokumen asli": "Sub-bab Referensi (Asli)",
        "Sub-bab Asal (Pada dokumen yang dibanding)": "Sub-bab Asal (Pembanding)",
        "Kalimat Menyimpang (Dokumen yang dibanding)": "Kalimat Menyimpang",
        "Alasan": "Alasan & Rekomendasi"
    };

    headers.forEach(header => {
        let thStyle = 'vertical-align: middle; text-align: center; padding: 12px; font-weight: bold; border: 1px solid #e0e0e0; background-color: #f8f9fa;'; 
        let headerText = customHeaders[header] || header;

        if ([
            "Sub-bab Referensi pada Dokumen asli",
            "Sub-bab Asal (Pada dokumen yang dibanding)", 
            "Kalimat Menyimpang (Dokumen yang dibanding)",
            "Alasan", 
            "penjelasan", "Pada Kalimat", "Kalimat Awal", "Kalimat Revisi"
        ].includes(header)) {
            thStyle += 'min-width: 300px;';
        }
        else if (["lokasi", "masalah", "saran"].includes(header)) {
            thStyle += 'min-width: 350px;'; 
        }
        else if (["pic_proofread", "finalize", "apakah_ganti", "Ditemukan di Halaman", "Halaman"].includes(header)) {
            thStyle += 'width: 100px;';
        }
        else if (["Kata/Frasa Salah", "Perbaikan Sesuai KBBI", "Kata yang Direvisi", "kategori"].includes(header)) {
            thStyle += 'min-width: 150px;';
        }

        head += `<th style="${thStyle}" class="header-${header.toLowerCase().replace(/[^a-z0-9]/g, '-')}">${headerText}</th>`;
    });
    head += "</tr>";

    let body = "";
    data.forEach((row, index) => {
        const rowId = index + 1;
        const savedAction = actions[rowId] || {};
        
        body += "<tr>";
        body += `<td style="vertical-align: middle; text-align: center; border: 1px solid #e0e0e0;">${a++}</td>`;
        
        headers.forEach(header => {
            let cellData = row[header] || "";
            let cellContent = '';
            
            let vAlign = 'top'; 
            
            if ([
                "Sub-bab Referensi pada Dokumen asli",
                "Sub-bab Asal (Pada dokumen yang dibanding)",
                "Kalimat Menyimpang (Dokumen yang dibanding)",
                "masalah", "saran", "penjelasan", 
                "Kata/Frasa Salah",
                "Perbaikan Sesuai KBBI",
                "Pada Kalimat",
                "Ditemukan di Halaman",
                "apakah_ganti",
                "pic_proofread",
                "finalize",
                "lokasi",
                "kategori"
            ].includes(header)) {
                vAlign = 'middle'; 
            }

            let tdStyle = `vertical-align: ${vAlign}; padding: 12px; border: 1px solid #e0e0e0; line-height: 1.6;`; 
            
            if (['penjelasan', 'Alasan', 'Kalimat Menyimpang (Dokumen yang dibanding)', 'Pada Kalimat', 'Kalimat Awal', 'Kalimat Revisi'].includes(header)) {
                tdStyle += 'text-align: justify;'; 
            } else {
                tdStyle += 'text-align: center;'; 
            }

            // --- KONTEN CELL ---
            if ((header === "Kalimat Revisi") && Array.isArray(cellData)) {
                cellContent = cellData.map(part => part.changed ? 
                    `<span class="diff-changed" style="background-color: #ffeef0; color: #b71c1c; font-weight: bold;">${part.text}</span>` : part.text
                ).join('');
            }
            else if (header === "kategori") {
                let badgeColor = '#9E9E9E';
                if(cellData === 'Proofreading') badgeColor = '#4CAF50';
                if(cellData === 'Koherensi') badgeColor = '#FF9800';
                if(cellData === 'Struktur') badgeColor = '#2196F3';
                // Gunakan display inline-block agar vertical align berfungsi baik
                cellContent = `<span style="background-color:${badgeColor}; color:white; padding:6px 12px; border-radius:12px; font-size:0.85em; display:inline-block;">${cellData}</span>`;
            }
            else if (header === "apakah_ganti") {
                const isChecked = savedAction.is_ganti ? 'checked' : '';
                cellContent = `<div style="display:flex; justify-content:center;"><input type="checkbox" class="action-checkbox" title="Centang jika perlu diganti" ${isChecked}></div>`;
            }
            else if (header === "pic_proofread") {
                cellContent = `<select class="action-dropdown" style="width: 100%; font-size: 0.9em; padding: 6px; border: 1px solid #ccc; border-radius: 4px;"><option value="">-- Pilih PIC --</option>`; 
                allUsersForDropdown.forEach(user => {
                    const isSelected = (savedAction.pic_user_id == user.id) ? 'selected' : '';
                    cellContent += `<option value="${user.id}" ${isSelected}>${user.fullname}</option>`;
                });
                cellContent += `</select>`;
            }
            else if (header === "finalize") {
                cellContent = `<button type="button" class="finalize-save-btn" onclick="saveRowState(${rowId}, event)">Save</button>`;
            }
            else if (header === "Pada Kalimat") {
                const salahWord = row["Kata/Frasa Salah"];
                if (salahWord && cellData.toLowerCase().includes(salahWord.toLowerCase())) {
                    const regex = new RegExp(`(${salahWord})`, 'gi');
                    cellContent = cellData.replace(regex, '<span class="highlight-error" style="background-color: yellow; font-weight:bold;">$1</span>');
                } else {
                    cellContent = cellData;
                }
            }
            else if (header === "Alasan" || header === "penjelasan") {
                let text = cellData.replace(/\n/g, '<br>');
                let parts = text.split(/Rekomendasi:/i);
                
                if (parts.length > 1) {
                    cellContent = `
                        <div style="margin-bottom: 10px;">${parts[0]}</div>
                        <div style="padding: 12px; background-color: #E8F5E9; color: #1B5E20; border-left: 5px solid #4CAF50; border-radius: 4px; font-weight: 500;">
                            <strong>Rekomendasi:</strong> ${parts[1]}
                        </div>
                    `;
                } else {
                    cellContent = text;
                }
            }
            else {
                cellContent = cellData;
            }
            
            body += `<td style="${tdStyle}">${cellContent}</td>`;
        });
        body += "</tr>";
    });

    return `
        <div class="results-table-wrapper" style="max-height: 600px; overflow-y: auto; overflow-x: auto; border: 1px solid #e0e0e0; border-radius: 8px;"> 
            <table style="width: 100%; border-collapse: collapse; min-width: 1200px;"> 
                <thead style="position: sticky; top: 0; background-color: #f8f9fa; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    ${head}
                </thead>
                <tbody style="background-color: white;">
                    ${body}
                </tbody>
            </table>
        </div>
    `;
}

function openResultsInNewTab(featureId) {
    let data, headers, title;

    if (featureId === 'proofreading') {
        data = JSON.parse(sessionStorage.getItem('proofreadResults'));
        headers = ["Kata/Frasa Salah", "Perbaikan Sesuai KBBI", "Pada Kalimat", "Ditemukan di Halaman", "apakah_ganti", "pic_proofread", "finalize"];
        title = "Hasil Analisis Proofreading";
    } else if (featureId === 'compare') {
        data = JSON.parse(sessionStorage.getItem('compareResults'));
        headers = [
            "Sub-bab Referensi pada Dokumen asli", 
            "Sub-bab Asal (Pada dokumen yang dibanding)", 
            "Kalimat Menyimpang (Dokumen yang dibanding)", 
            "Alasan"
        ];
        title = "Hasil Perbandingan Dokumen";
    } else if (featureId === 'review') {
        data = JSON.parse(sessionStorage.getItem('reviewResults'));
        if(data) data = sortReviewData(data);
        headers = ["kategori", "masalah", "saran", "penjelasan", "lokasi", "apakah_ganti", "pic_proofread", "finalize"];
        title = "Hasil Reviu Dokumen Lengkap";
    }

    if (!data || data.length === 0) {
        alert("Data hasil analisis tidak ditemukan. Silakan lakukan analisis terlebih dahulu.");
        return;
    }

    const tempActions = JSON.parse(sessionStorage.getItem('tempRowActions') || '{}');

    const tableHTML = createTable(data, headers, [], tempActions);

    const newWindow = window.open("", "_blank");
    
    if (newWindow) {
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 30px; 
                        color: #333; 
                        background-color: #fff;
                    }
                    h2 { 
                        text-align: center; 
                        margin-bottom: 30px; 
                        color: #C62828; 
                        font-size: 24px;
                    }
                    
                    /* --- PERBAIKAN UTAMA DI SINI --- */
                    /* Menghilangkan scrollbar internal agar tabel tampil penuh */
                    .results-table-wrapper {
                        max-height: none !important;
                        overflow: visible !important;
                        border: none !important;
                        box-shadow: none !important;
                        height: auto !important;
                    }

                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-bottom: 40px; 
                        box-shadow: 0 0 10px rgba(0,0,0,0.05);
                    }
                    
                    th { 
                        background-color: #f8f9fa; 
                        border: 1px solid #ddd; 
                        padding: 15px; 
                        text-align: center; 
                        vertical-align: middle;
                        font-size: 14px;
                        color: #444;
                    }
                    
                    td { 
                        border: 1px solid #ddd; 
                        padding: 15px; 
                        vertical-align: top; /* Pastikan konten rata atas */
                        font-size: 14px;
                    }
                    
                    /* Styling khusus untuk highlight */
                    .highlight-error { background-color: #FFF9C4; padding: 2px 4px; border-radius: 3px; font-weight: bold; }
                    .diff-changed { background-color: #FFEBEE; color: #C62828; font-weight: bold; padding: 2px 4px; border-radius: 3px; }
                    
                    /* Sembunyikan tombol aksi yang tidak perlu di print view */
                    .finalize-save-btn, .action-checkbox, .action-dropdown {
                        display: none !important; 
                    }

                    /* Agar tampilan checkbox/select di tabel tidak rusak layoutnya */
                    .table-cell-apakah_ganti, .table-cell-pic_proofread, .table-cell-finalize {
                        display: none;
                    }
                    .header-apakah-ganti, .header-pic-proofread, .header-finalize {
                        display: none;
                    }

                    /* Header Actions (Tombol Cetak & Tutup) */
                    .header-actions {
                        margin-bottom: 20px;
                        display: flex;
                        justify-content: flex-end; /* Tombol ditaruh di kanan */
                        gap: 10px; 
                        background: #f9f9f9;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #eee;
                    }

                    .btn-print {
                        padding: 10px 25px; 
                        cursor: pointer; 
                        background: #2B3674; 
                        color: white; 
                        border: none; 
                        border-radius: 6px; 
                        font-weight: 600; 
                        transition: background 0.2s;
                    }
                    
                    .btn-close {
                        padding: 10px 25px; 
                        cursor: pointer; 
                        background: #fff; 
                        color: #555; 
                        border: 1px solid #ddd; 
                        border-radius: 6px; 
                        font-weight: 600; 
                        transition: background 0.2s;
                    }

                    .btn-print:hover { background: #1a237e; }
                    .btn-close:hover { background: #f0f0f0; }

                    /* Styling khusus saat Print (Ctrl+P) */
                    @media print {
                        .header-actions { display: none; }
                        body { padding: 0; }
                        table { box-shadow: none; }
                        tr { page-break-inside: avoid; } /* Mencegah baris terpotong antar halaman */
                    }

                </style>
            </head>
            <body>
                <div class="header-actions">
                    <button onclick="window.close()" class="btn-close">Kembali</button>
                    <button onclick="window.print()" class="btn-print">Cetak / Simpan PDF</button>
                </div>

                <h2>${title}</h2>
                ${tableHTML}
            </body>
            </html>
        `);
        newWindow.document.close(); 
    } else {
        alert("Pop-up diblokir. Izinkan pop-up untuk melihat hasil di tab baru.");
    }
}

async function handleDownload(url, formData, defaultFilename = "download.dat") {
    try {
        const response = await fetch(url, { method: "POST", body: formData });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal mengunduh file");
        }
        const blob = await response.blob();
        const contentDisposition = response.headers.get('content-disposition');
        let filename = defaultFilename;
        if (contentDisposition) {
            const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
            const matches = filenameRegex.exec(contentDisposition);
            if (matches != null && matches[1]) {
                filename = matches[1].replace(/['"]/g, '');
            }
        }
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
    } catch (error) {
        showError(error.message);
    }
}

function renderCalendar(tasks, year, month) {
    const calendarEl = document.getElementById('task-calendar');
    if (!calendarEl) return;
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    let html = `
        <div class="calendar-header">
            <button id="calendar-prev-btn" class="calendar-nav-btn">&lt;</button>
            <span>${monthNames[month]} ${year}</span>
            <button id="calendar-next-btn" class="calendar-nav-btn">&gt;</button>
        </div>
        <div class="calendar-grid">
    `;

    const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    weekDays.forEach(day => { html += `<div class="calendar-weekday">${day}</div>`; });

    for (let i = 0; i < firstDayOfMonth; i++) { html += `<div class="calendar-day" style="background:#fafafa; cursor:default;"></div>`; }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDay = new Date(year, month, day);
        const today = new Date();
        let classes = ['calendar-day'];
        
        if (currentDay.toDateString() === today.toDateString()) classes.push('today');

        const dayTasks = tasks.filter(task => {
            if(!task.date) return false;
            return task.date.getDate() === day && 
                   task.date.getMonth() === month && 
                   task.date.getFullYear() === year;
        });

        let dots = '<div class="task-dot-container">';
        if (dayTasks.length > 0) {
            dayTasks.forEach(t => {
                let style = t.is_overdue ? 'background-color: #C62828;' : (t.type === 'Reminder AMS' ? 'background-color: #1976D2;' : 'background-color: #4CAF50;');
                dots += `<span class="task-dot" style="${style}" title="${t.name}"></span>`;
            });
        }
        dots += '</div>';

        html += `
            <div class="${classes.join(' ')}" onclick="onDateClick(${year}, ${month}, ${day})">
                <span>${day}</span>
                ${dots}
            </div>
        `;
    }

    html += `</div>`;
    calendarEl.innerHTML = html;

    document.getElementById('calendar-prev-btn').addEventListener('click', goToPreviousMonth);
    document.getElementById('calendar-next-btn').addEventListener('click', goToNextMonth);
}

function onDateClick(year, month, day) {
    const tasksOnDate = allTasks.filter(task => {
        if(!task.date) return false;
        return task.date.getDate() === day && 
               task.date.getMonth() === month && 
               task.date.getFullYear() === year;
    });

    const dateStr = `${day}/${month + 1}/${year}`;

    let contentHTML = "";
    
    if (tasksOnDate.length === 0) {
        contentHTML = `<div style="text-align:center; padding: 10px; color: #666;">
                            Tidak ada aktivitas/deadline pada tanggal <strong>${dateStr}</strong>.
                        </div>`;
    } else {
        contentHTML = `<div style="text-align:left; margin-bottom:15px;">`;
        
        tasksOnDate.forEach(t => {
            let icon = "";
            let color = "";

            if (t.is_overdue) {
                icon = "⚠️";
                color = "#D32F2F";
                textPesan = `Anda memiliki tugas yang <strong>terlambat</strong> sejak tanggal <strong>${dateStr}</strong> yaitu:`;
            } else {
                icon = "📅";
                color = "#1976D2";
                textPesan = `Anda memiliki <strong>deadline</strong> di tanggal <strong>${dateStr}</strong> yaitu:`;
            }

            contentHTML += `
                <div style="background-color: #fff; border-left: 4px solid ${color}; padding: 10px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <p style="margin: 0 0 5px 0; font-size: 0.9rem; color: #555;">${textPesan}</p>
                    <h4 style="margin: 0; color: ${color}; font-size: 1rem;">${icon} ${t.name}</h4>
                    <small style="color: #999;">Kategori: ${t.type}</small>
                </div>
            `;
        });
        
        contentHTML += `</div>`;
    }

    const modal = document.getElementById("custom-message-modal");
    const titleElem = document.getElementById("custom-message-title");
    const textElem = document.getElementById("custom-message-text");
    let detailsElem = document.getElementById("custom-message-details");

    if (modal) {
        titleElem.textContent = `Detail Kalender (${dateStr})`;
        
        if (detailsElem) {
            detailsElem.innerHTML = contentHTML;
            detailsElem.style.display = 'block';
            if(textElem) textElem.style.display = 'none';
        } else {
            if(textElem) {
                textElem.innerHTML = contentHTML;
                textElem.style.display = 'block';
            }
        }
        modal.classList.remove('hidden');
    }
}

function goToPreviousMonth() {
    currentCalendarMonth--;
    if (currentCalendarMonth < 0) {
        currentCalendarMonth = 11;
        currentCalendarYear--;
    }
    const activeTasks = allTasks.filter(log => log.status !== 'done');
    renderCalendar(activeTasks, currentCalendarYear, currentCalendarMonth);
}

function goToNextMonth() {
    currentCalendarMonth++;
    if (currentCalendarMonth > 11) {
        currentCalendarMonth = 0;
        currentCalendarYear++;
    }

    const activeTasks = allTasks.filter(log => log.status !== 'done');
    renderCalendar(activeTasks, currentCalendarYear, currentCalendarMonth);
}

async function loadDashboardReminders() {
    const onProgressContainer = document.querySelector('.reminder-group:nth-child(1) ul');
    const overdueContainer = document.querySelector('.reminder-group:nth-child(2) ul');
    
    if (!onProgressContainer || !overdueContainer) return;

    try {
        const response = await fetch('/api/get_dashboard_logs');
        const logsData = await response.json();

        onProgressContainer.innerHTML = '';
        overdueContainer.innerHTML = '';

        function renderLogList(container, dataList, emptyMessage, isOverdue = false) {
            if (!dataList || dataList.length === 0) {
                container.innerHTML = `<li class="no-reminder">${emptyMessage}</li>`;
                return;
            }

            const limit = 5;
            const displayItems = dataList.slice(0, limit);

            displayItems.forEach(item => {
                const li = document.createElement('li');
                li.style.cssText = "padding: 12px 20px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items: center;";
                
                const titleStyle = isOverdue ? "font-weight:600; color:#C62828;" : "font-weight:500; color:#333;";
                const badgeBg = isOverdue ? "#FFEBEE" : "#E1F5FE";
                const badgeColor = isOverdue ? "#C62828" : "#0277BD";

                li.innerHTML = `
                    <span style="${titleStyle}">${item.filename}</span>
                    <span style="font-size:0.8em; color:${badgeColor}; background:${badgeBg}; padding:4px 8px; border-radius:12px; white-space:nowrap;">
                        ${item.deadline}
                    </span>`;
                container.appendChild(li);
            });

            if (dataList.length > limit) {
                const moreLi = document.createElement('li');
                moreLi.style.cssText = "padding: 10px; text-align: center; border-bottom: none;";
                moreLi.innerHTML = `
                    <a href="/log_analysis" style="text-decoration: none; color: #1976D2; font-weight: 700; font-size: 0.9em; cursor: pointer;">
                        Lihat Semua (${dataList.length}) <i class='bx bx-right-arrow-alt' style="vertical-align: middle;"></i>
                    </a>
                `;
                container.appendChild(moreLi);
            }
        }

        renderLogList(onProgressContainer, logsData.on_progress, 'Tidak ada tugas yang sedang dikerjakan.', false);
        renderLogList(overdueContainer, logsData.overdue, 'Tidak ada tugas yang terlambat.', true);

    } catch (error) {
        console.error("Gagal memuat reminder widget:", error);
        onProgressContainer.innerHTML = '<li class="no-reminder" style="color:red;">Gagal memuat data.</li>';
    }
}

async function fetchAndRenderDashboardWidgets() {
    try {
        const [logsResponse, remindersResponse] = await Promise.all([
            fetch('/api/get_dashboard_logs'),
            fetch('/api/get_reminders')
        ]);

        if (!logsResponse.ok || !remindersResponse.ok) throw new Error('Gagal mengambil data widget.');

        const logsData = await logsResponse.json();
        const remindersData = await remindersResponse.json();
        
        loadDashboardReminders();

        let allCalendarTasks = [];

        if (logsData.on_progress) {
            logsData.on_progress.forEach(log => {
                if (log.deadline && log.deadline !== "Tanpa Deadline") {
                    allCalendarTasks.push({
                        name: log.filename,
                        date: new Date(log.deadline),
                        type: 'Log Analisis',
                        feature: 'Proofreading',
                        status_code: 'on_progress',
                        is_overdue: false
                    });
                }
            });
        }

        if (logsData.overdue) {
            logsData.overdue.forEach(log => {
                if (log.deadline && log.deadline !== "Tanpa Deadline") {
                    allCalendarTasks.push({
                        name: log.filename,
                        date: new Date(log.deadline),
                        type: 'Log Analisis',
                        feature: 'Proofreading',
                        status_code: 'overdue',
                        is_overdue: true
                    });
                }
            });
        }

        if (remindersData) {
            remindersData.forEach(rem => {
                allCalendarTasks.push({
                    name: `${rem.subject} (${rem.auditee})`,
                    date: new Date(rem.deadline_raw),
                    type: 'Reminder AMS',
                    feature: 'Tindak Lanjut',
                    status_code: rem.is_overdue ? 'overdue' : 'on_progress',
                    is_overdue: rem.is_overdue
                });
            });
        }

        allTasks = allCalendarTasks;

        if (typeof renderCalendar === "function") {
            const year = (typeof currentCalendarYear !== 'undefined') ? currentCalendarYear : new Date().getFullYear();
            const month = (typeof currentCalendarMonth !== 'undefined') ? currentCalendarMonth : new Date().getMonth();
            
            renderCalendar(allCalendarTasks, year, month);
        }

    } catch (error) {
        console.error("Gagal memuat widget dashboard:", error);
    }
}

function openCommentModal(featureId, rowId, event, parentId = null) {
    const button = event.target;
    const parent = button.parentElement;

    const resultViewContainer = button.closest('#history-result-view');
    
    let folderName, fileName, ownerId;

    if (resultViewContainer && resultViewContainer.dataset.folderName) {
        folderName = resultViewContainer.dataset.folderName;
        fileName = resultViewContainer.dataset.fileName;
        ownerId = resultViewContainer.dataset.ownerId;
    } else {
        folderName = currentAnalysisFeature;
        fileName = currentAnalysisFilename;
        ownerId = currentUserId;
    }


    if (!folderName || !fileName) {
        showCustomMessage("Error: Tidak dapat menentukan folder atau nama file untuk menyimpan komentar. Silakan simpan hasil ke folder terlebih dahulu.", 'error', 'Error Data');
        return;
    }
    
    if (!ownerId) {
        showCustomMessage("Error: User ID (ownerId) tidak terdeteksi untuk menyimpan komentar.", 'error', 'Error Data');
        return;
    }


    if (parent.querySelector(".inline-comment-box")) return;

    const box = document.createElement("div");
    box.className = "inline-comment-box";
    box.innerHTML = `
        <textarea class="comment-input" placeholder="Tulis komentar kamu..."></textarea>
        <div class="comment-actions">
            <button class="comment-send-btn">Kirim</button>
            <button class="comment-cancel-btn">Batal</button>
        </div>
    `;

    button.style.display = "none";
    parent.appendChild(box);

    box.querySelector(".comment-cancel-btn").onclick = () => {
        parent.removeChild(box);
        button.style.display = "inline-block";
    };

    box.querySelector(".comment-send-btn").onclick = async () => {
        const text = box.querySelector(".comment-input").value.trim();
        if (!text) {
            showCustomMessage("Komentar tidak boleh kosong!", 'info', 'Peringatan');
            return;
        }

        try {
            const response = await fetch("/add_comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    folderName: folderName, 
                    fileName: fileName,
                    rowId: rowId, 
                    text: text,
                    parentId: parentId
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Kesalahan server.");
            }

            const result = await response.json();
            showCustomMessage(result.message, 'success', 'Komentar Terkirim');
            parent.removeChild(box);
            button.style.display = "inline-block";
            
            if (resultViewContainer) {
                const currentOwnerId = resultViewContainer.dataset.ownerId;
                viewResultFile(folderName, fileName, currentOwnerId, featureId, { target: button });
            }


        } catch (err) {
            console.error(err);
            showCustomMessage(`Gagal mengirim komentar: ${err.message}`, 'error', 'Error Komentar');
        }
    };
}

async function loadUserFolders() {
    const folderGrid = document.getElementById("folder-grid");
    const folderHeader = document.querySelector('.folder-header'); 
    const folderHistoryDetail = document.getElementById("folder-history-detail"); 
    if (!folderGrid) return;
    
    const nocacheUrl = `/api/list_folders?t=${new Date().getTime()}`;

    folderGrid.classList.remove("hidden");
    folderGrid.innerHTML = `<div class="loading"><div class="spinner"></div> Memuat ulang folder...</div>`;
    if (folderHistoryDetail) folderHistoryDetail.classList.add("hidden"); 
    if (folderHeader) folderHeader.classList.remove("hidden"); 

    try {
        const response = await fetch(nocacheUrl);
        const folders = await response.json();

        folderGrid.innerHTML = '';

        if (folders.length === 0) {
            folderGrid.innerHTML = `
                <p class="no-folder-state" style="grid-column: 1 / -1;">
                    Belum ada folder yang tersimpan. Klik "Buat Folder Baru" untuk memulai.
                </p>
            `;
            return;
        }

        folders.forEach(folder => {
            const folderCard = document.createElement("div");
            folderCard.className = "feature-card folder-card";
            folderCard.setAttribute("data-name", folder.name);

            const isOwner = folder.is_owner;
            const badgeClass = isOwner ? 'badge-owner' : 'badge-shared';
            const badgeText = isOwner ? 'Milik Saya' : `Shared by: ${folder.owner_name}`;

            let ownerActions = '';
            if(isOwner) {
                ownerActions = `
                    <button class="folder-share-btn-text" onclick="openShareModal('${folder.name}', event)">Share</button>
                    <button class="folder-delete-btn-text" onclick="deleteFolder('${folder.name}', event)">Hapus</button>
                `;
            }

            folderCard.innerHTML = `
                <div class="folder-info-top">
                    <div class="folder-card-info-text">
                        <h3 style="display:flex; justify-content:space-between;">
                            ${folder.name}
                            <span class="folder-owner-badge ${badgeClass}">${badgeText}</span>
                        </h3>
                        <p style="font-size:0.9em; color:var(--text-light);">
                            Akses ke riwayat analisis AI dan kolaborasi.
                        </p>
                        <div class="folder-quick-actions">
                            ${ownerActions}
                        </div>
                    </div>
                </div>
                
                <button class="feature-btn history-btn" onclick="viewFolderHistory('${folder.name}', ${folder.owner_id})">
                    Lihat Isi Folder
                </button>
            `;
            folderGrid.appendChild(folderCard);
        });

    } catch (error) {
        console.error("Gagal load folder:", error);
        folderGrid.innerHTML = `<p style="color:red">Gagal memuat folder.</p>`;
    }
}

async function viewFolderHistory(folderName, ownerId) {
    if (folderGrid) folderGrid.classList.add('hidden');
    const folderHeader = document.querySelector('.folder-header');
    if (folderHeader) folderHeader.classList.add('hidden');
    if (folderHistoryDetail) folderHistoryDetail.classList.remove("hidden");
    
    if (folderHistoryDetail) {
        folderHistoryDetail.innerHTML = `
            <h3 style="text-align:center;">Riwayat Analisis di Folder: ${folderName}</h3>
            <button class="back-btn" onclick="navGoToFolder()">← Kembali ke Daftar Folder</button>
            <div class="loading folder-loading">
                <div class="spinner"></div> Memuat riwayat file...
            </div>
            <div id="history-table-container"></div>
            <div id="history-result-view" class="feature-section hidden" style="margin-top: 2rem; background-color: white; border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 12px;"></div>
        `;
        folderHistoryDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
            const response = await fetch(`/api/folder_history/${ownerId}/${folderName}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Gagal memuat riwayat folder.");
            }
    
            const historyFiles = await response.json();
            const tableContainer = document.getElementById("history-table-container");
    
            const loadingPlaceholder = folderHistoryDetail.querySelector('.loading-detail, .loading');
            if (loadingPlaceholder) loadingPlaceholder.remove();

            if (historyFiles.length === 0) {
                tableContainer.innerHTML = "<p style='text-align:center;'>Folder ini kosong. Belum ada hasil analisis yang disimpan.</p>";
                return;
            }

            const currentUserId = document.body.dataset.userId;

            let tableHTML = `
                <div class="results-table-wrapper">
                <table class="history-table">
                    <thead>
                    <tr>
                        <th>Nama File Asli</th>
                        <th>Fitur</th>
                        <th>Waktu Simpan</th>
                        <th>Aksi</th>
                    </tr>
                    </thead>
                    <tbody>
            `;
    
            historyFiles.forEach(file => {
                const deleteButton = (String(ownerId) === String(currentUserId)) ?
                    `<button class="delete-result-btn" onclick="deleteResultFile('${folderName}', '${file.filename}', ${ownerId}, event)">Hapus</button>` : '';
    
                const viewButton = `<button class="view-result-btn" onclick="viewResultFile('${folderName}', '${file.filename}', ${ownerId}, '${file.feature_type}', event)">View</button>`;

                tableHTML += `
                    <tr>
                        <td>${file.original_name}</td>
                        <td>${file.feature_type}</td>
                        <td>${file.timestamp}</td>
                        <td class="action-cell">
                            ${viewButton} ${deleteButton}
                        </td>
                    </tr>
                `;
            });
    
            tableHTML += `</tbody></table></div>`;
            tableContainer.innerHTML = tableHTML;
    
        } catch (error) {
            folderHistoryDetail.innerHTML = `
                <h3 style="text-align:center;">Riwayat Analisis di Folder: ${folderName}</h3>
                <button class="back-btn" onclick="navGoToFolder()">← Kembali ke Daftar Folder</button>
                <p class="error-flash">${error.message}</p>
            `;
        }
    }
}

async function viewResultFile(folderName, filename, ownerId, featureType, event) {
    const viewButton = event.target;
    viewButton.textContent = "...";
    viewButton.disabled = true;

    const resultViewContainer = document.getElementById("history-result-view");
    resultViewContainer.classList.remove("hidden");
    resultViewContainer.innerHTML = `<div class="loading"><div class="spinner"></div> Memuat hasil...</div>`;
    resultViewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

    resultViewContainer.setAttribute('data-folder-name', folderName);
    resultViewContainer.setAttribute('data-file-name', filename);
    resultViewContainer.setAttribute('data-owner-id', ownerId); 

    try {
        const resultResponse = await fetch("/api/get_result_file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_name: folderName, filename: filename, owner_id: ownerId })
        });
        if (!resultResponse.ok) {
            const err = await resultResponse.json();
            throw new Error(err.error || "Gagal memuat data hasil.");
        }
    
        const result = await resultResponse.json();
        let data = result.data;
        const actions = result.actions || {};
        
        const commentsResponse = await fetch("/api/get_comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_name: folderName, filename: filename })
        });
        const existingComments = await commentsResponse.json();

        let headers;
        if (featureType === 'proofreading') {
            headers = ["Kata/Frasa Salah", "Perbaikan Sesuai KBBI", "Pada Kalimat", "Ditemukan di Halaman", "apakah_ganti", "pic_proofread", "finalize"];
        } else if (featureType === 'compare') {
            headers = [
                "Sub-bab Referensi pada Dokumen asli", 
                "Sub-bab Asal (Pada dokumen yang dibanding)", 
                "Kalimat Menyimpang (Dokumen yang dibanding)", 
                "Alasan"
            ];
        } else if (featureType === 'review' || featureType === 'review_dokumen') {
            
            if(data) data = sortReviewData(data);

            headers = ["kategori", "masalah", "saran", "penjelasan", "lokasi", "apakah_ganti", "pic_proofread", "finalize"];
        } else {
            headers = Object.keys(data[0] || {});
        }

        resultViewContainer.innerHTML = `
            <h4>Detail Hasil: ${filename}</h4>
            <button class="back-btn" style="margin-bottom: 1rem;" onclick="document.getElementById('history-result-view').classList.add('hidden')">Tutup Tampilan</button>
            ${createTable(data, headers, existingComments, actions)}
        `;

        const resultTable = resultViewContainer.querySelector('table');
        if (resultTable) {
            resultTable.addEventListener('change', (event) => {
                if (event.target.classList.contains('action-checkbox') || event.target.classList.contains('action-dropdown')) {
                    const row = event.target.closest('tr');
                    const saveButton = row.querySelector('.finalize-save-btn');
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = 'Save';
                    }
                }
            });
        }
    } catch (error) {
        resultViewContainer.innerHTML = `<p class="error-flash">${error.message}</p>`;
    } finally {
        viewButton.textContent = "View";
        viewButton.disabled = false;
    }
}

async function deleteResultFile(folderName, filename, ownerId, event) {
    const confirmationMessage = `Apakah Anda yakin ingin menghapus file hasil "${filename}"? Tindakan ini tidak dapat dibatalkan.`;

    showCustomConfirm(confirmationMessage, async (isConfirmed) => {
        if (!isConfirmed) {
            return;
        }
    
        const deleteButton = event.target;
        deleteButton.textContent = "...";
        deleteButton.disabled = true;

        try {
            const response = await fetch("/api/delete_result", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folder_name: folderName, filename: filename, owner_id: ownerId })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Gagal menghapus file.");
            }
    
            const result = await response.json();
            deleteButton.closest("tr").remove();
            showCustomMessage(result.message, 'success', 'Penghapusan Berhasil');

        } catch (error) {
            showError(error.message);
            deleteButton.textContent = "Hapus";
            deleteButton.disabled = false;
        }
    }, 'Hapus Riwayat File');
}

function deleteFolder(folderName, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const confirmationMessage = `Apakah Anda yakin ingin menghapus folder "<strong>${folderName}</strong>"? Semua hasil analisis di dalamnya akan hilang permanen.`;

    showCustomConfirm(
        confirmationMessage, 
        async (isConfirmed) => {

            if (!isConfirmed) {
                return;
            }
            
            const folderCard = document.querySelector(`[data-name="${folderName}"]`);
            if (folderCard) {
                folderCard.style.opacity = '0.5';
            }

            try {
                const response = await fetch('/api/delete_folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_name: folderName })
                });

                const result = await response.json();

                if (response.ok) {
                    if (typeof loadUserFolders === "function") {
                        loadUserFolders(); 
                    }
                    
                    showCustomMessage("Folder berhasil dihapus", 'success', 'Penghapusan Berhasil');
                    
                } else {
                    if (folderCard) folderCard.style.opacity = '1'; 
                    showCustomMessage(result.error || "Gagal menghapus.", 'error', 'Penghapusan Gagal');
                }
            } catch (error) {
                console.error(error);
                if (folderCard) folderCard.style.opacity = '1';
                showCustomMessage("Kesalahan koneksi atau server.", 'error', 'Error Jaringan');
            }
        }, 
        'Hapus Folder?'
    );
}

function closeDeleteModal() {
    folderToDeleteName = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) modal.classList.add('hidden');
}

async function openSaveModal(featureId, resultsData, filename) {
    if (!resultsData || resultsData.length === 0) {
        showError("Tidak ada hasil analisis yang bisa disimpan. Mungkin data sudah tidak tersedia. Silakan coba analisis ulang.");
        return;
    }

    if (!featureId || !filename) {
        showError("Informasi fitur atau nama file tidak lengkap. Silakan coba analisis ulang.");
        return;
    }

    currentAnalysisResults = resultsData;
    currentAnalysisFeature = featureId;
    currentAnalysisFilename = filename;

    const saveModal = document.getElementById("save-modal");
    const folderSelectDropdown = document.getElementById("folder-select-dropdown");
    const confirmSaveBtn = document.getElementById("confirm-save-btn");
    
    if (!saveModal || !folderSelectDropdown || !confirmSaveBtn) {
        showError("Terjadi kesalahan pada halaman: Modal atau dropdown penyimpanan tidak ditemukan.");
        return;
    }

    document.getElementById("save-modal-feature-name").textContent = featureId.toUpperCase();
    saveModal.classList.remove("hidden");
    confirmSaveBtn.disabled = true;

    folderSelectDropdown.innerHTML = '<option value="">-- Pilih Folder --</option>';
    try {
        const response = await fetch("/api/list_folders");
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal memuat daftar folder.");
        }

        const folders = await response.json();

        folders.forEach(folder => {
            const option = document.createElement('option');
            option.value = `${folder.name}|${folder.owner_id}`; 
            option.textContent = folder.name;
            if (!folder.is_owner) {
                option.textContent += ` (Di-share oleh: ${folder.owner_name})`;
            }
            folderSelectDropdown.appendChild(option);
        });
        
        confirmSaveBtn.disabled = false;

    } catch (error) {
        console.error("Error loading folders for save modal:", error);
        const errorOption = document.createElement('option');
        errorOption.textContent = `Gagal memuat: ${error.message.substring(0, 50)}...`;
        errorOption.value = "";
        folderSelectDropdown.appendChild(errorOption);
        
    } finally {
    }
}

async function loadAMSDashboardWidget() {
    const amsContainer = document.getElementById('ams-dashboard-list');
    
    if (!amsContainer) return;

    try {
        const response = await fetch('/api/get_reminders');
        const reminders = await response.json();

        amsContainer.innerHTML = '';

        if (reminders.length === 0) {
            amsContainer.innerHTML = '<li class="no-reminder">Belum ada reminder Tindak Lanjut untuk saat ini</li>';
            return;
        }

        const displayReminders = reminders.slice(0, 5);

        displayReminders.forEach(rem => {
            const li = document.createElement('li');
            
            const daysColor = rem.is_overdue ? '#D32F2F' : '#2E7D32';
            const daysText = rem.is_overdue ? `Telat ${rem.sisa_hari}` : `Sisa ${rem.sisa_hari}`;

            li.style.cssText = "padding: 12px 20px; border-bottom: 1px solid #eee;";

            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                    <strong style="font-size:0.95rem; color:#333;">${rem.subject}</strong>
                    <span style="font-size:0.8rem; font-weight:bold; color:${daysColor}; white-space:nowrap;">${rem.sisa_hari}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666;">
                    <span style="font-weight:500;">Kepada:</span> ${rem.auditee}
                </div>
            `;
            amsContainer.appendChild(li);
        });

        if (reminders.length > 5) {
            const moreLi = document.createElement('li');
            moreLi.innerHTML = `<a href="/ams_reminder" style="display:block; text-align:center; font-size:0.85rem; color:#1976D2; text-decoration:none; font-weight:600;">Lihat ${reminders.length - 5} lainnya...</a>`;
            amsContainer.appendChild(moreLi);
        }

    } catch (error) {
        console.error("Gagal memuat AMS widget:", error);
        amsContainer.innerHTML = '<li class="no-reminder" style="color:red;">Gagal memuat data.</li>';
    }
}

async function openShareModal(folderName, event) {
    if (event) event.stopPropagation();

    const userTableBody = document.getElementById("share-user-table-body");
    const shareModal = document.getElementById("share-modal");
    const shareModalError = document.getElementById("share-modal-error");

    const titleSpan = document.getElementById("share-modal-folder-name");
    if(titleSpan) titleSpan.textContent = folderName;

    if(shareModal) shareModal.classList.remove("hidden");

    if(userTableBody) userTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;"><div class="spinner"></div> Memuat data pengguna...</td></tr>';

    try {
        const response = await fetch("/api/get_all_users");
        if (!response.ok) {
            throw new Error("Gagal memuat daftar pengguna.");
        }

        let users = await response.json();

        users.sort((a, b) => {
            const deptA = (a.label || '').toLowerCase();
            const deptB = (b.label || '').toLowerCase();
            const nameA = (a.fullname || a.username || '').toLowerCase();
            const nameB = (b.fullname || b.username || '').toLowerCase();

            if (deptA < deptB) return -1;
            if (deptA > deptB) return 1;

            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            return 0;
        });

        if (!userTableBody) return;
        userTableBody.innerHTML = '';

        if (users.length === 0) {
             userTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #999;">Tidak ada pengguna lain.</td></tr>';
        } else {
            let rowsHTML = '';
            users.forEach(user => {
                const displayName = user.fullname || user.username || 'Tanpa Nama';
                const deptName = user.label || '-';

                rowsHTML += `
                    <tr>
                        <td style="text-align:center;">
                            <input type="checkbox" class="share-user-checkbox" value="${user.id}" style="transform: scale(1.2); cursor: pointer;">
                        </td>
                        <td style="font-weight: 500;">${displayName}</td>
                        <td><span style="background:#E3F2FD; color:#1565C0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${deptName}</span></td>
                    </tr>
                `;
            });
            userTableBody.innerHTML = rowsHTML;
        }

    } catch (error) {
        console.error(error);
        if(userTableBody) userTableBody.innerHTML = `<tr><td colspan="3" style="color: red; text-align:center; padding: 20px;">Error: ${error.message}</td></tr>`;
    }
}


function checkSessionStorage(pageId) {
    let storageKey, tableDiv, containerDiv, headers;

    if (pageId === 'proofreading') {
        storageKey = 'proofreadResults';
        tableDiv = document.getElementById("proofread-results-table");
        containerDiv = document.getElementById("proofread-results-container");
        headers = ["Kata/Frasa Salah", "Perbaikan Sesuai KBBI", "Pada Kalimat", "Ditemukan di Halaman", "apakah_ganti", "pic_proofread", "finalize"];
    
    } else if (pageId === 'compare') {
        storageKey = 'compareResults';
        tableDiv = document.getElementById("compare-results-table");
        containerDiv = document.getElementById("compare-results-container");
        headers = [
            "Sub-bab Referensi pada Dokumen asli", 
            "Sub-bab Asal (Pada dokumen yang dibanding)", 
            "Kalimat Menyimpang (Dokumen yang dibanding)", 
            "Alasan"
        ];
    
    } else if (pageId === 'review') {
        storageKey = 'reviewResults';
        tableDiv = document.getElementById("review-results-table");
        containerDiv = document.getElementById("review-results-container");
        headers = ["kategori", "masalah", "saran", "penjelasan", "lokasi", "apakah_ganti", "pic_proofread", "finalize"];
        
    } else {
        return;
    }

    if (!tableDiv || !containerDiv) return;

    const storedData = sessionStorage.getItem(storageKey);
    const savedFile = sessionStorage.getItem(`${pageId}Filename`);
    const saveBtn = document.getElementById(`${pageId}-save-btn`);
    const viewBtn = document.getElementById(`${pageId}-view-new-tab-btn`);

    if (storedData) {
        try {
            let data = JSON.parse(storedData);
            if (data && data.length > 0) {
                if (pageId === 'review') {
                    data = sortReviewData(data);
                }

                const tempActions = JSON.parse(sessionStorage.getItem('tempRowActions') || '{}');
                tableDiv.innerHTML = createTable(data, headers, [], tempActions);
                containerDiv.classList.remove("hidden");
                
                currentAnalysisResults = data;
                currentAnalysisFeature = pageId;
                currentAnalysisFilename = savedFile;
                
                if (saveBtn) saveBtn.classList.remove("hidden");
                if (viewBtn) viewBtn.classList.remove("hidden");
            }
        } catch (e) {
            console.error("Gagal mem-parse data session storage:", e);
            sessionStorage.removeItem(storageKey);
            if (saveBtn) saveBtn.classList.add("hidden");
            if (viewBtn) viewBtn.classList.add("hidden");
        }
    }
}

function closeSaveModal() {
    const saveModal = document.getElementById("save-modal");
    if (saveModal) {
        saveModal.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => {

    currentUserId = document.body.dataset.userId;

    const folderGrid = document.getElementById("folder-grid");
    const folderModal = document.getElementById("folder-modal");
    const saveModal = document.getElementById("save-modal");
    const shareModal = document.getElementById("share-modal");
    const folderSelectDropdown = document.getElementById("folder-select-dropdown");
    const folderHistoryDetail = document.getElementById("folder-history-detail");

    loadUsersForDropdown();
    loadAMSDashboardWidget();
    fetchGeminiUsage();
    setInterval(fetchGeminiUsage, 1000);

    const proofreadFileInput = document.getElementById("proofread-file");
    const proofreadAnalyzeBtn = document.getElementById("proofread-analyze-btn");
    const proofreadLoading = document.getElementById("proofread-loading");
    const proofreadResultsContainer = document.getElementById("proofread-results-container");
    const proofreadResultsTableDiv = document.getElementById("proofread-results-table");
    const proofreadSaveBtn = document.getElementById("proofread-save-btn");
    const proofreadViewBtn = document.getElementById("proofread-view-new-tab-btn");

    const compareFileInput1 = document.getElementById("compare-file1");
    const compareFileInput2 = document.getElementById("compare-file2");
    const compareAnalyzeBtn = document.getElementById("compare-analyze-btn");
    const compareLoading = document.getElementById("compare-loading");
    const compareResultsContainer = document.getElementById("compare-results-container");
    const compareResultsTableDiv = document.getElementById("compare-results-table");
    const compareSaveBtn = document.getElementById("compare-save-btn");
    const compareViewBtn = document.getElementById("compare-view-new-tab-btn");

    const reviewFileInput = document.getElementById("review-file");
    const reviewAnalyzeBtn = document.getElementById("review-analyze-btn");
    const reviewLoading = document.getElementById("review-loading");
    const reviewResultsContainer = document.getElementById("review-results-container");
    const reviewResultsTableDiv = document.getElementById("review-results-table");
    const reviewSaveBtn = document.getElementById("review-save-btn");
    const reviewViewBtn = document.getElementById("review-view-new-tab-btn");

    const createFolderForm = document.getElementById("create-folder-form");
    const folderModalCloseBtn = document.getElementById("folder-modal-close-btn");
    const folderModalError = document.getElementById("folder-modal-error");
    const confirmSaveBtn = document.getElementById("confirm-save-btn");
    const saveModalCloseBtn = document.getElementById("save-modal-close-btn");
    const saveModalLoading = document.getElementById("save-modal-loading");
    const saveModalError = document.getElementById("save-modal-error");
    const shareModalCloseBtn = document.getElementById("share-modal-close-btn");
    const confirmShareBtn = document.getElementById("confirm-share-btn");
    const shareModalLoading = document.getElementById("share-modal-loading");
    const shareModalError = document.getElementById("share-modal-error");
    const createFolderBtn = document.getElementById("create-folder-btn");

    if (proofreadViewBtn) {
        proofreadViewBtn.addEventListener("click", () => openResultsInNewTab('proofreading'));
    }
    if (compareViewBtn) {
        compareViewBtn.addEventListener("click", () => openResultsInNewTab('compare'));
    }
    if (reviewViewBtn) {
        reviewViewBtn.addEventListener("click", () => openResultsInNewTab('review'));
    }

    document.body.addEventListener('click', function(event) {
        if (event.target.matches('#create-folder-btn')) {
            if (folderModal && createFolderForm) {
                createFolderForm.reset();
                if (folderModalError) folderModalError.classList.add("hidden");
                folderModal.classList.remove("hidden");
            }
        }
    });

    const closeBtnX = document.getElementById("save-modal-close-btn");
    if (closeBtnX) {
        closeBtnX.onclick = function() {
            closeSaveModalForce();
        };
    }

    const saveModalEl = document.getElementById("save-modal");
    if (saveModalEl) {
        saveModalEl.onclick = function(event) {
            if (event.target === saveModalEl) {
                closeSaveModalForce();
            }
        };
    }

    if (createFolderBtn) {
        createFolderBtn.addEventListener("click", function(e) {
            e.preventDefault();
            
            if (folderModal && createFolderForm) {
                createFolderForm.reset();
                
                if (folderModalError) folderModalError.classList.add("hidden");
                
                folderModal.classList.remove("hidden");
            }
        });
    }

    if (folderModalCloseBtn) {
        folderModalCloseBtn.addEventListener("click", () => { folderModal.classList.add("hidden"); });
    }
    window.addEventListener("click", (event) => {
        if (event.target == folderModal) {
            folderModal.classList.add("hidden");
        }
    });

    if (createFolderForm) {
        createFolderForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const btn = document.getElementById("folder-modal-submit-btn"); 
            const originalText = btn.innerText;
            const folderNameInput = document.getElementById("folder-name-input");

            const folderModal = document.getElementById("folder-modal");
            const folderModalError = document.getElementById("folder-modal-error"); 
            
            if (folderModalError) folderModalError.classList.add("hidden");

            btn.innerText = "Memproses...";
            btn.disabled = true;

            const formData = new FormData(createFolderForm);
            const data = { name: formData.get("name") };

            try {
                const response = await fetch("/api/create_folder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    if (folderModalError) {
                        folderModalError.textContent = result.error || "Gagal membuat folder.";
                        folderModalError.classList.remove("hidden");
                    }
                    throw new Error(result.error || "Gagal membuat folder.");
                }

                createFolderForm.reset();
                if(folderModal) folderModal.classList.add("hidden");
                if (typeof loadUserFolders === "function") {
                    loadUserFolders(); 
                }

                showCustomMessage({
                    title: 'Berhasil', 
                    message: `Folder '${result.folder_name}' berhasil dibuat!`,
                    details: "Daftar folder telah diperbarui secara otomatis."
                }, 'success');

            } catch (error) {
                console.error("Error saat membuat folder:", error);
                
                if (!folderModalError || folderModalError.classList.contains("hidden")) {
                    showCustomMessage(`Kesalahan: ${error.message}`, 'error', 'Error Pembuatan');
                }
            
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    const btnSimpan = document.getElementById("confirm-save-btn");
    if (btnSimpan) {
        btnSimpan.onclick = async function(e) {
            if (e) e.preventDefault();
            
            const dropdown = document.getElementById("folder-select-dropdown");
            if (!dropdown || !dropdown.value) {
                showCustomMessage("Mohon pilih folder tujuan.", "error");
                return;
            }

            const originalText = btnSimpan.innerText;
            btnSimpan.innerText = "Menyimpan...";
            btnSimpan.disabled = true;

            const [folderName, ownerId] = dropdown.value.split('|');
            
            const collectedActions = (typeof collectRowActionsFromTable === 'function') 
                ? collectRowActionsFromTable() 
                : {};

            const dataToSave = {
                folder_name: folderName,
                owner_id: ownerId,
                feature_type: currentAnalysisFeature,
                results_data: currentAnalysisResults,
                original_filename: currentAnalysisFilename,
                actions_data: collectedActions
            };

            try {
                const response = await fetch("/api/save_results", {
                    method: "POST", 
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSave),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Gagal menyimpan hasil.");
                }
                
                closeSaveModalForce();

                setTimeout(() => {
                    showCustomMessage(result.message, 'success', 'Penyimpanan Berhasil');
                }, 100);

            } catch (error) {
                console.error("Error saat menyimpan:", error);
                const errorMsg = document.getElementById("save-modal-error");
                if (errorMsg) {
                    errorMsg.textContent = error.message;
                    errorMsg.classList.remove("hidden");
                } else {
                    showCustomMessage(error.message, 'error');
                }
            } finally {
                btnSimpan.innerText = originalText;
                btnSimpan.disabled = false;
            }
        };
    }
    
    if (shareModalCloseBtn) {
        shareModalCloseBtn.addEventListener("click", () => { shareModal.classList.add("hidden"); });
    }
    window.addEventListener("click", (event) => {
        if (event.target == shareModal) {
            shareModal.classList.add("hidden");
        }
    });

    if (confirmShareBtn) {
        const newBtn = confirmShareBtn.cloneNode(true);
        confirmShareBtn.parentNode.replaceChild(newBtn, confirmShareBtn);

        newBtn.addEventListener("click", async () => {
            const folderNameElem = document.getElementById("share-modal-folder-name");
            const shareModalError = document.getElementById("share-modal-error");
            const shareModalLoading = document.getElementById("share-modal-loading");
            const shareModal = document.getElementById("share-modal");

            if (!folderNameElem) return;
            const folderName = folderNameElem.textContent;

            const selectedUsers = [];
            document.querySelectorAll('#share-user-table-body input[type="checkbox"]:checked').forEach(checkbox => {
                selectedUsers.push(checkbox.value);
            });

            if (selectedUsers.length === 0) {
                if (shareModalError) {
                    shareModalError.textContent = "Mohon pilih minimal satu pengguna.";
                    shareModalError.classList.remove("hidden");
                } else {
                    alert("Mohon pilih minimal satu pengguna.");
                }
                return;
            }

            if (shareModalLoading) shareModalLoading.classList.remove("hidden");
            if (shareModalError) shareModalError.classList.add("hidden");
            newBtn.disabled = true;
            newBtn.textContent = "Memproses...";

            try {
                const response = await fetch("/api/share_folder", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ folder_name: folderName, share_with_user_ids: selectedUsers })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Gagal berbagi folder.");
                }

                const result = await response.json();

                if (shareModal) shareModal.classList.add("hidden");
                
                showCustomMessage(result.message || "Folder berhasil dibagikan!", 'success');

                if (typeof loadUserFolders === "function") {
                    loadUserFolders();
                }

            } catch (error) {
                console.error(error);
                if (shareModalError) {
                    shareModalError.textContent = error.message;
                    shareModalError.classList.remove("hidden");
                } else {
                    alert(error.message);
                }
            } finally {
                if (shareModalLoading) shareModalLoading.classList.add("hidden");
                newBtn.disabled = false;
                newBtn.textContent = "Bagikan";
            }
        });
    }

    function setupSaveButton(saveBtnId, featureId, fileInputId1, fileInputId2 = null) {
        const saveBtn = document.getElementById(saveBtnId);
        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                const resultsData = currentAnalysisResults;

                let filename = "untitled.docx";
                const fileInput1 = document.getElementById(fileInputId1);
                if (fileInput1 && fileInput1.files[0]) {
                    filename = fileInput1.files[0].name;
                }

                if (fileInputId2) {
                    const fileInput2Elem = document.getElementById(fileInputId2);
                    if (fileInput2Elem && fileInput2Elem.files[0]) {
                        filename = "perbandingan_" + filename;
                    }
                }
        
                currentAnalysisFilename = filename;

                if (resultsData) {
                    openSaveModal(featureId, resultsData, filename);
                } else {
                    showError("Tidak ada hasil analisis yang siap disimpan. Silakan jalankan analisis terlebih dahulu.");
                }
            });
        }
    }

    setupSaveButton("proofread-save-btn", "proofreading", "proofread-file");
    setupSaveButton("compare-save-btn", "compare", "compare-file1", "compare-file2");
    setupSaveButton("review-save-btn", "review", "review-file");


    if (proofreadAnalyzeBtn) {
        proofreadAnalyzeBtn.addEventListener("click", async () => {
            const file = proofreadFileInput.files[0];
            if (!file) { showError("Silakan pilih file terlebih dahulu."); return; }
    
            clearError();
            proofreadLoading.classList.remove("hidden");
            proofreadAnalyzeBtn.disabled = true;
            let logId = await logAnalysisStart(file.name, 'proofreading');
            proofreadResultsContainer.classList.add("hidden");
            if(proofreadSaveBtn) proofreadSaveBtn.classList.add("hidden");
            if(proofreadViewBtn) proofreadViewBtn.classList.add("hidden");
            sessionStorage.removeItem('proofreadResults');
            sessionStorage.removeItem('proofreadingFilename');

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/proofread/analyze", { method: "POST", body: formData });
                if (!response.ok) {
                    let errMessage = "Server Error";
                    try {
                        const err = await response.json(); 
                        errMessage = err.error;
                    } catch(e) {
                        errMessage = `Gagal memproses (${response.status}). Kemungkinan file terlalu besar atau server timeout.`;
                    }
                    throw new Error(errMessage);
                }
                const data = await response.json();

                if (data.length === 0) {
                    proofreadResultsTableDiv.innerHTML = "<p>Tidak ada kesalahan yang ditemukan.</p>";
                } else {
                    const headers = ["Kata/Frasa Salah", "Perbaikan Sesuai KBBI", "Pada Kalimat", "Ditemukan di Halaman", "apakah_ganti", "pic_proofread", "finalize"];
                    proofreadResultsTableDiv.innerHTML = createTable(data, headers, [], {});
    
                    sessionStorage.setItem('proofreadResults', JSON.stringify(data));
                    sessionStorage.setItem('proofreadingFilename', file.name);
                    currentAnalysisResults = data;
                    currentAnalysisFeature = 'proofreading';
                    currentAnalysisFilename = file.name;
                    if(proofreadSaveBtn) proofreadSaveBtn.classList.remove("hidden");
                    if(proofreadViewBtn) proofreadViewBtn.classList.remove("hidden");
                }
                proofreadResultsContainer.classList.remove("hidden");
                await logAnalysisEnd(logId, 'done');

            } catch (error) {
                await logAnalysisEnd(logId, 'error');
                if (error.message.includes("429") || error.message.includes("quota")) {
                    showError("Anda telah melebihi batas penggunaan API. Silakan tunggu beberapa saat dan coba lagi.");
                } else {
                    showError(error.message);
                }
            } finally {
                proofreadLoading.classList.add("hidden");
                proofreadAnalyzeBtn.disabled = false;
            }
        });
    }
    
    if (compareAnalyzeBtn) {
        compareAnalyzeBtn.addEventListener("click", async () => {
            const file1 = compareFileInput1.files[0];
            const file2 = compareFileInput2.files[0];
            if (!file1 || !file2) { showError("Silakan unggah KEDUA file untuk perbandingan."); return; }
        
            clearError();
            compareLoading.classList.remove("hidden");
            compareAnalyzeBtn.disabled = true;
            compareResultsContainer.classList.add("hidden");
            if(compareSaveBtn) compareSaveBtn.classList.add("hidden");
            if(compareViewBtn) compareViewBtn.classList.add("hidden");
            
            sessionStorage.removeItem('compareResults');
            sessionStorage.removeItem('compareFilename');

            const apiEndpoint = '/api/compare/analyze_advanced';

            const formData = new FormData();
            formData.append("file1", file1);
            formData.append("file2", file2);

            try {
                const response = await fetch(apiEndpoint, { method: "POST", body: formData });
                if (!response.ok) {
                    let errMessage = "Server Error";
                    try { const err = await response.json(); errMessage = err.error; } 
                    catch(e) { errMessage = `Gagal memproses (${response.status}).`; }
                    throw new Error(errMessage);
                }
                const data = await response.json();

                if (data.length === 0) {
                    compareResultsTableDiv.innerHTML = "<p>Tidak ada perbedaan makna yang signifikan ditemukan.</p>";
                } else {
                    const headers = [
                        "Sub-bab Referensi pada Dokumen asli", 
                        "Sub-bab Asal (Pada dokumen yang dibanding)", 
                        "Kalimat Menyimpang (Dokumen yang dibanding)", 
                        "Alasan"
                    ];
                
                    compareResultsTableDiv.innerHTML = createTable(data, headers, [], {});
                
                    const filename = "perbandingan_" + file1.name;
                    sessionStorage.setItem('compareResults', JSON.stringify(data));
                    sessionStorage.setItem('compareFilename', filename);
                    
                    currentAnalysisResults = data;
                    currentAnalysisFeature = 'compare';
                    currentAnalysisFilename = filename;
                    
                    if(compareSaveBtn) compareSaveBtn.classList.remove("hidden");
                    if(compareViewBtn) compareViewBtn.classList.remove("hidden");
                }
                compareResultsContainer.classList.remove("hidden");

            } catch (error) {
                showError(error.message);
            } finally {
                compareLoading.classList.add("hidden");
                compareAnalyzeBtn.disabled = false;
            }
        });
    }
    
    if (reviewAnalyzeBtn) {
        reviewAnalyzeBtn.addEventListener("click", async () => {
            const file = reviewFileInput.files[0];
            if (!file) { showError("Silakan pilih file terlebih dahulu."); return; }
            
            clearError();
            reviewLoading.classList.remove("hidden");
            reviewAnalyzeBtn.disabled = true;
            reviewResultsContainer.classList.add("hidden");
            
            sessionStorage.removeItem('reviewResults');
            sessionStorage.removeItem('reviewFilename');

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/api/review/analyze", { method: "POST", body: formData });
                if (!response.ok) {
                    let errMessage = "Server Error";
                    try { const err = await response.json(); errMessage = err.error; } 
                    catch(e) { errMessage = `Gagal memproses (${response.status}). Kemungkinan file terlalu besar atau waktu habis.`; }
                    throw new Error(errMessage);
                }
                let data = await response.json();

                if (data.length === 0) {
                    reviewResultsTableDiv.innerHTML = "<p>Tidak ada masalah ditemukan (Dokumen Sempurna).</p>";
                } else {
                    data = sortReviewData(data);

                    const headers = ["kategori", "masalah", "saran", "penjelasan", "lokasi", "apakah_ganti", "pic_proofread", "finalize"];
                    reviewResultsTableDiv.innerHTML = createTable(data, headers, [], {});
                    
                    sessionStorage.setItem('reviewResults', JSON.stringify(data));
                    sessionStorage.setItem('reviewFilename', file.name);
                    
                    currentAnalysisResults = data;
                    currentAnalysisFeature = 'review_dokumen';
                    currentAnalysisFilename = file.name;
                    
                    if(reviewSaveBtn) reviewSaveBtn.classList.remove("hidden");
                    if(reviewViewBtn) reviewViewBtn.classList.remove("hidden");
                }
                reviewResultsContainer.classList.remove("hidden");

            } catch (error) {
                console.error("Error Reviu:", error);
                showError("Gagal: " + error.message);
            } finally {
                reviewLoading.classList.add("hidden");
                reviewAnalyzeBtn.disabled = false;
            }
        });
    }

});

async function fetchGeminiUsage() {
        try {
            const response = await fetch('/api/gemini-status');
            
            if (response.ok) {
                const data = await response.json();
                
                const widget = document.getElementById('api-monitor-widget');
                if(widget) widget.classList.remove('hidden');

                updateUsageUI(data.used, data.limit, data.reset_seconds);
            }
        } catch (error) {
            console.error("Gagal mengambil status Gemini:", error);
        }
    }

    function updateUsageUI(used, limit, resetSeconds) {
        const bar = document.getElementById('usage-chart-bar');
        const text = document.getElementById('usage-text-dashboard');
        const timer = document.getElementById('reset-timer-dashboard');

        if (!bar || !text || !timer) return;
        text.innerText = `${used} / ${limit}`;
        let percentage = 0;
        if (limit > 0) {
            percentage = (used / limit) * 100;
        }
        if (percentage > 100) percentage = 100;
        
        bar.style.width = `${percentage}%`;

        bar.className = 'usage-chart-bar'; 
        if (percentage >= 90) {
            bar.classList.add('danger');
        } else if (percentage >= 70) {
            bar.classList.add('warning');
        }

        const safeSeconds = Math.max(0, resetSeconds);
        const minutes = Math.floor(safeSeconds / 60);
        const seconds = Math.floor(safeSeconds % 60);
        timer.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

async function saveRowState(rowId, event) {
    const saveButton = event.target;
    const originalText = "Save"; 
    
    if (saveButton.disabled) return;

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    const resultViewContainer = saveButton.closest('#history-result-view');
    let folderName, fileName, ownerId;

    if (resultViewContainer && resultViewContainer.dataset.folderName) {
        folderName = resultViewContainer.dataset.folderName;
        fileName = resultViewContainer.dataset.fileName;
        ownerId = resultViewContainer.dataset.ownerId;
    } else {
        folderName = currentAnalysisFeature;
        fileName = currentAnalysisFilename;
        ownerId = currentUserId;
    }

    if (!folderName || !fileName) {
        showCustomMessage("Error: Data file hilang. Silakan simpan file ke folder terlebih dahulu agar perubahan bisa permanen.", 'error');
        saveButton.textContent = originalText;
        saveButton.disabled = false;
        return;
    }

    const row = saveButton.closest('tr');
    const checkbox = row.querySelector('.action-checkbox');
    const dropdown = row.querySelector('.action-dropdown');

    const isGanti = checkbox ? checkbox.checked : false;
    const picUserId = dropdown ? dropdown.value : null;

    const payload = {
        folder_name: folderName,
        filename: fileName,
        owner_id: ownerId,
        row_id: rowId,
        is_ganti: isGanti,
        pic_user_id: picUserId ? parseInt(picUserId) : null
    };

    try {
        const response = await fetch('/api/save_row_action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let result;
        const responseText = await response.text();
        
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error("Respon server tidak valid (Bukan JSON).");
        }

        if (!response.ok) {
            throw new Error(result.error || 'Gagal menyimpan status.');
        }

        let tempRowActions = JSON.parse(sessionStorage.getItem('tempRowActions') || '{}');
        
        tempRowActions[rowId] = {
            is_ganti: isGanti,
            pic_user_id: picUserId ? parseInt(picUserId) : null
        };
        
        sessionStorage.setItem('tempRowActions', JSON.stringify(tempRowActions));

        saveButton.textContent = 'Saved!';
        saveButton.style.backgroundColor = '#388E3C'; 
        
        showCustomMessage(result.message || 'Status berhasil disimpan.', 'success', 'Berhasil');

        if (typeof updateMailboxBadge === 'function') {
            updateMailboxBadge();
        }

    } catch (error) {
        console.error("Save Error:", error);
        showCustomMessage(`Gagal menyimpan: ${error.message}`, 'error');
        saveButton.textContent = 'Error';
        saveButton.style.backgroundColor = '#D32F2F';
    } finally {
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
            saveButton.style.backgroundColor = ''; 
        }, 1500); 
    }
}