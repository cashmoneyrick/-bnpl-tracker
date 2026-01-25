export interface GeminiExtractedOrder {
  platform: string;
  store?: string;
  total: number;
  payments: Array<{
    amount: number;
    date: string;
    status?: 'paid' | 'pending';
  }>;
}

export async function extractOrderFromImage(
  imageFile: File,
  apiKey: string
): Promise<GeminiExtractedOrder> {
  // 1. Convert image to base64
  const base64 = await fileToBase64(imageFile);

  // 2. Build request with extraction prompt
  const prompt = `Extract BNPL order details from this screenshot. Return ONLY valid JSON with no markdown formatting:
{
  "platform": "afterpay|klarna|sezzle|zip|four|affirm",
  "store": "Store Name",
  "total": 123.45,
  "payments": [
    {"amount": 30.86, "date": "2025-01-24", "status": "paid|pending"}
  ]
}
Identify the platform from branding/colors. Convert dates to YYYY-MM-DD format. If a payment shows as already paid/completed, set status to "paid".`;

  // 3. Call Gemini API (using gemini-2.0-flash model)
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType: imageFile.type, data: base64 } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini API request failed');
  }

  // 4. Parse response
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // 5. Extract JSON (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as GeminiExtractedOrder;
  } catch {
    throw new Error('Failed to parse extracted data. Please try a clearer screenshot.');
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/...;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
