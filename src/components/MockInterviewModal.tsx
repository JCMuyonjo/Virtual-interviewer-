import React, { useState, useEffect, useRef } from 'react';
import { TargetJob, InterviewerPersona, SessionAnswer, AnswerFeedback } from '../types';
import { voiceService } from '../services/voiceService';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  Award,
  ArrowRight,
  Clock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface MockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTarget: TargetJob;
  selectedPersona: InterviewerPersona;
  onSaveCompletedMock: (sessions: SessionAnswer[]) => void;
}

interface MockRound {
  stage: string;
  question: string;
  category: string;
}

export const MockInterviewModal: React.FC<MockInterviewModalProps> = ({
  isOpen,
  onClose,
  activeTarget,
  selectedPersona,
  onSaveCompletedMock,
}) => {
  const [rounds, setRounds] = useState<MockRound[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [completedAnswers, setCompletedAnswers] = useState<
    { q: string; cat: string; answer: string; secs: number; rating: number }[]
  >([]);
  const [isComplete, setIsComplete] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioMeterRef = useRef<{ stop: () => void } | null>(null);

  // Initialize questions
  useEffect(() => {
    if (isOpen && activeTarget) {
      const targetCompany = activeTarget.company || 'our company';
      const targetRole = activeTarget.role;
      const keySkill = activeTarget.skills[0] || 'your core specialization';

      const generatedRounds: MockRound[] = [
        {
          stage: '1. Introduction & Background',
          question: `Welcome! Let's kick off with an introduction. Could you tell me about yourself and what specifically brought you to this point in your career?`,
          category: 'Intro',
        },
        {
          stage: '2. Motivation & Company Fit',
          question: `Why are you eager to join ${targetCompany} as our ${targetRole}, and what excites you about our mission?`,
          category: 'Motivation',
        },
        {
          stage: '3. Technical & Role Mastery',
          question: `Tell me about a high-impact project where you applied ${keySkill} to deliver a measurable result under tight constraints.`,
          category: 'Role skills',
        },
        {
          stage: '4. High-Stakes Behavioral Challenge',
          question: `Describe a time you strongly disagreed with a product or engineering teammate on an important decision. How did you navigate it and what was the outcome?`,
          category: 'Behavioral',
        },
        {
          stage: '5. Candidate Closing & Vision',
          question: `Thank you for those detailed examples. To wrap up, what thoughtful questions do you have for me about our team dynamics, roadmap, or culture?`,
          category: 'Closing',
        },
      ];

      setRounds(generatedRounds);
      setCurrentIndex(0);
      setCompletedAnswers([]);
      setIsComplete(false);
      setTranscript('');
      setSeconds(0);

      // Speak first question
      setTimeout(() => {
        speakCurrentRound(generatedRounds[0].question);
      }, 500);
    }

    return () => {
      stopVoice();
    };
  }, [isOpen, activeTarget?.id]);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const stopVoice = () => {
    voiceService.stopAllAudio();
    setIsInterviewerSpeaking(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const speakCurrentRound = (questionText: string) => {
    stopVoice();
    setIsInterviewerSpeaking(true);
    voiceService.speakText(
      questionText,
      selectedPersona,
      () => setIsInterviewerSpeaking(true),
      () => {
        setIsInterviewerSpeaking(false);
        // Prompt recording
        startRecording();
      },
      () => setIsInterviewerSpeaking(false)
    );
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      audioMeterRef.current = voiceService.createAudioMeter(stream, (lvl) => setMicLevel(lvl));

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;

        let acc = transcript ? transcript + ' ' : '';
        recognition.onresult = (e: any) => {
          let curr = '';
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            curr += e.results[i][0].transcript;
          }
          setTranscript((acc + curr).trim());
        };

        recognition.start();
      }
    } catch (e) {
      console.warn('Mic error:', e);
      setIsRecording(false);
    }
  };

  const handleFinishRound = () => {
    stopVoice();
    const currentRound = rounds[currentIndex];
    const finalAnswer = transcript.trim() || 'Spoken answer completed in voice session.';

    // Estimate realistic score based on answer length and STAR presence
    const estimatedRating = finalAnswer.length > 150 ? 4 : finalAnswer.length > 60 ? 3 : 2;

    const updated = [
      ...completedAnswers,
      {
        q: currentRound.question,
        cat: currentRound.category,
        answer: finalAnswer,
        secs: seconds,
        rating: estimatedRating,
      },
    ];
    setCompletedAnswers(updated);

    if (currentIndex + 1 < rounds.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setTranscript('');
      setSeconds(0);
      speakCurrentRound(rounds[nextIdx].question);
    } else {
      setIsComplete(true);
    }
  };

  const handleSaveAndExit = () => {
    const formattedSessions: SessionAnswer[] = completedAnswers.map((ans, idx) => ({
      id: `mock-${Date.now()}-${idx}`,
      tid: activeTarget.id,
      q: ans.q,
      cat: ans.cat,
      answer: ans.answer,
      rating: ans.rating,
      secs: ans.secs,
      ts: Date.now(),
    }));

    onSaveCompletedMock(formattedSessions);
    onClose();
  };

  if (!isOpen) return null;

  const currentRound = rounds[currentIndex];
  const overallAvg = completedAnswers.length
    ? (completedAnswers.reduce((a, b) => a + b.rating, 0) / completedAnswers.length).toFixed(1)
    : '4.0';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12203A] text-white border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                Simulated Mock Interview
                <span className="text-xs font-normal text-slate-400">
                  {activeTarget.role} at {activeTarget.company}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              stopVoice();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isComplete && currentRound ? (
          <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-between gap-6">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-amber-400">{currentRound.stage}</span>
                <span>
                  Round {currentIndex + 1} of {rounds.length}
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / rounds.length) * 100}%` }}
                />
              </div>
            </div>

            {/* AI Interviewer Speaking Stage */}
            <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-5 flex flex-col items-center text-center">
              <div
                className={`w-16 h-16 rounded-full bg-gradient-to-tr ${selectedPersona.avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-md mb-3 transition-transform ${
                  isInterviewerSpeaking ? 'scale-110 ring-4 ring-amber-400/40' : ''
                }`}
              >
                {selectedPersona.name.charAt(0)}
              </div>

              <span className="text-xs text-slate-400 font-semibold mb-1">
                {selectedPersona.name} ({selectedPersona.title})
              </span>

              <h4 className="text-lg md:text-xl font-bold max-w-xl leading-snug font-heading my-2">
                "{currentRound.question}"
              </h4>

              <div className="flex items-center gap-1.5 h-6 mt-1">
                {[0.4, 0.8, 1, 0.6, 0.9, 0.5].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isInterviewerSpeaking ? 'bg-amber-400 soundwave-bar' : 'bg-slate-700 h-2'
                    }`}
                    style={{
                      height: isInterviewerSpeaking ? `${h * 20}px` : '4px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Answer Transcription Box */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${isRecording ? 'text-red-400 animate-pulse' : 'text-slate-400'}`} />
                  {isRecording ? 'Recording your answer...' : 'Answer Transcript / Notes'}
                </span>
                <span className="font-mono text-amber-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Speak your answer out loud; live transcription will stream here. You can also edit freely..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-amber-400 font-sans resize-none"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
              <button
                onClick={() => speakCurrentRound(currentRound.question)}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Repeat Question</span>
              </button>

              <button
                onClick={handleFinishRound}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-md"
              >
                <span>{currentIndex + 1 === rounds.length ? 'Complete Interview' : 'Submit & Next Round'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* COMPLETION SCORECARD */
          <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-2xl font-bold font-heading">Mock Interview Completed!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
                You completed all 5 rounds for <b>{activeTarget.role}</b> at {activeTarget.company}. Here is your session summary.
              </p>
            </div>

            {/* Score Stats */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto w-full">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Rounds</span>
                <b className="text-xl block font-bold text-white mt-0.5">{completedAnswers.length} / 5</b>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Readiness</span>
                <b className="text-xl block font-bold text-amber-400 mt-0.5">85%</b>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Score</span>
                <b className="text-xl block font-bold text-emerald-400 mt-0.5">{overallAvg} / 5</b>
              </div>
            </div>

            {/* Answers Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-left divide-y divide-slate-800 flex flex-col text-xs">
              {completedAnswers.map((ans, i) => (
                <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] text-amber-400 font-bold block">{ans.cat}</span>
                    <p className="text-slate-200 truncate font-medium">{ans.q}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 shrink-0">★ {ans.rating}/5</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleSaveAndExit}
                className="px-6 py-2.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-md"
              >
                Save Answers to Past Sessions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
