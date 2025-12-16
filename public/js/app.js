// UGC Video Generator App - Local Storage Version

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

        // Default guidelines
        this.defaultScriptRule = `✅ คำพูดที่ “พูดได้” (ปลอดภัย ไม่หลอกลวง) / เน้นข้อมูลจริง ใช้คำเชิงประสบการณ์ จำลองสถานการณ์ แต่ไม่อ้างว่าใช้จริง
“นี่คือข้อมูลสำคัญของสินค้า…”
“ผลิตภัณฑ์นี้ถูกออกแบบมาเพื่อ…”
“จากข้อมูลที่แบรนด์ให้มา…”
“คุณสมบัติที่น่าสนใจคือ…”
“เรามาดูว่ามันทำอะไรได้บ้างนะคะ…”
“นี่คือวิธีใช้งานตามที่แนะนำ…”
“เหมาะสำหรับคนที่กำลังมองหา…”
“ข้อดีที่เห็นได้ชัดตามฟีเจอร์คือ…”
“ถ้าคุณต้องการผลลัพธ์แบบนี้ สินค้าตัวนี้เป็นหนึ่งในตัวเลือกที่น่าสนใจ…”
“นี่เป็นภาพจำลองเพื่อแสดงฟีเจอร์ของสินค้า…”
“AI ข้างหลังฉันช่วยแสดงภาพการใช้งานให้ดูง่ายขึ้น…”
“ขออธิบายฟังก์ชันต่าง ๆ ให้ฟังนะคะ…”
“ข้อมูลนี้อ้างอิงจากรายละเอียดสินค้านะคะ…”
“ปล. ฉันคือ AI นางแบบที่ทำหน้าที่นำเสนอข้อมูลค่ะ”
“คลิปนี้ใช้เพื่อแสดงตัวอย่างการใช้งาน ไม่ใช่ประสบการณ์จริงค่ะ”
👉 หลักคิด:
พูดได้ทุกอย่างที่ “ไม่อ้างว่าตัวเองใช้จริง” และ “ไม่เปลี่ยนสเปกของสินค้า”
==========
❌ คำพูดที่ “ไม่ควรพูด” (เข้าข่ายหลอกลวง) / ห้ามใช้เด็ดขาด เพราะเข้าข่ายโฆษณาเกินจริง หรือแสดงตัวเป็น “ผู้ใช้จริง”
“ฉันลองใช้แล้วดีมากค่ะ”
“ฉันใช้มาเดือนหนึ่งและเห็นผลจริง ๆ”
“รับรองว่าใช้แล้วได้ผลแน่นอน!”
“ใช้ปุ๊บ หน้าใสปั๊บค่ะ!”
“ดีกว่าทุกตัวที่ฉันเคยใช้แน่นอน”
“ไม่ต้องลองด้วยตัวเอง ฉันลองมาแล้วของจริง!”
“ใช้แล้วผิวขาวขึ้นทันทีเลยค่ะ”
“เครื่องนี้แรงมาก ฉันทดสอบแล้ว!”
“กล้ารับประกันว่าใช้ดีชัวร์” (โดยที่เราไม่ใช่เจ้าของแบรนด์)
“ฉันเป็นผู้ใช้จริงนะคะ” (AI ไม่ใช่ผู้ใช้จริง)
“ใช้แล้วหาย 100%”
“ผลลัพธ์เหมือนผ่านหมอแน่นอนค่ะ”
“ทุกคนต้องซื้อเลย ของดีมาก!”
“ฉันทดลองกับชีวิตประจำวันมาแล้วค่ะ”
“นี่คือรีวิวจากประสบการณ์ตรงของฉัน”
👉 หลักคิด:
ห้ามพูดทุกอย่างที่ “สร้างภาพว่ามีประสบการณ์จริง” หรือ “รับรองผลลัพธ์”`;

        this.defaultVideoPromptRule = 'Cinematic lighting, 4k quality, highly detailed, photorealistic, natural lighting';

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.logStatus('ระบบ', 'พร้อมใช้งาน (Local Storage Mode)', 'success');
    }

    getConfigHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-config-openai-key': localStorage.getItem('ugc_openai_key') || '',
            'x-config-kie-key': localStorage.getItem('ugc_kie_key') || ''
        };
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
        document.getElementById('btnUploadAndManualPrompt').addEventListener('click', () => this.uploadAndManualPrompt());
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

        // Toggle Password Visibility
        this.setupPasswordToggle('settingOpenaiKey', 'toggleOpenaiKey');
        this.setupPasswordToggle('settingKieKey', 'toggleKieKey');

        // Status log toggle
        document.getElementById('toggleStatusLog').addEventListener('click', () => {
            const content = document.getElementById('statusLogContent');
            const btn = document.getElementById('toggleStatusLog');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
            btn.textContent = content.style.display === 'none' ? '▲' : '▼';
        });

        // Custom Inputs Logic
        const handleCustomSelect = (selectId, inputId) => {
            const select = document.getElementById(selectId);
            const input = document.getElementById(inputId);
            select.addEventListener('change', () => {
                input.style.display = select.value === 'custom' ? 'block' : 'none';
                if (select.value === 'custom') input.focus();
            });
        };
        handleCustomSelect('reviewStyle', 'customReviewStyle');
        handleCustomSelect('reviewObjective', 'customReviewObjective');
    }

    setupPasswordToggle(inputId, toggleId) {
        // Since we are masking manually, this might just clear the field to let them type new one
        // or toggle type="password" if implemented. 
        // For this version, we'll implement simple clear-on-focus if masked.
        const input = document.getElementById(inputId);
        input.addEventListener('focus', () => {
            if (input.value.startsWith('****')) {
                input.value = ''; // Clear mask to allow new entry
            }
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
            this.logStatus('รูปภาพ', `ไฟล์ใหญ่เกิน: ${(file.size / 1024 / 1024).toFixed(2)} MB`, 'error');
            return;
        }

        this.uploadedImage = file;
        this.logStatus('รูปภาพ', `เลือกรูป: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'success');

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

        let reviewStyle = document.getElementById('reviewStyle').value;
        if (reviewStyle === 'custom') {
            reviewStyle = document.getElementById('customReviewStyle').value.trim();
        }

        let reviewObjective = document.getElementById('reviewObjective').value;
        if (reviewObjective === 'custom') {
            reviewObjective = document.getElementById('customReviewObjective').value.trim();
        }

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

            // Need to send headers manually since FormData excludes Content-Type (browser sets it with boundary)
            // But our getConfigHeaders includes Content-Type: json. 
            // We need to merge carefully.
            const headers = this.getConfigHeaders();
            delete headers['Content-Type']; // Let browser set multipart/form-data

            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                headers: headers,
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
                headers: this.getConfigHeaders(),
                body: JSON.stringify({
                    productName,
                    productDetails,
                    reviewStyle,
                    reviewObjective,
                    // Send settings in body
                    openaiModel: localStorage.getItem('ugc_openai_model') || 'gpt-4o-mini',
                    scriptGenerationRule: localStorage.getItem('ugc_script_rule') || this.defaultScriptRule
                })
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

    async uploadAndManualPrompt() {
        if (!this.uploadedImage) {
            this.showToast('กรุณาเลือกรูปภาพก่อน');
            this.logStatus('ตรวจสอบ', 'ยังไม่ได้เลือกรูปภาพ', 'error');
            return;
        }

        const btn = document.getElementById('btnUploadAndManualPrompt');
        this.setButtonLoading(btn, true);

        try {
            // Upload image to Kie.ai
            this.logStatus('อัพโหลด', 'กำลังอัพโหลดรูปไป Kie.ai...', 'loading');

            const formData = new FormData();
            formData.append('image', this.uploadedImage);

            const headers = this.getConfigHeaders();
            delete headers['Content-Type'];

            const uploadResponse = await fetch('/api/upload-image', {
                method: 'POST',
                headers: headers,
                body: formData
            });
            const uploadResult = await uploadResponse.json();

            if (!uploadResult.success) {
                throw new Error(uploadResult.error);
            }

            this.uploadedImageUrl = uploadResult.data.url;
            document.getElementById('uploadedImageUrl').textContent = this.uploadedImageUrl;
            this.logStatus('อัพโหลด', `สำเร็จ! URL: ${this.uploadedImageUrl}`, 'success');

            // Skip script generation, go to Prompt tab
            this.generatedScript = '';
            this.generatedCaption = '';
            document.getElementById('generatedScript').value = '';
            document.getElementById('generatedCaption').value = '';
            document.getElementById('videoPrompt').value = ''; // Clear prompt for manual entry

            // Update status indications to show skipped
            document.getElementById('scriptStatus').textContent = '⏭️ ข้าม';
            document.getElementById('scriptStatus').className = 'status-badge';

            this.logStatus('ระบบ', 'เข้าสู่โหมด Manual Prompt', 'info');
            this.switchTab('prompt');
            this.showToast('อัพโหลดสำเร็จ! กรุณาเขียน Prompt เองได้เลย');

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
                headers: this.getConfigHeaders(),
                body: JSON.stringify({
                    productName: document.getElementById('productName').value.trim(),
                    productDetails: document.getElementById('productDetails').value.trim(),
                    reviewStyle: document.getElementById('reviewStyle').value,
                    script: this.generatedScript,
                    // Send settings
                    openaiModel: localStorage.getItem('ugc_openai_model') || 'gpt-4o-mini',
                    videoPromptRule: localStorage.getItem('ugc_video_prompt_rule') || this.defaultVideoPromptRule
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

        if (!videoPrompt) {
            this.showToast('กรุณากรอก Video Prompt');
            this.logStatus('ข้อผิดพลาด', 'ไม่มี Video Prompt', 'error');
            return;
        }

        if (!this.uploadedImageUrl) {
            this.showToast('ไม่พบ URL รูปภาพ - กรุณาอัพโหลดรูปใหม่จาก Tab แรก');
            this.logStatus('ข้อผิดพลาด', 'ไม่มี URL รูปภาพ', 'error');
            return;
        }

        this.videoPrompt = videoPrompt;
        const btn = document.getElementById('btnCreateVideo');
        this.setButtonLoading(btn, true);

        try {
            this.logStatus('สร้างวิดีโอ', 'กำลังส่งคำขอไป Kie.ai Sora2...', 'loading');

            const response = await fetch('/api/create-video', {
                method: 'POST',
                headers: this.getConfigHeaders(),
                body: JSON.stringify({
                    imageUrl: this.uploadedImageUrl,
                    videoPrompt: this.videoPrompt,
                    // Send model setting
                    sora2Model: localStorage.getItem('ugc_sora2_model') || 'sora-2-image-to-video'
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
                    headers: this.getConfigHeaders()
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

    // Settings (Local Storage)
    loadSettings() {
        // Load Model Settings
        const openaiModel = localStorage.getItem('ugc_openai_model');
        const sora2Model = localStorage.getItem('ugc_sora2_model');
        const videoPromptRule = localStorage.getItem('ugc_video_prompt_rule');
        const scriptRule = localStorage.getItem('ugc_script_rule');

        if (openaiModel) document.getElementById('settingOpenaiModel').value = openaiModel;
        if (sora2Model) document.getElementById('settingSora2Model').value = sora2Model;

        // Rules (Use defaults if empty)
        document.getElementById('settingVideoPromptRule').value = videoPromptRule || this.defaultVideoPromptRule;
        document.getElementById('settingScriptGenerationRule').value = scriptRule || this.defaultScriptRule;

        // keys
        const openaiKey = localStorage.getItem('ugc_openai_key');
        const kieKey = localStorage.getItem('ugc_kie_key');

        const openaiKeyInput = document.getElementById('settingOpenaiKey');
        const kieKeyInput = document.getElementById('settingKieKey');

        if (openaiKey) {
            openaiKeyInput.value = this.maskKey(openaiKey);
            document.getElementById('openaiStatus').textContent = '✅ พร้อมใช้งาน';
        } else {
            openaiKeyInput.value = '';
            document.getElementById('openaiStatus').textContent = '❌ ยังไม่ตั้งค่า';
        }

        if (kieKey) {
            kieKeyInput.value = this.maskKey(kieKey);
            document.getElementById('kieStatus').textContent = '✅ พร้อมใช้งาน';
        } else {
            kieKeyInput.value = '';
            document.getElementById('kieStatus').textContent = '❌ ยังไม่ตั้งค่า';
        }
    }

    maskKey(key) {
        if (!key || key.length < 12) return key;
        // Show first 8 chars, mask the rest
        return key.substring(0, 8) + '********';
    }

    openSettings() {
        document.getElementById('settingsModal').style.display = 'flex';
        this.loadSettings();
    }

    closeSettings() {
        document.getElementById('settingsModal').style.display = 'none';
    }

    saveSettings() {
        // Models
        localStorage.setItem('ugc_openai_model', document.getElementById('settingOpenaiModel').value);
        localStorage.setItem('ugc_sora2_model', document.getElementById('settingSora2Model').value);

        // Rules
        localStorage.setItem('ugc_video_prompt_rule', document.getElementById('settingVideoPromptRule').value.trim());
        localStorage.setItem('ugc_script_rule', document.getElementById('settingScriptGenerationRule').value.trim());

        // Keys
        const openaiInput = document.getElementById('settingOpenaiKey').value.trim();
        const kieInput = document.getElementById('settingKieKey').value.trim();

        // Only update key if user typed something (not masked value)
        if (openaiInput && !openaiInput.includes('*')) {
            localStorage.setItem('ugc_openai_key', openaiInput);
        } else if (openaiInput === '') {
            // Optional: Handle clearing key if empty? For now assume empty means no change if masked, but here empty means empty
            // If they clear it, we should probably delete it?
            // Let's check logic: loadSettings shows masked. If they focus and clear, it's empty.
            if (localStorage.getItem('ugc_openai_key')) {
                // Determine if user cleared it or just didn't touch it.
                // If it was masked (starts with chars then stars), and now is empty -> Clear it.
                // But logic above `input.value = ''` on focus handles the clearing.
                // So if it's empty here, it means they cleared it.
                // EXCEPTION: If they didn't touch it, `loadSettings` put masked value.
                // `openaiInput` will be masked. `!openaiInput.includes('*')` will be false.
                // So we WON'T overwrite with masked value. Correct.
            }
        }

        // Handling "Clear Key" case explicitly:
        // if input is empty, and it was previously set, we remove it.
        if (openaiInput === '') localStorage.removeItem('ugc_openai_key');
        if (kieInput === '') localStorage.removeItem('ugc_kie_key');

        if (kieInput && !kieInput.includes('*')) {
            localStorage.setItem('ugc_kie_key', kieInput);
        }

        this.showToast('บันทึกการตั้งค่าลง Web Browser แล้ว');
        this.logStatus('ตั้งค่า', 'บันทึกการตั้งค่าสำเร็จ', 'success');
        this.loadSettings();
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
