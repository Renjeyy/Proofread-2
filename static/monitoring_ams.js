document.addEventListener('DOMContentLoaded', async () => {
    const dataTableContainer = document.getElementById('data-table-container');
    const tableTitle = document.getElementById('table-title');
    const dynamicTablesWrapper = document.getElementById('dynamic-tables-wrapper');
    const periodFilterSelect = document.getElementById('period-filter-select');
    
    const dropdownHeader = document.getElementById('dropdown-header');
    const dropdownList = document.getElementById('dropdown-list');
    const dropdownSelectedText = document.getElementById('dropdown-selected-text');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    
    const addSessionBtn = document.getElementById('add-session-btn'); 
    const renameSessionBtn = document.getElementById('rename-session-btn');
    const shareSessionBtn = document.getElementById('share-session-btn'); 
    const deleteSessionBtn = document.getElementById('delete-session-btn'); 
    const addAuditeeBtn = document.getElementById('add-auditee-btn');

    const createSessionModal = document.getElementById('create-session-modal');
    const createSessionForm = document.getElementById('create-session-form');
    const createSessionCloseBtn = document.getElementById('create-session-modal-close-btn');
    const createSessionCancelBtn = document.getElementById('create-session-cancel-btn');
    const monitoringTypeSelect = document.getElementById('monitoring-type-select');
    const sessionNameInput = document.getElementById('session-name-input');
    const createSessionPeriod = document.getElementById('create-session-period');

    const renameSessionModal = document.getElementById('rename-session-modal');
    const renameSessionForm = document.getElementById('rename-session-form');
    const renameSessionCloseBtn = document.getElementById('rename-session-close-btn');
    const renameSessionCancelBtn = document.getElementById('rename-session-cancel-btn');

    const addAuditeeModal = document.getElementById('add-auditee-modal');
    const addAuditeeForm = document.getElementById('add-auditee-form');
    const addAuditeeCloseBtn = document.getElementById('add-auditee-modal-close-btn');
    const addAuditeeCancelBtn = document.getElementById('add-auditee-cancel-btn');
    const auditeeSessionSelect = document.getElementById('auditee-session-select');

    const editAuditeeModal = document.getElementById('edit-auditee-modal');
    const editAuditeeForm = document.getElementById('edit-auditee-form');
    const editAuditeeCloseBtn = document.getElementById('edit-auditee-modal-close-btn');
    const editAuditeeCancelBtn = document.getElementById('edit-auditee-cancel-btn');

    const shareSessionModal = document.getElementById('share-session-modal');
    const shareSessionCloseBtn = document.getElementById('share-session-close-btn');
    const shareUserListBody = document.getElementById('share-user-list-body');
    const confirmShareBtn = document.getElementById('confirm-share-btn');

    const STORAGE_KEY_FILTERS = 'ams_selected_filters';
    const STORAGE_KEY_LOCAL_SESSIONS = 'ams_local_created_sessions';
    let currentSessionName = null; 
    let allFetchedData = []; 
    let currentSelectedSessions = [];

    const calcPct = (val, total) => total > 0 ? Math.round((val / total) * 100) + '%' : '0%';
    function openModal(modal) { if(modal) modal.classList.remove('hidden'); }
    function closeModal(modal) { if(modal) modal.classList.add('hidden'); }
    
    function showCustomMessage(message, type = 'info') {
        const modal = document.getElementById('custom-message-modal');
        const textEl = document.getElementById('custom-message-text');
        if(modal && textEl) {
            textEl.textContent = message;
            openModal(modal);
        } else { console.log(message); }
    }
    
    function showCustomConfirm(message, onConfirm) {
       const modal = document.getElementById('custom-confirm-modal');
       const textEl = document.getElementById('custom-confirm-text');
       const okBtn = document.getElementById('custom-confirm-ok-btn');
       const cancelBtn = document.getElementById('custom-confirm-cancel-btn');
       textEl.textContent = message;
       const newOkBtn = okBtn.cloneNode(true);
       okBtn.parentNode.replaceChild(newOkBtn, okBtn);
       newOkBtn.addEventListener('click', () => { closeModal(modal); onConfirm(true); });
       cancelBtn.onclick = () => { closeModal(modal); onConfirm(false); };
       openModal(modal);
    }

    if(dropdownHeader) {
        dropdownHeader.addEventListener('click', (e) => { e.stopPropagation(); dropdownList.classList.toggle('hidden'); });
    }
    document.addEventListener('click', (e) => {
        if (document.getElementById('custom-dropdown') && !document.getElementById('custom-dropdown').contains(e.target)) {
            if(dropdownList) dropdownList.classList.add('hidden');
        }
    });

    function updateDropdownLabel() {
        const checkboxes = document.querySelectorAll('.session-checkbox:checked');
        if (checkboxes.length === 0) dropdownSelectedText.textContent = "Pilih Sesi...";
        else if (checkboxes.length === 1) dropdownSelectedText.textContent = checkboxes[0].value;
        else dropdownSelectedText.textContent = `${checkboxes.length} Sesi Dipilih`;
    }

    function updateSessionName() {
        const typeText = monitoringTypeSelect.options[monitoringTypeSelect.selectedIndex]?.text || "";
        const period = createSessionPeriod.value;
        
        if (typeText && period && typeText !== "-- Pilih Jenis Audit --") {
            const [year, month] = period.split('-');
            const dateObj = new Date(year, month - 1);
            const monthName = dateObj.toLocaleString('id-ID', { month: 'long' });
            sessionNameInput.value = `${typeText} - ${monthName} ${year}`;
        }
    }

    if (monitoringTypeSelect) monitoringTypeSelect.addEventListener('change', updateSessionName);
    if (createSessionPeriod) createSessionPeriod.addEventListener('change', updateSessionName);

    async function loadMonitoringData(selectedSessions) {
        if (!selectedSessions || selectedSessions.length === 0) {
            dataTableContainer.classList.add('hidden');
            return;
        }

        currentSelectedSessions = selectedSessions;
        // Simpan filter hanya yang valid
        localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(selectedSessions.map(s => s.name)));
        
        const originalText = applyFilterBtn.textContent;
        applyFilterBtn.textContent = "Memuat..."; 
        applyFilterBtn.disabled = true;

        try {
            dataTableContainer.classList.remove('hidden');
            allFetchedData = [];

            for (const session of selectedSessions) {
                let url = `/api/get_monitoring_data/${encodeURIComponent(session.name)}`;
                if (session.ownerId) url += `?owner_id=${session.ownerId}`;

                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`Gagal memuat sesi: ${session.name} (Status: ${response.status})`);
                        continue; // Skip sesi yang error, jangan stop semuanya
                    }
                    const data = await response.json();
                    
                    const processedData = data.map(item => ({ 
                        ...item, 
                        session_name: session.name, 
                        monitoring_type: session.type 
                    }));
                    allFetchedData = [...allFetchedData, ...processedData];
                } catch (innerErr) {
                    console.error(`Error fetching specific session ${session.name}:`, innerErr);
                }
            }

            updatePeriodFilterDropdown();
            filterDataByPeriod(); 

            // Logika UI tombol (Edit/Hapus/Share)
            if (selectedSessions.length === 1) {
                const session = selectedSessions[0];
                tableTitle.textContent = session.name; 
                currentSessionName = session.name;

                if (session.ownerId) { 
                    deleteSessionBtn.style.display = 'none'; addAuditeeBtn.style.display = 'none';
                    shareSessionBtn.style.display = 'none'; renameSessionBtn.style.display = 'none';
                } else { 
                    deleteSessionBtn.style.display = 'inline-block'; addAuditeeBtn.style.display = 'inline-block';
                    shareSessionBtn.style.display = 'inline-block'; renameSessionBtn.style.display = 'inline-block';
                }
            } else {
                tableTitle.textContent = `Tampilan Gabungan (${selectedSessions.length} Sesi)`;
                currentSessionName = null;
                deleteSessionBtn.style.display = 'none'; addAuditeeBtn.style.display = 'inline-block'; 
                shareSessionBtn.style.display = 'none'; renameSessionBtn.style.display = 'none';
            }

        } catch (error) { 
            console.error("Critical Error loading data:", error); 
            if (allFetchedData.length === 0 && selectedSessions.length > 0) {
                showCustomMessage("Gagal memuat data. Mungkin sesi telah dihapus.", "error");
            }
        } finally { 
            applyFilterBtn.textContent = "Tampilkan Data"; 
            applyFilterBtn.disabled = false; 
        }
    }

    function updatePeriodFilterDropdown() {
        const uniquePeriods = [...new Set(allFetchedData.map(item => item.periode))].filter(p => p).sort().reverse();
        const displayMap = {};
        allFetchedData.forEach(item => {
            if(item.periode) displayMap[item.periode] = item.periode_display;
        });

        periodFilterSelect.innerHTML = '<option value="latest">Terbaru</option>';
        if(uniquePeriods.length > 0) {
            periodFilterSelect.innerHTML += '<option value="all">Semua Periode</option>';
            uniquePeriods.forEach(p => {
                periodFilterSelect.innerHTML += `<option value="${p}">${displayMap[p]}</option>`;
            });
        }
        periodFilterSelect.value = 'latest';
    }

    function filterDataByPeriod() {
        const selectedPeriod = periodFilterSelect.value;
        let filteredData = [];

        if (selectedPeriod === 'latest') {
            if (allFetchedData.length > 0) {
                const uniquePeriods = [...new Set(allFetchedData.map(item => item.periode))].filter(p => p).sort().reverse();
                const latestPeriod = uniquePeriods[0];
                filteredData = allFetchedData.filter(d => d.periode === latestPeriod);
            }
        } else if (selectedPeriod === 'all') {
            filteredData = allFetchedData;
        } else {
            filteredData = allFetchedData.filter(d => d.periode === selectedPeriod);
        }

        renderDynamicTables(filteredData);
    }

    function renderDynamicTables(data) {
        dynamicTablesWrapper.innerHTML = '';
        
        currentSelectedSessions.forEach(session => {
            const sName = session.name;
            const mType = session.type;
            const ownerId = session.ownerId;
            const sessionData = data.filter(d => d.session_name === sName);
            const tableHTML = createSessionTableHTML(sName, sessionData, ownerId, true, mType);
            dynamicTablesWrapper.insertAdjacentHTML('beforeend', tableHTML);
        });
    }

    async function fetchAndDisplaySessions() {
        try {
            const response = await fetch('/api/get_monitoring_sessions');
            let apiSessions = [];
            if (response.ok) apiSessions = await response.json();
            
            // Ambil Data Lokal (Sesi yang baru dibuat tapi belum ada data/upload gambar)
            let localCreatedSessions = [];
            try {
                localCreatedSessions = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SESSIONS) || '[]');
            } catch (e) { 
                console.error("Error reading local sessions", e);
            }

            // --- 1. GABUNGKAN SESI API + SESI LOKAL ---
            // Kita mulai dengan sesi dari API
            let finalSessions = [...apiSessions];
            
            // List nama dari API untuk pengecekan duplikat
            const apiSessionNames = apiSessions.map(s => s.name);

            // Masukkan sesi lokal JIKA belum ada di API
            localCreatedSessions.forEach(localObj => {
                let sName = (typeof localObj === 'object') ? localObj.name : localObj;
                let sType = (typeof localObj === 'object') ? localObj.type : 'standard';
                
                // Cek apakah nama ini SUDAH ADA di API?
                if (!apiSessionNames.includes(sName)) {
                    // Cek apakah nama ini SUDAH ADA di list final (biar gak dobel di dropdown)?
                    if (!finalSessions.some(s => s.name === sName)) {
                        // Taruh di paling atas (unshift) biar mudah dicari
                        finalSessions.unshift({ 
                            name: sName, 
                            type: sType, 
                            owner: null, 
                            is_shared: false, 
                            is_temp: true // Penanda ini sesi lokal
                        });
                    }
                }
            });

            // --- 2. LOGIKA CHECKBOX TERPILIH (FILTER) ---
            let savedFilters = [];
            try {
                savedFilters = JSON.parse(localStorage.getItem(STORAGE_KEY_FILTERS) || '[]');
            } catch (e) { localStorage.removeItem(STORAGE_KEY_FILTERS); }

            // --- 3. RENDER DROPDOWN ---
            dropdownList.innerHTML = '';
            
            if (finalSessions.length === 0) {
                dropdownList.innerHTML = '<div class="dropdown-item" style="color: #999;">Belum ada sesi.</div>';
                populateSessionSelect([]);
                return;
            }

            let sessionsToAutoLoad = [];
            // Buat daftar nama valid dari GABUNGAN (bukan cuma API)
            const allValidNames = finalSessions.map(s => s.name);

            finalSessions.forEach(sessionObj => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dropdown-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'session-checkbox';
                checkbox.value = sessionObj.name;
                checkbox.dataset.type = sessionObj.type || 'standard';
                if(sessionObj.is_shared) checkbox.dataset.ownerId = sessionObj.owner_id;
                checkbox.id = `chk-${sessionObj.name.replace(/\s+/g, '_')}`;
                
                // Cek checkbox jika ada di savedFilters DAN namanya valid di daftar gabungan
                if (savedFilters.includes(sessionObj.name) && allValidNames.includes(sessionObj.name)) {
                    checkbox.checked = true;
                    sessionsToAutoLoad.push({
                        name: sessionObj.name,
                        ownerId: sessionObj.is_shared ? sessionObj.owner_id : null,
                        type: sessionObj.type || 'standard'
                    });
                }

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.style.width = '100%';
                
                let labelText = sessionObj.name;
                if(sessionObj.is_shared) labelText += ` <small style="color:#666;">(Shared)</small>`;
                if(sessionObj.is_temp) labelText += ` <small style="color:#2196F3;">(Baru)</small>`; // Penanda visual
                
                label.innerHTML = `<span>${labelText}</span>`;

                itemDiv.addEventListener('click', (e) => {
                    if (e.target !== checkbox) { checkbox.checked = !checkbox.checked; checkbox.dispatchEvent(new Event('change')); }
                });
                checkbox.addEventListener('change', updateDropdownLabel);
                itemDiv.appendChild(checkbox); itemDiv.appendChild(label); dropdownList.appendChild(itemDiv);
            });
            
            updateDropdownLabel();
            // Isi dropdown di Modal "Tambah Data" juga
            populateSessionSelect(finalSessions.filter(s => !s.is_shared));

            // Load data jika ada yang tercentang
            if (sessionsToAutoLoad.length > 0) {
                setTimeout(() => {
                    loadMonitoringData(sessionsToAutoLoad);
                }, 100);
            } else {
                dataTableContainer.classList.add('hidden');
            }

        } catch (error) { console.warn(error); }
    }

    function populateSessionSelect(sessionList) {
        if(!auditeeSessionSelect) return;
        auditeeSessionSelect.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = ""; defaultOption.textContent = "-- Pilih Sesi --"; defaultOption.disabled = true; defaultOption.selected = true;
        auditeeSessionSelect.appendChild(defaultOption);
        sessionList.forEach(sess => {
            const option = document.createElement('option');
            option.value = sess.name; option.textContent = sess.name; option.dataset.type = sess.type;
            auditeeSessionSelect.appendChild(option);
        });
    }

    if(applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.session-checkbox:checked');
            const selectedSessions = Array.from(checkedBoxes).map(cb => ({
                name: cb.value, 
                ownerId: cb.dataset.ownerId || null, 
                type: cb.dataset.type || 'standard'
            }));
            loadMonitoringData(selectedSessions);
        });
    }
    
    if (periodFilterSelect) {
        periodFilterSelect.addEventListener('change', filterDataByPeriod);
    }

    function createSessionTableHTML(sessionName, data, ownerId, showHeader, monitoringType) {
        let rowsHTML = '';
        let grandTotal = { total:0, selesai:0, bjt:0, out:0, bsr:0, bdl:0, tdd:0 };

        if (!data || data.length === 0) {
            const colspan = (monitoringType === 'bpk') ? 13 : 10;
            rowsHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 2rem; color: #666;">Belum ada data auditee. Silakan upload gambar atau tambah data.</td></tr>`;
        } else {
            const groupedData = data.reduce((acc, item) => { if (!acc[item.auditee]) acc[item.auditee] = []; acc[item.auditee].push(item); return acc; }, {});
            Object.keys(groupedData).sort().forEach(auditeeName => {
                const auditeeRows = groupedData[auditeeName];
                auditeeRows.sort((a, b) => a.tahun_audit - b.tahun_audit);
                const rowCount = auditeeRows.length + 1;

                auditeeRows.forEach((item, index) => {
                    let cellsHTML = '';
                    if (monitoringType === 'bpk') {
                        cellsHTML = `<td>${item.selesai}</td> <td>${calcPct(item.selesai, item.total_rekomendasi)}</td> <td>${item.belum_sesuai}</td> <td>${calcPct(item.belum_sesuai, item.total_rekomendasi)}</td> <td>${item.belum_tl}</td> <td>${calcPct(item.belum_tl, item.total_rekomendasi)}</td> <td>${item.tdd}</td> <td>${calcPct(item.tdd, item.total_rekomendasi)}</td>`;
                    } else { 
                        cellsHTML = `<td>${item.selesai}</td> <td>${calcPct(item.selesai, item.total_rekomendasi)}</td> <td>${item.tidak_selesai}</td> <td>${calcPct(item.tidak_selesai, item.total_rekomendasi)}</td> <td>${item.todo}</td> <td>${calcPct(item.todo, item.total_rekomendasi)}</td>`;
                    }
                    let actionButtons = item.is_read_only ? `<span style="color:#999; font-style:italic; font-size:0.9em;">Read Only</span>` : `<button class="edit-result-btn" data-id="${item.id}" data-auditee="${item.auditee}" data-tahun="${item.tahun_audit}" data-total="${item.total_rekomendasi}" data-selesai="${item.selesai}" data-bjt="${item.tidak_selesai}" data-todo="${item.todo}">Edit</button><button class="delete-result-btn" data-id="${item.id}">Hapus</button>`;
                    let rowStart = index === 0 ? `<td rowspan="${rowCount}" style="vertical-align: top; font-weight: bold;">${auditeeName}</td>` : '';

                    rowsHTML += `<tr>${rowStart}<td>${item.tahun_audit}</td><td style="font-weight: bold;">${item.total_rekomendasi}</td>${cellsHTML}<td style="white-space: nowrap;">${actionButtons}</td></tr>`;
                });

                let sub = auditeeRows.reduce((acc, c) => {
                    acc.total += c.total_rekomendasi; acc.selesai += c.selesai; acc.bjt += c.tidak_selesai; acc.out += c.todo;
                    acc.bsr += c.belum_sesuai; acc.bdl += c.belum_tl; acc.tdd += c.tdd; return acc;
                }, { total:0, selesai:0, bjt:0, out:0, bsr:0, bdl:0, tdd:0 });

                let subCells = monitoringType === 'bpk' ? 
                    `<td>${sub.selesai}</td> <td>${calcPct(sub.selesai, sub.total)}</td> <td>${sub.bsr}</td> <td>${calcPct(sub.bsr, sub.total)}</td> <td>${sub.bdl}</td> <td>${calcPct(sub.bdl, sub.total)}</td> <td>${sub.tdd}</td> <td>${calcPct(sub.tdd, sub.total)}</td>` :
                    `<td>${sub.selesai}</td> <td>${calcPct(sub.selesai, sub.total)}</td> <td>${sub.bjt}</td> <td>${calcPct(sub.bjt, sub.total)}</td> <td>${sub.out}</td> <td>${calcPct(sub.out, sub.total)}</td>`;

                rowsHTML += `<tr style="background-color: #f8f9fa; font-weight: bold;"><td style="text-align: center; font-style: italic;">Total</td><td>${sub.total}</td>${subCells}<td></td></tr>`;
                grandTotal.total += sub.total; grandTotal.selesai += sub.selesai; grandTotal.bjt += sub.bjt; grandTotal.out += sub.out; grandTotal.bsr += sub.bsr; grandTotal.bdl += sub.bdl; grandTotal.tdd += sub.tdd;
            });
        }

        let headerHTML = showHeader ? `<div style="background: #333; color: #fff; padding: 10px 20px; font-weight: bold; font-size: 1.1rem;">${sessionName} ${ownerId ? '(Shared)' : ''}</div>` : '';
        
        let tableHeadHTML = monitoringType === 'bpk' ? 
            `<thead><tr><th rowspan="2">Auditee</th><th rowspan="2">Periode / Tahun</th><th rowspan="2">Total</th><th colspan="2" style="background:#e8f5e9">Selesai</th><th colspan="2" style="background:#fff3e0">Belum Sesuai</th><th colspan="2" style="background:#ffebee">Belum TL</th><th colspan="2" style="background:#eceff1">TDD</th><th rowspan="2">Aksi</th></tr><tr><th>Jumlah</th><th>Persentase</th><th>Jumlah</th><th>Persentase</th><th>Jumlah</th><th>Persentase</th><th>Jumlah</th><th>Persentase</th></tr></thead>` :
            `<thead><tr><th rowspan="2">Auditee</th><th rowspan="2">Periode / Tahun</th><th rowspan="2">Total</th><th colspan="2" style="background:#e8f5e9">Selesai</th><th colspan="2" style="background:#fff3e0">Belum Jatuh Tempo</th><th colspan="2" style="background:#ffebee">Outstanding</th><th rowspan="2">Aksi</th></tr><tr><th>Jumlah</th><th>Persentase</th><th>Jumlah</th><th>Persentase</th><th>Jumlah</th><th>Persentase</th></tr></thead>`;

        let footerCells = monitoringType === 'bpk' ?
            `<td>${grandTotal.selesai}</td> <td>${calcPct(grandTotal.selesai, grandTotal.total)}</td> <td>${grandTotal.bsr}</td> <td>${calcPct(grandTotal.bsr, grandTotal.total)}</td> <td>${grandTotal.bdl}</td> <td>${calcPct(grandTotal.bdl, grandTotal.total)}</td> <td>${grandTotal.tdd}</td> <td>${calcPct(grandTotal.tdd, grandTotal.total)}</td>` :
            `<td>${grandTotal.selesai}</td> <td>${calcPct(grandTotal.selesai, grandTotal.total)}</td> <td>${grandTotal.bjt}</td> <td>${calcPct(grandTotal.bjt, grandTotal.total)}</td> <td>${grandTotal.out}</td> <td>${calcPct(grandTotal.out, grandTotal.total)}</td>`;

        let footerActions = `
            <div style="padding: 1.5rem; text-align: left; background-color: #f9f9f9; border-top: 1px solid #eee; display: flex; gap: 10px; align-items: center;">
                <button class="export-excel-dynamic-btn" data-session="${sessionName}" style="background-color: #217346; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">Export to Excel</button>
        `;
        
        if (!ownerId) {
            footerActions += `
                <input type="file" id="upload-image-input-${sessionName.replace(/\s+/g, '_')}" style="display: none;" accept="image/*" data-session="${sessionName}">
                <button class="upload-image-btn" onclick="document.getElementById('upload-image-input-${sessionName.replace(/\s+/g, '_')}').click()" style="background-color: #009688; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">Upload Gambar</button>
            `;
        }

        let viewUrl = `/monitoring_ams/view/${encodeURIComponent(sessionName)}`;
        if (ownerId) viewUrl += `?owner_id=${ownerId}`;

        footerActions += `
            <a href="${viewUrl}" target="_blank" style="text-decoration:none;">
                <button style="background-color: #1976D2; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Tampilkan di halaman baru
                </button>
            </a>
        `;

        footerActions += `</div>`;

        return `<div class="session-table-block" style="margin-bottom: 3rem; background: #fff; border-radius: 16px; border: 1px solid #e0e0e0; overflow: hidden;"><div class="results-table-wrapper" style="border:none; border-radius:0;"><table class="monitoring-data-table" data-session-name="${sessionName}">${tableHeadHTML}<tbody>${rowsHTML}</tbody><tfoot><tr class="totals-row"><th colspan="2" style="text-align: center;">GRAND TOTAL</th><td>${grandTotal.total}</td>${footerCells}<td></td></tr></tfoot></table></div>${footerActions}</div>`;
    }

    if(monitoringTypeSelect) monitoringTypeSelect.addEventListener('change', () => { if(!sessionNameInput.value) sessionNameInput.value = monitoringTypeSelect.options[monitoringTypeSelect.selectedIndex].text; });
    if(auditeeSessionSelect) auditeeSessionSelect.addEventListener('change', () => {
        const opt = auditeeSessionSelect.options[auditeeSessionSelect.selectedIndex];
        const type = opt.dataset.type || 'standard';
        document.getElementById('input-monitoring-type').value = type;
        document.getElementById('readonly-session-name').value = opt.text;
        document.getElementById('form-fields-standard').style.display = type === 'bpk' ? 'none' : 'contents';
        document.getElementById('form-fields-bpk').style.display = type === 'bpk' ? 'contents' : 'none';
    });

    if(createSessionForm) {
        createSessionForm.addEventListener('submit', async (e) => {
            e.preventDefault(); const fd = new FormData(createSessionForm); const d = Object.fromEntries(fd.entries());
            try {
                const res = await fetch('/api/add_monitoring_session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
                const r = await res.json(); if(!res.ok) throw new Error(r.error);
                
                let locals = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SESSIONS) || '[]');
                locals.push({name: d.session_name, type: d.monitoring_type});
                localStorage.setItem(STORAGE_KEY_LOCAL_SESSIONS, JSON.stringify(locals));
                localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify([d.session_name]));
                
                showCustomMessage(r.message, 'success'); closeModal(createSessionModal); createSessionForm.reset(); fetchAndDisplaySessions();
            } catch(err) { showCustomMessage(err.message, 'error'); }
        });
    }

    if(addAuditeeForm) {
        addAuditeeForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); const fd = new FormData(addAuditeeForm); const d = Object.fromEntries(fd.entries()); 
            try { 
                const res = await fetch('/api/add_auditee_data', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }); 
                const r = await res.json(); if(!res.ok) throw new Error(r.error); 
                showCustomMessage(r.message, 'success'); closeModal(addAuditeeModal); addAuditeeForm.reset(); 
                const cb = document.getElementById(`chk-${d.session_name.replace(/\s+/g, '_')}`);
                if(cb) { cb.checked = true; applyFilterBtn.click(); }
            } catch(err) { showCustomMessage(err.message, 'error'); } 
        });
    }

    if(editAuditeeForm) {
        editAuditeeForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); const fd = new FormData(editAuditeeForm); const d = Object.fromEntries(fd.entries()); 
            try { 
                const res = await fetch(`/api/edit_auditee_data/${d.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) }); 
                const r = await res.json(); if(!res.ok) throw new Error(r.error); 
                showCustomMessage(r.message, 'success'); closeModal(editAuditeeModal); 
                applyFilterBtn.click(); 
            } catch(err) { showCustomMessage(err.message, 'error'); } 
        });
    }

    if(renameSessionForm) { 
        renameSessionForm.addEventListener('submit', async (e) => { 
            e.preventDefault(); const newName = document.getElementById('new-session-name').value.trim(); 
            if(!newName || newName === currentSessionName) { closeModal(renameSessionModal); return; } 
            try { 
                const response = await fetch('/api/rename_monitoring_session', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ old_name: currentSessionName, new_name: newName }) }); 
                const result = await response.json(); if(!response.ok) throw new Error(result.error); 
                let localSessions = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SESSIONS) || '[]'); 
                localSessions = localSessions.map(s => (s.name === currentSessionName) ? {...s, name: newName} : s); 
                localStorage.setItem(STORAGE_KEY_LOCAL_SESSIONS, JSON.stringify(localSessions)); 
                showCustomMessage(result.message, "success"); closeModal(renameSessionModal); 
                localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify([newName])); 
                fetchAndDisplaySessions(); 
            } catch (error) { showCustomMessage(error.message, "error"); } 
        }); 
    }

    if(dynamicTablesWrapper) {
        dynamicTablesWrapper.addEventListener('click', (event) => {
            if(event.target.closest('.export-excel-dynamic-btn')) {
                const btn = event.target.closest('.export-excel-dynamic-btn');
                const tbl = btn.closest('.session-table-block').querySelector('table');
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(tbl), 'Data');
                XLSX.writeFile(wb, (btn.dataset.session || 'Data') + '.xlsx');
            }
            if(event.target.classList.contains('edit-result-btn')) {
                const btn = event.target;
                document.getElementById('edit_auditee_id').value = btn.dataset.id;
                document.getElementById('edit_auditee_name').value = btn.dataset.auditee;
                document.getElementById('edit_tahun_audit').value = btn.dataset.tahun;
                document.getElementById('edit_total_rekomendasi').value = btn.dataset.total;
                document.getElementById('edit_selesai').value = btn.dataset.selesai;
                document.getElementById('edit_tidak_selesai').value = btn.dataset.bjt;
                document.getElementById('edit_todo').value = btn.dataset.todo;
                openModal(editAuditeeModal);
            }
            if(event.target.classList.contains('delete-result-btn')) {
                const id = event.target.dataset.id;
                showCustomConfirm('Hapus?', async (y) => { if(y) { await fetch(`/api/delete_auditee/${id}`, {method:'DELETE'}); applyFilterBtn.click(); } });
            }
        });
        
        dynamicTablesWrapper.addEventListener('change', async (event) => {
            if(event.target.type==='file' && event.target.dataset.session) {
                const f = event.target.files[0]; if(!f) return;
                showCustomMessage("Memproses gambar...", "info");
                const fd = new FormData(); fd.append('file', f); fd.append('session_name', event.target.dataset.session);
                try { await fetch('/api/upload_ams_image', {method:'POST', body:fd}); showCustomMessage("Sukses!", "success"); applyFilterBtn.click(); }
                catch(err) { showCustomMessage("Gagal: " + err, "error"); }
                event.target.value = '';
            }
        });
    }

    if(addSessionBtn) addSessionBtn.onclick = () => openModal(createSessionModal);
    if(createSessionCloseBtn) createSessionCloseBtn.onclick = () => closeModal(createSessionModal);
    if(createSessionCancelBtn) createSessionCancelBtn.onclick = () => closeModal(createSessionModal);
    if(addAuditeeBtn) addAuditeeBtn.onclick = () => { auditeeSessionSelect.dispatchEvent(new Event('change')); openModal(addAuditeeModal); };
    if(addAuditeeCloseBtn) addAuditeeCloseBtn.onclick = () => closeModal(addAuditeeModal);
    if(addAuditeeCancelBtn) addAuditeeCancelBtn.onclick = () => closeModal(addAuditeeModal);
    if(editAuditeeCloseBtn) editAuditeeCloseBtn.onclick = () => closeModal(editAuditeeModal);
    if(editAuditeeCancelBtn) editAuditeeCancelBtn.onclick = () => closeModal(editAuditeeModal);
    if(renameSessionBtn) renameSessionBtn.onclick = () => { if(currentSessionName) { document.getElementById('new-session-name').value = currentSessionName; openModal(renameSessionModal); } };
    if(renameSessionCloseBtn) renameSessionCloseBtn.onclick = () => closeModal(renameSessionModal);
    if(renameSessionCancelBtn) renameSessionCancelBtn.onclick = () => closeModal(renameSessionModal);
    if(shareSessionCloseBtn) shareSessionCloseBtn.onclick = () => closeModal(shareSessionModal);
    if(document.getElementById('custom-message-close-btn')) document.getElementById('custom-message-close-btn').onclick = () => closeModal(document.getElementById('custom-message-modal'));
    if(document.getElementById('custom-message-ok-btn')) document.getElementById('custom-message-ok-btn').onclick = () => closeModal(document.getElementById('custom-message-modal'));

    if (deleteSessionBtn) deleteSessionBtn.onclick = () => {
        if(!currentSessionName) return;
        
        showCustomConfirm(`Hapus sesi "${currentSessionName}"?`, async (y) => { 
            if(y) {
                await fetch(`/api/delete_monitoring_session/${encodeURIComponent(currentSessionName)}`, {method:'DELETE'});
                
                let locals = JSON.parse(localStorage.getItem(STORAGE_KEY_LOCAL_SESSIONS) || '[]');
                locals = locals.filter(s => (s.name || s) !== currentSessionName);
                localStorage.setItem(STORAGE_KEY_LOCAL_SESSIONS, JSON.stringify(locals));
                
                localStorage.removeItem(STORAGE_KEY_FILTERS);
                
                showCustomMessage("Sesi dihapus.", "success"); 
                
                dataTableContainer.classList.add('hidden'); 

                currentSessionName = null;

                fetchAndDisplaySessions();
            }
        });
    };
    
    if(shareSessionBtn) shareSessionBtn.onclick = async () => {
        if(!currentSessionName) return;
        
        document.getElementById('share-modal-title').textContent = `Share Folder: ${currentSessionName}`;
        
        shareUserListBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Memuat daftar user...</td></tr>';
        openModal(shareSessionModal);

        try {
            const res = await fetch('/api/get_all_users'); 
            let users = await res.json();

            users.sort((a, b) => {
                const labelA = (a.label || '').toUpperCase();
                const labelB = (b.label || '').toUpperCase();
                if (labelA < labelB) return -1;
                if (labelA > labelB) return 1;

                const nameA = (a.fullname || '').toUpperCase();
                const nameB = (b.fullname || '').toUpperCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                
                return 0;
            });

            shareUserListBody.innerHTML = users.map(u => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="text-align:center; padding:10px; vertical-align:middle;">
                        <input type="checkbox" class="share-user-checkbox" value="${u.id}" style="transform: scale(1.2); cursor:pointer;">
                    </td>
                    <td style="text-align:center; padding:10px; vertical-align:middle; color:#333; font-weight:500;">
                        ${u.fullname}
                    </td>
                    <td style="text-align:center; padding:10px; vertical-align:middle;">
                        <span style="background:#e3f2fd; color:#1565c0; padding:4px 12px; border-radius:15px; font-size:0.85em; font-weight:bold; border: 1px solid #bbdefb;">
                            ${u.label}
                        </span>
                    </td>
                </tr>
            `).join('');

        } catch(e) { 
            console.error(e);
            shareUserListBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Gagal memuat user. Silakan coba lagi.</td></tr>'; 
        }
    };
    if(confirmShareBtn) confirmShareBtn.onclick = async () => {
        const uids = Array.from(document.querySelectorAll('.share-user-checkbox:checked')).map(c=>c.value);
        if(!uids.length) return;
        await fetch('/api/share_ams_session', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({session_name:currentSessionName, user_ids:uids})});
        showCustomMessage("Shared!", "success"); closeModal(shareSessionModal);
    };

    fetchAndDisplaySessions();
});