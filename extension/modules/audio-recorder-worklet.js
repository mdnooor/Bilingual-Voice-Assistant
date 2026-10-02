/**
 * Audio Recorder Worklet - Bilingual Voice Assistant
 * Runs in AudioWorkletGlobalScope for low-latency PCM processing
 */

class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = true;
    this.port.onmessage = (event) => {
      if (event.data?.action === 'stop') {
        this.isRecording = false;
      }
    };
  }

  process(inputs) {
    if (!this.isRecording) return false;
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      this.port.postMessage(channelData);
    }
    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
