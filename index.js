const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const Groq = require("groq-sdk");
require("dotenv").config();
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
app.use(cors());
app.use(express.json());

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

let pdfText = "";



app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File not uploaded!" });
    }
    const data = await pdfParse(req.file.buffer);
    pdfText = data.text;
    
    console.log("PDF Text Preview:", pdfText.slice(0, 200));
    
    res.json({
      success: true,
      message: "PDF uploaded successfully!",
      pages: data.numpages,
    });
  } catch (err) {
    res.status(500).json({ error: "PDF upload failed" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { question } = req.body;

    if (!pdfText) {
      return res.status(400).json({
        error: "No PDF text available. Please upload a PDF first.",
      });
    }

    const response = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. 
          Answer only from the document below.
          If answer not found, say "This information is not in the document."
          
          Document:
          ${pdfText.slice(0, 3000)}`,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const answer = response.choices[0].message.content;
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong!" });
  }
});

app.listen(3000, () => {
  console.log("✅ Server running: http://localhost:3000");
});