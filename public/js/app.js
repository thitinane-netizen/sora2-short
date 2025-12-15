// UGC Video Generator App - Tab-based UI

class UGCVideoApp {
    constructor() {
        this.uploadedImage = null;
        this.uploadedImageUrl = null;
        this.generatedScript = '';
        this.generatedCaption = '';
        this.videoPrompt = '';
        this.taskId = null;
        this.statusCheckInterval = null;
        this.videoStartTime = null;
        this.TIMEOUT_WARNING_MS = 4 * 60 * 1000;
        this.token = localStorage.getItem('ugc_token');
        this.userEmail = localStorage.getItem('ugc_email');

        this.init();
    }

    async init() {
        // Check login first
        const isLoggedIn = await this.checkAuth();
        if (!isLoggedIn) {
            window.location.href = '/login.html';
            return;
        }

        this.bindEvents();
        this.loadSettings();
        this.updateUserInfo();
        this.logStatus('ระบบ', 'เริ่มต้นระบบสำเร็จ', 'success');
    }

    async checkAuth() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await response.json();
            return result.success;
        } catch (e) {
            return false;
        }
    }

    updateUserInfo() {
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl && this.userEmail) {
            userInfoEl.textContent = this.userEmail;
        }
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
        } catch (e) {}

        localStorage.removeItem('ugc_token');
        localStorage.removeItem('ugc_email');
        window.location.href = '/login.html';
    }

    bindEvents() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Image upload
        const imageUploadArea = document.getElementById('imageUploadArea');
        const productImage = document.getElementById('productImage');

        imageUploadArea.addEventListener('click', () => productImage.click());
        productImage.addEventListener('change', (e) => this.handleImageUpload(e));
        document.getElementById('removeImage').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage();
        });

        // Drag and drop
        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.classList.add('dragover');
        });
        imageUploadArea.addEventListener('dragleave', () => imageUploadArea.classList.remove('dragover'));
        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                productImage.files = e.dataTransfer.files;
                this.handleImageUpload({ target: productImage });
            }
        });

        // Main actions
        document.getElementById('btnUploadAndGenerate').addEventListener('click', () => this.uploadAndGenerateScript());
        document.getElementById('btnGenerateVideoPrompt').addEventListener('click', () => this.generateVideoPrompt());
        document.getElementById('btnCreateVideo').addEventListener('click', () => this.createVideo());
        document.getElementById('btnStartOver').addEventListener('click', () => this.startOver());

        // Copy buttons
        document.getElementById('btnCopyCaption').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('generatedCaption').value);
        });
        document.getElementById('btnCopyResultCaption').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('resultCaption').textContent);
        });

        // Settings
        document.getElementById('btnSettings').addEventListener('click', () => this.openSettings());
        document.getElementById('closeSettings').addEventListener('click', () => this.closeSettings());
        document.getElementById('btnSaveSettings').addEventListener('click', () => this.saveSettings());
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') this.closeSettings();
        });

        // Logout
        const logoutBtn = document.getElementById('btnLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Status log toggle
        document.getElementById('toggleStatusLog').addEventListener('click', () => {
            const content = document.getElementById('statusLogContent');
            const btn = document.getElementById('toggleStatusLog');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            btn.textContent = content.style.display === 'none' ? '▲' : '▼';
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            this.showToast('รองรับเฉพาะ JPEG, PNG, WEBP');
            this.logStatus('รูปภาพ', `ไฟล์ไม่รองรับ: ${file.type}`, 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showToast('ไฟล์ต้องไม่เกิน 10MB');
            this.logStatus('รูปภาพ', `ไฟล์ใหญ่เกิน: ${(file.size/1024/1024).toFixed(2)} MB`, 'error');
            return;
        }

        this.uploadedImage = file;
        this.logStatus('รูปภาพ', `เลือกรูป: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'success');

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('previewImg').src = e.target.result;
            document.getElementById('promptPreviewImg').src = e.target.result;
            document.getElementById('uploadPlaceholder').style.display = 'none';
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.uploadedImage = null;
        this.uploadedImageUrl = null;
        document.getElementById('productImage').value = '';
        document.getElementById('uploadPlaceholder').style.display = 'flex';
        document.getElementById('imagePreview').style.display = 'none';
        this.logStatus('รูปภาพ', 'ลบรูปออกแล้ว', 'info');
    }

    async uploadAndGenerateScript() {
        const productName = document.getElementById('productName').value.trim();
        const productDetails = document.getElementById('productDetails').value.trim();
        const reviewStyle = document.getElementById('reviewStyle').value;
        const reviewObjective = document.getElementById('reviewObjective').value;

        // Validate
        const missing = [];
        if (!productName) missing.push('ชื่อสินค้า');
        if (!productDetails) missing.push('รายละเอียด');
        if (!this.uploadedImage) missing.push('รูปภาพ');
        if (!reviewStyle) missing.push('สไตล์');
        if (!reviewObjective) missing.push('วัตถุประสงค์');

        if (missing.length > 0) {
            this.showToast(`กรุณากรอก: ${missing.join(', ')}`);
            this.logStatus('ตรวจสอบ', `ข้อมูลไม่ครบ: ${missing.join(', ')}`, 'error');
            return;
        }

        const btn = document.getElementById('btnUploadAndGenerate');
        this.setButtonLoading(btn, true);

        try {
            // Step 1: Upload image to Kie.ai
            this.logStatus('อัพโหลด', 'กำลังอัพโหลดรูปไป Kie.ai...', 'loading');

            const formData = new FormData();
            formData.append('image', this.uploadedImage);

            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` },
                body: formData
            });
            const uploadResult = await uploadResponse.json();

            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            this.uploadedImageUrl = uploadResult.data.url;
            document.getElementById('uploadedImageUrl').textContent = this.uploadedImageUrl;
            this.logStatus('อัพโหลด', `สำเร็จ! URL: ${this.uploadedImageUrl}`, 'success');

            // Step 2: Generate script
            this.logStatus('บทพูด', 'กำลังสร้างบทพูดด้วย OpenAI...', 'loading');

            const scriptResponse = await fetch('/api/generate-script', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ productName, productDetails, reviewStyle, reviewObjective })
            });
            const scriptResult = await scriptResponse.json();

            if (!scriptResult.success) {
                throw new Error(scriptResult.error);
            }

            this.generatedScript = scriptResult.data.script;
            this.generatedCaption = scriptResult.data.caption;

            document.getElementById('generatedScript').value = this.generatedScript;
            document.getElementById('generatedCaption').value = this.generatedCaption;
            document.getElementById('scriptStatus').textContent = '✅ สำเร็จ';
            document.getElementById('scriptStatus').className = 'status-badge success';

            // Show API details
            document.getElementById('scriptApiDetails').style.display = 'block';
            document.getElementById('scriptApiRequest').textContent = JSON.stringify(scriptResult.apiRequest, null, 2);
            document.getElementById('scriptApiResponse').textContent = JSON.stringify(scriptResult.apiResponse, null, 2);

            this.logStatus('บทพูด', 'สร้างบทพูดสำเร็จ!', 'success');
            this.switchTab('script');

        } catch (error) {
            this.logStatus('ข้อผิดพลาด', error.message, 'error');
            this.showToast('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async generateVideoPrompt() {
        const script = document.getElementById('generatedScript').value.trim();
        if (!script) {
            this.showToast('กรุณากรอกบทพูด');
            return;
        }

        this.generatedScript = script;
        this.generatedCaption = document.getElementById('generatedCaption').value.trim();

        const btn = document.getElementById('btnGenerateVideoPrompt');
        this.setButtonLoading(btn, true);

        try {
            this.logStatus('Video Prompt', 'กำลังสร้าง Video Prompt...', 'loading');

            const response = await fetch('/api/generate-video-prompt', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    productName: document.getElementById('productName').value.trim(),
                    productDetails: document.getElementById('productDetails').value.trim(),
                    reviewStyle: document.getElementById('reviewStyle').value,
                    script: this.generatedScript
                })
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            this.videoPrompt = result.data.videoPrompt;
            document.getElementById('videoPrompt').value = this.videoPrompt;
            document.getElementById('promptStatus').textContent = '✅ สำเร็จ';
            document.getElementById('promptStatus').className = 'status-badge success';

            // Show API details
            document.getElementById('promptApiDetails').style.display = 'block';
            document.getElementById('promptApiRequest').textContent = JSON.stringify(result.apiRequest, null, 2);
            document.getElementById('promptApiResponse').textContent = JSON.stringify(result.apiResponse, null, 2);

            this.logStatus('Video Prompt', 'สร้าง Video Prompt สำเร็จ!', 'success');
            this.switchTab('prompt');

        } catch (error) {
            this.logStatus('ข้อผิดพลาด', error.message, 'error');
            this.showToast('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    async createVideo() {
        const videoPrompt = document.getElementById('videoPrompt').value.trim();

        // Debug log
        console.log('createVideo - videoPrompt:', videoPrompt ? 'มี' : 'ไม่มี');
        console.log('createVideo - uploadedImageUrl:', this.uploadedImageUrl);

        if (!videoPrompt) {
            this.showToast('กรุณากรอก Video Prompt');
            this.logStatus('ข้อผิดพลาด', 'ไม่มี Video Prompt', 'error');
            return;
        }

        if (!this.uploadedImageUrl) {
            this.showToast('ไม่พบ URL รูปภาพ - กรุณาอัพโหลดรูปใหม่จาก Tab แรก');
            this.logStatus('ข้อผิดพลาด', 'ไม่มี URL รูปภาพ (uploadedImageUrl is null)', 'error');
            return;
        }

        this.videoPrompt = videoPrompt;
        const btn = document.getElementById('btnCreateVideo');
        this.setButtonLoading(btn, true);

        try {
            this.logStatus('สร้างวิดีโอ', 'กำลังส่งคำขอไป Kie.ai Sora2...', 'loading');

            const response = await fetch('/api/create-video', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    imageUrl: this.uploadedImageUrl,
                    videoPrompt: this.videoPrompt
                })
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error);
            }

            this.taskId = result.data.taskId;
            document.getElementById('taskIdDisplay').textContent = this.taskId;
            document.getElementById('videoStatus').textContent = '⏳ กำลังสร้าง';
            document.getElementById('videoStatus').className = 'status-badge generating';

            // Show API details
            document.getElementById('videoApiDetails').style.display = 'block';
            document.getElementById('videoApiRequest').textContent = JSON.stringify(result.apiRequest, null, 2);
            document.getElementById('videoApiResponse').textContent = JSON.stringify(result.apiResponse, null, 2);

            this.logStatus('สร้างวิดีโอ', `Task ID: ${this.taskId}`, 'success');
            this.switchTab('video');
            this.startStatusCheck();

        } catch (error) {
            this.logStatus('ข้อผิดพลาด', error.message, 'error');
            this.showToast('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            this.setButtonLoading(btn, false);
        }
    }

    startStatusCheck() {
        this.videoStartTime = Date.now();
        let progress = 0;
        const progressFill = document.getElementById('progressFill');

        // Progress animation
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 3;
                progressFill.style.width = Math.min(progress, 90) + '%';
            }
        }, 1000);

        // Elapsed time counter
        const timeInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.videoStartTime) / 1000);
            document.getElementById('elapsedTime').textContent = elapsed;

            // Timeout warning
            if (elapsed > 240 && elapsed % 30 === 0) {
                this.logStatus('แจ้งเตือน', `รอนานเกิน 4 นาที (${elapsed} วินาที)`, 'warning');
                this.showToast('⚠️ รอนานเกิน 4 นาทีแล้ว');
            }
        }, 1000);

        // Status polling
        this.statusCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/video-status/${this.taskId}`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                const result = await response.json();

                if (!result.success) return;

                const state = result.data?.state || 'unknown';
                document.getElementById('videoStateDisplay').textContent = this.getStatusText(state);
                document.getElementById('statusApiResponse').textContent = JSON.stringify(result.data, null, 2);

                if (state === 'success' || state === 'completed') {
                    clearInterval(this.statusCheckInterval);
                    clearInterval(progressInterval);
                    clearInterval(timeInterval);
                    progressFill.style.width = '100%';

                    document.getElementById('videoStatus').textContent = '✅ สำเร็จ';
                    document.getElementById('videoStatus').className = 'status-badge success';

                    this.logStatus('สร้างวิดีโอ', 'สร้างวิดีโอสำเร็จ!', 'success');
                    this.showResult(result.data);

                } else if (state === 'failed' || state === 'error') {
                    clearInterval(this.statusCheckInterval);
                    clearInterval(progressInterval);
                    clearInterval(timeInterval);

                    document.getElementById('videoStatus').textContent = '❌ ล้มเหลว';
                    document.getElementById('videoStatus').className = 'status-badge error';

                    const errorMsg = result.data?.failMsg || 'ไม่ทราบสาเหตุ';
                    this.logStatus('สร้างวิดีโอ', `ล้มเหลว: ${errorMsg}`, 'error');
                    this.showToast('การสร้างวิดีโอล้มเหลว: ' + errorMsg);
                }

            } catch (error) {
                console.error('Status check error:', error);
            }
        }, 5000);
    }

    showResult(data) {
        let videoUrl = null;

        if (data?.resultJson) {
            try {
                const resultData = JSON.parse(data.resultJson);
                videoUrl = resultData?.resultUrls?.[0] || resultData?.video_url;
            } catch (e) {
                console.error('Parse error:', e);
            }
        }

        videoUrl = videoUrl || data?.output?.video_url || data?.videoUrl;

        if (videoUrl) {
            document.getElementById('videoContainer').style.display = 'block';
            document.getElementById('resultVideo').querySelector('source').src = videoUrl;
            document.getElementById('resultVideo').load();
            document.getElementById('downloadVideoBtn').href = videoUrl;
            document.getElementById('downloadVideoBtn').style.display = 'inline-flex';
            this.logStatus('ผลลัพธ์', `Video URL: ${videoUrl}`, 'success');
        }

        document.getElementById('resultCaption').textContent = this.generatedCaption;
        document.getElementById('resultStatus').textContent = '✅ พร้อมใช้งาน';
        document.getElementById('resultStatus').className = 'status-badge success';

        this.switchTab('result');
        this.showToast('✅ สร้างวิดีโอสำเร็จ!');
    }

    getStatusText(status) {
        const map = {
            'pending': 'รอดำเนินการ',
            'processing': 'กำลังประมวลผล',
            'generating': 'กำลังสร้างวิดีโอ',
            'success': 'สำเร็จ',
            'completed': 'สำเร็จ',
            'failed': 'ล้มเหลว',
            'error': 'ข้อผิดพลาด'
        };
        return map[status] || status;
    }

    startOver() {
        if (this.statusCheckInterval) clearInterval(this.statusCheckInterval);

        this.uploadedImage = null;
        this.uploadedImageUrl = null;
        this.generatedScript = '';
        this.generatedCaption = '';
        this.videoPrompt = '';
        this.taskId = null;

        // Reset form
        document.getElementById('productName').value = '';
        document.getElementById('productDetails').value = '';
        document.getElementById('reviewStyle').value = '';
        document.getElementById('reviewObjective').value = '';
        this.removeImage();

        // Reset other tabs
        document.getElementById('generatedScript').value = '';
        document.getElementById('generatedCaption').value = '';
        document.getElementById('videoPrompt').value = '';
        document.getElementById('scriptStatus').textContent = 'รอข้อมูล';
        document.getElementById('scriptStatus').className = 'status-badge';
        document.getElementById('promptStatus').textContent = 'รอข้อมูล';
        document.getElementById('promptStatus').className = 'status-badge';
        document.getElementById('videoStatus').textContent = 'รอคำสั่ง';
        document.getElementById('videoStatus').className = 'status-badge';
        document.getElementById('resultStatus').textContent = 'รอวิดีโอ';
        document.getElementById('resultStatus').className = 'status-badge';

        // Hide API details
        document.getElementById('scriptApiDetails').style.display = 'none';
        document.getElementById('promptApiDetails').style.display = 'none';
        document.getElementById('videoApiDetails').style.display = 'none';

        this.logStatus('ระบบ', 'รีเซ็ตข้อมูลแล้ว', 'info');
        this.switchTab('input');
    }

    // Settings
    async loadSettings() {
        try {
            const response = await fetch('/api/settings', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const result = await response.json();
            if (result.success) {
                document.getElementById('settingOpenaiModel').value = result.data.openaiModel;
                document.getElementById('settingSora2Model').value = result.data.sora2Model;
                document.getElementById('openaiStatus').textContent = result.data.hasOpenaiKey ? '✅ พร้อมใช้งาน' : '❌ ยังไม่ตั้งค่า';
                document.getElementById('kieStatus').textContent = result.data.hasKieKey ? '✅ พร้อมใช้งาน' : '❌ ยังไม่ตั้งค่า';
            }
        } catch (error) {
            console.error('Load settings error:', error);
        }
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
        this.loadSettings();
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    async saveSettings() {
        const settingsData = {
            openaiApiKey: document.getElementById('settingOpenaiKey').value.trim() || undefined,
            kieApiKey: document.getElementById('settingKieKey').value.trim() || undefined,
            openaiModel: document.getElementById('settingOpenaiModel').value,
            sora2Model: document.getElementById('settingSora2Model').value
        };

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(settingsData)
            });
            const result = await response.json();

            if (result.success) {
                this.showToast('บันทึกการตั้งค่าสำเร็จ');
                this.logStatus('ตั้งค่า', 'อัพเดทการตั้งค่าสำเร็จ', 'success');
                this.loadSettings();
                document.getElementById('settingOpenaiKey').value = '';
                document.getElementById('settingKieKey').value = '';
            } else {
                this.showToast(result.error || 'บันทึกไม่สำเร็จ');
            }
        } catch (error) {
            this.showToast('เกิดข้อผิดพลาด: ' + error.message);
        }
    }

    // Utilities
    setButtonLoading(btn, loading) {
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loading');
        text.style.display = loading ? 'none' : 'inline';
        loader.style.display = loading ? 'inline' : 'none';
        btn.disabled = loading;
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('คัดลอกแล้ว!');
        }).catch(() => {
            this.showToast('ไม่สามารถคัดลอกได้');
        });
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    logStatus(step, message, type = 'info') {
        const logContent = document.getElementById('statusLogContent');
        const time = new Date().toLocaleTimeString('th-TH');
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', loading: '⏳' };

        const entry = document.createElement('div');
        entry.className = `status-log-entry status-${type}`;
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-icon">${icons[type] || 'ℹ️'}</span>
            <span class="log-step">[${step}]</span>
            <span class="log-message">${message}</span>
        `;
        logContent.insertBefore(entry, logContent.firstChild);

        while (logContent.children.length > 100) {
            logContent.removeChild(logContent.lastChild);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => new UGCVideoApp());
