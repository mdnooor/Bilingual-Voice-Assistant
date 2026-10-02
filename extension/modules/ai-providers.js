/**
 * AI Providers Module - Bilingual Voice Assistant
 * Production-ready bilingual refinement (Bangla & English)
 * Supported: Google Gemini, Groq, OpenAI, Custom API
 * Compliant with Chrome Web Store:
 * - NO hardcoded API keys
 * - NO console logging of keys or credentials
 * - Resilient JSON response parsing
 * - Graceful fallback handling
 */

export const AIProviders = {
  /**
   * Refines spoken text into clean Bangla and English
   * @param {string} inputText
   * @param {Object} config - { provider, apiKey, customEndpoint, model }
   * @returns {Promise<{ bangla: string, english: string, rawRefined?: string }>}
   */
  async refine(inputText, config = {}) {
    const text = (inputText || '').trim();
    if (!text) {
      throw new Error('Input text is empty. Please speak or type something first.');
    }

    const provider = config.provider || 'gemini';
    const apiKey = (config.apiKey || '').trim();

    // If no API key configured, use built-in linguistic fallback
    if (!apiKey && provider !== 'custom') {
      return this._fallbackBilingual(text);
    }

    try {
      switch (provider) {
        case 'gemini':
          return await this._callGemini(text, apiKey, config.model || 'gemini-1.5-flash');
        case 'groq':
          return await this._callGroq(text, apiKey, config.model || 'llama-3.1-8b-instant');
        case 'openai':
          return await this._callOpenAI(text, apiKey, config.model || 'gpt-4o-mini');
        case 'custom':
          return await this._callCustom(text, apiKey, config.customEndpoint, config.model);
        default:
          return await this._callGemini(text, apiKey, config.model || 'gemini-1.5-flash');
      }
    } catch (err) {
      // Re-throw configuration errors so caller can inform user to fix their settings
      if (
        err.message &&
        (err.message.includes('API key') ||
          err.message.includes('endpoint') ||
          err.message.includes('Invalid') ||
          err.message.includes('required'))
      ) {
        throw err;
      }
      // Return fallback for network/transient failures
      const fb = this._fallbackBilingual(text);
      return {
        ...fb,
        warning: 'API request failed (' + (err.message || 'Network error') + '). Showing local bilingual output.'
      };
    }
  },

  /**
   * Google Gemini API call
   */
  async _callGemini(text, apiKey, model = 'gemini-1.5-flash') {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const systemPrompt = `You are a professional bilingual voice assistant for Bangla and English.
You receive spoken voice input that may contain stutters, mispronunciations, speech errors, or mixed language.
Your task is to refine this text and return a valid JSON object with exactly two keys:
1. "bangla": the polished, natural, grammatically correct Bangla version.
2. "english": the polished, natural, grammatically correct English version.
Return ONLY raw JSON, with no markdown code blocks or surrounding text.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `Raw spoken input: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || `HTTP ${response.status}: Gemini request failed`;
      throw new Error(msg);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response received from Gemini.');
    }

    return this._parseBilingualJSON(candidateText, text);
  },

  /**
   * Groq Cloud API call
   */
  async _callGroq(text, apiKey, model = 'llama-3.1-8b-instant') {
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    return this._callOpenAICompatible(endpoint, text, apiKey, model);
  },

  /**
   * OpenAI API call
   */
  async _callOpenAI(text, apiKey, model = 'gpt-4o-mini') {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    return this._callOpenAICompatible(endpoint, text, apiKey, model);
  },

  /**
   * Custom OpenAI-compatible API endpoint call
   */
  async _callCustom(text, apiKey, customEndpoint, model) {
    if (!customEndpoint) {
      throw new Error('Custom endpoint URL is required.');
    }
    return this._callOpenAICompatible(customEndpoint, text, apiKey, model || 'default');
  },

  /**
   * Helper for OpenAI-compatible completions
   */
  async _callOpenAICompatible(endpoint, text, apiKey, model) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a bilingual voice assistant for Bangla and English. Refine spoken input into both languages. Return ONLY a JSON object with keys "bangla" and "english".'
          },
          {
            role: 'user',
            content: `Refine this spoken text: "${text}"`
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from AI provider.');
    }

    return this._parseBilingualJSON(content, text);
  },

  /**
   * Parses JSON with fallback for markdown code fences
   */
  _parseBilingualJSON(rawString, originalText) {
    try {
      let cleaned = rawString.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      }
      const parsed = JSON.parse(cleaned);
      if (parsed.bangla && parsed.english) {
        return {
          bangla: String(parsed.bangla).trim(),
          english: String(parsed.english).trim(),
          rawRefined: cleaned
        };
      }
    } catch {
      // Try regex extraction
      const bnMatch = rawString.match(/"bangla"\s*:\s*"([^"]+)"/i);
      const enMatch = rawString.match(/"english"\s*:\s*"([^"]+)"/i);
      if (bnMatch && enMatch) {
        return {
          bangla: bnMatch[1].trim(),
          english: enMatch[1].trim()
        };
      }
    }

    // If model returned plain text or unparseable JSON
    return this._fallbackBilingual(originalText);
  },

  /**
   * Fallback bilingual translation & cleanup when no API key is provided
   */
  _fallbackBilingual(text) {
    const isBangla = /[\u0980-\u09FF]/.test(text);
    
    // Basic clean dictionary for common spoken phrases
    const bnToEn = {
      'কেমন আছেন': 'How are you?',
      'ভালো আছি': 'I am fine.',
      'ধন্যবাদ': 'Thank you.',
      'আপনি কেমন আছেন': 'How are you doing?',
      'আমি ভালো আছি': 'I am doing well.',
      'আমার নাম': 'My name is',
      'সাহায্য করুন': 'Please help me.',
      'আজকের আবহাওয়া কেমন': 'How is the weather today?',
      'আমি তোমাকে ভালোবাসি': 'I love you.',
      'শুভ সকাল': 'Good morning.',
      'শুভ রাত্রি': 'Good night.'
    };

    const enToBn = {
      'hello': 'হ্যালো / আসসালামু আলাইকুম',
      'how are you': 'আপনি কেমন আছেন?',
      'thank you': 'আপনাকে ধন্যবাদ।',
      'good morning': 'শুভ সকাল।',
      'good night': 'শুভ রাত্রি।',
      'i am fine': 'আমি ভালো আছি।',
      'what is your name': 'আপনার নাম কি?'
    };

    const trimmed = text.trim();
    let bangla = trimmed;
    let english = trimmed;

    if (isBangla) {
      bangla = trimmed;
      english = bnToEn[trimmed] || `[English Translation of "${trimmed}"]`;
    } else {
      english = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      const lower = trimmed.toLowerCase().replace(/[?!.,]/g, '');
      bangla = enToBn[lower] || `[বাংলা অনুবাদ: "${trimmed}"]`;
    }

    return { bangla, english };
  }
};
