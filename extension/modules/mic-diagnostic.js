/**
 * Mic Diagnostic Module - Bilingual Voice Assistant
 * Validates microphone permissions, device availability, and audio volume
 */

export const MicDiagnostic = {
  /**
   * Runs diagnostic check on microphone
   * @returns {Promise<{ ok: boolean, error?: string, devices?: number, level?: number }>}
   */
  async runDiagnostic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        ok: false,
        error: 'navigator.mediaDevices.getUserMedia is not supported.'
      };
    }

    try {
      // 1. Check audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');
      if (audioInputs.length === 0) {
        return {
          ok: false,
          error: 'No audio input devices detected.',
          devices: 0
        };
      }

      // 2. Request test audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Audio level sample using AudioContext
      let maxLevel = 0;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          maxLevel = sum / dataArray.length;
          await ctx.close();
        }
      } catch {
        // AudioContext level check failed, stream itself still succeeded
      }

      // Clean up track
      stream.getTracks().forEach((track) => track.stop());

      return {
        ok: true,
        devices: audioInputs.length,
        level: Math.round(maxLevel)
      };
    } catch (err) {
      return {
        ok: false,
        error: err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : err.message || 'Microphone capture failed.',
        devices: 0
      };
    }
  }
};
