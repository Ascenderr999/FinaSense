import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

let currentKeyIndex = 0;

function getAvailableGroqKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GROQ_API_KEY_1) keys.push(process.env.GROQ_API_KEY_1);
  if (process.env.GROQ_API_KEY_2) keys.push(process.env.GROQ_API_KEY_2);
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  return keys;
}

async function executeWithFailover(generateContentFn: (groq: Groq) => Promise<any>) {
  const keys = getAvailableGroqKeys();
  if (keys.length === 0) {
    throw new Error("No Groq API Keys available.");
  }

  let attempts = 0;
  while (attempts < keys.length) {
    try {
      const groq = new Groq({ apiKey: keys[currentKeyIndex % keys.length] });
      return await generateContentFn(groq);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      const isInvalidKey = error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.message?.toLowerCase().includes('api key');
      
      if (isRateLimit || isInvalidKey) {
        currentKeyIndex++;
        attempts++;
      } else {
        throw error;
      }
    }
  }
  
  throw new Error("API rate limit exceeded across all available keys.");
}

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/api/categorize', async (req, res) => {
  try {
    const { description, amount } = req.body;
    
    const keys = getAvailableGroqKeys();
    if (keys.length === 0) {
       return res.json({ category: 'Uncategorized' });
    }

    const prompt = `Categorize this transaction description into a single short category name (max 2 words) from the following extensive list: 'Groceries', 'Entertainment', 'Utilities', 'Rent', 'Salary', 'Transport', 'Dining', 'Shopping', 'Healthcare', 'Education', 'Subscriptions', 'Travel', 'Clothing', 'Electronics', 'Gifts', 'Insurance', 'Taxes', 'Investments', 'Home Improvement', 'Pets', 'Personal Care', 'Fitness', 'Freelance', 'Dividends', 'Savings', or generate a similarly concise fitting category if none fit.
    Description: "${description}"
    Amount: ${amount}
    Return ONLY the category name.`;

    const response = await executeWithFailover((groq) => groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    }));

    const category = response.choices[0]?.message?.content?.trim() || 'Uncategorized';
    res.json({ category });
  } catch (error: any) {
    if (error?.message === "API rate limit exceeded across all available keys.") {
       return res.status(429).json({ error: "API rate limit exceeded. Please try again later." });
    }
    console.warn("Categorize Error:", error.message || error);
    res.status(500).json({ error: "Failed to categorize transaction" });
  }
});

