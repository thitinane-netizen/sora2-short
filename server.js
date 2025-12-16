require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// User data file path
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
let MEMORY_USERS = null; // In-memory cache for Vercel persistence

// Default settings from .env (fallback)
const defaultSettings = {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    kieApiKey: process.env.KIE_API_KEY || '',
    openaiModel: 'gpt-4o-mini',
    openaiModel: 'gpt-4o-mini',
    sora2Model: 'sora-2-image-to-video',
    sora2Model: 'sora-2-image-to-video',
    videoPromptRule: 'Cinematic lighting, 4k quality, highly detailed, photorealistic, natural lighting',
    scriptGenerationRule: ''
};

// Current user settings (will be set per request based on token)
let currentUserSettings = { ...defaultSettings };

// ============ USER MANAGEMENT FUNCTIONS ============

function ensureDataDir() {
    try {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    } catch (error) {
        console.warn('Warning: Cannot create data directory (likely read-only filesystem). Data persistence will be disabled.');
    }
}

function loadUsers() {
    // Return memory cache if available (Fix for Vercel read-only)
    if (MEMORY_USERS !== null) {
        return MEMORY_USERS;
    }

    // ensureDataDir(); // Skip creating dir on load to avoid errors
    if (fs.existsSync(USERS_FILE)) {
        try {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            MEMORY_USERS = JSON.parse(data); // Cache it
            return MEMORY_USERS;
        } catch (e) {
            MEMORY_USERS = {};
            return {};
        }
    }
    MEMORY_USERS = {};
    return {};
}

function saveUsers(users) {
    MEMORY_USERS = users; // Update cache first

    try {
        ensureDataDir();
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.warn('Warning: Cannot save users (likely read-only filesystem). Data will be lost on restart.');
    }
}

function hashPasscode(passcode) {
    return crypto.createHash('sha256').update(passcode).digest('hex');
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function getUserByToken(token) {
    if (!token) return null;
    const users = loadUsers();
    for (const email in users) {
        if (users[email].token === token) {
            return { email, ...users[email] };
        }
    }
    return null;
}

// Middleware to check auth and set user settings
function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const user = getUserByToken(token);

    if (user) {
        // Use user's API keys if available, otherwise use defaults
        currentUserSettings = {
            openaiApiKey: user.openaiApiKey || defaultSettings.openaiApiKey,
            kieApiKey: user.kieApiKey || defaultSettings.kieApiKey,
            openaiModel: user.openaiModel || defaultSettings.openaiModel,
            kieApiKey: user.kieApiKey || defaultSettings.kieApiKey,
            openaiModel: user.openaiModel || defaultSettings.openaiModel,
            sora2Model: user.sora2Model || defaultSettings.sora2Model,
            openaiModel: user.openaiModel || defaultSettings.openaiModel,
            sora2Model: user.sora2Model || defaultSettings.sora2Model,
            videoPromptRule: user.videoPromptRule || defaultSettings.videoPromptRule,
            scriptGenerationRule: user.scriptGenerationRule || defaultSettings.scriptGenerationRule
        };
        req.user = user;
    } else {
        currentUserSettings = { ...defaultSettings };
        req.user = null;
    }
    next();
}

// Get current settings (for API handlers that use settings variable)
function getSettings() {
    return currentUserSettings;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============ AUTH API ENDPOINTS ============

// Register new user
app.post('/api/auth/register', (req, res) => {
    const { email, passcode, openaiApiKey, kieApiKey } = req.body;

    if (!email || !passcode) {
        return res.status(400).json({ success: false, error: 'กรุณากรอก Email และ Passcode' });
    }

    if (passcode.length < 4 || passcode.length > 20) {
        return res.status(400).json({ success: false, error: 'Passcode ต้องมี 4-20 ตัวอักษร' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'รูปแบบ Email ไม่ถูกต้อง' });
    }

    const users = loadUsers();

    if (users[email.toLowerCase()]) {
        return res.status(400).json({ success: false, error: 'Email นี้ถูกใช้งานแล้ว' });
    }

    const token = generateToken();
    users[email.toLowerCase()] = {
        passcodeHash: hashPasscode(passcode),
        token: token,
        openaiApiKey: openaiApiKey || '',
        kieApiKey: kieApiKey || '',
        openaiModel: 'gpt-4o-mini',
        sora2Model: 'sora-2-image-to-video',
        videoPromptRule: '',
        scriptGenerationRule: '',
        createdAt: new Date().toISOString()
    };

    saveUsers(users);

    res.json({
        success: true,
        data: { email: email.toLowerCase(), token }
    });
});

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, passcode } = req.body;

    if (!email || !passcode) {
        return res.status(400).json({ success: false, error: 'กรุณากรอก Email และ Passcode' });
    }

    const users = loadUsers();
    const user = users[email.toLowerCase()];

    if (!user) {
        return res.status(401).json({ success: false, error: 'ไม่พบบัญชีนี้ กรุณาลงทะเบียนก่อน' });
    }

    if (user.passcodeHash !== hashPasscode(passcode)) {
        return res.status(401).json({ success: false, error: 'Passcode ไม่ถูกต้อง' });
    }

    // Generate new token on login
    const token = generateToken();
    user.token = token;
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    res.json({
        success: true,
        data: { email: email.toLowerCase(), token }
    });
});

