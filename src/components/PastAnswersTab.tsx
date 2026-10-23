import React from 'react';
import { TargetJob, SessionAnswer } from '../types';
import { Clock, Star, Volume2, RotateCcw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface PastAnswersTabProps {
  activeTarget: TargetJob | null;
  sessions: SessionAnswer[];
  onPractiseAgain: (question: string, cat: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const PastAnswersTab: React.FC<PastAnswersTabProps> = ({
  activeTarget,
  sessions,
  onPractiseAgain,
  onDeleteSession,
}) => {
  const targetSessions = activeTarget
    ? sessions.filter((s) => s.tid === activeTarget.id).slice().reverse()
    : sessions.slice().reverse();

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-[#D5DBE6] dark:border-[#26324A] mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#101828] dark:text-[#EEF2FA]">
            Past Spoken & Saved Answers
          </h2>
          <p className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
            {activeTarget ? `Saved rehearsal rounds for ${activeTarget.role}` : 'All past answers'}
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[#5B6577] dark:text-[#99A4B8]">
          {targetSessions.length} recorded
        </span>
      </div>

      {targetSessions.length === 0 ? (
        <div className="py-12 text-center text-[#5B6577] dark:text-[#99A4B8]">
          <p className="text-sm font-medium">No saved answers yet.</p>
          <p className="text-xs mt-1">
            Complete a practice question on the Practice tab or start a Mock Interview to record your spoken answers.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#D5DBE6] dark:divide-[#26324A] flex flex-col">
          {targetSessions.map((s) => (
            <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {s.cat}
                    </span>
                    <span className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
                      {new Date(s.ts).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#101828] dark:text-[#EEF2FA]">
                    {s.q}
                  </h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#FFB400] flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{s.rating}/5</span>
                    </div>
                    <span className="text-xs text-[#5B6577] dark:text-[#99A4B8] flex items-center justify-end gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(s.secs)}
                    </span>
                  </div>

                  <button
                    onClick={() => onDeleteSession(s.id)}
                    title="Delete answer"
                    className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Answer Transcript */}
              <div className="p-3 rounded-lg bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] text-xs leading-relaxed text-[#101828] dark:text-[#EEF2FA] whitespace-pre-wrap font-sans">
                {s.answer}
              </div>

              {/* Audio recording player if available */}
              {s.audioBlobUrl && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#5B6577] dark:text-[#99A4B8] font-medium flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    Spoken Recording:
                  </span>
                  <audio controls src={s.audioBlobUrl} className="h-7 w-48" />
                </div>
              )}

              {/* AI Feedback note if available */}
              {s.feedback && (
                <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs flex flex-col gap-1.5">
                  <b className="text-indigo-700 dark:text-indigo-300">
                    AI Coaching: "{s.feedback.summary}"
                  </b>
                  {s.feedback.improvements?.length > 0 && (
                    <span className="text-[#5B6577] dark:text-[#99A4B8] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      Tip: {s.feedback.improvements[0]}
                    </span>
                  )}
                </div>
              )}

              {/* Practise Again Button */}
              <div>
                <button
                  onClick={() => onPractiseAgain(s.q, s.cat)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5DBE6] dark:border-[#26324A] text-xs font-semibold text-[#101828] dark:text-[#EEF2FA] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  Practise Again
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
