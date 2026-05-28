import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini
  app.post("/api/generate-player", async (req, res) => {
    try {
      const { neededPositions, drawnPlayerNames = [] } = req.body;
      const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBipI2shgEo7HjLNor1IReOrl3hJSyEJtQ";
      const ai = new GoogleGenAI({ apiKey });
      
      const recentDrawnPlayers = drawnPlayerNames.slice(-20);
      
      const prompt = `Select one random active professional football player.
IMPORTANT: Do NOT pick any of these players: [${recentDrawnPlayers.join(', ')}].
The player must play in one of these positions: [${neededPositions.join(', ')}].
Diversity: Mix it up! Pick from various tiers: Elite (e.g., Haaland), Star (e.g., Mac Allister), or Rising/Reliable Pro (e.g., Nico Paz, Joao Pedro).
Output Format: Return ONLY JSON: {"name": "Full Name", "position": "FW" | "MF" | "DF", "club": "Club Name", "rating": 85-99, "tier": "Elite" | "Star" | "Pro"}. Return ONLY valid JSON, do not use markdown code block formatting.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
           responseMimeType: "application/json",
        }
      });
      
      let jsonText = response.text || "{}";
      const aiPlayer = JSON.parse(jsonText);
      const playerName = aiPlayer.name || aiPlayer.Name;

      // Fetch Image from Wikipedia
      let imageURL = "https://images.unsplash.com/photo-1574629810360-143093b5860d?w=500&q=80";
      try {
        if (playerName) {
          const queryName = encodeURIComponent(playerName);
          // Step 1: Search Wikipedia
          const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${queryName}%20football&utf8=&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const searchResults = searchData.query?.search;

        if (searchResults && searchResults.length > 0) {
          const pageTitle = encodeURIComponent(searchResults[0].title);
          // Step 2: Get Page Image
          const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
          const imgRes = await fetch(imgUrl);
          const imgData = await imgRes.json();
          const pages = imgData.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            if (pageId !== "-1" && pages[pageId].thumbnail) {
               imageURL = pages[pageId].thumbnail.source;
            }
          }
        }
        }
      } catch (e) {
        console.error("Wikipedia Image Fetch Error:", e);
      }

      res.json({ ...aiPlayer, imageURL });
    } catch (e: any) {
      console.error("Gemini Gen Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
