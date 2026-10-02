/**
 * Offscreen Audio Recorder - Bilingual Voice Assistant
 * Manifest V3 offscreen audio capture
 */

let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.action === 'startRecording') {
    startCapture(sendResponse);
    return true;
  }

  if (message.action === 'stopRecording') {
    stopCapture(sendResponse);
    return true;
  }
});

async function startCapture(sendResponse) {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.start();
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

function stopCapture(sendResponse) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.onstop = () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      sendResponse({ success: true });
    };
    mediaRecorder.stop();
  } else {
    sendResponse({ success: true });
  }
}
