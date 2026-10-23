import React from 'react';
import { Volume2, Sparkles, Moon, Sun, Mic, PlayCircle } from 'lucide-react';
import { InterviewerPersona } from '../types';
import { INTERVIEWER_PERSONAS } from '../data/questionBank';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  selectedPersona: InterviewerPersona;
  onSelectPersona: (persona: InterviewerPersona) => void;
  onStartMockInterview: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDark,
  onToggleTheme,
  selectedPersona,
  onSelectPersona,
  onStartMockInterview,
  autoSpeak,
  onToggleAutoSpeak,
}) => {
  return (
    <header className="grid-column-1/-1 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#D5DBE6] dark:border-[#26324A]">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFB400] to-amber-600 flex items-center justify-center text-[#241A00] shadow-sm">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#101828] dark:text-[#EEF2FA] flex items-center gap-2">
              Rehearsal Room
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium border border-amber-300/40">
                AI Voice Interviewer
              </span>
            </h1>
            <p className="text-sm text-[#5B6577] dark:text-[#99A4B8] max-w-xl">
              Practice role-specific interview questions out loud. Your AI interviewer asks each question, listens to your response, and coaches you to land the offer.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Full Mock Interview Button */}
        <button
          onClick={onStartMockInterview}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#12203A] dark:bg-[#1B2B4B] text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition font-medium text-sm shadow-sm border border-slate-700/50"
        >
          <PlayCircle className="w-4 h-4 text-[#FFB400]" />
          <span>Full Mock Interview</span>
          <span className="text-xs bg-amber-500/20 text-[#FFB400] px-1.5 py-0.5 rounded">5 Rounds</span>
        </button>

        {/* Voice Persona Selector */}
        <div className="relative group">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] text-xs font-medium text-[#101828] dark:text-[#EEF2FA]">
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[#5B6577] dark:text-[#99A4B8]">Voice:</span>
            <select
              value={selectedPersona.id}
              onChange={(e) => {
                const found = INTERVIEWER_PERSONAS.find((p) => p.id === e.target.value);
                if (found) onSelectPersona(found);
              }}
              className="bg-transparent font-semibold cursor-pointer outline-none text-[#101828] dark:text-[#EEF2FA] pr-1"
            >
              {INTERVIEWER_PERSONAS.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-[#141D2F] text-[#101828] dark:text-[#EEF2FA]">
                  {p.name} ({p.title.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Auto-Speak Toggle */}
        <button
          onClick={onToggleAutoSpeak}
          title={autoSpeak ? "Auto-speak questions is ON" : "Auto-speak questions is OFF"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition ${
            autoSpeak
              ? 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
              : 'bg-white dark:bg-[#141D2F] border-[#D5DBE6] dark:border-[#26324A] text-[#5B6577] dark:text-[#99A4B8]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Auto-speak: {autoSpeak ? 'On' : 'Off'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-lg bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] text-[#5B6577] dark:text-[#99A4B8] hover:text-[#101828] dark:hover:text-[#EEF2FA] transition"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
