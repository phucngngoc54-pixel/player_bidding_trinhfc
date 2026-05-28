import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { neededPositions, drawnPlayerNames = [] } = req.body;
    
    // Support Gemini API Key from Vercel Environment Variables
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "AIzaSyBipI2shgEo7HjLNor1IReOrl3hJSyEJtQ";
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
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${queryName}%20football&utf8=&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const searchResults = searchData.query?.search;

        if (searchResults && searchResults.length > 0) {
          const pageTitle = encodeURIComponent(searchResults[0].title);
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

    res.status(200).json({ ...aiPlayer, imageURL });
  } catch (e: any) {
    console.error("Gemini Gen Error:", e);
    res.status(500).json({ error: e.message });
  }
}