app.post('/api/insights', async (req, res) => {
  try {
    const keys = getAvailableGroqKeys();
    if (keys.length === 0) {
       return res.json({ insights: "Add your Groq API Key in the settings to get personalized AI financial insights." });
    }

    const { transactions, goals } = req.body;
    
    const formattedGoals = (goals || []).map((g: any) => {
      const isComplete = g.currentAmount >= g.targetAmount;
      return {
        title: g.title,
        type: g.type,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        status: isComplete ? "FULLY_ACHIEVED_AND_COMPLETED" : "Active In-Progress",
        percentComplete: `${((g.currentAmount / g.targetAmount) * 100).toFixed(1)}%`
      };
    });

    const stylePrompt = "You are an elite, razor-sharp financial strategist who speaks with absolute realism and direct authority. Analyze both the user's recent real-time transactions and their goals. Provide ultra-concise, direct advice focused on real spending patterns and goal milestones. Never use fictional prices or refer to completed goals as active. Keep it under 25 words total, in 1 or 2 powerful sentences.";

    const prompt = `${stylePrompt}
    
    CRITICAL DATA RULES:
    1. COMPLETED GOALS (marked FULLY_ACHIEVED_AND_COMPLETED): Never tell the user to save for them; celebrate that they are 100% completed and urge them to redirect cash flow.
    2. REAL EXPENDITURES: Reference only the real numbers, exact amounts, and categories from their provided transaction list. Never invent fake purchases, fake prices, or fake metrics.
    
    User Data:
    Goals: ${JSON.stringify(formattedGoals)}
    Transactions: ${JSON.stringify((transactions || []).slice(0, 15))}
    
    Respond directly with your feedback. Do not wrap in quotes or add preamble.`;

    const response = await executeWithFailover((groq) => groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    }));

    const insights = response.choices[0]?.message?.content?.trim() || "You're doing great! Keep tracking your expenses to get personalized insights.";
    res.json({ insights });
  } catch (error: any) {
    if (error?.message === "API rate limit exceeded across all available keys.") {
       return res.status(429).json({ error: "API rate limit exceeded. Please try again later." });
    }
    console.warn("Insights Error:", error.message || error);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

app.post('/api/parse-receipt', async (req, res) => {
  try {
    const { text, imageBase64, mimeType } = req.body;

    if (!text && !imageBase64) {
       return res.status(400).json({ error: "No text or image provided" });
    }

    let extractedText = text || '';

    if (!text && imageBase64) {
       if (!process.env.HUGGINGFACE_API_KEY) {
          return res.status(400).json({ error: "Add your Hugging Face API Key in the settings to process images." });
       }

       try {
          const attemptVision = async (modelName: string) => {
              for (let i = 0; i < 3; i++) {
                 try {
                     const hfResp = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
                        method: "POST",
                        headers: {
                           "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                           "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                           model: modelName,
                           messages: [{
                               role: "user",
                               content: [
                                   { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
                                   { type: "text", text: "Extract all text from this receipt. Do not add any conversational text. Return only the extracted text." }
                               ]
                           }],
                           max_tokens: 1000
                        })
                     });
                     
                     if (!hfResp.ok) {
                        const errText = await hfResp.text();
                        throw new Error(`HTTP ${hfResp.status}: ${errText}`);
                     }
                     
                     const data = await hfResp.json();
                     return data.choices[0]?.message?.content || "";
                 } catch (err: any) {
                     console.warn(`Model ${modelName} failed on attempt ${i + 1}. Error: ${err.message}`);
                     if (i < 2) {
                        await new Promise(r => setTimeout(r, 3000));
                        continue;
                     }
                     throw err;
                 }
              }
              throw new Error(`Failed to extract using ${modelName} after retries`);
          };

          try {
             extractedText = await attemptVision("Qwen/Qwen3-VL-8B-Instruct");
          } catch (err1) {
             console.warn("Qwen3-VL failed, trying Qwen2.5-VL...");
             extractedText = await attemptVision("Qwen/Qwen2.5-VL-72B-Instruct");
          }
       } catch (e: any) {
          console.warn("HuggingFace OCR failed:", e.message || e);
          return res.status(503).json({ error: "Hugging Face vision models are currently loading or busy. Please wait 15-30 seconds and try scanning again!" });
       }
    }

    if (!extractedText.trim()) {
       return res.status(400).json({ error: "Could not extract any text from the incoming data." });
    }
    
    const keys = getAvailableGroqKeys();
    if (keys.length === 0) {
       return res.status(400).json({ error: "Add your Groq API Key to extract JSON details." });
    }

    const prompt = `You are the fully automated parsing engine of "FinaSense". Your core mission is to act as an advanced multimodal extraction pipeline. You will receive the unstructured text of an Azerbaijani bank transaction SMS or a receipt OCR text. 
    
Your task is to analyze the context, intelligently extract the exact financial figures, determine the specific brand/merchant, and dynamically classify the business into our predefined application categories.

You MUST return ONLY a clean JSON object. No markdown wrappers like \`\`\`json, no preface, no trailing text.

Output Schema:
{
  "amount": number,
  "type": "income" | "expense",
  "category": string,
  "description": string
}

Strict Context Extraction Logic:
1. MERCHANT IDENTIFICATION:
   Scan the content to find the merchant's name. You must process local Azerbaijani businesses intelligently:
   - Identify grocery/supermarket chains (e.g., Bravo, Bazarstore, Araz, OBA, Al Market, Spar, Neptun, Grandmart, Bolmart) and map them to "Groceries".
   - Identify dining, cafes, fast food, and leisure spots (e.g., KFC, McDonald's, Shaurma N1, Entree, Coffee Moffie, Mado, Starbucks, Cinema Plus, Park Cinema) and map them to "Entertainment".
   - Identify transit, taxi services, and gas stations (e.g., Bolt, Uber, Yango, 189 Taxi, Socar, Azpetrol, Lukoil) and map them to "Transport".
   - Identify pharmacies and medical clinics (e.g., Zeytun Aptek, Kanon, Avromed, Alo Aptek, Oksigen) and map them to "Healthcare".
   - Identify telecommunication and utilities (e.g., Azercell, Bakcell, Nar, Azerisig, Azersu, Azerigaz) and map them to "Utilities".
   - Identify learning systems and bookstores (e.g., Ali & Nino, Libreff, Udemy, Coursera) and map them to "Education".
   - For all other merchants, map them to an appropriate specific category (e.g., "Shopping", "Personal Care", "Subscriptions", "Fitness"). Use your best judgment based on the merchant name.

2. FINANCIAL DATA PARSING:
   - "amount": Isolate the actual transactional volume. For receipts, locate the grand total (look for "CƏM", "YEKUN", "NƏĞDSİZ", "TOPLAM", "ÖDƏNİŞ", or "TOTAL"). Extract it strictly as a pure float. Note: The comma may be used as a decimal separator (e.g. 15,50), convert it to a float (e.g. 15.50).
   - "type": Detect "expense" for spending patterns ("XƏRC", "ODENIS", "DEBIT", "TRANSFER TO") and "income" for incoming funds ("MEDAXIL", "MAAS", "KREDIT", "TRANSFER FROM", "MƏDAXİL"). If analyzing a retail store receipt, it is an "expense".
   - "description": Format this value dynamically as "[Cleaned Merchant Name] - AI Scanned". Ensure the merchant name is readable and properly capitalized.

Here is the input text to parse:
"""
${extractedText}
"""`;

    const response = await executeWithFailover((groq) => groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: prompt }
      ],
    }));

    const parsedText = response.choices[0]?.message?.content?.trim() || "{}";
    const data = JSON.parse(parsedText);
    res.json(data);
  } catch (error: any) {
    if (error?.message === "API rate limit exceeded across all available keys.") {
       return res.status(429).json({ error: "API rate limit exceeded on Groq parsing. Please try again later." });
    }
    console.warn("Parse Receipt Error:", error.message || error);
    res.status(500).json({ error: "Failed to parse receipt/SMS" });
  }
});

app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

export default app;
