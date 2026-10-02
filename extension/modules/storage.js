/**
 * Storage Module - Bilingual Voice Assistant
 * Safe wrapper for chrome.storage.local with browser localStorage fallback
 */

const DEFAULT_SETTINGS = {
  selectedProvider: 'gemini',
  sttLanguage: 'auto',
  customEndpoint: '',
  selectedModel: 'gemini-1.5-flash',
  autoCopy: false,
  dockPinned: false,
  theme: 'dark',
  apiKeys: {
    gemini: '',
    groq: '',
    openai: '',
    custom: ''
  }
};

export const Storage = {
  /**
   * Retrieves keys from chrome.storage.local
   * @param {string|Array<string>|null} keys
   * @returns {Promise<Object>}
   */
  async get(keys = null) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              resolve(this.getFallback(keys));
            } else {
              resolve({ ...DEFAULT_SETTINGS, ...result });
            }
          });
        } else {
          resolve(this.getFallback(keys));
        }
      } catch {
        resolve(this.getFallback(keys));
      }
    });
  },

  /**
   * Sets items in chrome.storage.local
   * @param {Object} items
   * @returns {Promise<void>}
   */
  async set(items) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(items, () => {
            resolve();
          });
        } else {
          this.setFallback(items);
          resolve();
        }
      } catch {
        this.setFallback(items);
        resolve();
      }
    });
  },

  _memCache: {},

  /**
   * Local fallback when not running in Chrome extension context
   */
  getFallback(keys) {
    try {
      const hasStorage = typeof localStorage !== 'undefined';
      const data = {};
      if (!keys) {
        for (const key of Object.keys(DEFAULT_SETTINGS)) {
          let val = hasStorage ? localStorage.getItem(`va_${key}`) : null;
          if (val === null && this._memCache[key] !== undefined) {
            val = JSON.stringify(this._memCache[key]);
          }
          data[key] = val ? JSON.parse(val) : DEFAULT_SETTINGS[key];
        }
        return data;
      }
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        let val = hasStorage ? localStorage.getItem(`va_${k}`) : null;
        if (val === null && this._memCache[k] !== undefined) {
          val = JSON.stringify(this._memCache[k]);
        }
        data[k] = val ? JSON.parse(val) : DEFAULT_SETTINGS[k];
      }
      return data;
    } catch {
      return { ...DEFAULT_SETTINGS, ...this._memCache };
    }
  },

  setFallback(items) {
    try {
      const hasStorage = typeof localStorage !== 'undefined';
      for (const [k, v] of Object.entries(items)) {
        this._memCache[k] = v;
        if (hasStorage) {
          localStorage.setItem(`va_${k}`, JSON.stringify(v));
        }
      }
    } catch {
      // Storage quota or disabled in private mode
    }
  }
};
