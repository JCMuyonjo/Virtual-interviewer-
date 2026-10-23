import { InterviewerPersona } from '../types';

let currentAudioElement: HTMLAudioElement | null = null;

export const voiceService = {
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
    };

    try {
      // First attempt server-side Gemini 3.8 Flash Lite TTS
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

          audio.onerror = (e) => {
            console.warn('Audio playback error, falling back to Web Speech API', e);
            if (!stopped) {
              this.speakWithWebSpeech(text, persona, onStart, onEnd, onError);
            }
          };

          await audio.play();
          return { stop: stopHandler };
        }
      }
    } catch (err) {
      console.warn('Server TTS unavailable, using browser speech synthesis:', err);
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
    const cleanText = text.replace(/[*_#`~]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Pick matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const isFemale = persona.voice === 'Kore' || persona.voice === 'Zephyr';
    const preferredVoice = voices.find(v => {
      const name = v.name.toLowerCase();
      return v.lang.startsWith('en') && (isFemale ? (name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('victoria')) : (name.includes('male') || name.includes('david') || name.includes('george')));
    }) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.95; // Slightly slower, measured interviewer pace
    utterance.pitch = isFemale ? 1.05 : 0.95;

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
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
      } catch (e) {
        // ignore
      }
      currentAudioElement = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
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
    } catch (e) {
      console.warn('AudioContext not permitted or failed to start:', e);
      return { stop: () => {} };
    }
  },
};
