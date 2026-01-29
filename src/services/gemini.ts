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
  const prompt = `Extract BNPL order details from this screenshot. Return ONLY valid JSON with no additional text:

{
  "platform": "afterpay|klarna|sezzle|zip|four|affirm",
  "store": "Store Name",
  "total": 123.45,
  "payments": [
    {"amount": 30.86, "date": "2025-01-24", "status": "paid|pending"}
  ]
}

Rules:
1. PLATFORM: Identify from app branding, colors, or logos. Sezzle is purple, Afterpay is mint green, Klarna is pink, Zip is blue, Affirm is blue, Four is orange.
2. STORE: Look for merchant name. If not visible, use "Unknown".
3. TOTAL: Look for order total. If not visible, calculate by summing all payment amounts.
4. PAYMENTS: Extract each payment with amount, date, and status.
   - Convert all dates to YYYY-MM-DD format
   - Status should be "paid" if marked paid/complete, otherwise "pending"
   - Include ALL payments shown (typically 4 for most BNPL apps)
5. AMOUNTS: Use numbers only, no currency symbols (e.g., 16.92 not $16.92)

If you cannot identify a required field, make your best guess based on context rather than returning null.`;

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
    const parsed = JSON.parse(jsonStr);
    return validateExtractedOrder(parsed);
  } catch (err) {
    if (err instanceof Error) {
      // Re-throw validation errors with helpful messages
      if (err.message.startsWith("Couldn't") || err.message.startsWith('Could not')) {
        throw err;
      }
    }
    throw new Error('Failed to analyze screenshot. Please try again or use Paste JSON instead.');
  }
}

function validateExtractedOrder(data: unknown): GeminiExtractedOrder {
  if (!data || typeof data !== 'object') {
    throw new Error('Could not parse response from AI');
  }

  const obj = data as Record<string, unknown>;

  // Validate platform (required - can't guess)
  if (typeof obj.platform !== 'string' || !obj.platform) {
    throw new Error("Couldn't detect BNPL platform. Please select it manually.");
  }

  // Default store to "Unknown" if missing
  const store = typeof obj.store === 'string' && obj.store ? obj.store : 'Unknown';

  // Validate payments array (required)
  if (!Array.isArray(obj.payments) || obj.payments.length === 0) {
    throw new Error("Couldn't find payment schedule in screenshot. Make sure the payment dates are visible.");
  }

  // Validate each payment
  const payments: Array<{ amount: number; date: string; status: 'paid' | 'pending' }> = [];
  for (let i = 0; i < obj.payments.length; i++) {
    const p = obj.payments[i] as Record<string, unknown> | null | undefined;
    if (!p || typeof p.amount !== 'number' || isNaN(p.amount) || p.amount <= 0) {
      throw new Error(`Could not extract amount for payment #${i + 1}`);
    }
    if (typeof p.date !== 'string' || !p.date) {
      throw new Error(`Could not extract date for payment #${i + 1}`);
    }

    // Normalize date to YYYY-MM-DD format
    let normalizedDate: string;
    try {
      normalizedDate = normalizeDate(p.date);
    } catch {
      throw new Error(`Could not parse date "${p.date}" for payment #${i + 1}`);
    }

    payments.push({
      amount: p.amount,
      date: normalizedDate,
      status: p.status === 'paid' ? 'paid' : 'pending',
    });
  }

  // Calculate total from payments if missing
  let total = typeof obj.total === 'number' && !isNaN(obj.total) ? obj.total : 0;
  if (!total || total <= 0) {
    total = payments.reduce((sum, p) => sum + p.amount, 0);
  }
  // Round to 2 decimal places to avoid floating point issues
  total = Math.round(total * 100) / 100;

  if (total <= 0) {
    throw new Error('Could not extract total amount from screenshot');
  }

  return { platform: obj.platform, store, total, payments };
}

/**
 * Normalize date to YYYY-MM-DD format
 * Handles various formats from Gemini: "Feb 10, 2026", "2/10/2026", "2026-02-10", etc.
 * Avoids timezone issues by parsing explicitly without using Date constructor for text formats.
 */
function normalizeDate(value: string): string {
  const str = value.trim();

  // Already YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YYYY format
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // YYYY/MM/DD format
  const slashMatch2 = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch2) {
    const [, y, m, d] = slashMatch2;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Month name patterns - parse explicitly to avoid timezone issues
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const currentYear = new Date().getFullYear();

  // "Month Day, Year" format (e.g., "Feb 10, 2026", "February 10, 2026")
  const monthDayYear = str.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})$/);
  if (monthDayYear) {
    const [, monthStr, day, year] = monthDayYear;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // "Month Day" format without year (e.g., "Feb 10") - assume current/next year
  const monthDay = str.match(/^([a-zA-Z]+)\s+(\d{1,2})$/);
  if (monthDay) {
    const [, monthStr, day] = monthDay;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      // If the date would be more than 30 days in the past, use next year
      const testDate = new Date(currentYear, monthIndex, parseInt(day));
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const year = testDate < thirtyDaysAgo ? currentYear + 1 : currentYear;
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // "Day Month Year" format (e.g., "10 Feb 2026")
  const dayMonthYear = str.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/);
  if (dayMonthYear) {
    const [, day, monthStr, year] = dayMonthYear;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // "Day Month" format without year (e.g., "10 Feb")
  const dayMonth = str.match(/^(\d{1,2})\s+([a-zA-Z]+)$/);
  if (dayMonth) {
    const [, day, monthStr] = dayMonth;
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
    if (monthIndex !== -1) {
      const testDate = new Date(currentYear, monthIndex, parseInt(day));
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const year = testDate < thirtyDaysAgo ? currentYear + 1 : currentYear;
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  throw new Error(`Invalid date: ${str}`);
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
