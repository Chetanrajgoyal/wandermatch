/* ============================================
   Kibi — Gemini AI API Client
   ============================================ */

const GEMINI_API_KEY = "AQ.Ab8RN6Iv903j4cGLy-KdavkPEdbLivFDBhYb8E9FMzdSHhZy0g";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-1.5-flash-latest";

const GeminiAPI = {
  /**
   * Generate an itinerary using Gemini AI
   * @param {Object} params - Trip parameters
   * @returns {Promise<Object>} { itinerary: [...], accommodations: [...], image: string|null }
   */
  async generateItinerary(params) {
    const { destination, lat, lon, startDate, endDate, budget, travelStyle, interests, socialPreference, travelPace, numDays, attractions, weather } = params;

    const prompt = this.buildPrompt(params);

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${err}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Sometimes Gemini returns markdown JSON; clean it
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        itinerary: parsed.itinerary || [],
        accommodations: parsed.accommodations || [],
        image: parsed.image || null,
        notes: parsed.notes || ""
      };
    } catch (err) {
      console.error("Gemini itinerary generation failed:", err);
      throw err;
    }
  },

  /**
   * Ask Gemini for a place image URL when TripMate has none
   * @param {string} destination
   * @returns {Promise<string|null>}
   */
  async getPlaceImage(destination) {
    const prompt = `Return ONLY a valid HTTPS URL to a high-quality, representative travel photo of ${destination}. No explanation, no markdown, just the URL. If unsure, return "null".`;

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
        })
      });

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (text.toLowerCase() === "null") return null;
      if (text.startsWith("http")) return text;
      return null;
    } catch (err) {
      console.warn("Gemini image fetch failed:", err);
      return null;
    }
  },

  buildPrompt(params) {
    const { destination, lat, lon, startDate, endDate, budget, travelStyle, interests, socialPreference, travelPace, numDays, attractions, weather } = params;

    const attractionList = (attractions || []).map(a =>
      `- ${a.name}${a.category ? ` (${Array.isArray(a.category) ? a.category.join(", ") : a.category})` : ""}: ${a.description || "No description"}`
    ).join("\n") || "No specific attractions provided.";

    const hotelList = (params.hotels || []).map(h =>
      `- ${h.name} (${h.type}, ~₹${h.costPerNight}/night)`
    ).join("\n") || "No specific hotels found.";

    const weatherText = weather?.current
      ? `Current weather: ${weather.current.temperature_2m || weather.current.temp || "N/A"}°C, ${weather.current.weather_code || ""}`
      : "Weather data not available.";

    return `You are an expert travel planner. Create a detailed ${numDays}-day itinerary for ${destination}.

Trip Details:
- Dates: ${startDate} to ${endDate}
- Total Budget: ₹${budget} INR (approx)
- Travel Style: ${Array.isArray(travelStyle) ? travelStyle.join(", ") : travelStyle}
- Interests: ${Array.isArray(interests) ? interests.join(", ") : interests}
- Social Preference: ${socialPreference}
- Travel Pace: ${travelPace}

Attractions available in ${destination}:
${attractionList}

Real hotels/lodging found near ${destination}:
${hotelList}

${weatherText}

Instructions:
1. Create a day-by-day itinerary. Each day should have a title and 3-5 activities.
2. Each activity must include: name, time (e.g. "9:00 AM"), icon (a single emoji), cost in INR (number), type (e.g. Nature, Culture, Food, Adventure), and a short description.
3. Distribute activities logically across days and times (Morning, Afternoon, Evening).
4. Respect the total budget — keep activity costs reasonable for the destination.
5. Suggest 2-3 accommodations with: name, cost per night in INR, type (Budget/Mid-Range/Comfort/Luxury), and a one-line description.
6. Return ONLY valid JSON in this exact structure:

{
  "itinerary": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "activities": [
        { "name": "...", "time": "...", "icon": "...", "cost": 0, "type": "...", "description": "..." }
      ]
    }
  ],
  "accommodations": [
    { "name": "...", "costPerNight": 0, "type": "...", "description": "..." }
  ],
  "notes": "string"
}

Do not include markdown formatting or explanations outside the JSON.`;
  }
};
