import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json({ limit: '10mb' }));

// Google Vision endpoint
app.post('/ocr/google', upload.single('image'), async (req, res) => {
  try {
    const image = fs.readFileSync(req.file.path, { encoding: 'base64' });
    const requestBody = {
      requests: [{
        image: { content: image },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }]
      }]
    };
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );
    fs.unlinkSync(req.file.path);
    const data = await response.json();
    if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
      res.json({ text: data.responses[0].fullTextAnnotation.text });
    } else {
      res.status(400).json({ error: 'No se detectó texto' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Puedes agregar endpoints similares para Azure y OCR.Space aquí...

app.listen(process.env.PORT || 3000, () => {
  console.log('OCR backend listening on port', process.env.PORT || 3000);
});
