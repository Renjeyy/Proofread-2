let shelvesData = [];
let libraryData = [];
let allLibraryFiles = []; 
let currentShelfId = null;
let deleteTarget = null; 
let currentFileTypeSelectionId = null;
let tempSelectedTypes = new Set();
let currentFilterType = null;
let currentFilterValue = null;
let pendingUploadFiles = [];
let currentEditingFileIndex = null;

const STORAGE_KEY = 'library_shelves_data';
const META_STORAGE_KEY = 'library_file_metadata'; 
const LAST_OPEN_SHELF_KEY = 'library_last_open_shelf';

const clusterOptions = {
    "Internal": [
        "Audit Internal",
        "Audit Investigasi",
        "Audit dengan Tujuan Tertentu",
        "Review Internal",
        "Assessment Internal",
        "Advisory"
    ],
    "Eksternal": [
        "Audit Eksternal BPK",
        "Audit Eksternal KAP",
        "Audit Eksternal Itjen Kemenkeu",
        "Audit Eksternal OJK",
        "Review Eksternal",
        "Assessment Eksternal"
    ]
};

document.addEventListener('DOMContentLoaded', async () => {
    loadShelvesFromStorage();
    createCustomTypeModal();
    createFilterValueModal();

    await updateShelfCounts(); 

    const lastShelf = localStorage.getItem(LAST_OPEN_SHELF_KEY);
    if (lastShelf) {
        try {
            const { id, name } = JSON.parse(lastShelf);
            const shelfExists = shelvesData.some(s => s.id === id);
            if (shelfExists) {
                openShelf(id, name);
            } else {
                localStorage.removeItem(LAST_OPEN_SHELF_KEY);
                renderShelves();
            }
        } catch (e) {
            localStorage.removeItem(LAST_OPEN_SHELF_KEY);
            renderShelves();
        }
    } else {
        renderShelves();
    }
});

function loadShelvesFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        shelvesData = JSON.parse(storedData);
    } else {
        shelvesData = [];
    }
}

function saveShelvesToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shelvesData));
}

async function updateShelfCounts() {
    try {
        const response = await fetch(`/api/library/list?t=${new Date().getTime()}`);
        
        if (response.ok) {
            allLibraryFiles = await response.json();
            
            shelvesData.forEach(shelf => {
                const count = allLibraryFiles.filter(file => {
                    const fileShelfId = file.shelf_id !== undefined ? file.shelf_id : file.shelfId;
                    return String(fileShelfId) === String(shelf.id);
                }).length;
                shelf.count = count;
            });
            saveShelvesToStorage();
        }
    } catch (error) {
        console.error("Gagal update data global:", error);
    }
}

function getFileMeta(fileId) {
    const allMeta = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || '{}');
    return allMeta[fileId] || { nomorLemari: '', jenisLaporan: '' };
}

function updateFileMeta(fileId, key, value) {
    const allMeta = JSON.parse(localStorage.getItem(META_STORAGE_KEY) || '{}');
    if (!allMeta[fileId]) allMeta[fileId] = {};
    allMeta[fileId][key] = value;
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(allMeta));
    
    if (key === 'jenisLaporan') {
        const btn = document.getElementById(`btn-jenis-${fileId}`);
        if (btn) {
            updateJenisButtonStyle(btn, value);
        }
    }
}

function renderShelves() {
    const gridContainer = document.getElementById('shelf-grid-container');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    if (shelvesData.length === 0) {
        gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px; border: 2px dashed #eee; border-radius: 12px;">Belum ada lemari dokumen. Silakan buat lemari baru.</div>';
        return;
    }
    
    shelvesData.forEach(shelf => {
        const card = document.createElement('div');
        card.className = 'shelf-card';
        card.innerHTML = `
            <div class="shelf-icon">
                <i class='bx bxs-cabinet'></i>
            </div>
            <div class="shelf-title">${shelf.name}</div>
            <div class="shelf-count">${shelf.count} Dokumen</div>
            <div class="shelf-actions">
                <button class="btn-open-shelf" onclick="openShelf(${shelf.id}, '${shelf.name}')">Buka Lemari</button>
                <button class="btn-delete-shelf" onclick="deleteShelf(${shelf.id}, '${shelf.name}')">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `;
        gridContainer.appendChild(card);
    });
}

