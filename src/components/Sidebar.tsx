import React, { useState } from 'react';
import { TargetJob, FieldType, SessionAnswer, InterviewerPersona } from '../types';
import { Plus, Briefcase, Trash2, Volume2, Sparkles, ChevronDown, Check } from 'lucide-react';
import { voiceService } from '../services/voiceService';

interface SidebarProps {
  targets: TargetJob[];
  activeId: string | null;
  onSelectTarget: (id: string) => void;
  onAddTarget: (target: Omit<TargetJob, 'id' | 'createdAt'>) => void;
  onDeleteTarget: (id: string) => void;
  sessions: SessionAnswer[];
  selectedPersona: InterviewerPersona;
  onSelectPersona: (persona: InterviewerPersona) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  targets,
  activeId,
  onSelectTarget,
  onAddTarget,
  onDeleteTarget,
  sessions,
  selectedPersona,
}) => {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState<FieldType>('tech');
  const [skills, setSkills] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;

    const skillList = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    onAddTarget({
      role: role.trim(),
      company: company.trim() || 'Undisclosed Company',
      type,
      skills: skillList,
      jobDescription: jobDescription.trim() || undefined,
    });

    setRole('');
    setCompany('');
    setSkills('');
    setJobDescription('');
    setIsOpenForm(false);
  };

  const testVoiceSample = async () => {
    if (isTestingVoice) return;
    setIsTestingVoice(true);
    const greeting = `Hello! I'm ${selectedPersona.name}, your ${selectedPersona.title.toLowerCase()}. I'll be asking the questions today. Speak clearly and take your time.`;
    await voiceService.speakText(
      greeting,
      selectedPersona,
      () => setIsTestingVoice(true),
      () => setIsTestingVoice(false),
      () => setIsTestingVoice(false)
    );
  };

  return (
    <aside className="bg-white dark:bg-[#141D2F] border border-[#D5DBE6] dark:border-[#26324A] rounded-xl p-4 flex flex-col gap-4 shadow-sm h-fit">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#101828] dark:text-[#EEF2FA] flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-amber-500" />
            Your Applications
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#5B6577] dark:text-[#99A4B8]">
            {targets.length}
          </span>
        </div>

        {/* Targets List */}
        <div className="flex flex-col gap-2">
          {targets.length === 0 ? (
            <p className="text-sm text-[#5B6577] dark:text-[#99A4B8] py-2">
              No applications yet. Add your first job below to start practicing.
            </p>
          ) : (
            targets.map((t) => {
              const isActive = t.id === activeId;
              const count = sessions.filter((s) => s.tid === t.id).length;
              const targetSessions = sessions.filter((s) => s.tid === t.id);
              const avgRating = targetSessions.length
                ? (targetSessions.reduce((acc, s) => acc + s.rating, 0) / targetSessions.length).toFixed(1)
                : null;

              return (
                <div
                  key={t.id}
                  className={`group relative rounded-lg border p-3 transition text-left cursor-pointer ${
                    isActive
                      ? 'border-[#FFB400] bg-amber-50/50 dark:bg-amber-950/20 shadow-xs'
                      : 'border-[#D5DBE6] dark:border-[#26324A] bg-transparent hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                  onClick={() => onSelectTarget(t.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm font-semibold text-[#101828] dark:text-[#EEF2FA] truncate">
                        {t.role}
                      </b>
                      <span className="block text-xs text-[#5B6577] dark:text-[#99A4B8] truncate">
                        {t.company || 'No company'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {avgRating && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                          ★ {avgRating}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Remove application "${t.role} at ${t.company}"?`)) {
                            onDeleteTarget(t.id);
                          }
                        }}
                        title="Delete application"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#5B6577] dark:text-[#99A4B8]">
                    <span>{count} answers saved</span>
                    {t.skills.length > 0 && (
                      <span className="truncate max-w-[120px]" title={t.skills.join(', ')}>
                        {t.skills.length} key skills
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

        {/* Add Application Form Accordion */}
      <div className="border-t border-[#D5DBE6] dark:border-[#26324A] pt-3">
        <button
          onClick={() => setIsOpenForm(!isOpenForm)}
          className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg border border-[#D5DBE6] dark:border-[#26324A] bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-[#101828] dark:text-[#EEF2FA] transition"
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-amber-500" />
            Add Application
          </span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpenForm ? 'rotate-180' : ''}`} />
        </button>

        {isOpenForm && (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5 text-xs">
            <div>
              <label className="block text-[#5B6577] dark:text-[#99A4B8] font-medium mb-1">
                Job Title *
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                required
                className="w-full bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[#5B6577] dark:text-[#99A4B8] font-medium mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Labs"
                className="w-full bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[#5B6577] dark:text-[#99A4B8] font-medium mb-1">
                Field / Specialization
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FieldType)}
                className="w-full bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500"
              >
                <option value="tech">Software / Engineering</option>
                <option value="product">Product / Design</option>
                <option value="sales">Sales / Customer Success</option>
                <option value="data">Data / Analytics / AI</option>
                <option value="ops">Operations / Management</option>
                <option value="general">General / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[#5B6577] dark:text-[#99A4B8] font-medium mb-1">
                Key Skills (comma separated)
              </label>
              <input
                type="text"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="e.g. React, GraphQL, System Design"
                className="w-full bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[#5B6577] dark:text-[#99A4B8] font-medium mb-1">
                Job Context / Notes (optional)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key responsibilities or requirements..."
                rows={2}
                className="w-full bg-[#EEF1F6] dark:bg-[#0B1220] border border-[#D5DBE6] dark:border-[#26324A] rounded-lg p-2 text-[#101828] dark:text-[#EEF2FA] outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="submit"
                className="flex-1 bg-[#FFB400] text-[#241A00] font-semibold py-2 rounded-lg hover:bg-amber-400 transition"
              >
                Save Application
              </button>
              <button
                type="button"
                onClick={() => setIsOpenForm(false)}
                className="px-3 py-2 border border-[#D5DBE6] dark:border-[#26324A] rounded-lg text-[#5B6577] dark:text-[#99A4B8] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Current AI Interviewer Bio Card */}
      <div className="border-t border-[#D5DBE6] dark:border-[#26324A] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#5B6577] dark:text-[#99A4B8] uppercase tracking-wider">
            Your Interviewer
          </span>
          <button
            onClick={testVoiceSample}
            disabled={isTestingVoice}
            className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 hover:underline"
          >
            <Volume2 className="w-3 h-3" />
            {isTestingVoice ? 'Speaking...' : 'Test Voice'}
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-[#D5DBE6] dark:border-[#26324A] p-2.5 flex items-start gap-2.5">
          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-tr ${selectedPersona.avatarColor} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs`}
          >
            {selectedPersona.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#101828] dark:text-[#EEF2FA]">
              {selectedPersona.name}
            </h4>
            <p className="text-[11px] text-[#5B6577] dark:text-[#99A4B8] truncate">
              {selectedPersona.title}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {selectedPersona.style}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