// Verify token
app.get('/api/auth/verify', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const user = getUserByToken(token);

    if (user) {
        res.json({
            success: true,
            data: {
                email: user.email,
                hasOpenaiKey: !!user.openaiApiKey,
                hasKieKey: !!user.kieApiKey
            }
        });
    } else {
        res.status(401).json({ success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const users = loadUsers();

    for (const email in users) {
        if (users[email].token === token) {
            users[email].token = null;
            saveUsers(users);
            break;
        }
    }

    res.json({ success: true });
});

// ============ PROTECTED ROUTES ============
// Apply auth middleware to all /api routes except /auth
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth')) {
        return next();
    }
    authMiddleware(req, res, next);
});

// Require login middleware for protected routes
function requireLogin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'กรุณา login ก่อนใช้งาน' });
    }
    next();
}

// Serve static files after auth check
app.use(express.static(path.join(process.cwd(), 'public')));

// Multer config for file uploads
const storage = multer.memoryStorage(); // Use memory storage for base64 conversion
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('รองรับเฉพาะไฟล์ JPEG, PNG, WEBP เท่านั้น'));
        }
    }
});

// Review styles mapping
const reviewStyles = {
    'ป้ายยา': 'สไตล์แนะนำสินค้าแบบป้ายยา เน้นบอกต่อว่าดีจริง ต้องลอง',
    'แก้ปัญหา': 'สไตล์เล่าปัญหาที่เจอและวิธีแก้ด้วยสินค้านี้',
    'ตลกขำขัน': 'สไตล์ตลกขำขัน เบาสมอง แต่ยังคงนำเสนอสินค้าได้ดี',
    'ให้ความรู้': 'สไตล์ให้ความรู้ อธิบายประโยชน์และวิธีใช้อย่างละเอียด',
    'เล่าเรื่อง/สตอรี่': 'สไตล์เล่าเรื่องราวประสบการณ์จริงที่ใช้สินค้า',
    'ดราม่าติก่อนดีทีหลัง': 'สไตล์ดราม่าติก แสดงความแตกต่างก่อนและหลังใช้สินค้า',
    'เหตุผลเชิงคำถาม': 'สไตล์ตั้งคำถามชวนคิด แล้วตอบด้วยสินค้า',
    'ความรู้>ปัญหา>แก้ได้': 'สไตล์ให้ความรู้ก่อน ชี้ปัญหา แล้วเสนอทางแก้ด้วยสินค้า'
};

// API: Get/Update Settings (uses currentUserSettings set by authMiddleware)
app.get('/api/settings', (req, res) => {
    res.json({
        success: true,
        data: {
            email: req.user?.email || null,
            openaiApiKey: currentUserSettings.openaiApiKey ? '***' + currentUserSettings.openaiApiKey.slice(-8) : '',
            kieApiKey: currentUserSettings.kieApiKey ? '***' + currentUserSettings.kieApiKey.slice(-8) : '',
            openaiModel: currentUserSettings.openaiModel,
            openaiModel: currentUserSettings.openaiModel,
            sora2Model: currentUserSettings.sora2Model,
            videoPromptRule: currentUserSettings.videoPromptRule,
            scriptGenerationRule: currentUserSettings.scriptGenerationRule,
            hasOpenaiKey: !!currentUserSettings.openaiApiKey,
            hasKieKey: !!currentUserSettings.kieApiKey
        }
    });
});

app.post('/api/settings', requireLogin, (req, res) => {
    const { openaiApiKey, kieApiKey, openaiModel, sora2Model, videoPromptRule, scriptGenerationRule } = req.body;

    // Save to user's data
    const users = loadUsers();
    const user = users[req.user.email];

    if (openaiApiKey !== undefined) user.openaiApiKey = openaiApiKey;
    if (kieApiKey !== undefined) user.kieApiKey = kieApiKey;
    if (openaiModel) user.openaiModel = openaiModel;
    if (sora2Model) user.sora2Model = sora2Model;
    if (videoPromptRule !== undefined) user.videoPromptRule = videoPromptRule;
    if (scriptGenerationRule !== undefined) user.scriptGenerationRule = scriptGenerationRule;

    saveUsers(users);

    // Update current settings
    currentUserSettings.openaiApiKey = user.openaiApiKey || defaultSettings.openaiApiKey;
    currentUserSettings.kieApiKey = user.kieApiKey || defaultSettings.kieApiKey;
    currentUserSettings.openaiModel = user.openaiModel;
    currentUserSettings.sora2Model = user.sora2Model;
    currentUserSettings.videoPromptRule = user.videoPromptRule;
    currentUserSettings.scriptGenerationRule = user.scriptGenerationRule;

    res.json({
        success: true,
        message: 'Settings saved successfully'
    });
});