function openShelf(id, name) {
    currentShelfId = id;
    localStorage.setItem(LAST_OPEN_SHELF_KEY, JSON.stringify({ id, name }));
    
    document.getElementById('shelf-view').classList.add('hidden-view');
    document.getElementById('file-view').classList.remove('hidden-view');
    document.getElementById('current-shelf-title').innerText = name;
    
    fetchLibraryData(id);
}

function backToShelves() {
    currentShelfId = null;
    localStorage.removeItem(LAST_OPEN_SHELF_KEY);

    document.getElementById('file-view').classList.add('hidden-view');
    document.getElementById('shelf-view').classList.remove('hidden-view');
    
    updateShelfCounts().then(() => {
        renderShelves();
    }); 
}

function openAddShelfModal() {
    const modal = document.getElementById('add-shelf-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

function closeAddShelfModal() {
    const modal = document.getElementById('add-shelf-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
    document.getElementById('add-shelf-form').reset();
}

function handleCreateShelf(event) {
    event.preventDefault();
    const nameInput = document.getElementById('new-shelf-name');
    const newId = shelvesData.length > 0 ? Math.max(...shelvesData.map(s => s.id)) + 1 : 1;
    
    shelvesData.push({
        id: newId,
        name: nameInput.value,
        count: 0
    });
    
    saveShelvesToStorage();
    closeAddShelfModal();
    renderShelves();
}

function deleteShelf(id, name) {
    deleteTarget = { type: 'shelf', id: id };
    
    const titleDisplay = document.getElementById('delete-filename-display');
    const modal = document.getElementById('custom-delete-modal');
    
    if (titleDisplay) titleDisplay.textContent = `Lemari "${name}"`;
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

async function fetchLibraryData(shelfId) {
    const tableBody = document.getElementById('library-table-body');
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" style="padding: 30px;">Memuat data...</td></tr>`;

    try {
        const response = await fetch(`/api/library/list?shelf_id=${shelfId}&t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Gagal mengambil data");
        
        const allData = await response.json();
        libraryData = allData.filter(item => String(item.shelf_id) === String(shelfId));
        
        filterLibrary();
    } catch (error) {
        console.error(error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="padding:20px; text-align: center; color: #C62828;">Gagal memuat data.</td></tr>`;
        }
    }
}

function updateClusterOptions() {
    const groupSelect = document.getElementById('cluster-group');
    const specificSelect = document.getElementById('cluster-specific');
    
    if (!groupSelect || !specificSelect) return;

    const selectedGroup = groupSelect.value;
    
    specificSelect.innerHTML = '<option value="" disabled selected>-- Pilih Detail --</option>';
    specificSelect.disabled = true;

    if (selectedGroup && clusterOptions[selectedGroup]) {
        specificSelect.disabled = false;
        clusterOptions[selectedGroup].forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            specificSelect.appendChild(option);
        });
    }
}

function updateJenisButtonStyle(button, value) {
    let types = [];
    if (Array.isArray(value)) {
        types = value;
    } else if (value) {
        types = [value];
    }

    if (types.length === 0) {
        button.innerHTML = '<span>Pilih</span> <i class="bx bx-plus-circle"></i>';
        button.style.background = '#f0f0f0';
        button.style.color = '#999';
        button.style.boxShadow = 'none';
    } 
    else if (types.includes('Hardcopy') && types.includes('Softcopy')) {
        button.innerHTML = `<i class="bx bxs-check-shield"></i> <span>Hardcopy & Softcopy</span>`;
        button.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'; 
        button.style.color = '#fff';
        button.style.boxShadow = '0 4px 10px rgba(76, 175, 80, 0.3)';
    } 
    else if (types.includes('Hardcopy')) {
        button.innerHTML = '<i class="bx bxs-file-blank"></i> <span>Hardcopy</span>';
        button.style.background = '#E3F2FD'; 
        button.style.color = '#1565C0';
        button.style.boxShadow = 'none';
    } 
    else if (types.includes('Softcopy')) {
        button.innerHTML = '<i class="bx bxs-cloud"></i> <span>Softcopy</span>';
        button.style.background = '#E8F5E9'; 
        button.style.color = '#2E7D32';
        button.style.boxShadow = 'none';
    }
}

function createCustomTypeModal() {
    if (document.getElementById('type-selection-modal')) return;

    const modalHTML = `
        <div id="type-selection-modal" class="modal hidden" style="z-index: 4000;">
            <div class="modal-content" style="max-width: 400px; text-align: center; border-radius: 20px; padding: 30px;">
                <span class="modal-close-btn" onclick="closeTypeModal()" style="top: 15px; right: 20px;">&times;</span>
                
                <h3 style="color: #2B3674; font-size: 1.4rem; margin-bottom: 5px;">Pilih Jenis Laporan</h3>
                <p style="color: #A3AED0; font-size: 0.9rem; margin-bottom: 25px;">Anda dapat memilih satu atau keduanya</p>
                
                <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 25px;">
                    <div id="card-type-Hardcopy" onclick="toggleTypeSelection('Hardcopy')" style="flex: 1; cursor: pointer; border: 2px solid #E0E5F2; border-radius: 16px; padding: 15px; transition: all 0.2s; background: white;">
                        <div style="width: 50px; height: 50px; background: #E3F2FD; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; color: #1565C0; font-size: 24px;">
                            <i class='bx bxs-file'></i>
                        </div>
                        <h4 style="margin: 0; color: #1565C0; font-size: 1rem;">Hardcopy</h4>
                        <span style="font-size: 11px; color: #A3AED0;">Fisik</span>
                    </div>

                    <div id="card-type-Softcopy" onclick="toggleTypeSelection('Softcopy')" style="flex: 1; cursor: pointer; border: 2px solid #E0E5F2; border-radius: 16px; padding: 15px; transition: all 0.2s; background: white;">
                        <div style="width: 50px; height: 50px; background: #E8F5E9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; color: #2E7D32; font-size: 24px;">
                            <i class='bx bxs-cloud'></i>
                        </div>
                        <h4 style="margin: 0; color: #2E7D32; font-size: 1rem;">Softcopy</h4>
                        <span style="font-size: 11px; color: #A3AED0;">Digital</span>
                    </div>
                </div>

                <button onclick="saveTypeSelection()" class="login-btn" style="width: 100%; height: 45px; font-size: 15px; background-color: #2B3674;">
                    Simpan Pilihan
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openTypeModal(fileId) {
    currentFileTypeSelectionId = fileId;
    const modal = document.getElementById('type-selection-modal');
    
    tempSelectedTypes.clear();
    const currentMeta = getFileMeta(fileId);
    
    let currentTypes = [];
    if (Array.isArray(currentMeta.jenisLaporan)) {
        currentTypes = currentMeta.jenisLaporan;
    } else if (currentMeta.jenisLaporan) {
        currentTypes = [currentMeta.jenisLaporan]; 
    }

    currentTypes.forEach(type => tempSelectedTypes.add(type));
    updateModalCardVisuals();

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

function toggleTypeSelection(type) {
    if (tempSelectedTypes.has(type)) {
        tempSelectedTypes.delete(type);
    } else {
        tempSelectedTypes.add(type);
    }
    updateModalCardVisuals();
}

function updateModalCardVisuals() {
    const types = ['Hardcopy', 'Softcopy'];
    types.forEach(type => {
        const card = document.getElementById(`card-type-${type}`);
        if (!card) return;

        if (tempSelectedTypes.has(type)) {
            if (type === 'Hardcopy') {
                card.style.borderColor = '#1565C0';
                card.style.backgroundColor = '#E3F2FD';
                card.style.transform = 'translateY(-3px)';
                card.style.boxShadow = '0 4px 10px rgba(21, 101, 192, 0.15)';
            } else {
                card.style.borderColor = '#2E7D32';
                card.style.backgroundColor = '#E8F5E9';
                card.style.transform = 'translateY(-3px)';
                card.style.boxShadow = '0 4px 10px rgba(46, 125, 50, 0.15)';
            }
        } else {
            card.style.borderColor = '#E0E5F2';
            card.style.backgroundColor = 'white';
            card.style.transform = 'none';
            card.style.boxShadow = 'none';
        }
    });
}

function saveTypeSelection() {
    if (currentFileTypeSelectionId) {
        const selectionArray = Array.from(tempSelectedTypes);
        updateFileMeta(currentFileTypeSelectionId, 'jenisLaporan', selectionArray);
        closeTypeModal();
    }
}

function closeTypeModal() {
    const modal = document.getElementById('type-selection-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
    currentFileTypeSelectionId = null;
}

function renderTable(data) {
    const tableElement = document.getElementById('library-table');
    const tableHead = tableElement.querySelector('thead');
    const tableBody = document.getElementById('library-table-body');
    
    if (!tableBody) return;

    if (tableHead) {
        tableHead.innerHTML = `
            <tr>
                <th width="25%" style="text-align:left; padding-left:20px;">DOKUMEN</th>
                <th width="10%">NO. LEMARI</th>
                <th width="12%">CLUSTER</th>
                <th width="15%">JENIS LAPORAN</th>
                <th width="20%" style="text-align:center;">RINGKASAN</th>
                <th width="10%">KATEGORI</th>
                <th width="8%">AKSI</th>
            </tr>
        `;
    }
    
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align: center; color: #A3AED0; font-style:italic;">Folder ini masih kosong.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const meta = getFileMeta(item.id);
        
        const displayTitle = item.title ? item.title : "Tanpa Judul";
        const displayType = item.type ? item.type.toUpperCase() : "FILE";
        
        let fileIconClass = 'bx-file-blank';
        if (displayType === 'PDF') fileIconClass = 'bxs-file-pdf';
        else if (displayType === 'DOCX') fileIconClass = 'bxs-file-doc';

        row.innerHTML = `
            <td class="col-title" style="text-align:left; padding-left:20px;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; background:#F4F7FE; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#2B3674; font-size:20px;">
                        <i class='bx ${fileIconClass}'></i>
                    </div>
                    <div>
                        <a href="#" onclick="viewFile('${item.url}')" style="display:block; line-height:1.2;">${displayTitle}</a>
                        <span style="font-size:11px; color:#A3AED0;">${displayType} • ${item.upload_date || 'Baru'}</span>
                    </div>
                </div>
            </td>
            <td>
                <input type="text" 
                    class="input-no-lemari"
                    value="${meta.nomorLemari || ''}" 
                    placeholder="-" 
                    onblur="updateFileMeta(${item.id}, 'nomorLemari', this.value)">
            </td>
            <td>
                <span style="background:#FFF8E1; color:#FF8F00; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; text-transform:uppercase;">
                    ${item.cluster || 'N/A'}
                </span>
            </td>
            <td>
                <button id="btn-jenis-${item.id}" class="jenis-btn" onclick="openTypeModal(${item.id})">
                    Loading...
                </button>
            </td>
            <td style="text-align:justify; color:#555; font-size:13px; line-height:1.5; white-space: normal;">
                ${item.summary || '-'}
            </td>
            <td><span style="font-weight:600; color:#2B3674;">${item.category || '-'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon-action btn-view-icon" onclick="viewFile('${item.url}')" title="Lihat">
                        <i class='bx bx-show'></i>
                    </button>
                    <button class="btn-icon-action btn-delete-icon" onclick="deleteFile(${item.id}, '${displayTitle.replace(/'/g, "\\'")}')" title="Hapus">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
        
        const btn = document.getElementById(`btn-jenis-${item.id}`);
        updateJenisButtonStyle(btn, meta.jenisLaporan);
    });
}

