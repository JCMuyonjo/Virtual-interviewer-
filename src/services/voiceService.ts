import { InterviewerPersona } from '../types';

let currentAudioElement: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let ttsQuotaExhausted = false;

// Pre-load voices if speech synthesis is supported
let availableVoices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    availableVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const voiceService = {
  // Checks if TTS quota has been exhausted during this session
  isQuotaExhausted() {
    return ttsQuotaExhausted;
  },

  // Speaks text aloud using Gemini 3.8 TTS or Web Speech API fallback
  async speakText(
    text: string,
    persona: InterviewerPersona,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: any) => void
  ): Promise<{ stop: () => void }> {
    // Stop any existing speech
    this.stopAllAudio();

    let stopped = false;
    const stopHandler = () => {
      stopped = true;
      if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
        currentAudioElement = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      activeUtterance = null;
    };

    // If quota was previously exhausted on the server, jump directly to Web Speech API
    if (ttsQuotaExhausted) {
      this.speakWithWebSpeech(text, persona, onStart, onEnd, onError);
      return { stop: stopHandler };
    }

    try {
      // Attempt server-side Gemini 3.8 Flash Lite TTS
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: persona.voice,
          style: persona.style,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // If server flagged quota exceeded or fallback
        if (data.fallback) {
          if (data.quotaExceeded) {
            ttsQuotaExhausted = true;
          }
          if (!stopped) {
            this.speakWithWebSpeech(text, persona, onStart, onEnd, onError);
          }
          return { stop: stopHandler };
        }

        if (data.audio && !stopped) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          currentAudioElement = audio;

          audio.onplay = () => {
            if (onStart) onStart();
          };

          audio.onended = () => {
            currentAudioElement = null;
            if (!stopped && onEnd) onEnd();
          };

          audio.onerror = () => {
            if (!stopped) {
              this.speakWithWebSpeech(text, persona, onStart, onEnd, onError);
            }
          };

          await audio.play();
          return { stop: stopHandler };
        }
      } else {
        // If 429 or 500, mark quota exhausted to prevent repeated network requests
        ttsQuotaExhausted = true;
      }
    } catch {
      ttsQuotaExhausted = true;
    }

    if (!stopped) {
      this.speakWithWebSpeech(text, persona, onStart, onEnd, onError);
    }

    return { stop: stopHandler };
  },

  speakWithWebSpeech(
    text: string,
    persona: InterviewerPersona,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (error: any) => void
  ) {
    if (!('speechSynthesis' in window)) {
      if (onError) onError(new Error('Speech synthesis is not supported in this browser.'));
      return;
    }

    window.speechSynthesis.cancel();

    // Clean text of markdown artifacts
    const cleanText = text.replace(/[*_#`~"]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance;

    // Pick matching voice if available
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const isFemale = persona.voice === 'Kore' || persona.voice === 'Zephyr';

    const preferredVoice =
      voices.find((v) => {
        const name = v.name.toLowerCase();
        const isEnglish = v.lang.startsWith('en');
        if (!isEnglish) return false;
        return isFemale
          ? name.includes('female') ||
              name.includes('samantha') ||
              name.includes('victoria') ||
              name.includes('zira') ||
              name.includes('karen') ||
              name.includes('google us english')
          : name.includes('male') ||
              name.includes('david') ||
              name.includes('daniel') ||
              name.includes('george') ||
              name.includes('alex');
      }) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.96; // Natural interviewer pace
    utterance.pitch = isFemale ? 1.05 : 0.95;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      // Ignore interruption cancels
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        if (onError) onError(e);
      }
    };

    window.speechSynthesis.speak(utterance);
  },

  stopAllAudio() {
    if (currentAudioElement) {
      try {
        currentAudioElement.pause();
        currentAudioElement.currentTime = 0;
      } catch {
        // ignore
      }
      currentAudioElement = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    activeUtterance = null;
  },

  // Check speech recognition capability
  isSpeechRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  },

  // Audio level meter using Web Audio API
  createAudioMeter(stream: MediaStream, onLevel: (level: number) => void): { stop: () => void } {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animId: number;

      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 128); // 0.0 to 1.0
        onLevel(normalized);
        animId = requestAnimationFrame(checkLevel);
      };

      checkLevel();

      return {
        stop: () => {
          cancelAnimationFrame(animId);
          source.disconnect();
          analyser.disconnect();
          audioContext.close().catch(() => {});
        },
      };
    } catch {
      return { stop: () => {} };
    }
  },
};
