/**
 * Clipboard Module - Bilingual Voice Assistant
 * Safe clipboard copying with visual feedback support
 */

export const Clipboard = {
  /**
   * Copies text to clipboard
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async copy(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Try modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall back to execCommand
      }
    }

    // Fallback: temporary textarea
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.contain = 'strict';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.fontSize = '12pt';
      document.body.appendChild(el);
      el.select();
      el.selectionStart = 0;
      el.selectionEnd = text.length;

      const success = document.execCommand('copy');
      document.body.removeChild(el);
      return success;
    } catch {
      return false;
    }
  }
};
