document.addEventListener('DOMContentLoaded', function() {
    const composeModal = document.getElementById('compose-modal');
    const composeBtn = document.getElementById('compose-btn'); 
    const composeCloseBtn = document.getElementById('compose-modal-close-btn');
    const composeForm = document.getElementById('compose-form');
    const folderItems = document.querySelectorAll('.folder-item'); 
    const messageTableBody = document.getElementById('message-table-body');
    const recipientSelect = document.getElementById('recipient-select');
    const subjectInput = document.getElementById('subject-input');
    const bodyInput = document.getElementById('body-input');
    const previewBtn = document.getElementById('preview-btn');
    const previewSendModal = document.getElementById('preview-send-modal');
    const previewModalCloseBtn = document.getElementById('preview-modal-close-btn');
    const previewBackBtn = document.getElementById('preview-back-btn');
    const confirmSendBtn = document.getElementById('confirm-send-btn');
    const previewTargetName = document.getElementById('preview-target-name');
    const previewTargetSubject = document.getElementById('preview-target-subject');
    const previewTargetBody = document.getElementById('preview-target-body');
    
    const aiGenerateBtn = document.getElementById('ai-generate-btn');
    const aiLoading = document.getElementById('ai-loading');
    const aiCustomBtn = document.getElementById('open-ai-custom-btn');
    const aiOptionsModal = document.getElementById('ai-options-modal');
    const aiOptionsCloseBtn = document.getElementById('ai-options-close-btn');
    const aiSaveOptionsBtn = document.getElementById('ai-save-options-btn');
    const aiSettingsSummary = document.getElementById('ai-settings-summary');

    const customMessageModal = document.getElementById('custom-message-modal');
    const customMessageTitle = document.getElementById('custom-message-title');
    const customMessageText = document.getElementById('custom-message-text');
    const customMessageModalContent = customMessageModal.querySelector('.modal-content');

    let currentFolder = 'sent';
    let allUsers = [];
    let currentFormData = null; 
    let aiPreferences = {
        formality: 'Formal',
        tone: 'Netral & Profesional',
        length: 'Sedang (3-4 Paragraf)',
        extraPrompt: ''
    };

    function showCustomMessage(title, message, isError = false) {
        customMessageModalContent.innerHTML = `
            <span class="modal-close-btn" onclick="document.getElementById('custom-message-modal').classList.add('hidden')">&times;</span>
            <h3 id="custom-message-title-temp" style="border-bottom: none; margin-bottom: 10px; color: ${isError ? 'var(--danger)' : 'var(--primary)'}">${title}</h3>
            <p id="custom-message-text-temp" style="text-align: center; margin-top: 1rem; margin-bottom: 2rem;">${message}</p>
            <div class="modal-actions" style="border-top: none; margin: 0; justify-content: center;">
                <button onclick="document.getElementById('custom-message-modal').classList.add('hidden')" class="login-btn full-width" style="width: 100%; padding: 10px;">OK</button>
            </div>
        `;
        customMessageModal.classList.remove('hidden');
    }

    function showConfirmation(messageId) {
        customMessageModalContent.innerHTML = `
            <span class="modal-close-btn" onclick="document.getElementById('custom-message-modal').classList.add('hidden')">&times;</span>
            <h3 style="border-bottom: none; margin-bottom: 10px; color: var(--danger);">Konfirmasi Penghapusan Pesan</h3>
            <p style="text-align: center; margin-top: 1rem; margin-bottom: 2rem;">Apakah Anda yakin ingin menghapus pesan ini? <b>Menghapus pesan ini akan menghapusnya dari kotak masuk penerima juga.</b></p>
            <div class="modal-actions" style="border-top: none; margin: 0; display: flex; justify-content: space-between; gap: 10px;">
                <button id="cancel-delete-btn" type="button" class="btn-secondary" style="flex: 1; padding: 10px;">Batal</button>
                <button id="confirm-delete-btn-action" type="button" class="action-delete-btn" style="flex: 1; padding: 10px;">Hapus Permanen</button>
            </div>
        `;
        
        document.getElementById('cancel-delete-btn').addEventListener('click', () => customMessageModal.classList.add('hidden'));

        document.getElementById('confirm-delete-btn-action').addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            deleteMessage(messageId);
        });
        
        customMessageModal.classList.remove('hidden');
    }
    
    function formatDateTime(isoString) {
        const date = new Date(isoString);
        const datePart = date.toLocaleDateString('id-ID', {
            day: '2-digit', 
            month: 'short', 
            year: 'numeric'
        });

        return `${datePart}`;
    }

    async function fetchAllUsers() {
        try {
            const response = await fetch('/api/get_all_users');
            if (response.ok) {
                allUsers = await response.json();
                populateRecipientDropdown();
            } else {
                console.error("Gagal memuat user.");
            }
        } catch (e) {
            console.error("Error fetching users:", e);
        }
    }

    function populateRecipientDropdown() {
        recipientSelect.innerHTML = '<option value="">-- Pilih Penerima --</option>';
        const currentUserId = document.body.dataset.userId;

        allUsers.forEach(user => {
            if (String(user.id) !== String(currentUserId)) {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.fullname} (${user.label})`;
                recipientSelect.appendChild(option);
            }
        });
    }
    
    async function fetchUnreadCount() {
        try {
            const response = await fetch('/api/get_unread_count');
            if (response.ok) {
                const data = await response.json();
                const unreadCountEl = document.getElementById('unread-count');
                if (data.count > 0 && unreadCountEl) {
                    unreadCountEl.textContent = data.count;
                    unreadCountEl.classList.remove('hidden');
                } else if (unreadCountEl) {
                    unreadCountEl.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("Gagal mengambil hitungan pesan belum dibaca:", e);
        }
    }

    async function fetchMessages(type) {
        currentFolder = type;
        const listTitle = document.getElementById('list-title');
        const senderRecipientHeader = document.getElementById('sender-recipient-header');

        messageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat pesan...</td></tr>';
        
        if (type === 'sent') {
            listTitle.textContent = 'Sent Items';
            senderRecipientHeader.textContent = 'Ditunjukkan kepada';
        } else {
            listTitle.textContent = 'Inbox';
            senderRecipientHeader.textContent = 'Dari';
        }
        
        try {
            const response = await fetch('/api/get_messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type })
            });

            if (response.ok) {
                const messages = await response.json();
                renderMessages(messages, type);
            } else {
                messageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger);">Gagal memuat pesan.</td></tr>';
            }
        } catch (e) {
            console.error("Error fetching messages:", e);
            messageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--danger);">Error koneksi.</td></tr>';
        }
    }

    function renderMessages(messages, type) {
        messageTableBody.innerHTML = '';
        if (messages.length === 0) {
            messageTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-light);">Tidak ada pesan dalam folder ini.</td></tr>';
            return;
        }

        messages.forEach((msg, index) => {
            const row = messageTableBody.insertRow();
            row.dataset.messageId = msg.id;
            row.dataset.messageType = type;
            row.classList.add('message-row');
            
            if (type === 'inbox' && !msg.is_read) {
                row.classList.add('unread-row');
            }

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${msg.other_user}</td>
                <td>${msg.subject}</td>
                <td>${formatDateTime(msg.timestamp)}</td>
                <td class="action-cell" style="display:flex; justify-content:center; gap: 5px;">
                    <button class="action-view-btn" data-id="${msg.id}" data-subject="${msg.subject}">
                        View
                    </button>
                    <button class="action-delete-btn" data-id="${msg.id}">
                        Delete
                    </button>
                </td>
            `;
            
            row.querySelector('.action-view-btn').addEventListener('click', (e) => {
                e.stopPropagation(); 
                viewMessageDetail(msg.id);
            });

            row.querySelector('.action-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                showConfirmation(msg.id);
            });
        });
    }
    
    function viewMessageDetail(messageId) {
        window.location.href = `/mailbox/view/${messageId}`;
    }

    async function deleteMessage(messageId) {
        try {
            const response = await fetch('/api/delete_message', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message_id: messageId })
            });

            if (response.ok) {
                showCustomMessage('Sukses', 'Pesan berhasil dihapus.');
                fetchMessages(currentFolder); 
            } else {
                const errorData = await response.json();
                showCustomMessage('Gagal', `Gagal menghapus pesan: ${errorData.error}`, true);
            }
        } catch (e) {
            showCustomMessage('Error', 'Terjadi kesalahan saat menghubungi server.', true);
            console.error("Error deleting message:", e);
        }
    }

    composeBtn.addEventListener('click', () => {
        composeModal.classList.remove('hidden'); 
        composeForm.reset();
        bodyInput.value = '';
        if(recipientSelect.options.length <= 1) fetchAllUsers();
    });

    composeCloseBtn.addEventListener('click', () => { composeModal.classList.add('hidden'); });
    document.getElementById('compose-cancel-btn').addEventListener('click', () => { composeModal.classList.add('hidden'); });
    
    previewBtn.addEventListener('click', function(e) {
        e.preventDefault();

        if (!composeForm.checkValidity()) {
            composeForm.reportValidity();
            return;
        }

        currentFormData = new FormData(composeForm);

        const recipientName = recipientSelect.options[recipientSelect.selectedIndex].text;
        const subject = subjectInput.value.trim();
        const body = bodyInput.value.trim();

        previewTargetName.textContent = recipientName;
        previewTargetSubject.textContent = subject;
        previewTargetBody.textContent = body;
        
        composeModal.classList.add('hidden');
        previewSendModal.classList.remove('hidden');
    });

    previewModalCloseBtn.addEventListener('click', () => {
        previewSendModal.classList.add('hidden');
    });

    previewBackBtn.addEventListener('click', () => {
        previewSendModal.classList.add('hidden');
        composeModal.classList.remove('hidden');
    });

    confirmSendBtn.addEventListener('click', async function() {
        if (!currentFormData) return;

        confirmSendBtn.disabled = true;
        confirmSendBtn.textContent = 'Mengirim...';
        
        try {
            const response = await fetch('/api/send_message', {
                method: 'POST',
                body: currentFormData
            });

            if (response.ok) {
                showCustomMessage('Sukses', 'Pesan Anda berhasil dikirim ke kotak surat penerima.');
                previewSendModal.classList.add('hidden');
                fetchMessages('sent'); 
            } else {
                const errorData = await response.json();
                showCustomMessage('Gagal', `Gagal mengirim pesan: ${errorData.error}`, true);
            }
        } catch (e) {
            showCustomMessage('Error', 'Terjadi kesalahan saat menghubungi server.', true);
            console.error("Error sending internal message:", e);
        } finally {
            confirmSendBtn.disabled = false;
            confirmSendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Pesan';
        }
    });

    aiCustomBtn.addEventListener('click', () => {
        aiOptionsModal.classList.remove('hidden');
        document.getElementById('ai-formality').value = aiPreferences.formality;
        document.getElementById('ai-tone').value = aiPreferences.tone;
        document.getElementById('ai-length').value = aiPreferences.length;
        document.getElementById('ai-extra-prompt').value = aiPreferences.extraPrompt;
    });

    aiOptionsCloseBtn.addEventListener('click', () => {
        aiOptionsModal.classList.add('hidden');
    });

    aiSaveOptionsBtn.addEventListener('click', () => {
        const formality = document.getElementById('ai-formality').value;
        const tone = document.getElementById('ai-tone').value;
        const length = document.getElementById('ai-length').value;
        const extraPrompt = document.getElementById('ai-extra-prompt').value.trim();

        aiPreferences = { formality, tone, length, extraPrompt };

        let shortPrompt = extraPrompt.length > 20 ? extraPrompt.substring(0, 20) + '...' : extraPrompt;
        if (!shortPrompt) shortPrompt = "Tanpa instruksi khusus";
        
        aiSettingsSummary.textContent = `(Set: ${formality}, ${tone}, ${shortPrompt})`;
        aiSettingsSummary.style.color = 'var(--primary)';
        aiSettingsSummary.style.fontWeight = 'bold';

        aiOptionsModal.classList.add('hidden');
    });

    aiGenerateBtn.addEventListener('click', async function() {
        const finalPrompt = `
            Tolong buatkan draf body email dengan spesifikasi berikut:
            1. Tingkat Formalitas: ${aiPreferences.formality}
            2. Tone/Nada Bicara: ${aiPreferences.tone}
            3. Panjang Tulisan: ${aiPreferences.length}
            4. Konteks/Instruksi Utama: "${aiPreferences.extraPrompt}"
            
            Pastikan outputnya hanya body email saja sesuai instruksi di atas.
        `;
        
        aiGenerateBtn.disabled = true;
        aiGenerateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
        aiLoading.classList.remove('hidden');

        try {
            const response = await fetch('/api/generate_email_body', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: finalPrompt })
            });

            if (response.ok) {
                const data = await response.json();
                if (bodyInput.value.trim()) {
                    bodyInput.value += "\n\n---\n\n";
                }
                bodyInput.value += data.body;
            } else {
                const errorData = await response.json();
                showCustomMessage('AI Gagal', `Gagal membuat draf: ${errorData.error}`, true);
            }

        } catch (e) {
            showCustomMessage('Error Koneksi AI', 'Gagal terhubung dengan layanan AI.', true);
            console.error("AI Error:", e);
        } finally {
            aiGenerateBtn.disabled = false;
            aiGenerateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Draft';
            aiLoading.classList.add('hidden');
        }
    });

    folderItems.forEach(item => {
        item.addEventListener('click', function() {
            folderItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            const folderType = this.dataset.folder;
            fetchMessages(folderType);
        });
    });

    fetchAllUsers();
    fetchMessages(currentFolder);
    fetchUnreadCount();
});