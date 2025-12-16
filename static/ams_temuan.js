document.addEventListener('DOMContentLoaded', async () => {
    const addSessionBtn = document.getElementById('add-temuan-session-btn');
    const createModal = document.getElementById('create-temuan-modal');
    const closeCreateModal = document.getElementById('close-create-modal');
    const createForm = document.getElementById('create-temuan-form');
    
    const sessionSelect = document.getElementById('temuan-session-select');
    const loadBtn = document.getElementById('load-temuan-btn');
    const deleteSessionBtn = document.getElementById('delete-session-btn');
    
    const shareSessionBtn = document.getElementById('share-session-btn');
    const shareModal = document.getElementById('share-session-modal');
    const closeShareModal = document.getElementById('close-share-modal');
    const shareSessionNameDisplay = document.getElementById('share-session-name-display');
    const shareUserTbody = document.getElementById('user-table-body');
    const btnSubmitShare = document.getElementById('btn-submit-share');

    const temuanContainer = document.getElementById('temuan-container');
    const temuanTbody = document.getElementById('temuan-tbody');
    const tableTitle = document.getElementById('table-title');
    
    const searchFilterContainer = document.getElementById('search-filter-container');
    const filterColumnSelect = document.getElementById('filter-column-select');
    const advancedSearchDisplay = document.getElementById('advanced-search-display');
    const advancedSearchValue = document.getElementById('advanced-search-value');

    const addRowBtn = document.getElementById('add-row-btn');
    const addDataModal = document.getElementById('add-data-modal');
    const closeDataModal = document.getElementById('close-data-modal');
    const addDataForm = document.getElementById('add-data-form');
    const cancelDataBtn = document.getElementById('cancel-data-btn');
    const modalTitle = addDataModal ? addDataModal.querySelector('h3') : null; 

    const importExcelBtn = document.getElementById('import-excel-btn');
    const excelInput = document.getElementById('excel-import-input');
    const sheetModal = document.getElementById('sheet-selection-modal');
    const closeSheetModal = document.getElementById('close-sheet-modal');
    const cancelSheetBtn = document.getElementById('cancel-sheet-btn');
    const sheetSelect = document.getElementById('excel-sheet-select');
    const processImportBtn = document.getElementById('process-import-btn');

    const progressModal = document.getElementById('import-progress-modal');
    const progressBar = document.getElementById('import-progress-bar');
    const progressText = document.getElementById('import-progress-text');
    const importWarningModal = document.getElementById('import-warning-modal');
    const btnCloseWarning = document.getElementById('btn-close-warning');

    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');

    const commentModal = document.getElementById('comment-modal');
    const closeCommentModal = document.getElementById('close-comment-modal');
    const commentForm = document.getElementById('comment-form');
    const commentTextInput = document.getElementById('comment-text-input');

    const deleteCommentModal = document.getElementById('delete-comment-modal');
    const btnConfirmDeleteComment = document.getElementById('btn-confirm-delete-comment');
    const btnCancelDeleteComment = document.getElementById('btn-cancel-delete-comment');

    const showReportBtn = document.getElementById('show-report-table-btn');
    const reportModal = document.getElementById('report-table-modal');
    const downloadPngBtn = document.getElementById('download-report-png-btn');

    let currentSessionId = null;
    let currentSessionName = ""; 
    let rawExcelData = null;      
    let allData = [];
    let userMap = {};
    
    let isEditing = false;
    let editRowId = null;
    let pendingDeleteRowId = null;
    let deleteMode = 'row';
    let rowToCommentId = null;
    let pendingDeleteCommentId = null;
    let allUsersForShare = []; 
    let workbook = null;
    let currentUsers = [];
    let lastSortKey = 'label'; 
    let lastSortDirection = 'asc';
    let dynamicCutoffPrev = new Date(); 
    let dynamicCutoffCurr = new Date();

    const STORAGE_KEY_TEMUAN = 'ams_active_temuan_id';

    function updateDynamicHeaders(sessionName) {
        if (!sessionName) return;

        const months = {
            'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
            'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6, 'agu': 7, 'agt': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'dec': 11, 'des': 11
        };

        const lowerName = sessionName.toLowerCase();
        let detectedMonth = -1;
        let detectedYear = new Date().getFullYear(); 
        const yearMatch = lowerName.match(/20\d{2}/);
        if (yearMatch) {
            detectedYear = parseInt(yearMatch[0]);
        }

        for (const [key, val] of Object.entries(months)) {
            if (lowerName.includes(key)) {
                detectedMonth = val;
                break;
            }
        }

        if (detectedMonth === -1) {
            const today = new Date();
            detectedMonth = today.getMonth() - 1; 
            if (detectedMonth < 0) {
                detectedMonth = 11;
                detectedYear = today.getFullYear() - 1;
            }
        }
        const dateCurr = new Date(detectedYear, detectedMonth + 1, 0); 
        const datePrev = new Date(detectedYear, detectedMonth, 0); 
        dynamicCutoffCurr = dateCurr;
        dynamicCutoffPrev = datePrev;

        const headerPrev = document.getElementById('header-status-prev');
        const headerCurr = document.getElementById('header-status-curr');

        const formatHeader = (d) => {
            const m = d.toLocaleDateString('id-ID', { month: 'short' });
            const y = d.getFullYear().toString().slice(-2);
            return `Status Akhir ${m} ${y}`;
        };

        if (headerPrev) headerPrev.innerText = formatHeader(datePrev);
        if (headerCurr) headerCurr.innerText = formatHeader(dateCurr);
        
        console.log(`Headers Updated: Prev=${formatHeader(datePrev)} (H-1), Curr=${formatHeader(dateCurr)} (H)`);
    }

    async function initApp() {
        setupEventListeners();
        await loadUserMap();
        await loadSessions(); 

        const savedId = localStorage.getItem(STORAGE_KEY_TEMUAN);
        if (savedId && sessionSelect) {
            const optionExists = sessionSelect.querySelector(`option[value="${savedId}"]`);
            if (optionExists) {
                sessionSelect.value = savedId;
                currentSessionId = savedId;
                updateOwnerButtons(optionExists);
                loadTemuanData(savedId);
            }
        }
    }

    function updateOwnerButtons(selectedOption) {
        const isOwner = selectedOption.dataset.owner === 'true';
        if(deleteSessionBtn) deleteSessionBtn.style.display = isOwner ? 'inline-block' : 'none';
        if(shareSessionBtn) shareSessionBtn.style.display = isOwner ? 'inline-block' : 'none';
    }

    function setupSelectAllListener() {
        const selectAll = document.getElementById('select-all-users');
        if (selectAll) {
            selectAll.onclick = function() {
                const checkboxes = document.querySelectorAll('#user-table-body .share-user-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                });
            };
        }
    }

    function renderUserTable(users) {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;

        tbody.innerHTML = ''; 

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="share-user-checkbox" value="${user.id}"></td>
                <td>${user.fullname}</td>
                <td>${user.label}</td>
            `;
            tbody.appendChild(tr);
        });
        
        setupSelectAllListener(); 
    }

    function sortUserTable(key) {
        document.querySelectorAll('.user-share-table th.sortable').forEach(h => {
            h.classList.remove('asc', 'desc');
            h.querySelector('.sort-icon').textContent = '';
        });

        const isAscending = lastSortKey !== key || lastSortDirection === 'desc';
        const direction = isAscending ? 'asc' : 'desc';
        const currentHeader = document.querySelector(`.user-share-table th[data-sort-key="${key}"]`);
        if (currentHeader) {
            currentHeader.classList.add(direction);
            currentHeader.querySelector('.sort-icon').textContent = isAscending ? '▲' : '▼';
        }

        const sortedUsers = [...currentUsers].sort((a, b) => {
            let valA, valB;
            const dirMultiplier = isAscending ? 1 : -1;

            if (key === 'label') {
                valA = a.label.toLowerCase();
                valB = b.label.toLowerCase();
                if (valA < valB) return -1 * dirMultiplier;
                if (valA > valB) return 1 * dirMultiplier;
                valA = a.fullname.toLowerCase();
                valB = b.fullname.toLowerCase();
                if (valA < valB) return -1; 
                if (valA > valB) return 1;
                return 0;

            } else if (key === 'name') {
                valA = a.fullname.toLowerCase();
                valB = b.fullname.toLowerCase();
                if (valA < valB) return -1 * dirMultiplier;
                if (valA > valB) return 1 * dirMultiplier;

                valA = a.label.toLowerCase();
                valB = b.label.toLowerCase();
                if (valA < valB) return -1;
                if (valA > valB) return 1;
                return 0;
            }

            return 0;
        });

        lastSortKey = key;
        lastSortDirection = direction;
        
        renderUserTable(sortedUsers);
    }

    function setupSortingListeners() {
        document.querySelectorAll('.user-share-table th.sortable').forEach(header => {
            header.addEventListener('click', function() {
                const sortKey = this.getAttribute('data-sort-key');
                sortUserTable(sortKey);
            });
        });
        sortUserTable(lastSortKey);
    }

    function setupEventListeners() {
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const select = document.getElementById('temuan-session-select');
                if (select.value) {
                    currentSessionId = select.value;
                    localStorage.setItem(STORAGE_KEY_TEMUAN, currentSessionId);
                    loadTemuanData(currentSessionId);
                    const selectedOption = select.options[select.selectedIndex];
                    updateOwnerButtons(selectedOption);
                } else {
                    showCustomMessage("Silakan pilih sesi terlebih dahulu.");
                }
            });
        }

        if (deleteSessionBtn) deleteSessionBtn.addEventListener('click', handleDeleteSession);
        if (addSessionBtn) addSessionBtn.addEventListener('click', () => toggleModal('create-temuan-modal', true));
        if (addRowBtn) addRowBtn.addEventListener('click', openAddRowModal);
        if (shareSessionBtn) shareSessionBtn.addEventListener('click', openShareModal);

        if (cancelDataBtn) {
            cancelDataBtn.addEventListener('click', () => {
                toggleModal('add-data-modal', false);
                if (addDataForm) addDataForm.reset();
            });
        }

        const monthlyReportBtn = document.getElementById('monthly-report-btn');
        if (monthlyReportBtn) {
            monthlyReportBtn.addEventListener('click', () => {
                if (!currentSessionId) {
                    showCustomMessage("Silakan pilih sesi terlebih dahulu.");
                    return;
                }
                window.open(`/laporan_bulanan/${currentSessionId}`, '_blank');
            });
        }

        if (btnCloseWarning) {
            btnCloseWarning.addEventListener('click', () => {
                toggleModal('import-warning-modal', false);
            });
        }

        document.querySelectorAll('.modal-close-btn, .cancel-btn').forEach(btn => {
            if (btn.id !== 'cancel-data-btn' && btn.id !== 'btn-close-warning') {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) {
                        modal.classList.add('hidden');
                        const form = modal.querySelector('form');
                        if (form) form.reset();
                    }
                });
            }
        });

        if (createForm) createForm.addEventListener('submit', handleCreateSession);
        if (addDataForm) addDataForm.addEventListener('submit', handleSaveRowData);
        if (commentForm) commentForm.addEventListener('submit', handleSaveComment);

        if (btnConfirmDelete) {
            btnConfirmDelete.addEventListener('click', async () => {
                if (deleteMode === 'session') {
                    try {
                        btnConfirmDelete.textContent = "Menghapus...";
                        btnConfirmDelete.disabled = true;

                        const res = await fetch(`/api/delete_temuan_session/${currentSessionId}`, { method: 'DELETE' });

                        if (res.ok) {
                            toggleModal('delete-confirm-modal', false);
                            showCustomMessage("Sesi berhasil dihapus.");
                            localStorage.removeItem(STORAGE_KEY_TEMUAN);

                            if (temuanContainer) temuanContainer.classList.add('hidden');
                            if (searchFilterContainer) searchFilterContainer.classList.add('hidden');

                            loadSessions();
                            currentSessionId = null;
                        } else {
                            try {
                                const err = await res.json();
                                alert("Gagal menghapus sesi: " + (err.error || "Error tidak diketahui"));
                            } catch (e) {
                                alert("Gagal menghapus sesi (Server Error).");
                            }
                        }
                    } catch (err) {
                        showCustomMessage("Error koneksi.");
                    } finally {
                        btnConfirmDelete.textContent = "Ya, Hapus"; 
                        btnConfirmDelete.disabled = false;
                    }
                } else {
                    await executeDeleteRow();
                }
            });
        }
        if (btnConfirmDeleteComment) btnConfirmDeleteComment.addEventListener('click', executeDeleteComment);
        if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', () => toggleModal('delete-confirm-modal', false));
        if (btnCancelDeleteComment) btnCancelDeleteComment.addEventListener('click', () => toggleModal('delete-comment-modal', false));

        if (btnSubmitShare) btnSubmitShare.addEventListener('click', handleSubmitShare);

        if (advancedSearchDisplay) {
            advancedSearchDisplay.addEventListener('click', openFilterValueModal);
        }

        const popupSearch = document.getElementById('popup-search-input');
        if (popupSearch) {
            popupSearch.addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                const items = document.querySelectorAll('#filter-value-list li');
                items.forEach(item => {
                    item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
                });
            });
        }

        if (filterColumnSelect) {
            filterColumnSelect.addEventListener('change', () => {
                advancedSearchDisplay.value = "";
                advancedSearchValue.value = "";
                applyClientFilter();
            });
        }

        if (importExcelBtn) importExcelBtn.addEventListener('click', () => document.getElementById('excel-import-input').click());
        if (excelInput) excelInput.addEventListener('change', handleFileSelect);
        if (processImportBtn) processImportBtn.addEventListener('click', processImportData);
        if (cancelSheetBtn) cancelSheetBtn.addEventListener('click', () => toggleModal('sheet-selection-modal', false));
    }

    function toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if(modal) show ? modal.classList.remove('hidden') : modal.classList.add('hidden');
    }

    function showCustomMessage(msg) {
        const modal = document.getElementById('custom-message-modal');
        const textEl = document.getElementById('custom-message-text');
        if (modal && textEl) { textEl.textContent = msg; modal.classList.remove('hidden'); } 
        else { alert(msg); }
    }

    function formatDisplayDate(val) {
        if(!val) return "-";
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if(datePattern.test(val)) {
            const d = new Date(val);
            if(!isNaN(d.getTime())) return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return val; 
    }

    function formatPICList(picString) {
        if (!picString) return "-";
        let rawList = String(picString).split('\n');
        let cleanList = [];
        rawList.forEach(item => {
            let contentOnly = item.trim().replace(/^\d+[\.\)]\s*/, ''); 
            if (contentOnly && contentOnly !== '-' && contentOnly.toLowerCase() !== 'nan') cleanList.push(contentOnly);
        });
        if (cleanList.length === 0) return "-";
        return '<ol style="padding-left: 20px; margin: 0; text-align: left;">' + cleanList.map(name => `<li style="margin-bottom: 4px;">${name}</li>`).join('') + '</ol>';
    }

    function formatListText(text) {
        if (!text) return '';
        let lines = text.toString().split('\n');
        let html = '';
        lines.forEach((line, index) => {
            if (line.trim() !== '') {
                let marginBottom = (index === lines.length - 1) ? '0' : '10px';
                html += `<div style="margin-bottom: ${marginBottom};">${line}</div>`;
            }
        });
        return html || '-';
    }

    function renderHistoryList(historyArray) {
        if (!historyArray || historyArray.length === 0) return '<div style="text-align:center; color:#bbb; font-size:0.8em; padding:10px;">- Belum ada riwayat -</div>';
        let html = '<table class="history-mini-table"><thead><tr><th>User</th><th>Tanggal</th><th>Jam</th><th>Kolom</th></tr></thead><tbody>';
        historyArray.forEach(h => {
            let parts = h.time.split(' '); 
            html += `<tr><td class="hist-col-user">${h.user}</td><td class="hist-col-date">${parts[0]||'-'}</td><td class="hist-col-time">${parts[1]||'-'}</td><td class="hist-col-edit">${h.columns}</td></tr>`;
        });
        return html + '</tbody></table>';
    }

    async function loadSessions() {
        try {
            const response = await fetch('/api/get_temuan_sessions');
            if(response.ok) {
                const sessions = await response.json();
                if(sessionSelect) {
                    sessionSelect.innerHTML = '<option value="" disabled selected>-- Pilih Sesi --</option>';
                    sessions.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.id;
                        opt.dataset.name = s.nama_sesi;
                        opt.dataset.owner = s.is_owner; 
                        opt.textContent = s.nama_sesi; 
                        sessionSelect.appendChild(opt);
                    });
                }
            }
        } catch (error) { console.warn("Gagal fetch sesi:", error); }
    }

    async function handleCreateSession(e) {
        e.preventDefault();
        const formData = new FormData(createForm);
        try {
            const res = await fetch('/api/add_temuan_session', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            if (res.ok) {
                toggleModal('create-temuan-modal', false);
                showCustomMessage("Sesi berhasil dibuat!");
                createForm.reset();
                await loadSessions();
            } else {
                const err = await res.json();
                alert(err.error || "Gagal membuat sesi.");
            }
        } catch (err) { showCustomMessage("Error koneksi."); }
    }

    async function handleDeleteSession() {
        if (!currentSessionId) return;
        deleteMode = 'session';
        const modalTitle = document.querySelector('#delete-confirm-modal h3');
        const modalText = document.querySelector('#delete-confirm-modal p');
        if(modalTitle) modalTitle.textContent = "Hapus Sesi?";
        if(modalText) modalText.innerHTML = "PERINGATAN: Menghapus sesi ini akan menghapus <strong>SELURUH</strong> data temuan di dalamnya.<br>Lanjutkan?";
        if(btnConfirmDelete) {
            btnConfirmDelete.textContent = "Ya, Hapus";
            btnConfirmDelete.disabled = false;
        }
        toggleModal('delete-confirm-modal', true);
    }

    async function loadTemuanData(sessionId) {
        if (temuanTbody) temuanTbody.innerHTML = '<tr><td colspan="26" class="text-center">Memuat data...</td></tr>';
        if (temuanContainer) temuanContainer.classList.remove('hidden');
        if (searchFilterContainer) searchFilterContainer.classList.remove('hidden');

        const select = document.getElementById('temuan-session-select');
        let sName = "Sesi Tanpa Nama";

        if (select.selectedIndex > -1) {
            sName = select.options[select.selectedIndex].text;
            if (tableTitle) tableTitle.textContent = `Detail: ${sName}`;
        }

        // Update Header Tabel Sesuai Nama Sesi
        updateDynamicHeaders(sName);

        advancedSearchDisplay.value = "";
        advancedSearchValue.value = "";

        try {
            const response = await fetch(`/api/get_temuan_data/${sessionId}`);
            if (!response.ok) throw new Error("Gagal fetch data");
            allData = await response.json();
            renderTable(allData);
        } catch (error) {
            console.error(error);
            if (temuanTbody) temuanTbody.innerHTML = '<tr><td colspan="26" class="text-center text-danger">Gagal memuat data.</td></tr>';
        }
    }

    function openFilterValueModal() {
        const colKey = filterColumnSelect.value;
        if(colKey === 'all' || !allData.length) { applyClientFilter(); return; }

        const modal = document.getElementById('filter-value-modal');
        const listContainer = document.getElementById('filter-value-list');
        const searchInput = document.getElementById('popup-search-input');
        
        listContainer.innerHTML = '';
        searchInput.value = '';
        modal.classList.remove('hidden');

        const raw = allData.map(r => r[colKey] ? String(r[colKey]).trim() : "");
        const unique = [...new Set(raw)].filter(x => x !== "").sort();

        const liAll = document.createElement('li');
        liAll.textContent = "-- Tampilkan Semua --";
        liAll.style.fontWeight = "bold"; liAll.style.color = "#1976d2";
        liAll.onclick = () => { selectFilterValue("", ""); };
        listContainer.appendChild(liAll);

        unique.forEach(val => {
            const li = document.createElement('li');
            li.textContent = val;
            li.onclick = () => selectFilterValue(val, val);
            listContainer.appendChild(li);
        });
    }

    function selectFilterValue(displayVal, realVal) {
        advancedSearchDisplay.value = displayVal || "";
        advancedSearchValue.value = realVal || "";
        toggleModal('filter-value-modal', false);
        applyClientFilter();
    }

    function applyClientFilter() {
        const colFilter = filterColumnSelect.value;
        const searchVal = advancedSearchValue.value; 
        if (!searchVal) { renderTable(allData); return; }
        const filtered = allData.filter(row => {
            if (colFilter === 'all') return true; 
            const rowVal = row[colFilter] ? String(row[colFilter]).trim() : "";
            return rowVal === searchVal; 
        });
        renderTable(filtered);
    }

    function renderTable(dataList) {
        if (!temuanTbody) return;
        temuanTbody.innerHTML = '';

        // Logic Status: Prioritas Utama = Marker Import Excel
        const getStatus = (tDateStr, cutoffDate, forceSelesai) => {
            if (forceSelesai) {
                // Warna hijau sesuai Excel user
                return '<span class="status-bjt" style="background-color: #d4edda; color: #155724; border-color: #c3e6cb;">Selesai</span>';
            }

            if (!tDateStr) return '-';
            const tDate = new Date(tDateStr);
            tDate.setHours(0, 0, 0, 0);
            cutoffDate.setHours(0, 0, 0, 0);

            return tDate > cutoffDate ?
                '<span class="status-bjt">Belum Jatuh Tempo</span>' :
                '<span class="status-os">OS</span>';
        };

        if (dataList.length === 0) {
            temuanTbody.innerHTML = '<tr><td colspan="26" class="text-center" style="padding: 40px; color: #666;">Tidak ada data ditemukan.</td></tr>';
            return;
        }

        dataList.forEach(row => {
            const tr = document.createElement('tr');

            // Deteksi Marker "Selesai" dari Import
            let rawControl = row.control || "";
            let isSelesaiExcel = false;
            
            if (rawControl.includes('$$FORCE_SELESAI$$')) {
                isSelesaiExcel = true;
                // Hapus marker agar tabel bersih
                rawControl = rawControl.replace('$$FORCE_SELESAI$$', '').trim();
            }

            const targetDate = row.perubahan_target || row.target_penyelesaian;

            // Panggil status dengan flag isSelesaiExcel
            const statusPrevHtml = getStatus(targetDate, dynamicCutoffPrev, isSelesaiExcel);
            const statusCurrHtml = getStatus(targetDate, dynamicCutoffCurr, isSelesaiExcel);

            const val = (v) => (v === null || v === undefined) ? '' : v;
            const num = (v) => (v === null || v === undefined) ? 0 : v;

            const getPicName = (rawVal) => {
                if (!rawVal) return '-';
                return userMap[rawVal] || userMap[rawVal.trim()] || rawVal;
            };

            tr.innerHTML = `
                <td class="text-center">${val(row.no_aoi)}</td>
                <td class="text-center">${getPicName(row.pic_skai)}</td>
                <td class="text-center">${val(row.jenis_aoi)}</td>
                <td class="text-center">${val(row.klasifikasi)}</td>
                <td class="text-center">${val(row.no_lha)}</td>
                <td class="text-center">${val(row.nama_penugasan)}</td>
                <td class="col-wide" style="text-align: justify; vertical-align: middle;">${formatListText(row.aoi)}</td>
                <td class="col-wide" style="text-align: justify; vertical-align: middle;">${formatListText(row.rekomendasi)}</td>
                <td class="col-wide" style="text-align: justify; vertical-align: middle;">${formatListText(row.rencana_tl)}</td>
                <td class="col-wide" style="text-align: justify; vertical-align: middle;">${formatListText(row.rencana_evidence)}</td>
                <td class="text-center" style="text-align: justify; vertical-align: middle;">${val(row.auditee)}</td>
                <td class="text-left" style="vertical-align:top;">${formatPICList(row.pic_auditee)}</td>
                <td class="text-center">${formatDisplayDate(row.target_penyelesaian)}</td>
                <td class="text-center">${formatDisplayDate(row.perubahan_target)}</td>
                <td class="col-wide" style="text-align: justify; vertical-align: middle;">${formatListText(row.tindak_lanjut)}</td>
                <td class="text-center">${val(row.signifikansi)}</td>
                
                <td class="text-center">${statusPrevHtml}</td>
                <td class="text-center">${statusCurrHtml}</td>
                
                <td class="text-center font-weight-bold">${num(row.jml_rekomendasi)}</td>
                <td class="text-center font-weight-bold" style="color:green;">${num(row.selesai)}</td>
                <td class="text-center">${num(row.belum_jt_bs)}</td>
                <td class="text-center">${num(row.os_bd)}</td>
                <td class="text-center">${num(row.tdd)}</td>
                
                <td class="text-center">${val(rawControl)}</td>
                
                <td class="col-wide text-left" style="background-color: #fffde7; min-width: 320px;">
                    <div class="comment-list">${renderCommentsHTML(row.comments)}</div>
                    <button class="btn-add-note-modern" onclick="openCommentModal(${row.id})" style="margin-top:8px;">+ Tambah Catatan</button>
                </td>
                <td class="col-history">${renderHistoryList(row.history_logs)}</td>
                <td class="text-center">
                    <div style="display: flex; gap: 5px; justify-content: center;">
                        <button class="edit-row-btn" style="background:#1976d2; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.85em;" onclick="openEditModal(${row.id})">Edit</button>
                        <button class="delete-row-btn" style="background:#d32f2f; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.85em;" onclick="confirmDeleteRow(${row.id})">Hapus</button>
                    </div>
                </td>
            `;
            temuanTbody.appendChild(tr);
        });
    }

    function openAddRowModal() {
        isEditing = false;
        editRowId = null;
        document.getElementById('add-data-form').reset();
        if(modalTitle) modalTitle.textContent = "Tambah Data Temuan";
        document.getElementById('current-session-id').value = currentSessionId;
        toggleModal('add-data-modal', true);
    }

    window.openEditModal = function(rowId) {
        isEditing = true;
        editRowId = rowId;
        const rowData = allData.find(r => r.id === rowId);
        if (!rowData) return alert("Data tidak ditemukan.");
        
        if(modalTitle) modalTitle.textContent = "Edit Data Temuan";
        const form = document.getElementById('add-data-form');
        
        const fields = ['no_aoi', 'jenis_aoi', 'klasifikasi', 'no_lha', 'nama_penugasan', 'aoi', 'rekomendasi', 'rencana_tl', 'rencana_evidence', 'auditee', 'pic_auditee', 'target_penyelesaian', 'perubahan_target', 'tindak_lanjut', 'signifikansi', 'jml_rekomendasi', 'selesai', 'belum_jt_bs', 'os_bd', 'tdd', 'control'];
        fields.forEach(key => {
            const input = form.elements[key];
            if(input) input.value = rowData[key] || (key.includes('jml') || key === 'selesai' || key === 'os_bd' || key === 'belum_jt_bs' || key === 'tdd' ? 0 : '');
        });
        if(form.elements['pic_skai']) form.elements['pic_skai'].value = rowData['pic_skai'] || '';
        toggleModal('add-data-modal', true);
    }

    async function handleSaveRowData(e) {
        e.preventDefault();

        if (!currentSessionId) {
            return showCustomMessage("Error: ID Sesi hilang / belum dipilih.");
        }

        const formData = new FormData(addDataForm);
        const data = Object.fromEntries(formData.entries());

        let url = isEditing && editRowId ? `/api/edit_temuan_row/${editRowId}` : '/api/add_temuan_row';
        if (!isEditing) data.session_id = currentSessionId;

        const submitBtn = addDataForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan...";

        try {
            const res = await fetch(url, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showCustomMessage(isEditing ? "Data berhasil diperbarui!" : "Data berhasil disimpan!");
                toggleModal('add-data-modal', false);
                addDataForm.reset();
                loadTemuanData(currentSessionId);
            } else {
                const errData = await res.json();
                showCustomMessage("Gagal simpan: " + (errData.error || "Error server"));
            }
        } catch (err) {
            console.error(err);
            showCustomMessage("Gagal menyimpan data (Error Koneksi).");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    window.confirmDeleteRow = function(rowId) { 
        pendingDeleteRowId = rowId; 
        deleteMode = 'row';
        const modalTitle = document.querySelector('#delete-confirm-modal h3');
        const modalText = document.querySelector('#delete-confirm-modal p');
        if(modalTitle) modalTitle.textContent = "Konfirmasi Hapus";
        if(modalText) modalText.textContent = "Apakah Anda yakin ingin menghapus baris data ini? Tindakan ini tidak dapat dibatalkan.";
        toggleModal('delete-confirm-modal', true); 
    }

    async function executeDeleteRow() {
        if(!pendingDeleteRowId) return;
        try {
            const res = await fetch(`/api/delete_temuan_row/${pendingDeleteRowId}`, { method: 'DELETE' });
            if(res.ok) {
                toggleModal('delete-confirm-modal', false);
                loadTemuanData(currentSessionId);
                pendingDeleteRowId = null;
            } else { const err = await res.json(); alert("Gagal: " + (err.error || "Error")); }
        } catch(e) { alert("Error koneksi."); }
    }

    window.openCommentModal = function(rowId) { rowToCommentId = rowId; document.getElementById('comment-text-input').value = ''; toggleModal('comment-modal', true); }
    async function handleSaveComment(e) {
        e.preventDefault(); 
        
        if(!rowToCommentId) return;
        
        const inputField = document.getElementById('comment-text-input');
        const text = inputField.value;
        const submitBtn = e.target.querySelector('button[type="submit"]'); 
        const originalBtnText = submitBtn.innerText;

        if(!text.trim()) { 
            showCustomMessage("Mohon isi komentar terlebih dahulu."); 
            return; 
        }

        submitBtn.disabled = true;
        submitBtn.innerText = "Menyimpan...";

        try {
            const res = await fetch(`/api/add_comment/${rowToCommentId}`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ comment: text }) 
            });
            
            if(res.ok) { 
                showCustomMessage("Komentar berhasil disimpan!"); 
                toggleModal('comment-modal', false); 
                inputField.value = ''; 
                loadTemuanData(currentSessionId); 
            } else { 
                const err = await res.json();
                showCustomMessage("Gagal: " + (err.error || "Terjadi kesalahan server"));
            }
        } catch(err) { 
            showCustomMessage("Error koneksi internet."); 
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
    function renderCommentsHTML(comments) {
        if (!comments || !comments.length) return '<div style="text-align:center; color:#999; font-style:italic; padding:10px;">Belum ada catatan</div>';
        
        let html = `
            <table class="mini-comment-table" style="width:100%; border-collapse:collapse; background:white; border:1px solid #ddd; border-radius:4px; overflow:hidden;">
                <thead>
                    <tr style="background-color:#e3f2fd; color:#1565c0; font-size:0.85em;">
                        <th style="padding:8px; text-align:center; border-bottom:2px solid #90caf9; width:1%; white-space:nowrap;">User / Tanggal</th>
                        <th style="padding:8px; text-align:center; border-bottom:2px solid #90caf9;">Komentar</th>
                    </tr>
                </thead>
                <tbody>
        `;

        comments.forEach(c => {
            const deleteBtn = c.is_owner 
                ? `<button class="btn-delete-floating" onclick="confirmDeleteComment(${c.id})" title="Hapus">&times;</button>` 
                : '';

            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:8px 12px; vertical-align:top; text-align:center; font-weight:600; color:#444; font-size:0.8em; background-color:#fafafa; border-right:1px solid #eee; white-space:nowrap;">
                        <div style="margin-bottom:2px;">${c.username}</div>
                        <div style="font-weight:normal; color:#888; font-size:0.9em;">${c.created_at.split(',')[0]}</div>
                    </td>
                    
                    <td style="padding:10px 30px 10px 12px; vertical-align:middle; text-align:justify; color:#333; font-size:0.9em; line-height:1.3; position:relative; white-space: normal; word-break: break-word;">
                        ${c.content}
                        ${deleteBtn}
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        return html;
    }
    window.confirmDeleteComment = function(id) { pendingDeleteCommentId = id; toggleModal('delete-comment-modal', true); }
    async function executeDeleteComment() {
        if(!pendingDeleteCommentId) return;
        try { await fetch(`/api/delete_comment/${pendingDeleteCommentId}`, { method: 'DELETE' }); toggleModal('delete-comment-modal', false); loadTemuanData(currentSessionId); } catch(e) { alert("Gagal."); }
    }

    async function openShareModal() {
        if (!currentSessionId) return showCustomMessage("Pilih sesi Temuan terlebih dahulu.");
        
        document.getElementById('share-session-name-display').textContent = 
            document.getElementById('temuan-session-select').selectedOptions[0].text;
            
        const tbody = document.getElementById('user-table-body');
        const container = document.getElementById('user-list-container');
        
        tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 20px;">Memuat...</td></tr>';
        toggleModal('share-session-modal', true);

        try {
            const res = await fetch('/api/get_all_users'); 
            if (!res.ok) throw new Error("Gagal mengambil data user.");
            
            const users = await res.json();
            
            currentUsers = users.map(u => ({
                id: u.id,
                fullname: u.fullname,
                label: u.label,
                is_shared: false 
            }));
            
            sortUserTable(lastSortKey); 
            
            document.querySelectorAll('.user-share-table th.sortable').forEach(header => {
                if (!header.hasAttribute('data-listener-attached')) {
                    header.addEventListener('click', function() {
                        const sortKey = this.getAttribute('data-sort-key');
                        sortUserTable(sortKey);
                    });
                    header.setAttribute('data-listener-attached', 'true');
                }
            });


        } catch (e) { 
            tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 20px; color: #d32f2f;">Gagal memuat daftar user.</td></tr>'; 
            console.error("Error memuat user untuk share:", e);
        }
    }

    async function handleSubmitShare() {
        const uids = Array.from(document.querySelectorAll('.share-user-checkbox:checked')).map(cb => parseInt(cb.value));
        if(!uids.length) return showCustomMessage("Pilih user yang akan dibagikan.");
        
        const submitBtn = document.getElementById('btn-submit-share');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Processing...";
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/share_temuan_session', { 
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify({session_id:currentSessionId, user_ids:uids})
            });
            
            if (res.ok) {
                toggleModal('share-session-modal', false); 
                showCustomMessage("Akses sesi berhasil dibagikan.");
            } else {
                const err = await res.json();
                showCustomMessage("Gagal share: " + (err.error || "Error tidak diketahui"));
            }

        } catch (e) {
             showCustomMessage("Error koneksi saat berbagi.");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const data = new Uint8Array(evt.target.result);
            workbook = XLSX.read(data, {type: 'array'});
            const select = document.getElementById('excel-sheet-select');
            select.innerHTML = '';
            workbook.SheetNames.forEach(name => { select.appendChild(new Option(name, name)); });
            toggleModal('sheet-selection-modal', true);
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    }

    async function processImportData() {
        if (!workbook || !currentSessionId) {
            showCustomMessage("Sesi atau File belum siap.");
            return;
        }
        const sheetName = document.getElementById('excel-sheet-select').value;
        const worksheet = workbook.Sheets[sheetName];

        // --- PERBAIKAN: Menggunakan sheet_to_json dengan raw: false untuk parsing nilai hasil perhitungan ---
        let rawData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false});
        // --- END PERBAIKAN ---

        const cleanStr = (str) => {
            if (!str || typeof str !== 'string') return "";
            return str.toLowerCase().replace(/[^a-z0-9]/g, '');
        };

        let headerRowIndex = 0;
        let maxScore = 0;
        const headerKeywords = ["no", "aoi", "jenis", "klasifikasi", "lha", "penugasan", "rekomendasi", "auditee", "pic", "target", "tl", "tindak", "status", "jumlah", "selesai", "bpk", "control", "os", "bd", "bs"];

        for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const row = rawData[i];
            if (!Array.isArray(row)) continue;
            let score = 0;
            row.forEach(cell => {
                if (cell && typeof cell === 'string') {
                    const c = cleanStr(cell);
                    if (headerKeywords.some(k => c.includes(k))) score++;
                }
            });
            if (score > maxScore) { maxScore = score; headerRowIndex = i; }
        }

        const headers = rawData[headerRowIndex];
        if (!headers || !Array.isArray(headers)) {
            alert("Gagal mendeteksi header tabel di Excel.");
            return;
        }

        const mapConfig = {};
        const dict = {
            'no_aoi': ['no', 'nomor', 'aoi'],
            'jenis_aoi': ['jenis'],
            'klasifikasi': ['klasifikasi', 'tahun'],
            'no_lha': ['lha', 'laporan'],
            'nama_penugasan': ['nama', 'penugasan', 'judul', 'kegiatan', 'project', 'audit'],
            'aoi': ['area', 'improvement', 'temuan', 'masalah', 'kondisi'],
            'rekomendasi': ['rekomendasi', 'saran'],
            'rencana_tl': ['rencana', 'action', 'plan'], 
            'rencana_evidence': ['evidence', 'bukti'],
            'auditee': ['auditee', 'unit', 'divisi'],
            'pic_auditee': ['pic'],
            'target_penyelesaian': ['target', 'due', 'date', 'jatuh', 'tempo'],
            'perubahan_target': ['perubahan', 'revised', 'revisi'],
            'tindak_lanjut': ['tindak', 'lanjut', 'progress', 'status', 'tl'], 
            'signifikansi': ['signifikansi', 'risk', 'risiko'],
            'jml_rekomendasi': ['jumlahrekomendasi', 'jmlrekomendasi', 'totalrekomendasi'],
            'selesai': ['selesai', 'done', 'closed'],
            'belum_jt_bs': ['belumjatuhtempo', 'bjt', 'belumsesuai', 'bs', 'noncompliance', 'bsbpk'], 
            'os_bd': ['outstanding', 'os', 'belumditindaklanjuti', 'bd', 'btl', 'belumtindaklanjut', 'bdbpk'],
            'tdd': ['tddbpk', 'tdd'],
            'control': ['control'],
            'status_excel': ['status', 'sts', 'stat'] 
        };

        headers.forEach((h, idx) => {
            const hClean = cleanStr(h);
            if (!hClean) return;
            
            for (const [dbKey, keywords] of Object.entries(dict)) {
                if (mapConfig[dbKey] === undefined) {
                    if (dbKey === 'tindak_lanjut' && hClean.includes('rencana')) continue; 
                    if (dbKey === 'os_bd') {
                        if (hClean.includes('jatuh') || hClean.includes('sesuai') || hClean.includes('bjt')) continue;
                    }
                    if (dbKey === 'belum_jt_bs') {
                        if (hClean.includes('outstanding') || hClean.includes('tindak') || hClean.includes('os')) continue;
                    }
                    if (keywords.some(k => hClean.includes(k))) {
                        mapConfig[dbKey] = idx;
                    }
                }
            }
        });

        const mappedData = [];
        let lastNoAoi = "", lastAuditee = "", lastKlasifikasi = "", lastJenisAoi = "", lastNoLha = "", lastNamaPenugasan = "";
        let lastTindakLanjut = ""; 

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const getVal = (key) => {
                const idx = mapConfig[key];
                if (idx === undefined) return "";
                const val = row[idx];
                return (val === undefined || val === null) ? "" : String(val).trim();
            };

            const getNum = (key) => {
                const val = getVal(key);
                if (val === "") return "0"; 
                const clean = val.replace(/[^0-9\.\-]/g, '');
                return clean || "0";
            };
            
            let isExcelSelesai = false;
            const valSelesai = parseInt(getNum('selesai'));
            const valJml = parseInt(getNum('jml_rekomendasi'));
            if(valJml > 0 && valSelesai === valJml) isExcelSelesai = true;

            const statusIndices = [];
            headers.forEach((h, idx) => {
                if(cleanStr(h).includes('status')) statusIndices.push(idx);
            });
            statusIndices.forEach(idx => {
                const cellVal = row[idx];
                if (cellVal && typeof cellVal === 'string') {
                    if (cellVal.toLowerCase().includes('selesai')) isExcelSelesai = true;
                }
            });

            let rawControl = getVal('control');
            if (isExcelSelesai) {
                if(!rawControl.includes('$$FORCE_SELESAI$$')) {
                    rawControl = rawControl + " $$FORCE_SELESAI$$";
                }
            }

            let rawNoAoi = getVal('no_aoi');
            let rawAuditee = getVal('auditee');
            let rawTindakLanjut = getVal('tindak_lanjut'); 
            
            if (rawNoAoi) lastNoAoi = rawNoAoi;
            if (rawAuditee) lastAuditee = rawAuditee;
            if (getVal('klasifikasi')) lastKlasifikasi = getVal('klasifikasi');
            if (getVal('jenis_aoi')) lastJenisAoi = getVal('jenis_aoi');
            if (getVal('no_lha')) lastNoLha = getVal('no_lha');
            if (getVal('nama_penugasan')) lastNamaPenugasan = getVal('nama_penugasan');
            
            if (rawTindakLanjut) lastTindakLanjut = rawTindakLanjut;
            const finalTindakLanjut = rawTindakLanjut || lastTindakLanjut;

            const hasContent = (getVal('rekomendasi') || getVal('rencana_tl') || finalTindakLanjut || getVal('aoi'));
            const finalNoAoi = rawNoAoi || (hasContent ? lastNoAoi : "");
            const finalAuditee = rawAuditee || (hasContent ? lastAuditee : "");

            if (!finalNoAoi && !finalAuditee && !hasContent) continue;

            const item = {
                no_aoi: finalNoAoi,
                pic_skai: "",
                jenis_aoi: getVal('jenis_aoi') || (hasContent ? lastJenisAoi : ""),
                klasifikasi: getVal('klasifikasi') || (hasContent ? lastKlasifikasi : ""),
                no_lha: getVal('no_lha') || (hasContent ? lastNoLha : ""),
                nama_penugasan: getVal('nama_penugasan') || (hasContent ? lastNamaPenugasan : ""),
                aoi: getVal('aoi'),
                rekomendasi: getVal('rekomendasi'),
                rencana_tl: getVal('rencana_tl'),
                rencana_evidence: getVal('rencana_evidence'),
                auditee: finalAuditee,
                pic_auditee: getVal('pic_auditee'),
                target_penyelesaian: getVal('target_penyelesaian'),
                perubahan_target: getVal('perubahan_target'),
                tindak_lanjut: finalTindakLanjut,
                signifikansi: getVal('signifikansi'),
                jml_rekomendasi: getNum('jml_rekomendasi'),
                selesai: getNum('selesai'),
                belum_jt_bs: getNum('belum_jt_bs'),
                os_bd: getNum('os_bd'),
                tdd: getNum('tdd'),
                control: rawControl
            };
            mappedData.push(item);
        }

        toggleModal('sheet-selection-modal', false);
        toggleModal('import-progress-modal', true);
        updateProgress(10, "Reset data lama & Import data baru...");

        const CHUNK_SIZE = 50;
        for (let i = 0; i < mappedData.length; i += CHUNK_SIZE) {
            const chunk = mappedData.slice(i, i + CHUNK_SIZE);
            const isFirstChunk = (i === 0);

            try {
                updateProgress(Math.round((i / mappedData.length) * 100), `Mengirim baris ${i+1} - ${i+chunk.length}...`);
                await fetch('/api/import_temuan_json', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        session_id: currentSessionId,
                        data: chunk,
                        reset_data: isFirstChunk
                    })
                });
            } catch (e) {
                console.error(e);
                alert("Gagal mengirim data.");
                return;
            }
        }

        updateProgress(100, "Selesai!");
        setTimeout(() => {
            toggleModal('import-progress-modal', false);
            loadTemuanData(currentSessionId);
            toggleModal('import-warning-modal', true); // Munculkan warning di sini
        }, 1000);
    }

    function updateProgress(percent, text) {
        const bar = document.getElementById('import-progress-bar');
        const txt = document.getElementById('import-progress-text');
        if(bar) { bar.style.width = percent + '%'; bar.textContent = percent + '%'; }
        if(txt) txt.textContent = text;
    }

    window.exportTableToExcel = function(tableID, filename = '') {
        if (allData.length === 0) return alert("Tidak ada data.");
        const exportData = allData.map(row => ({
            "No AOI": row.no_aoi, "PIC SKAI": row.pic_skai, "Jenis AOI": row.jenis_aoi,
            "Klasifikasi": row.klasifikasi, "No LHA": row.no_lha, "Nama Penugasan": row.nama_penugasan,
            "AOI": row.aoi, "Rekomendasi": row.rekomendasi, "Rencana TL": row.rencana_tl,
            "Auditee": row.auditee, "Target": row.target_penyelesaian, "Tindak Lanjut": row.tindak_lanjut
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Temuan");
        XLSX.writeFile(wb, (filename || 'Data_Temuan') + '.xlsx');
    }

    async function loadUserMap() {
        try {
            const res = await fetch('/api/get_all_users');
            if (res.ok) {
                const users = await res.json();
                users.forEach(u => {
                    if (u.username) userMap[u.username] = u.fullname;
                    if (u.id) userMap[u.id] = u.fullname;
                    if (u.fullname) userMap[u.fullname] = u.fullname;
                });
                console.log("User Map Loaded:", userMap); 
            }
        } catch (e) {
            console.error("Gagal memuat daftar user untuk mapping", e);
        }
    }

    initApp();
});