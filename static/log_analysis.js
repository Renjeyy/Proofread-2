document.addEventListener('DOMContentLoaded', () => {
    const logTableBody = document.getElementById('log-table-body');
    const addTaskBtn = document.getElementById('add-task-btn');
    
    const taskModal = document.getElementById('task-modal');
    const taskModalCloseBtn = document.getElementById('task-modal-close-btn');
    const taskForm = document.getElementById('task-form');
    const taskModalTitle = document.getElementById('task-modal-title');
    const taskModalSubmitBtn = taskForm ? taskForm.querySelector('button[type="submit"]') : null;
    
    const logLoading = document.getElementById('log-loading');
    const logError = document.getElementById('log-error');

    const formatDateForDisplay = (isoString) => {
        if (!isoString || isoString === 'None' || isoString === '-' || isoString === '') return '-';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('id-ID', { 
                day: 'numeric', month: 'long', year: 'numeric'
            });
        } catch (e) { return '-'; }
    };

    const formatDateForInput = (isoString) => {
        if (!isoString || isoString === 'None' || isoString === '-' || isoString === '') return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            
            const offset = date.getTimezoneOffset() * 60000;
            const localISOTime = new Date(date.getTime() - offset).toISOString().slice(0, 16);
            return localISOTime;
        } catch (e) { return ''; }
    };

    async function fetchAndRenderLogs() {
        if (!logTableBody) return;

        if (logLoading) logLoading.classList.remove('hidden');
        if (logError) logError.classList.add('hidden');
        logTableBody.innerHTML = '';

        try {
            const response = await fetch('/api/get_analysis_logs');
            if (!response.ok) throw new Error('Gagal mengambil data log.');
            
            const logs = await response.json();
            
            window.cachedLogsData = [];

            if (logs.length === 0) {
                logTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Belum ada log atau tugas.</td></tr>';
                return;
            }

            logs.forEach((log, index) => {
                window.cachedLogsData.push(log);

                let statusBadge = '';
                const status = log.status ? log.status.toLowerCase() : 'unknown';

                const baseStyle = "padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; white-space: nowrap; display: inline-block;";

                if (status === 'done') {
                    statusBadge = `<span style="${baseStyle} background-color: #4CAF50; color: white;">Done</span>`;
                } else if (status === 'overdue') {
                    statusBadge = `<span style="${baseStyle} background-color: #ff4d4d; color: white;">Overdue</span>`;
                } else if (status === 'manual') {
                    statusBadge = `<span style="${baseStyle} background-color: #9E9E9E; color: white;">Manual</span>`;
                } else {
                    statusBadge = `<span style="${baseStyle} background-color: #607D8B; color: white;">On Progress</span>`;
                }

                const displayStart = formatDateForDisplay(log.start_time);
                const displayDeadline = formatDateForDisplay(log.deadline);
                const displayEnd = formatDateForDisplay(log.end_time);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="text-align: center;">${index + 1}</td>
                    <td style="font-weight:500;">${log.filename}</td>
                    <td>${log.feature_type.charAt(0).toUpperCase() + log.feature_type.slice(1)}</td>
                    <td>${displayStart}</td>
                    <td>${displayDeadline}</td>
                    <td>${displayEnd}</td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td>
                        <div style="display:flex; gap:5px; justify-content:center;">
                            <button class="view-result-btn" onclick="openEditModal(${log.id})" style="padding: 5px 10px; font-size: 0.8em;">Edit</button>
                            <button class="delete-result-btn" onclick="deleteTask(${log.id})" style="padding: 5px 10px; font-size: 0.8em; background-color: #d32f2f;">Hapus</button>
                        </div>
                    </td>
                `;
                logTableBody.appendChild(row);
            });

        } catch (error) {
            console.error(error);
            if (logError) {
                logError.textContent = error.message;
                logError.classList.remove('hidden');
            }
        } finally {
            if (logLoading) logLoading.classList.add('hidden');
        }
    }

    window.openEditModal = (logId) => {
        const logToEdit = window.cachedLogsData ? window.cachedLogsData.find(log => log.id === logId) : null;

        if (!logToEdit) {
            fetchAndRenderLogs().then(() => {
                showCustomMessage('Data sedang dimuat ulang, silakan coba klik Edit lagi.', 'info');
            });
            return;
        }

        document.getElementById('task-log-id').value = logToEdit.id;
        document.getElementById('task-filename-input').value = logToEdit.filename;
        document.getElementById('task-feature-select').value = logToEdit.feature_type;
        
        document.getElementById('task-start-time-input').value = formatDateForInput(logToEdit.start_time);
        document.getElementById('task-deadline-input').value = formatDateForInput(logToEdit.deadline);
        document.getElementById('task-end-time-input').value = formatDateForInput(logToEdit.end_time);

        if (taskModalTitle) taskModalTitle.textContent = 'Edit Tugas';
        if (taskModalSubmitBtn) taskModalSubmitBtn.textContent = 'Update Tugas';
        
        if (taskModal) taskModal.classList.remove('hidden');
    };

    window.deleteTask = (logId) => {
        showCustomConfirm('Apakah Anda yakin ingin menghapus tugas ini?', async (isConfirmed) => {
            if (!isConfirmed) return;

            try {
                const response = await fetch(`/api/delete_task/${logId}`, { method: 'DELETE' });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Gagal menghapus tugas.');
                }

                showCustomMessage(result.message || 'Tugas berhasil dihapus.', 'success');
                fetchAndRenderLogs();
            } catch (error) {
                showCustomMessage(error.message, 'error');
            }
        }, 'Hapus Tugas');
    };

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            taskForm.reset();
            document.getElementById('task-log-id').value = ''; 
            
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
            document.getElementById('task-start-time-input').value = localISOTime;

            if (taskModalTitle) taskModalTitle.textContent = 'Tambah Tugas Baru';
            if (taskModalSubmitBtn) taskModalSubmitBtn.textContent = 'Tambah Tugas';
            if (taskModal) taskModal.classList.remove('hidden');
        });
    }

    if (taskModalCloseBtn) {
        taskModalCloseBtn.addEventListener('click', () => {
            if (taskModal) taskModal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            taskModal.classList.add('hidden');
        }
    });

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnOriginalText = taskModalSubmitBtn.textContent;
            taskModalSubmitBtn.textContent = "Menyimpan...";
            taskModalSubmitBtn.disabled = true;

            const logId = document.getElementById('task-log-id').value;
            const isEditing = !!logId; 

            const taskData = {
                filename: document.getElementById('task-filename-input').value,
                feature_type: document.getElementById('task-feature-select').value,
                start_time: document.getElementById('task-start-time-input').value,
                deadline: document.getElementById('task-deadline-input').value,
                end_time: document.getElementById('task-end-time-input').value,
                document_type: "Manual Entry"
            };

            const url = isEditing ? `/api/edit_task/${logId}` : '/api/add_manual_task';
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Gagal memproses tugas.');
                }

                showCustomMessage(result.message, 'success');
                if (taskModal) taskModal.classList.add('hidden');
                taskForm.reset();
                fetchAndRenderLogs();

            } catch (error) {
                showCustomMessage(error.message, 'error');
            } finally {
                taskModalSubmitBtn.textContent = btnOriginalText;
                taskModalSubmitBtn.disabled = false;
            }
        });
    }

    fetchAndRenderLogs();
});