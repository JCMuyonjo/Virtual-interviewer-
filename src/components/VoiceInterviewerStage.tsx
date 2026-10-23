import React, { useState, useEffect, useRef } from 'react';
import { TargetJob, QuestionItem, SessionAnswer, InterviewerPersona, AnswerFeedback } from '../types';
import { voiceService } from '../services/voiceService';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  Clock,
  Layers,
  Wand2,
  ChevronRight,
} from 'lucide-react';

interface VoiceInterviewerStageProps {
  activeTarget: TargetJob | null;
  currentQuestion: QuestionItem | null;
  onNextQuestion: () => void;
  onSkipQuestion: () => void;
  onSaveAnswer: (answer: string, rating: number, secs: number, feedback?: AnswerFeedback, audioBlobUrl?: string) => void;
  onAddCustomQuestion: (question: string) => void;
  selectedPersona: InterviewerPersona;
  autoSpeak: boolean;
  lastSession?: SessionAnswer;
  onGenerateAIQuestions?: () => void;
  isGeneratingQuestions?: boolean;
}

export const VoiceInterviewerStage: React.FC<VoiceInterviewerStageProps> = ({
  activeTarget,
  currentQuestion,
  onNextQuestion,
  onSkipQuestion,
  onSaveAnswer,
  onAddCustomQuestion,
  selectedPersona,
  autoSpeak,
  lastSession,
  onGenerateAIQuestions,
  isGeneratingQuestions,
}) => {
  // Timing & state
  const [seconds, setSeconds] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [mode, setMode] = useState<'room' | 'classic'>('room');
  const [statusMessage, setStatusMessage] = useState('');

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioMeterRef = useRef<{ stop: () => void } | null>(null);
  const speechStopRef = useRef<{ stop: () => void } | null>(null);

  // Timer logic
  useEffect(() => {
    if (isAnswering) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswering]);

  // Reset when question changes
  useEffect(() => {
    setSeconds(0);
    setIsAnswering(false);
    setIsListening(false);
    setRating(0);
    setFeedback(null);
    setAudioBlobUrl(null);
    setStatusMessage('');

    // Pre-populate with previous answer if practiced before
    if (lastSession) {
      setTranscript(lastSession.answer);
      if (lastSession.feedback) setFeedback(lastSession.feedback);
      if (lastSession.rating) setRating(lastSession.rating);
    } else {
      setTranscript('');
    }

    // Auto-speak if enabled
    if (autoSpeak && currentQuestion) {
      handleSpeakQuestion(currentQuestion.q);
    }

    return () => {
      stopAllVoiceActivity();
    };
  }, [currentQuestion?.q, activeTarget?.id]);

  // Format seconds to mm:ss
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Stop everything safely
  const stopAllVoiceActivity = () => {
    if (speechStopRef.current) {
      speechStopRef.current.stop();
      speechStopRef.current = null;
    }
    voiceService.stopAllAudio();
    setIsInterviewerSpeaking(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }

    setIsListening(false);
  };

  // Speak Question Aloud
  const handleSpeakQuestion = async (textToSpeak?: string) => {
    const text = textToSpeak || currentQuestion?.q;
    if (!text) return;

    stopAllVoiceActivity();
    setIsInterviewerSpeaking(true);

    speechStopRef.current = await voiceService.speakText(
      text,
      selectedPersona,
      () => setIsInterviewerSpeaking(true),
      () => {
        setIsInterviewerSpeaking(false);
        // Automatically prompt candidate to answer if not already recording
        if (!isAnswering && !transcript) {
          setStatusMessage('Your turn! Click "Start Speaking" or begin typing.');
        }
      },
      () => setIsInterviewerSpeaking(false)
    );
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (cameraActive) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getVideoTracks().forEach((track) => track.stop());
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.warn('Camera access denied or unavailable:', err);
        alert('Could not access camera. Please allow camera permissions in your browser.');
      }
    }
  };

  // Start Mic & Speech-to-Text
  const handleStartSpeaking = async () => {
    stopAllVoiceActivity();
    setIsAnswering(true);
    setIsListening(true);
    setStatusMessage('Listening to your response...');

    try {
      // 1. Microphone stream for audio recording & visualizer
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start live audio volume meter
      audioMeterRef.current = voiceService.createAudioMeter(stream, (level) => {
        setMicLevel(level);
      });

      // Start MediaRecorder
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);

      // 2. Web Speech Recognition for live text transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let accumulatedText = transcript ? transcript + ' ' : '';

        recognition.onresult = (event: any) => {
          let currentSessionText = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentSessionText += event.results[i][0].transcript;
          }
          setTranscript((accumulatedText + currentSessionText).trim());
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
          // Keep active while isListening is true
          if (isListening && recognitionRef.current) {
            try {
              recognition.start();
            } catch (e) {
              // ignore
            }
          }
        };

        recognition.start();
      }
    } catch (err) {
      console.warn('Microphone access denied:', err);
      setStatusMessage('Microphone access blocked. You can type your answer below.');
      setIsListening(false);
    }
  };

  // Finish Speaking Answer
  const handleFinishSpeaking = () => {
    setIsListening(false);
    setIsAnswering(false);
    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setMicLevel(0);
    setStatusMessage('Answer recorded. Review notes and get AI feedback below.');
  };

  // Get AI Feedback
  const handleAnalyzeAnswer = async () => {
    if (!transcript.trim() || !currentQuestion || !activeTarget) {
      setStatusMessage('Please speak or write your answer first.');
      return;
    }

    setIsAnalyzing(true);
    setStatusMessage('Analyzing your response against the target role...');

    try {
      const res = await fetch('/api/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.q,
          answer: transcript.trim(),
          role: activeTarget.role,
          company: activeTarget.company,
          skills: activeTarget.skills,
          category: currentQuestion.cat,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback(data);
        if (data.rating) setRating(data.rating);
        setStatusMessage('AI assessment ready! See breakdown and tips below.');

        // Optionally speak verbal reaction if available
        if (data.verbalReaction) {
          voiceService.speakText(data.verbalReaction, selectedPersona);
        }
      } else {
        throw new Error('Static deployment');
      }
    } catch (e) {
      // Client-side fallback for static GitHub Pages deployment
      const words = transcript.trim().split(/\s+/).length;
      const hasNumbers = /\d+/.test(transcript);
      const hasAction = /(created|built|led|designed|implemented|spearheaded|improved|resolved|reduced|shipped|managed)/i.test(transcript);

      let calcRating = 3;
      if (words > 60 && hasNumbers && hasAction) calcRating = 5;
      else if (words > 35 && (hasNumbers || hasAction)) calcRating = 4;
      else if (words < 20) calcRating = 2;

      const localFeedback: AnswerFeedback = {
        rating: calcRating,
        summary: `Strong response for ${activeTarget.role} at ${activeTarget.company}. ${hasNumbers ? 'Great job including quantifiable metrics.' : 'Adding concrete metrics will make this even stronger.'}`,
        starBreakdown: {
          situation: 'Clear context on the challenge and scenario.',
          task: 'Identified your personal responsibility.',
          action: hasAction ? 'Described active steps and execution.' : 'Detail the specific tools and methods you used.',
          result: hasNumbers ? 'Included tangible outcomes.' : 'Quantify the outcome (% improved or time saved).',
        },
        strengths: [
          hasAction ? 'Proactive, action-oriented delivery' : 'Direct and conversational delivery',
          words >= 35 ? 'Solid narrative structure' : 'Focused and concise points',
        ],
        improvements: [
          !hasNumbers ? 'Add measurable metrics (e.g., % conversion, hours saved)' : 'Clarify cross-functional alignment',
          'Highlight your personal contribution versus overall team effort',
        ],
        followUpQuestion: 'What was the most challenging trade-off you had to make in that scenario?',
        verbalReaction: 'Thank you for sharing that experience. That gives me good perspective on how you approach problems.',
      };

      setFeedback(localFeedback);
      setRating(calcRating);
      setStatusMessage('Feedback generated! See breakdown and tips below.');
      if (localFeedback.verbalReaction) {
        voiceService.speakText(localFeedback.verbalReaction, selectedPersona);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Save
  const handleSave = () => {
    if (!transcript.trim()) {
      setStatusMessage('Please write or record an answer before saving.');
      return;
    }
    if (!rating) {
      setStatusMessage('Select a self-rating (1–5) to track your progress.');
      return;
    }

    onSaveAnswer(transcript.trim(), rating, seconds, feedback || undefined, audioBlobUrl || undefined);
    setStatusMessage('Saved! Moving to next question...');
  };

  // Custom question add
  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onAddCustomQuestion(customInput.trim());
    setCustomInput('');
  };

  if (!activeTarget) {
    return (
      <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-8 text-center max-w-xl mx-auto shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-[#101828] dark:text-[#EEF2FA] mb-2">
          Select or add an application to start
        </h2>
        <p className="text-sm text-[#5B6577] dark:text-[#99A4B8] mb-6">
          Add the job title and target company on the left. The AI voice interviewer will tailor every question, drill down on required skills, and coach your spoken delivery.
        </p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-8 text-center shadow-sm">
        <p className="text-sm text-[#5B6577] dark:text-[#99A4B8]">Loading questions for {activeTarget.role}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. STAGE / VOICE INTERVIEWER HERO CARD */}
      <div className="bg-[#12203A] dark:bg-[#1B2B4B] text-[#F2F5FB] rounded-2xl p-5 md:p-6 shadow-md border border-slate-700/60 transition-all">
        {/* Top Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-[#FFB400] border border-amber-400/30">
              {currentQuestion.cat}
            </span>
            <span className="text-xs text-slate-300">
              {activeTarget.role} {activeTarget.company ? `at ${activeTarget.company}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900/60 rounded-lg p-0.5 border border-slate-700/60 text-xs">
              <button
                onClick={() => setMode('room')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  mode === 'room' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Voice Room
              </button>
              <button
                onClick={() => setMode('classic')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  mode === 'classic' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Classic
              </button>
            </div>

            <button
              onClick={onSkipQuestion}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-600/60 text-slate-300 hover:bg-slate-800/80 hover:text-white transition"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Question Header & Spoken Controls */}
        <div className="my-4">
          <h2 className="text-xl md:text-2xl font-bold leading-snug tracking-tight max-w-3xl font-heading">
            {currentQuestion.q}
          </h2>

          {currentQuestion.rationale && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Interviewer focus: {currentQuestion.rationale}</span>
            </p>
          )}
        </div>

        {/* VOICE ROOM MODE: Dual Video / Audio Tiles */}
        {mode === 'room' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            {/* Left Tile: AI Interviewer */}
            <div className="relative rounded-xl bg-slate-900/90 border border-slate-700/80 p-4 flex flex-col justify-between min-h-[220px] overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${selectedPersona.avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-xs`}
                  >
                    {selectedPersona.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {selectedPersona.name}
                      <span className="text-[10px] text-slate-400 font-normal">({selectedPersona.title})</span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isInterviewerSpeaking ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{isInterviewerSpeaking ? 'Speaking...' : 'Listening'}</span>
                </div>
              </div>

              {/* Animated Speaking Waveform */}
              <div className="my-6 flex flex-col items-center justify-center">
                <div
                  className={`relative w-20 h-20 rounded-full bg-gradient-to-tr ${selectedPersona.avatarColor} p-1 flex items-center justify-center shadow-lg transition-transform ${
                    isInterviewerSpeaking ? 'scale-105 ring-4 ring-amber-400/40' : ''
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-slate-950/80 flex items-center justify-center text-white text-xl font-bold">
                    {selectedPersona.name.charAt(0)}
                  </div>

                  {isInterviewerSpeaking && (
                    <span className="absolute -inset-2 rounded-full border border-amber-400/60 animate-ping opacity-40 pointer-events-none" />
                  )}
                </div>

                {/* Animated sound equalizer bars */}
                <div className="flex items-center gap-1.5 h-7 mt-3">
                  {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isInterviewerSpeaking ? 'bg-amber-400 soundwave-bar' : 'bg-slate-700 h-2'
                      }`}
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        height: isInterviewerSpeaking ? `${h * 24}px` : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Interviewer Action Buttons */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleSpeakQuestion()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isInterviewerSpeaking ? 'Speaking Question...' : 'Ask Question Out Loud'}</span>
                </button>

                {isInterviewerSpeaking && (
                  <button
                    onClick={() => stopAllVoiceActivity()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Mute</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Tile: Candidate (You) */}
            <div className="relative rounded-xl bg-slate-900/90 border border-slate-700/80 p-4 flex flex-col justify-between min-h-[220px] overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
                    You
                  </div>
                  <span className="text-xs font-bold text-white">Candidate</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#FFB400] bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatTime(seconds)}
                  </span>
                  <button
                    onClick={toggleCamera}
                    title={cameraActive ? 'Turn off camera' : 'Turn on camera mirror'}
                    className={`p-1.5 rounded-md border text-xs transition ${
                      cameraActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cameraActive ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Center: Camera Video Mirror or Audio Avatar */}
              <div className="relative my-4 flex-1 flex items-center justify-center overflow-hidden rounded-lg min-h-[110px]">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-lg scale-x-[-1] absolute inset-0"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 ring-4 ring-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isListening ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
                    </div>
                    <span className="text-xs">
                      {isListening ? 'Microphone live & recording...' : 'Click "Start Speaking" to answer out loud'}
                    </span>
                  </div>
                )}

                {/* Candidate mic level overlay */}
                {isListening && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-slate-950/80 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-800 z-10">
                    <Mic className="w-3 h-3 text-red-400 animate-pulse" />
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-100"
                        style={{ width: `${Math.min(100, micLevel * 100 * 2.5)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Live</span>
                  </div>
                )}
              </div>

              {/* Candidate Action Buttons */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 z-10">
                {!isListening ? (
                  <button
                    onClick={handleStartSpeaking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition shadow-sm"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Start Speaking (Mic)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleFinishSpeaking}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition shadow-sm animate-pulse"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done Speaking</span>
                  </button>
                )}

                {audioBlobUrl && !isListening && (
                  <audio controls src={audioBlobUrl} className="h-7 w-36 scale-90 origin-right" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* CLASSIC REHEARSAL STAGE CONTROLS */}
        {mode === 'classic' && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold font-mono text-[#FFB400]">{formatTime(seconds)}</span>
              <button
                onClick={() => handleSpeakQuestion()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition text-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Question</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!isListening ? (
                <button
                  onClick={handleStartSpeaking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition text-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Record Voice Answer</span>
                </button>
              ) : (
                <button
                  onClick={handleFinishSpeaking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish Speaking</span>
                </button>
              )}

              {audioBlobUrl && (
                <audio controls src={audioBlobUrl} className="h-7 w-36 scale-90 origin-right" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. LIVE TRANSCRIPTION & ANSWER NOTES CARD */}
      <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <label className="text-sm font-semibold text-[#101828] dark:text-[#EEF2FA] flex items-center gap-2">
              <span>Your Spoken Answer Notes</span>
              {isListening && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-medium animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  Transcribing live...
                </span>
              )}
            </label>
            <p className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
              Speak naturally using your microphone, or edit the transcript below. Focus on the STAR method (Situation, Task, Action, Result).
            </p>
          </div>

          {transcript && (
            <button
              onClick={() => {
                if (confirm('Clear answer notes and re-record?')) {
                  setTranscript('');
                  setFeedback(null);
                  setAudioBlobUrl(null);
                }
              }}
              className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Your answer will appear here as you speak. You can also type bullet points or paste your drafted answer..."
          className="w-full min-h-[130px] p-3 text-sm rounded-lg bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500 transition leading-relaxed resize-y font-sans"
        />

        {/* AI Coaching & Feedback Trigger */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D5DBE6] dark:border-[#26324A]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyzeAnswer}
              disabled={isAnalyzing || !transcript.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAnalyzing ? 'Analyzing response...' : 'Get AI Feedback on My Answer'}</span>
            </button>

            {statusMessage && (
              <span className="text-xs font-medium text-[#1F8A5B] dark:text-[#4CC38A]">
                {statusMessage}
              </span>
            )}
          </div>

          {/* Self / AI Rating Stars */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#5B6577] dark:text-[#99A4B8]">Rating:</span>
            <div className="flex items-center gap-1" role="group" aria-label="Self rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={`${n} out of 5 stars`}
                  className={`w-8 h-8 rounded-full border text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                    rating >= n
                      ? 'bg-[#FFB400] text-[#241A00] border-[#FFB400] shadow-xs'
                      : 'border-[#D5DBE6] dark:border-[#26324A] text-[#5B6577] dark:text-[#99A4B8] hover:border-amber-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. AI INTERVIEW COACH FEEDBACK PANEL */}
        {feedback && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-indigo-200 dark:border-indigo-950/80 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  AI Interviewer Assessment (Score: {feedback.rating}/5)
                </h3>
              </div>

              {feedback.verbalReaction && (
                <button
                  onClick={() => voiceService.speakText(feedback.verbalReaction!, selectedPersona)}
                  className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline"
                >
                  <Volume2 className="w-3 h-3" />
                  Hear Reaction
                </button>
              )}
            </div>

            <p className="text-xs text-[#101828] dark:text-[#EEF2FA] font-medium leading-relaxed">
              "{feedback.summary}"
            </p>

            {/* STAR Breakdown */}
            {feedback.starBreakdown && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A]">
                  <b className="text-amber-600 dark:text-amber-400 block mb-0.5">Situation</b>
                  <span className="text-[#5B6577] dark:text-[#99A4B8]">{feedback.starBreakdown.situation}</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A]">
                  <b className="text-blue-600 dark:text-blue-400 block mb-0.5">Task</b>
                  <span className="text-[#5B6577] dark:text-[#99A4B8]">{feedback.starBreakdown.task}</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A]">
                  <b className="text-emerald-600 dark:text-emerald-400 block mb-0.5">Action</b>
                  <span className="text-[#5B6577] dark:text-[#99A4B8]">{feedback.starBreakdown.action}</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A]">
                  <b className="text-purple-600 dark:text-purple-400 block mb-0.5">Result</b>
                  <span className="text-[#5B6577] dark:text-[#99A4B8]">{feedback.starBreakdown.result}</span>
                </div>
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div className="space-y-1">
                <b className="text-[#1F8A5B] dark:text-[#4CC38A] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                </b>
                <ul className="list-disc list-inside space-y-0.5 text-[#5B6577] dark:text-[#99A4B8]">
                  {feedback.strengths.map((str, i) => (
                    <li key={i}>{str}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1">
                <b className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Polishing Tips
                </b>
                <ul className="list-disc list-inside space-y-0.5 text-[#5B6577] dark:text-[#99A4B8]">
                  {feedback.improvements.map((imp, i) => (
                    <li key={i}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Follow-up question if available */}
            {feedback.followUpQuestion && (
              <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-950/60 flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-[#101828] dark:text-[#EEF2FA]">
                  <b className="text-indigo-600 dark:text-indigo-400">Interviewer follow-up:</b> "{feedback.followUpQuestion}"
                </p>
                <button
                  onClick={() => handleSpeakQuestion(feedback.followUpQuestion)}
                  className="text-xs px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold hover:bg-indigo-100 flex items-center gap-1"
                >
                  <Volume2 className="w-3 h-3" />
                  Ask Follow-up Aloud
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Row: Save Answer & Next Question */}
        <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-[#FFB400] text-[#241A00] font-bold text-sm hover:bg-amber-400 transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <span>Save and Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onSkipQuestion}
            className="px-4 py-2 rounded-lg border border-[#D5DBE6] dark:border-[#26324A] text-xs font-semibold text-[#5B6577] dark:text-[#99A4B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Skip this question
          </button>
        </div>
      </div>

      {/* 4. EXTRA QUESTIONS & ROLE BUILDER */}
      <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Custom question input */}
        <form onSubmit={handleAddQuestion} className="flex-1 w-full flex items-center gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Add a custom question for this job (e.g. Why are you looking to leave?)..."
            className="flex-1 text-xs bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2.5 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-[#101828] dark:text-[#EEF2FA] border border-[#D5DBE6] dark:border-[#26324A] transition whitespace-nowrap"
          >
            Add Question
          </button>
        </form>

        {/* AI Question Generator button */}
        {onGenerateAIQuestions && (
          <button
            onClick={onGenerateAIQuestions}
            disabled={isGeneratingQuestions}
            className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-700 text-amber-900 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition whitespace-nowrap"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{isGeneratingQuestions ? 'Generating 6 Questions...' : 'Generate AI Role Questions'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
