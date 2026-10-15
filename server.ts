import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Shared server-side Gemini client with aistudio-build telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // AI Knowledge Matching & Agent Guidance Endpoint
  app.post('/api/ai/match-article', async (req, res) => {
    try {
      const { concern, articles, activeCase } = req.body;

      if (!concern && !activeCase) {
        return res.status(400).json({
          error: 'Customer concern or active case context is required.',
        });
      }

      const availableArticlesContext =
        Array.isArray(articles) && articles.length > 0
          ? articles
              .map(
                (a: any) =>
                  `- ID: ${a.articleId} | Title: "${a.title}" | Category: ${a.category}\n  Summary: ${a.summary}\n  SOP: ${a.recommendedSop}`
              )
              .join('\n\n')
          : 'Default Instacart Logistics SOPs apply.';

      const caseContext = activeCase
        ? `Active Case Context:\n- Case Number: ${activeCase.caseNumber || 'N/A'}\n- Subject: ${activeCase.subject || 'N/A'}\n- Category: ${activeCase.category || 'N/A'}\n- Description: ${activeCase.description || 'N/A'}`
        : 'No specific case selected.';

      const prompt = `You are the Instacart Care AI Knowledge & Resolution Specialist.
An enterprise customer service or logistics agent is handling a customer or shopper issue and needs the exact right knowledge base article / SOP to resolve it quickly and accurately.

${caseContext}

Agent Query / Customer Concern:
"${concern || activeCase?.subject || 'Customer reported a delivery issue.'}"

Available Instacart Knowledge Base SOP Articles:
${availableArticlesContext}

Analyze the customer concern carefully. Select the most relevant Knowledge Base article.
Provide:
1. matchedArticleId: The exact articleId string (e.g., "KB-INSTA-101", "KB-INSTA-102", "KB-INSTA-103", "KB-INSTA-104", "KB-INSTA-105", "KB-INSTA-106", etc.)
2. matchedTitle: The title of the matched article
3. confidenceScore: An integer between 1 and 100 representing confidence in this SOP match
4. reasoning: 1-2 concise sentences explaining why this SOP matches the customer's scenario
5. stepByStepAction: 3-4 bullet steps for the agent to resolve this issue in compliance with Instacart policy
6. suggestedScript: A friendly, professional, empathetic script for the agent to say on the phone or in chat
7. tags: 2-4 short keywords (e.g., ["Cold Chain", "Refund", "Perishables"])

Return your response strictly as valid JSON matching this schema:
{
  "matchedArticleId": "string",
  "matchedTitle": "string",
  "confidenceScore": number,
  "reasoning": "string",
  "stepByStepAction": ["string"],
  "suggestedScript": "string",
  "tags": ["string"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction:
            'You are an enterprise AI assistant for Instacart Care call center agents. Always provide precise, compliant SOP recommendations in structured JSON.',
        },
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        const cleaned = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error('Error in /api/ai/match-article:', err);
      return res.status(500).json({
        error: err.message || 'Failed to process AI article matching.',
      });
    }
  });

  // Vite middleware in dev or static files in prod
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
