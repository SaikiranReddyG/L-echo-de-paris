import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK to prevent startup crashes when GEMINI_API_KEY is not configured
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Translate and segment endpoint
app.post("/api/translate-story", async (req, res) => {
  try {
    const { title, level, text } = req.body;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required to translate." });
      return;
    }

    // Check if GEMINI_API_KEY is available. If not, we will do a smart local fallback split and placeholder translation.
    if (!process.env.GEMINI_API_KEY) {
      // Local fallback split by typical sentence punctuation
      const sentencesRaw = text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);

      const sentences = sentencesRaw.map(s => ({
        french: s,
        english: `[English translation of: "${s}"]`
      }));

      res.json({
        title: title || "New French Story",
        level: level || "beginner",
        sentences,
        warning: "GEMINI_API_KEY not set. Story split locally, translations are placeholders."
      });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `You are a French linguistics expert and translator. 
Analyze the provided French text and perform the following:
1. Divide the text into clear, semantic, complete sentences for typing practice (limit to around 5-15 logical sentences).
2. Translate each sentence into natural English.
3. Determine a suitable title and levels if not provided.

The French text:
"""
${text}
"""

Story parameters:
- Requested Title: ${title || "None specified"}
- Requested Level: ${level || "None specified"}

Return the result strictly as a JSON object adhering to this schema:
{
  "title": "A string containing the final title",
  "level": "one of: 'beginner', 'easy', 'intermediate'",
  "sentences": [
    {
      "french": "The French sentence precisely as written (preserve accents and punctuation)",
      "english": "The corresponding English translation"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["title", "level", "sentences"],
          properties: {
            title: { type: Type.STRING },
            level: { type: Type.STRING },
            sentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["french", "english"],
                properties: {
                  french: { type: Type.STRING },
                  english: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const responseText = response.text ? response.text.trim() : "";
    if (!responseText) {
      throw new Error("Empty response received from the Gemini model.");
    }

    const parsedResult = JSON.parse(responseText);
    res.json(parsedResult);

  } catch (error: any) {
    console.error("Translation server error:", error);
    res.status(500).json({ 
      error: error.message || "An unexpected translation failure occurred." 
    });
  }
});

// Single sentence translation endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence || typeof sentence !== "string") {
      res.status(400).json({ error: "sentence is required." });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        content: [
          {
            text: `[English translation of: "${sentence}"]`
          }
        ]
      });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Translate the following French sentence to natural English. 
Return only the English translation, nothing else, no quotes, no explanation.

French: ${sentence}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const translatedText = response.text ? response.text.trim() : "";
    res.json({
      content: [
        {
          text: translatedText
        }
      ]
    });
  } catch (error: any) {
    console.error("Single translation server error:", error);
    res.status(500).json({
      error: error.message || "An unexpected translation failure occurred."
    });
  }
});

// Notebook API routes
app.get("/api/notebook", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "notebook.json");
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({ sai: [], claude: [] }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(data);
  } catch (error) {
    console.error("GET /api/notebook error:", error);
    res.status(500).json({ error: "Failed to fetch notebook." });
  }
});

app.post("/api/notebook/sai", (req, res) => {
  try {
    const { french, translation, usage, notes } = req.body;
    const filePath = path.join(process.cwd(), "notebook.json");
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({ sai: [], claude: [] }, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!data.sai) data.sai = [];
    
    const newEntry = {
      id: Date.now().toString(),
      date: Date.now(),
      french: french || "",
      translation: translation || "",
      usage: usage || "",
      notes: notes || ""
    };
    
    data.sai.push(newEntry);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json(newEntry);
  } catch (error) {
    console.error("POST /api/notebook/sai error:", error);
    res.status(500).json({ error: "Failed to add entry." });
  }
});

app.delete("/api/notebook/sai/:id", (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(process.cwd(), "notebook.json");
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Notebook file not found." });
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (data.sai) {
      data.sai = data.sai.filter((item: any) => item.id !== id);
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/notebook/sai error:", error);
    res.status(500).json({ error: "Failed to delete entry." });
  }
});

// Start server
async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
