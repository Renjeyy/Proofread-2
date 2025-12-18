let shelvesData = [];
let libraryData = [];
let currentShelfId = null;
let deleteTarget = null; 
const STORAGE_KEY = 'library_shelves_data';

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

document.addEventListener('DOMContentLoaded', () => {
    loadShelvesFromStorage();
    renderShelves();
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
    
    document.getElementById('shelf-view').classList.add('hidden-view');
    document.getElementById('file-view').classList.remove('hidden-view');
    document.getElementById('current-shelf-title').innerText = name;
    
    fetchLibraryData(id);
}

function backToShelves() {
    currentShelfId = null;
    document.getElementById('file-view').classList.add('hidden-view');
    document.getElementById('shelf-view').classList.remove('hidden-view');
    renderShelves(); 
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
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="padding: 30px;">Memuat data...</td></tr>`;

    try {
        const response = await fetch(`/api/library/list?shelf_id=${shelfId}&t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Gagal mengambil data");
        
        libraryData = await response.json();
        
        renderTable(libraryData);
        updateCategoryFilter();
        updateTypeFilter();
    } catch (error) {
        console.error(error);
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align: center; color: #C62828;">Gagal memuat data.</td></tr>`;
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

function updateCategoryFilter() {
    const filterSelect = document.getElementById('filter-category');
    if (!filterSelect) return;

    const currentValue = filterSelect.value;
    const uniqueCategories = [...new Set(libraryData.map(item => item.category))].sort();

    filterSelect.innerHTML = '<option value="">All Categories</option>';

    uniqueCategories.forEach(cat => {
        if (cat && cat.trim() !== "") {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterSelect.appendChild(option);
        }
    });

    let optionExists = [...filterSelect.options].some(o => o.value === currentValue);
    if (optionExists) filterSelect.value = currentValue;
}

function updateTypeFilter() {
    const filterSelect = document.getElementById('filter-type');
    if (!filterSelect) return;

    const currentValue = filterSelect.value;
    const uniqueTypes = [...new Set(libraryData.map(item => item.type))].sort();

    filterSelect.innerHTML = '<option value="">All Types</option>';

    uniqueTypes.forEach(type => {
        if (type && type.trim() !== "") {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type.toUpperCase();
            filterSelect.appendChild(option);
        }
    });

    let optionExists = [...filterSelect.options].some(o => o.value === currentValue);
    if (optionExists) filterSelect.value = currentValue;
}

function renderTable(data) {
    const tableBody = document.getElementById('library-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align: center; color: #666;">Belum ada dokumen di lemari ini.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        
        const displayTitle = item.title ? item.title : "Tanpa Judul";
        const displayType = item.type ? item.type.toUpperCase() : "FILE";
        const displayCluster = item.cluster ? item.cluster : "-";

        row.innerHTML = `
            <td class="col-title"><a href="#" onclick="viewFile('${item.url}')">${displayTitle}</a></td>
            <td style="font-weight: 500; color: #444;">${displayCluster}</td>
            <td class="col-summary">${item.summary || '-'}</td>
            <td class="col-category"><span>${item.category || 'Uncategorized'}</span></td>
            <td>${item.size || '0 KB'}</td>
            <td><span class="file-type-badge">${displayType}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="viewFile('${item.url}')">View</button>
                    <button class="btn-delete" onclick="deleteFile(${item.id}, '${displayTitle.replace(/'/g, "\\'")}')">Hapus</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterLibrary() {
    const categorySelect = document.getElementById('filter-category');
    const typeSelect = document.getElementById('filter-type');
    const searchInput = document.getElementById('search-library');

    const categoryVal = categorySelect ? categorySelect.value.toLowerCase() : "";
    const typeVal = typeSelect ? typeSelect.value.toLowerCase() : "";
    const searchVal = searchInput ? searchInput.value.toLowerCase() : "";

    const filteredData = libraryData.filter(item => {
        const itemCat = item.category ? item.category.toLowerCase() : "";
        const itemType = item.type ? item.type.toLowerCase() : "";
        const itemTitle = item.title ? item.title.toLowerCase() : "";
        const itemSummary = item.summary ? item.summary.toLowerCase() : "";
        
        const matchCategory = categoryVal === "" || itemCat === categoryVal;
        const matchType = typeVal === "" || itemType === typeVal;
        const matchSearch = itemTitle.includes(searchVal) || itemSummary.includes(searchVal);

        return matchCategory && matchType && matchSearch;
    });

    renderTable(filteredData);
}

function resetFilters() {
    const cat = document.getElementById('filter-category');
    const typ = document.getElementById('filter-type');
    const src = document.getElementById('search-library');
    
    if (cat) cat.value = "";
    if (typ) typ.value = "";
    if (src) src.value = "";
    
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
}

function viewFile(url) {
    if (url && url !== "#") {
        window.open(url, '_blank');
    } else {
        alert("File tidak valid atau URL rusak.");
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
                alert("Gagal menghapus file.");
            }
        } else if (deleteTarget.type === 'shelf') {
            shelvesData = shelvesData.filter(s => s.id !== deleteTarget.id);
            saveShelvesToStorage();
            renderShelves();
            closeDeleteModal();
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan sistem saat menghapus.");
    } finally {
        if (btnConfirm) btnConfirm.innerText = originalText;
    }
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
        alert("Pilih file terlebih dahulu.");
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
        return;
    }

    if (!specificClusterInput || !specificClusterInput.value) {
        alert("Harap pilih Cluster Audit (Internal/Eksternal) dan detailnya.");
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
        } else {
            alert("Gagal upload: " + (result.error || "Unknown error"));
        }
    } catch (e) {
        console.error(e);
        alert("Terjadi kesalahan koneksi saat upload.");
    } finally {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}