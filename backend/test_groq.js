import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

async function test() {
    const groqToken = process.env.GROQ_API_KEY;
    console.log("Token exists:", !!groqToken);
    const systemPrompt = `You are a financial assistant for an Uzbek user. 
    Analyze the following transcribed text from a voice message or raw text, and extract the transaction details.
    Respond ONLY with a valid raw JSON object. Do not wrap in markdown \`\`\`json blocks.
    
    Required JSON structure:
    {
      "amount": (Number, required. Extract the amount. Convert text numbers like "ellik ming" to 50000. If missing or unclear, return null),
      "type": (String, "income" or "expense". Default is expense unless words like maosh, foyda, biznes imply income),
      "category": (String, required. Must be EXACTLY ONE of the following:
         For expense: [Oziq-ovqat, Transport, Boshqa]
         For income: [Maosh, Biznes, Boshqa]
         If it doesn't fit well, use 'Boshqa'
      ),
      "description": (String. The rest of the words. e.g. "bozordan go'sht oldim")
    }`;

    try {
        const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: "50000 ovqat" }
                ],
                temperature: 0.1
            },
            {
                headers: {
                    "Authorization": `Bearer ${groqToken}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("Result:", res.data.choices[0].message.content);
    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
}

test();