// API: Upload image to Kie.ai File Upload API
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาอัพโหลดรูปภาพ'
            });
        }

        // Convert to base64 with data URI prefix
        const base64Data = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype;
        const base64DataUri = `data:${mimeType};base64,${base64Data}`;

        // Upload to Kie.ai File Upload API
        const uploadEndpoint = 'https://kieai.redpandaai.co/api/file-base64-upload';
        const requestBody = {
            base64Data: base64DataUri,
            uploadPath: 'ugc-images',
            fileName: req.file.originalname || 'image.jpg'
        };

        const response = await axios.post(uploadEndpoint, requestBody, {
            headers: {
                'Authorization': `Bearer ${currentUserSettings.kieApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.success || response.data.code === 200) {
            // API returns downloadUrl, not fileUrl
            const fileUrl = response.data.data?.downloadUrl || response.data.data?.fileUrl || response.data.data?.url;

            console.log('Upload success - URL:', fileUrl);

            res.json({
                success: true,
                data: {
                    url: fileUrl,
                    filename: req.file.originalname,
                    filePath: response.data.data?.filePath,
                    uploadedAt: response.data.data?.uploadedAt
                },
                apiRequest: {
                    endpoint: uploadEndpoint,
                    method: 'POST',
                    body: { base64Data: '[BASE64_DATA]', uploadPath: 'ugc-images', fileName: req.file.originalname }
                },
                apiResponse: response.data
            });
        } else {
            throw new Error(response.data.msg || 'Upload failed');
        }

    } catch (error) {
        console.error('Upload error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + (error.response?.data?.msg || error.message)
        });
    }
});

// API: Generate script and caption using OpenAI GPT
app.post('/api/generate-script', async (req, res) => {
    try {
        const { productName, productDetails, reviewStyle, reviewObjective } = req.body;
        // Use custom style if not in map
        const styleDescription = reviewStyles[reviewStyle] || reviewStyle;

        const systemPrompt = `คุณเป็นผู้เชี่ยวชาญสร้างคอนเทนต์รีวิวสินค้าภาษาไทย โดยต้องปฏิบัติตามกฎอย่างเคร่งครัด:

🔴 กฎทองสำหรับ AI นางแบบรีวิวสินค้า:
${currentUserSettings.scriptGenerationRule || '1. พูดได้: อธิบายฟีเจอร์ + ข้อมูลที่มีจริง\n2. ห้ามพูด: ประสบการณ์จริง + ผลลัพธ์จริง + การรับรองประสิทธิภาพ\n3. ถ้าข้อความทำให้คน "เข้าใจผิดว่ามีคนลองแล้ว" = ห้ามพูด'}

ตอบเป็น JSON เท่านั้น`;

        const userPrompt = `สร้างบทพูดภาษาไทยสำหรับคลิป UGC ความยาว 10 วินาที (เน้นสั้นกระชับ ไม่เกิน 2-3 ประโยค)

ข้อมูลสินค้า:
- ชื่อสินค้า: ${productName}
- รายละเอียด: ${productDetails}
- สไตล์การรีวิว: ${styleDescription}
- วัตถุประสงค์: ${reviewObjective}

ข้อกำหนดสำคัญ:
1. บทพูดต้องเป็นภาษาไทยทั้งหมด กระชับ ดึงดูดใจ เหมาะกับ TikTok/Reels
2. ห้ามอ้างว่าใช้สินค้าจริง หรือมีประสบการณ์จริง
3. ใช้คำแนะนำเชิงข้อมูล เช่น "ผลิตภัณฑ์นี้ออกแบบมาเพื่อ..." "คุณสมบัติที่น่าสนใจคือ..."
4. อาจเพิ่มคำว่า "นี่เป็นภาพจำลองแสดงการใช้งาน" หรือ "ข้อมูลอ้างอิงจากรายละเอียดสินค้า"

ตอบในรูปแบบ JSON:
{
    "script": "บทพูดภาษาไทยที่นี่",
    "caption": "caption ภาษาไทยพร้อมแฮชแท็กที่นี่"
}`;

        const openaiRequest = {
            model: currentUserSettings.openaiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', openaiRequest, {
            headers: {
                'Authorization': `Bearer ${currentUserSettings.openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content;

        let result;
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch (parseError) {
            result = { script: content, caption: '' };
        }

        res.json({
            success: true,
            data: result,
            apiRequest: {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                body: openaiRequest
            },
            apiResponse: {
                model: response.data.model,
                usage: response.data.usage,
                content: content
            }
        });

    } catch (error) {
        console.error('Generate script error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการสร้างบทพูด: ' + (error.response?.data?.error?.message || error.message)
        });
    }
});

