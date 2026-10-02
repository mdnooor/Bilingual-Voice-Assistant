/**
 * Normalizer Module - Bilingual Voice Assistant
 * Cleans transcripts, trims whitespace, standardizes punctuation for Bangla & English
 */

export const Normalizer = {
  /**
   * Normalizes raw spoken transcript
   * @param {string} text
   * @returns {string}
   */
  clean(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
      .trim();

    // Capitalize first English character if applicable
    if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  },

  /**
   * Detects whether text is primarily Bangla or English
   * @param {string} text
   * @returns {'bn'|'en'|'mixed'}
   */
  detectLanguage(text) {
    if (!text) return 'en';
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    if (banglaChars > 0 && englishChars === 0) return 'bn';
    if (englishChars > 0 && banglaChars === 0) return 'en';
    if (banglaChars > englishChars) return 'bn';
    return 'en';
  }
};
