const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'public')));

// Configure Multer for temp uploads
const upload = multer({
    dest: '/tmp', // Vercel compliant temp dir
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Default Fallback Settings
const defaultSettings = {
    openaiModel: 'gpt-4o-mini',
    sora2Model: 'sora-2-image-to-video',
    videoPromptRule: 'Cinematic lighting, 4k quality, highly detailed, photorealistic, natural lighting',
    scriptGenerationRule: `✅ คำพูดที่ “พูดได้” (ปลอดภัย ไม่หลอกลวง) / เน้นข้อมูลจริง ใช้คำเชิงประสบการณ์ จำลองสถานการณ์ แต่ไม่อ้างว่าใช้จริง
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
ห้ามพูดทุกอย่างที่ “สร้างภาพว่ามีประสบการณ์จริง” หรือ “รับรองผลลัพธ์”`
};

// --- Helper Functions ---

const getApiKeys = (req) => {
    return {
        openaiApiKey: req.headers['x-config-openai-key'] || process.env.OPENAI_API_KEY,
        kieApiKey: req.headers['x-config-kie-key'] || process.env.KIE_API_KEY
    };
};

const deleteFile = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('Error deleting file:', err);
    }
};

// --- API Endpoints ---

// Upload Image to Kie.ai
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const { kieApiKey } = getApiKeys(req);
    if (!kieApiKey) {
        deleteFile(req.file.path);
        return res.status(400).json({ success: false, error: 'Missing Kie.ai API Key' });
    }

    try {
        const fileStream = fs.createReadStream(req.file.path);
        const data = new FormData();
        data.append('file', fileStream);

        const response = await axios.post('https://api.kie.ai/files', data, {
            headers: {
                'Authorization': `Bearer ${kieApiKey}`,
                ...data.getHeaders()
            }
        });

        // Clean up temp file
        deleteFile(req.file.path);

        res.json({ success: true, data: response.data });
    } catch (error) {
        deleteFile(req.file.path);
        console.error('Kie Upload Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || error.message || 'Upload failed'
        });
    }
});

// Generate Script using OpenAI
app.post('/api/generate-script', async (req, res) => {
    const { productName, productDetails, reviewStyle, reviewObjective, openaiModel, scriptGenerationRule } = req.body;
    const { openaiApiKey } = getApiKeys(req);

    if (!openaiApiKey) return res.status(400).json({ success: false, error: 'Missing OpenAI API Key' });

    const effectiveRule = scriptGenerationRule || defaultSettings.scriptGenerationRule;
    const model = openaiModel || defaultSettings.openaiModel;

    const userPrompt = `สินค้า: ${productName}
รายละเอียด: ${productDetails}
สไตล์การรีวิว: ${reviewStyle}
วัตถุประสงค์: ${reviewObjective}

ขอ 2 ส่วน:
1. Script (บทพูดภาษาไทย) ความยาว 45-60 วินาที
2. Caption (ภาษาไทย) สำหรับโพสต์ลง Social Media พร้อม Hashtags`;

    try {
        const apiRequest = {
            model: model,
            messages: [
                { role: "system", content: effectiveRule },
                { role: "user", content: userPrompt }
            ]
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', apiRequest, {
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0]?.message?.content || '';

        let script = content;
        let caption = '';

        // Basic split logic if both are in one response
        if (content.includes('Caption') || content.includes('2.')) {
            const parts = content.split(/Caption|2\./i);
            script = parts[0] || content;
            caption = parts[1] || '';
        }

        res.json({
            success: true,
            data: { script: script.trim(), caption: caption.trim() },
            apiRequest,
            apiResponse: response.data
        });

    } catch (error) {
        console.error('OpenAI Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
    }
});

// Generate Video Prompt using OpenAI
app.post('/api/generate-video-prompt', async (req, res) => {
    const { productName, productDetails, reviewStyle, script, openaiModel, videoPromptRule } = req.body;
    const { openaiApiKey } = getApiKeys(req);

    if (!openaiApiKey) return res.status(400).json({ success: false, error: 'Missing OpenAI API Key' });

    const model = openaiModel || defaultSettings.openaiModel;
    const effectiveRule = videoPromptRule || defaultSettings.videoPromptRule;

    const systemPrompt = `You are an expert at creating video prompts for Sora AI video generation. 
Your task is to create a detailed video prompt that describes the visual scene, motion, AND includes the Thai dialogue.
The video will be a UGC-style product review.
IMPORTANT: The final prompt MUST include the Thai script as the spoken dialogue.

GUILELINES:
${effectiveRule}
`;

    const userPrompt = `Product: ${productName}
Details: ${productDetails}
Style: ${reviewStyle}
Script (Thai): "${script}"

Create a definitive video generation prompt that includes the visual description and the spoken script.`;

    try {
        const apiRequest = {
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ]
        };

        const response = await axios.post('https://api.openai.com/v1/chat/completions', apiRequest, {
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const videoPrompt = response.data.choices[0]?.message?.content || '';

        res.json({
            success: true,
            data: { videoPrompt },
            apiRequest,
            apiResponse: response.data
        });

    } catch (error) {
        console.error('OpenAI Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data?.error?.message || error.message });
    }
});

// Create Video (Kie.ai Sora)
app.post('/api/create-video', async (req, res) => {
    const { imageUrl, videoPrompt, sora2Model } = req.body;
    const { kieApiKey } = getApiKeys(req);

    if (!kieApiKey) return res.status(400).json({ success: false, error: 'Missing Kie.ai API Key' });

    const model = sora2Model || defaultSettings.sora2Model;

    try {
        const apiRequest = {
            model: model,
            prompt: videoPrompt,
            image_urls: [imageUrl],
            aspect_ratio: "9:16",
            duration_seconds: 5
        };

        const response = await axios.post('https://api.kie.ai/video/sora/generations', apiRequest, {
            headers: {
                'Authorization': `Bearer ${kieApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            success: true,
            data: { taskId: response.data.id },
            apiRequest,
            apiResponse: response.data
        });

    } catch (error) {
        console.error('Kie Video Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data?.message || 'Video creation failed' });
    }
});

// Check Video Status
app.get('/api/video-status/:taskId', async (req, res) => {
    const { taskId } = req.params;
    const { kieApiKey } = getApiKeys(req);

    if (!kieApiKey) return res.status(400).json({ success: false, error: 'Missing Kie.ai API Key' });

    try {
        const response = await axios.get(`https://api.kie.ai/video/sora/generations/${taskId}`, {
            headers: { 'Authorization': `Bearer ${kieApiKey}` }
        });

        res.json({ success: true, data: response.data });

    } catch (error) {
        console.error('Kie Status Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.response?.data?.message || 'Status check failed' });
    }
});

// Handle 404 - SPA Fallback
app.use((req, res) => {
    res.status(404).sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
