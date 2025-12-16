let libraryData = [];
let fileIdToDelete = null;

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
    fetchLibraryData();
});

async function fetchLibraryData() {
    try {
        const response = await fetch(`/api/library/list?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Gagal mengambil data");
        
        libraryData = await response.json();
        
        renderTable(libraryData);
        updateCategoryFilter();
        updateTypeFilter();
    } catch (error) {
        console.error(error);
        const tableBody = document.getElementById('library-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align: center; color: #C62828;">Gagal memuat data. Pastikan server backend berjalan.</td></tr>`;
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
        tableBody.innerHTML = `<tr><td colspan="7" style="padding:30px; text-align: center; color: #666;">Belum ada data dokumen. Silakan tambah file baru.</td></tr>`;
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
    if (modal) modal.classList.remove('hidden');
}

function closeAddFileModal() {
    const modal = document.getElementById('add-file-modal');
    const form = document.getElementById('add-file-form');
    
    const specificSelect = document.getElementById('cluster-specific');
    if(specificSelect) {
        specificSelect.innerHTML = '<option value="" disabled selected>-- Pilih Detail --</option>';
        specificSelect.disabled = true;
    }

    if (modal) modal.classList.add('hidden');
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
    fileIdToDelete = id;
    
    const titleDisplay = document.getElementById('delete-filename-display');
    const modal = document.getElementById('custom-delete-modal');
    
    if (titleDisplay) titleDisplay.textContent = `"${title}"`;
    if (modal) modal.classList.remove('hidden');
}

function closeDeleteModal() {
    const modal = document.getElementById('custom-delete-modal');
    if (modal) modal.classList.add('hidden');
    fileIdToDelete = null;
}

async function confirmDeleteAction() {
    if (fileIdToDelete !== null) {
        const btnConfirm = document.querySelector('.btn-confirm-delete-modal');
        const originalText = btnConfirm ? btnConfirm.innerText : 'Ya, Hapus';
        if (btnConfirm) btnConfirm.innerText = "Menghapus...";

        try {
            const response = await fetch(`/api/library/delete/${fileIdToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await fetchLibraryData();
                closeDeleteModal();
            } else {
                alert("Gagal menghapus file.");
            }
        } catch (e) {
            console.error(e);
            alert("Terjadi kesalahan server saat menghapus.");
        } finally {
            if (btnConfirm) btnConfirm.innerText = originalText;
        }
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

    try {
        const response = await fetch('/api/library/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            await fetchLibraryData(); 
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