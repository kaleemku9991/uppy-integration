const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const Airtable = require('airtable');
const companion = require('@uppy/companion');

const app = express();
app.use(bodyParser.json());

const secret = crypto.randomBytes(64).toString('hex');

app.use(session({ 
  secret: secret,
  resave: false,
  saveUninitialized: true
}));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filetypes = /png|jpg|jpeg/;
    const mimetype = filetypes.test(req.file.mimetype);
    const extname = filetypes.test(path.extname(req.file.originalname).toLowerCase());
    if (!mimetype || !extname) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type. Only PNG and JPEG images are allowed.' });
    }

    const imageData = fs.readFileSync(req.file.path);
    const dataExtractionApiResponse = await axios.post('DataExtractionApiEndpoint', imageData, {
      headers: {
        'Content-Type': 'image/png'
      }
    });

    const extractedData = dataExtractionApiResponse.data;
    
    const airtable = new Airtable({ apiKey: 'YOUR_AIRTABLE_API_KEY' });
    const base = airtable.base('YOUR_AIRTABLE_BASE_ID');

    base('Table Name').create({
      Name: extractedData.name,
      Age: extractedData.age,
      Email: extractedData.email
    }, (err, record) => {
      if (err) {
        console.error('Error:', err);
        return res.status(500).json({ error: 'Failed to store data in Airtable' });
      }
      console.log('Record created:', record.getId());
      res.json({ message: 'Data stored in Airtable successfully' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const options = {
  secret: secret,
  providerOptions: {
    drive: {
      key: 'YOUR_GOOGLE_KEY',
      secret: 'YOUR_GOOGLE_SECRET'
    }
  },
  server: {
    host: 'localhost:3020',
    protocol: 'http'
  },
  filePath: '/path/to/folder/',
  uploadUrls: ['http://localhost:3000']
};

const { app: companionApp } = companion.app(options);
app.use(companionApp);

const PORT = process.env.PORT || 3020;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

companion.socket(server);