function handleFilterCriteriaChange() {
    const criteria = document.getElementById('filter-criteria').value;
    const valueBtn = document.getElementById('filter-value-btn');
    const activeDisplay = document.getElementById('active-filter-display');
    
    currentFilterType = criteria === "" ? null : criteria;
    currentFilterValue = null; 
    
    if (activeDisplay) activeDisplay.classList.add('hidden');

    if (criteria === "") {
        valueBtn.classList.add('hidden');
        resetFilters();
    } else {
        valueBtn.classList.remove('hidden');
        valueBtn.innerHTML = `Select ${criteria.charAt(0).toUpperCase() + criteria.slice(1)} <i class='bx bx-chevron-down'></i>`;
    }
}

function createFilterValueModal() {
    if (document.getElementById('filter-value-modal')) return;

    const modalHTML = `
        <div id="filter-value-modal" class="modal hidden" style="z-index: 4001;">
            <div class="modal-content" style="max-width: 400px; padding: 25px;">
                <span class="modal-close-btn" onclick="closeFilterValueModal()" style="top: 15px; right: 20px;">&times;</span>
                <h3 style="color: #2B3674; margin-bottom: 20px;">Select Filter Value</h3>
                <div id="filter-options-container" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function openFilterValueModal() {
    if (!currentFilterType) return;

    const container = document.getElementById('filter-options-container');
    container.innerHTML = '';

    let uniqueValues = new Set();
    libraryData.forEach(item => {
        let val = item[currentFilterType];
        if (val) uniqueValues.add(val);
    });

    if (uniqueValues.size === 0) {
        container.innerHTML = '<p style="color:#999;">No options available.</p>';
    } else {
        uniqueValues.forEach(val => {
            const btn = document.createElement('div');
            btn.className = 'chip-option';
            btn.textContent = val;
            btn.onclick = () => applyFilter(val);
            container.appendChild(btn);
        });
    }

    const modal = document.getElementById('filter-value-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

function closeFilterValueModal() {
    const modal = document.getElementById('filter-value-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
}

function applyFilter(value) {
    currentFilterValue = value;
    closeFilterValueModal();
    
    const activeDisplay = document.getElementById('active-filter-display');
    const activeText = document.getElementById('active-filter-text');
    
    if (activeDisplay && activeText) {
        activeText.textContent = `${currentFilterType}: ${value}`;
        activeDisplay.classList.remove('hidden');
    }

    filterLibrary();
}

function filterLibrary() {
    const searchInput = document.getElementById('search-library');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredData = libraryData.filter(item => {
        let matchFilter = true;
        if (currentFilterType && currentFilterValue) {
            const itemVal = item[currentFilterType] ? item[currentFilterType].toString() : "";
            matchFilter = itemVal === currentFilterValue;
        }

        const itemTitle = item.title ? item.title.toLowerCase() : "";
        const itemSummary = item.summary ? item.summary.toLowerCase() : "";
        const matchSearch = itemTitle.includes(searchVal) || itemSummary.includes(searchVal);

        return matchFilter && matchSearch;
    });

    renderTable(filteredData);
}

function resetFilters() {
    const criteriaSelect = document.getElementById('filter-criteria');
    const valueBtn = document.getElementById('filter-value-btn');
    const activeDisplay = document.getElementById('active-filter-display');
    const searchInput = document.getElementById('search-library');
    
    if (criteriaSelect) criteriaSelect.value = "";
    if (valueBtn) valueBtn.classList.add('hidden');
    if (activeDisplay) activeDisplay.classList.add('hidden');
    if (searchInput) searchInput.value = "";

    currentFilterType = null;
    currentFilterValue = null;
    
    renderTable(libraryData);
}

function openAddFileModal() {
    const modal = document.getElementById('add-file-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

function closeAddFileModal() {
    const modal = document.getElementById('add-file-modal');
    const form = document.getElementById('add-file-form');
    
    const specificSelect = document.getElementById('cluster-specific');
    if(specificSelect) {
        specificSelect.innerHTML = '<option value="" disabled selected>-- Pilih Detail --</option>';
        specificSelect.disabled = true;
    }

    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
    if (form) form.reset();
    resetFileInput(); // Reset visual file
}

function viewFile(url) {
    if (url && url !== "#") {
        window.open(url, '_blank');
    } else {
        showCustomAlert("Error", "File tidak valid atau URL rusak.", "bx-error-circle", "#C62828");
    }
}

function deleteFile(id, title) {
    deleteTarget = { type: 'file', id: id };
    
    const titleDisplay = document.getElementById('delete-filename-display');
    const modal = document.getElementById('custom-delete-modal');
    
    if (titleDisplay) titleDisplay.textContent = `"${title}"`;
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
}

function closeDeleteModal() {
    const modal = document.getElementById('custom-delete-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    }
    deleteTarget = null;
}

async function confirmDeleteAction() {
    if (!deleteTarget) return;

    const btnConfirm = document.querySelector('.btn-confirm-delete-modal');
    const originalText = btnConfirm ? btnConfirm.innerText : 'Ya, Hapus';
    if (btnConfirm) btnConfirm.innerText = "Menghapus...";

    try {
        if (deleteTarget.type === 'file') {
            const response = await fetch(`/api/library/delete/${deleteTarget.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchLibraryData(currentShelfId); 
                closeDeleteModal();
            } else {
                showCustomAlert("Gagal", "Gagal menghapus file.", "bx-x-circle", "#C62828");
            }
        } else if (deleteTarget.type === 'shelf') {
            shelvesData = shelvesData.filter(s => s.id !== deleteTarget.id);
            saveShelvesToStorage();
            if (currentShelfId === deleteTarget.id) {
                backToShelves(); 
            } else {
                renderShelves();
            }
            closeDeleteModal();
        }
    } catch (e) {
        console.error(e);
        showCustomAlert("Error", "Terjadi kesalahan sistem.", "bx-error", "#C62828");
    } finally {
        if (btnConfirm) btnConfirm.innerText = originalText;
    }
}