// API: Generate video prompt for Sora2
app.post('/api/generate-video-prompt', async (req, res) => {
    try {
        const { productName, productDetails, reviewStyle, script } = req.body;

        const systemPrompt = `You are an expert at creating video prompts for Sora AI video generation.
Your task is to create a detailed video prompt that describes the visual scene, motion, AND includes the Thai dialogue.
The video will be a UGC-style product review.
IMPORTANT: The final prompt MUST include the Thai script as the spoken dialogue.

USER DEFINED RULES (Apply these strictly):
${currentUserSettings.videoPromptRule || 'No specific custom rules.'}`;

        const userPrompt = `Create a detailed VIDEO PROMPT for Sora AI to generate a 15-second UGC product review video.

PRODUCT INFO:
- Product: ${productName}
- Details: ${productDetails}
- Review Style: ${reviewStyle}

THAI SCRIPT (บทพูดภาษาไทย - ต้องใส่ใน prompt):
"${script}"

VIDEO REQUIREMENTS:
1. Aspect ratio: 9:16 (portrait/vertical for TikTok/Reels)
2. Duration: 15 seconds
3. Style: UGC (User Generated Content) - natural, authentic feel
4. The person should be holding/showing the product
5. Natural movements, NOT a still image
6. Good lighting, clean background

OUTPUT FORMAT - Your prompt MUST follow this structure:
---
[VISUAL DESCRIPTION IN ENGLISH]
Describe the scene: background, lighting, camera angle, person's appearance, how they hold/show product, natural gestures and movements.

[THAI DIALOGUE - บทพูด]
The person speaks in Thai: "${script}"
---

IMPORTANT: Always include the full Thai script in the prompt so the video will have Thai audio/speech.
Output the video prompt only, no explanations.`;

        const openaiRequest = {
            model: currentUserSettings.openaiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', openaiRequest, {
            headers: {
                'Authorization': `Bearer ${currentUserSettings.openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const videoPrompt = response.data.choices[0].message.content;

        res.json({
            success: true,
            data: { videoPrompt },
            apiRequest: {
                endpoint: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                body: openaiRequest
            },
            apiResponse: {
                model: response.data.model,
                usage: response.data.usage,
                content: videoPrompt
            }
        });

    } catch (error) {
        console.error('Generate video prompt error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการสร้าง Video Prompt: ' + (error.response?.data?.error?.message || error.message)
        });
    }
});

// API: Create video with Sora2
app.post('/api/create-video', async (req, res) => {
    try {
        const { imageUrl, videoPrompt } = req.body;

        if (!imageUrl || !videoPrompt) {
            return res.status(400).json({
                success: false,
                error: 'กรุณาระบุ imageUrl และ videoPrompt'
            });
        }

        const kieRequest = {
            model: currentUserSettings.sora2Model,
            input: {
                prompt: videoPrompt,
                image_urls: [imageUrl],
                aspect_ratio: 'portrait',
                n_frames: '15'
            }
        };

        const response = await axios.post('https://api.kie.ai/api/v1/jobs/createTask', kieRequest, {
            headers: {
                'Authorization': `Bearer ${currentUserSettings.kieApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code === 200) {
            res.json({
                success: true,
                data: { taskId: response.data.data.taskId },
                apiRequest: {
                    endpoint: 'https://api.kie.ai/api/v1/jobs/createTask',
                    method: 'POST',
                    body: kieRequest
                },
                apiResponse: response.data
            });
        } else {
            throw new Error(response.data.msg || 'Unknown error from Kie.ai');
        }

    } catch (error) {
        console.error('Create video error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการสร้างวิดีโอ: ' + (error.response?.data?.msg || error.message)
        });
    }
});

// API: Check video status
app.get('/api/video-status/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;

        const response = await axios.get('https://api.kie.ai/api/v1/jobs/recordInfo', {
            params: { taskId },
            headers: {
                'Authorization': `Bearer ${currentUserSettings.kieApiKey}`
            }
        });

        res.json({
            success: true,
            data: response.data.data,
            apiRequest: {
                endpoint: 'https://api.kie.ai/api/v1/jobs/recordInfo',
                method: 'GET',
                params: { taskId }
            },
            apiResponse: response.data
        });

    } catch (error) {
        console.error('Check status error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
        });
    }
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
