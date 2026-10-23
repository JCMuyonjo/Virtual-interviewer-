import React, { useState, useRef, useEffect } from 'react';
import { CHECKLIST_ITEMS } from '../data/questionBank';
import { CheckSquare, Square, Mic, Video, CheckCircle2, Volume2, VideoOff } from 'lucide-react';
import { voiceService } from '../services/voiceService';

interface SetupTabProps {
  checks: Record<string, boolean>;
  onToggleCheck: (index: number) => void;
  onCheckAll: () => void;
  onResetChecks: () => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({
  checks,
  onToggleCheck,
  onCheckAll,
  onResetChecks,
}) => {
  // Mic test
  const [micTesting, setMicTesting] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const micStopRef = useRef<{ stop: () => void } | null>(null);

  // Camera test
  const [camTesting, setCamTesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);

  const completedCount = CHECKLIST_ITEMS.filter((_, i) => checks[i]).length;
  const isAllChecked = completedCount === CHECKLIST_ITEMS.length;

  // Toggle Live Mic Test
  const toggleMicTest = async () => {
    if (micTesting) {
      if (micStopRef.current) {
        micStopRef.current.stop();
        micStopRef.current = null;
      }
      setMicTesting(false);
      setMicVolume(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStopRef.current = voiceService.createAudioMeter(stream, (level) => {
          setMicVolume(level);
        });
        setMicTesting(true);
      } catch (err) {
        alert('Could not access microphone. Please check browser permissions.');
      }
    }
  };

  // Toggle Live Camera Test
  const toggleCamTest = async () => {
    if (camTesting) {
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((track) => track.stop());
        camStreamRef.current = null;
      }
      setCamTesting(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        camStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCamTesting(true);
      } catch (err) {
        alert('Could not access camera. Please check browser permissions.');
      }
    }
  };

  useEffect(() => {
    return () => {
      if (micStopRef.current) micStopRef.current.stop();
      if (camStreamRef.current) {
        camStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D5DBE6] dark:border-[#26324A]">
        <div>
          <h2 className="text-xl font-bold text-[#101828] dark:text-[#EEF2FA]">
            Before an Online Interview Checklist
          </h2>
          <p className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
            Complete these essential checks 15 minutes before your actual interview call.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            {completedCount} / {CHECKLIST_ITEMS.length} ready
          </span>
          <button
            onClick={isAllChecked ? onResetChecks : onCheckAll}
            className="text-xs px-2.5 py-1 rounded border border-[#D5DBE6] dark:border-[#26324A] text-[#5B6577] dark:text-[#99A4B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isAllChecked ? 'Reset' : 'Check All'}
          </button>
        </div>
      </div>

      {/* Live Hardware Testing Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mic Test Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#D5DBE6] dark:border-[#26324A] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#101828] dark:text-[#EEF2FA] flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-amber-500" />
                Live Microphone Test
              </span>
              <button
                onClick={toggleMicTest}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  micTesting
                    ? 'bg-red-500 text-white'
                    : 'bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] text-[#101828] dark:text-[#EEF2FA]'
                }`}
              >
                {micTesting ? 'Stop Test' : 'Test Mic'}
              </button>
            </div>
            <p className="text-[11px] text-[#5B6577] dark:text-[#99A4B8]">
              Speak into your mic to ensure clear audio without clipping or background hiss.
            </p>
          </div>

          <div className="mt-4">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(100, micVolume * 100 * 2.5)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>Quiet</span>
              <span>Optimal</span>
              <span>Loud</span>
            </div>
          </div>
        </div>

        {/* Camera Test Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[#D5DBE6] dark:border-[#26324A] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#101828] dark:text-[#EEF2FA] flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-500" />
                Live Camera Framing Check
              </span>
              <button
                onClick={toggleCamTest}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  camTesting
                    ? 'bg-red-500 text-white'
                    : 'bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] text-[#101828] dark:text-[#EEF2FA]'
                }`}
              >
                {camTesting ? 'Stop Preview' : 'Test Camera'}
              </button>
            </div>
            <p className="text-[11px] text-[#5B6577] dark:text-[#99A4B8]">
              Confirm eye level positioning, soft front lighting, and a neat background.
            </p>
          </div>

          <div className="mt-3 relative h-28 bg-slate-200 dark:bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
            {camTesting ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <VideoOff className="w-5 h-5 mx-auto mb-1 opacity-60" />
                <span>Camera preview paused</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="flex flex-col gap-2">
        {CHECKLIST_ITEMS.map((item, idx) => {
          const isChecked = !!checks[idx];
          return (
            <label
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition text-xs ${
                isChecked
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/60 text-[#101828] dark:text-[#EEF2FA]'
                  : 'bg-slate-50/50 dark:bg-slate-800/20 border-[#D5DBE6] dark:border-[#26324A] text-[#5B6577] dark:text-[#99A4B8] hover:bg-slate-100/50'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleCheck(idx)}
                className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
              />
              <span className={`flex-1 leading-relaxed ${isChecked ? 'font-medium' : ''}`}>
                {item}
              </span>
              {isChecked && <CheckCircle2 className="w-4 h-4 text-[#1F8A5B] dark:text-[#4CC38A] shrink-0" />}
            </label>
          );
        })}
      </div>
    </div>
  );
};