// --- FILE UPLOAD HANDLING (SINGLE FILE) ---

function handleSingleFileSelect(input) {
    const files = input.files;
    if (files.length > 0) {
        const file = files[0];
        
        // Show file info
        const infoBox = document.getElementById('file-upload-info');
        const nameEl = document.getElementById('upload-file-name');
        const metaEl = document.getElementById('upload-file-meta');
        const dropArea = document.getElementById('drop-area');
        
        let sizeStr = "";
        if (file.size < 1024) sizeStr = file.size + " B";
        else if (file.size < 1024 * 1024) sizeStr = (file.size / 1024).toFixed(1) + " KB";
        else sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
        
        let ext = file.name.split('.').pop().toUpperCase();
        
        nameEl.innerText = file.name;
        metaEl.innerText = `${ext} • ${sizeStr}`;
        
        infoBox.classList.add('active');
        dropArea.style.display = 'none'; // Hide drop area
    }
}

function resetFileInput() {
    const input = document.getElementById('new-file-upload');
    const infoBox = document.getElementById('file-upload-info');
    const dropArea = document.getElementById('drop-area');
    
    input.value = '';
    infoBox.classList.remove('active');
    dropArea.style.display = 'block';
}

async function handleUploadFile(event) {
    event.preventDefault();

    const btn = document.querySelector('#add-file-form button[type="submit"]');
    const originalText = btn ? btn.innerText : 'Upload';
    if (btn) {
        btn.innerText = "Mengupload...";
        btn.disabled = true;
    }

    const titleInput = document.getElementById('new-file-title');
    const categoryInput = document.getElementById('new-file-category');
    const summaryInput = document.getElementById('new-file-summary');
    const fileInput = document.getElementById('new-file-upload');
    const specificClusterInput = document.getElementById('cluster-specific');
    
    if (!fileInput || fileInput.files.length === 0) {
        showCustomAlert("Peringatan", "Pilih file terlebih dahulu.", "bx-error-circle", "#C62828");
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
        return;
    }

    if (!specificClusterInput || !specificClusterInput.value) {
        showCustomAlert("Peringatan", "Harap pilih Cluster Audit (Internal/Eksternal) dan detailnya.", "bx-error-circle", "#C62828");
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', titleInput.value);
    formData.append('category', categoryInput.value);
    formData.append('summary', summaryInput.value);
    formData.append('cluster', specificClusterInput.value);
    formData.append('shelf_id', currentShelfId);

    try {
        const response = await fetch('/api/library/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            await fetchLibraryData(currentShelfId); 
            closeAddFileModal();
            showCustomAlert("Sukses", "File berhasil diupload.", "bx-check-circle", "#2E7D32");
        } else {
            showCustomAlert("Gagal", "Gagal upload: " + (result.error || "Unknown error"), "bx-x-circle", "#C62828");
        }
    } catch (e) {
        console.error(e);
        showCustomAlert("Error", "Terjadi kesalahan koneksi.", "bx-wifi-off", "#C62828");
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}

function triggerFolderUpload() {
    document.getElementById('folder-input').click();
}

function handleFolderSelect(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;

    pendingUploadFiles = files.filter(f => !f.name.startsWith('.'));
    
    if (pendingUploadFiles.length === 0) {
        showCustomAlert("Info", "Folder kosong atau tidak ada file valid.", "bx-info-circle", "#1565C0");
        return;
    }

    renderPreviewTable();
    
    const modal = document.getElementById('folder-preview-modal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
    
    input.value = ''; 
}

function closeFolderPreviewModal() {
    document.getElementById('folder-preview-modal').classList.remove('active');
    document.getElementById('folder-preview-modal').classList.add('hidden');
    pendingUploadFiles = [];
}

function renderPreviewTable() {
    const tbody = document.getElementById('folder-preview-body');
    tbody.innerHTML = '';

    let shelfOptions = '<option value="" disabled selected>Pilih Lemari</option>';
    shelvesData.forEach(shelf => {
        shelfOptions += `<option value="${shelf.id}">${shelf.name}</option>`;
    });
    shelfOptions += `<option value="NEW_SHELF">+ Buat Baru...</option>`;

    const defaultShelf = currentShelfId ? currentShelfId : "";

    pendingUploadFiles.forEach((file, index) => {
        const tr = document.createElement('tr');
        
        let sizeStr = "";
        if (file.size < 1024) sizeStr = file.size + " B";
        else if (file.size < 1024 * 1024) sizeStr = (file.size / 1024).toFixed(1) + " KB";
        else sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";

        if (!file.customCategory) file.customCategory = "";
        if (!file.customSummary) file.customSummary = "";
        if (!file.customCluster) file.customCluster = "";
        if (!file.customClusterGroup) file.customClusterGroup = "";
        if (!file.targetShelfId) file.targetShelfId = defaultShelf;

        const isDetailFilled = file.customCategory && file.customCluster && file.customSummary;
        const btnClass = isDetailFilled ? 'filled' : '';
        const btnText = isDetailFilled ? 'Edit Detail' : 'Input Detail File';
        const btnIcon = isDetailFilled ? 'bx-check-circle' : 'bx-edit';

        tr.innerHTML = `
            <td style="font-weight: 600; color: #2B3674;">${file.name}</td>
            <td style="color: #707EAE;">${sizeStr}</td>
            <td>
                <select class="preview-select" onchange="handleShelfSelectRow(this, ${index})">
                    ${shelfOptions}
                </select>
            </td>
            <td>
                <button class="btn-fill-detail ${btnClass}" onclick="openFileDetailModal(${index})">
                    <i class='bx ${btnIcon}'></i> ${btnText}
                </button>
            </td>
            <td>
                <button class="btn-delete-icon" onclick="removeFileFromPreview(${index})">
                    <i class='bx bx-x'></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        if (file.targetShelfId) {
            const select = tr.querySelector('select');
            select.value = file.targetShelfId;
        }
    });
}

function handleShelfSelectRow(select, index) {
    const val = select.value;
    if (val === 'NEW_SHELF') {
        openShelfAssignModal(); 
        select.value = ""; 
    } else {
        pendingUploadFiles[index].targetShelfId = val;
    }
}

function openFileDetailModal(index) {
    currentEditingFileIndex = index;
    const file = pendingUploadFiles[index];
    
    document.getElementById('modal-category').value = file.customCategory;
    document.getElementById('modal-summary').value = file.customSummary;
    
    const groupSelect = document.getElementById('modal-cluster-group');
    if (file.customClusterGroup) {
        groupSelect.value = file.customClusterGroup;
        updateModalClusterOptions();
        document.getElementById('modal-cluster-specific').value = file.customCluster;
    } else {
        groupSelect.value = "";
        updateModalClusterOptions();
    }

    const modal = document.getElementById('file-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeFileDetailModal() {
    const modal = document.getElementById('file-detail-modal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
    currentEditingFileIndex = null;
}

function updateModalClusterOptions() {
    const groupSelect = document.getElementById('modal-cluster-group');
    const specificSelect = document.getElementById('modal-cluster-specific');
    const selectedGroup = groupSelect.value;
    
    specificSelect.innerHTML = '<option value="" disabled selected>-- Pilih Detail --</option>';
    specificSelect.disabled = true;

    if (selectedGroup && clusterOptions[selectedGroup]) {
        specificSelect.disabled = false;
        clusterOptions[selectedGroup].forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.textContent = opt;
            specificSelect.appendChild(optEl);
        });
    }
}

function saveFileDetail() {
    if (currentEditingFileIndex === null) return;

    const group = document.getElementById('modal-cluster-group').value;
    const specific = document.getElementById('modal-cluster-specific').value;
    const category = document.getElementById('modal-category').value;
    const summary = document.getElementById('modal-summary').value;

    if (!group || !specific) {
        showCustomAlert("Info", "Harap pilih Cluster lengkap.", "bx-info-circle", "#1565C0");
        return;
    }

    const file = pendingUploadFiles[currentEditingFileIndex];
    file.customClusterGroup = group;
    file.customCluster = specific;
    file.customCategory = category;
    file.customSummary = summary;

    closeFileDetailModal();
    renderPreviewTable();
}

function removeFileFromPreview(index) {
    pendingUploadFiles.splice(index, 1);
    renderPreviewTable();
}

function openShelfAssignModal() {
    const modal = document.getElementById('shelf-assign-modal');
    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeShelfAssignModal() {
    document.getElementById('shelf-assign-modal').classList.remove('active');
    document.getElementById('shelf-assign-modal').classList.add('hidden');
}

function quickCreateShelf() {
    const nameInput = document.getElementById('quick-new-shelf-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const newId = shelvesData.length > 0 ? Math.max(...shelvesData.map(s => s.id)) + 1 : 1;
    shelvesData.push({
        id: newId,
        name: name,
        count: 0
    });
    saveShelvesToStorage();
    
    closeShelfAssignModal();
    renderShelves(); 
    renderPreviewTable(); 
    
    nameInput.value = '';
}

async function processFolderUploadFinal() {
    const btn = document.querySelector('#folder-preview-modal .login-btn');
    const originalText = btn.innerText;
    btn.innerText = "Sedang Mengupload...";
    btn.disabled = true;

    let successCount = 0;
    let failCount = 0;

    for (const file of pendingUploadFiles) {
        if (!file.targetShelfId) continue; 

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.split('.')[0]); 
        formData.append('category', file.customCategory || "General");
        formData.append('summary', file.customSummary || "-");
        formData.append('cluster', file.customCluster || "Internal"); 
        formData.append('shelf_id', file.targetShelfId);

        try {
            const response = await fetch('/api/library/upload', {
                method: 'POST',
                body: formData
            });
            if (response.ok) successCount++;
            else failCount++;
        } catch (e) {
            console.error(e);
            failCount++;
        }
    }

    closeFolderPreviewModal();
    
    if (failCount === 0) {
        showCustomAlert("Selesai", `Berhasil mengupload ${successCount} file.`, "bx-check-double", "#2E7D32");
    } else {
        showCustomAlert("Selesai", `Berhasil: ${successCount}, Gagal: ${failCount}`, "bx-error", "#FF9800");
    }
    
    btn.innerText = originalText;
    btn.disabled = false;
    
    updateShelfCounts();
    if (currentShelfId) {
        fetchLibraryData(currentShelfId);
    } else {
        renderShelves();
    }
}

function showCustomAlert(title, message, iconClass, color) {
    const modal = document.getElementById('custom-alert-modal');
    const titleEl = document.getElementById('alert-title');
    const msgEl = document.getElementById('alert-message');
    const iconEl = document.getElementById('alert-icon');
    const iconWrapper = document.getElementById('alert-icon-wrapper');

    titleEl.innerText = title;
    titleEl.style.color = color;
    msgEl.innerText = message;
    
    iconEl.className = `bx ${iconClass}`;
    iconEl.style.color = color;
    
    let r = 0, g = 0, b = 0;
    if (color.length === 7) {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
    }
    iconWrapper.style.backgroundColor = `rgba(${r},${g},${b},0.1)`;

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeCustomAlert() {
    const modal = document.getElementById('custom-alert-modal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
}

function handleGlobalSearch(event) {
    if (event.key === 'Enter') {
        const keyword = event.target.value.toLowerCase();
        if (!keyword) return;

        const results = allLibraryFiles.filter(f => 
            (f.title && f.title.toLowerCase().includes(keyword)) || 
            (f.summary && f.summary.toLowerCase().includes(keyword)) ||
            (f.category && f.category.toLowerCase().includes(keyword))
        );

        openGlobalSearchModal(results, keyword);
    }
}

function openGlobalSearchModal(results, keyword) {
    const modal = document.getElementById('global-search-modal');
    const tbody = document.getElementById('global-search-body');
    const keywordDisplay = document.getElementById('search-keyword-display');
    
    keywordDisplay.innerText = keyword;
    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 40px; text-align: center; color: #A3AED0;">Tidak ditemukan hasil untuk "${keyword}"</td></tr>`;
    } else {
        results.forEach(item => {
            const shelf = shelvesData.find(s => String(s.id) === String(item.shelf_id));
            const shelfName = shelf ? shelf.name : "Tidak Diketahui";
            const meta = getFileMeta(item.id);
            const nomorLemari = meta.nomorLemari || "-";
            
            let types = [];
            if (Array.isArray(meta.jenisLaporan)) types = meta.jenisLaporan;
            else if (meta.jenisLaporan) types = [meta.jenisLaporan];
            const jenisLaporanStr = types.length > 0 ? types.join(", ") : "-";

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600; color: #2B3674; text-align: center;">${item.title || "Tanpa Judul"}</td>
                <td><span style="background: #E3F2FD; color: #1565C0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">${shelfName}</span></td>
                <td style="font-weight: 600; color: #2B3674;">${nomorLemari}</td>
                <td>${item.cluster || "-"}</td>
                <td>${jenisLaporanStr}</td>
                <td style="text-align: left; font-size: 13px; color: #555;">${item.summary || "-"}</td>
                <td><span style="font-weight: 600;">${item.category || "-"}</span></td>
                <td>
                    <button class="btn-view-icon" onclick="viewFile('${item.url}')" title="Lihat Laporan">
                        <i class='bx bx-link-external'></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    modal.classList.remove('hidden');
    modal.classList.add('active');
}

function closeGlobalSearchModal() {
    const modal = document.getElementById('global-search-modal');
    modal.classList.remove('active');
    modal.classList.add('hidden');
}