import React from 'react';
import { TargetJob, SessionAnswer } from '../types';
import { TrendingUp, Award, Clock, Target, AlertTriangle } from 'lucide-react';

interface ProgressTabProps {
  activeTarget: TargetJob | null;
  sessions: SessionAnswer[];
}

export const ProgressTab: React.FC<ProgressTabProps> = ({ activeTarget, sessions }) => {
  const targetSessions = activeTarget ? sessions.filter((s) => s.tid === activeTarget.id) : sessions;

  if (targetSessions.length === 0) {
    return (
      <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-[#101828] dark:text-[#EEF2FA] mb-2">No progress data yet</h2>
        <p className="text-sm text-[#5B6577] dark:text-[#99A4B8] max-w-md mx-auto">
          Save a few answers to see your score distribution, category strengths, and improvement trends over rounds.
        </p>
      </div>
    );
  }

  // Category averages
  const cats: Record<string, number[]> = {};
  targetSessions.forEach((s) => {
    if (!cats[s.cat]) cats[s.cat] = [];
    cats[s.cat].push(s.rating);
  });

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const sortedCats = Object.entries(cats)
    .map(([cat, ratings]) => ({ cat, avg: avg(ratings), count: ratings.length }))
    .sort((a, b) => a.avg - b.avg); // Weakest areas first

  const firstThree = targetSessions.slice(0, 3).map((s) => s.rating);
  const lastThree = targetSessions.slice(-3).map((s) => s.rating);
  const firstAvg = firstThree.length ? avg(firstThree) : 0;
  const lastAvg = lastThree.length ? avg(lastThree) : 0;
  const improvement = lastAvg - firstAvg;

  const totalSecs = targetSessions.reduce((acc, s) => acc + s.secs, 0);
  const totalMins = Math.round(totalSecs / 60);

  return (
    <div className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-6 shadow-sm flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[#101828] dark:text-[#EEF2FA]">
          Progress & Readiness Analysis
        </h2>
        <p className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
          {activeTarget ? `Interview metrics for ${activeTarget.role} at ${activeTarget.company}` : 'Overall metrics'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#D5DBE6] dark:border-[#26324A]">
          <span className="text-[11px] font-semibold text-[#5B6577] dark:text-[#99A4B8] flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            Answers Saved
          </span>
          <b className="text-2xl font-bold text-[#101828] dark:text-[#EEF2FA] mt-1 block">
            {targetSessions.length}
          </b>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#D5DBE6] dark:border-[#26324A]">
          <span className="text-[11px] font-semibold text-[#5B6577] dark:text-[#99A4B8] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            Average Rating
          </span>
          <b className="text-2xl font-bold text-[#FFB400] mt-1 block">
            {avg(targetSessions.map((s) => s.rating)).toFixed(1)} / 5.0
          </b>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#D5DBE6] dark:border-[#26324A]">
          <span className="text-[11px] font-semibold text-[#5B6577] dark:text-[#99A4B8] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Rounds Growth
          </span>
          <b className="text-2xl font-bold text-[#1F8A5B] dark:text-[#4CC38A] mt-1 block">
            {improvement >= 0 ? `+${improvement.toFixed(1)}` : improvement.toFixed(1)}
          </b>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-[#D5DBE6] dark:border-[#26324A]">
          <span className="text-[11px] font-semibold text-[#5B6577] dark:text-[#99A4B8] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Speaking Time
          </span>
          <b className="text-2xl font-bold text-[#101828] dark:text-[#EEF2FA] mt-1 block">
            {totalMins} mins
          </b>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#EEF2FA]">
            Score by Question Category (Weakest First)
          </h3>
          <span className="text-xs text-[#5B6577] dark:text-[#99A4B8]">
            AI interviewer emphasizes your lower categories
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {sortedCats.map((item) => (
            <div key={item.cat} className="flex items-center gap-3 text-xs">
              <span className="w-32 font-semibold text-[#101828] dark:text-[#EEF2FA] truncate">
                {item.cat}
              </span>

              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-[#D5DBE6]/60 dark:border-[#26324A]">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-[#FFB400] rounded-full transition-all duration-500"
                  style={{ width: `${(item.avg / 5) * 100}%` }}
                />
              </div>

              <div className="w-16 text-right">
                <span className="font-bold text-[#101828] dark:text-[#EEF2FA]">
                  {item.avg.toFixed(1)}
                </span>
                <span className="text-[#5B6577] dark:text-[#99A4B8] ml-1">
                  ({item.count})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-impact recommendation callout */}
      {sortedCats.length > 0 && sortedCats[0].avg < 3.5 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            <b>Focus recommendation:</b> Your lowest rated category is{' '}
            <span className="font-bold underline">{sortedCats[0].cat}</span> (avg {sortedCats[0].avg.toFixed(1)}/5).
            Try answering with more specific metrics, clear trade-offs, and concise 60–90 second structure.
          </div>
        </div>
      )}
    </div>
  );
};
