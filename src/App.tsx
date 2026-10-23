/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TargetJob, SessionAnswer, QuestionItem, ActiveTab, InterviewerPersona, AnswerFeedback } from './types';
import { BANK, INTERVIEWER_PERSONAS } from './data/questionBank';
import { storageService } from './services/storageService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VoiceInterviewerStage } from './components/VoiceInterviewerStage';
import { PastAnswersTab } from './components/PastAnswersTab';
import { ProgressTab } from './components/ProgressTab';
import { SetupTab } from './components/SetupTab';
import { MockInterviewModal } from './components/MockInterviewModal';

export default function App() {
  const [initialData] = useState(() => storageService.load());
  const [targets, setTargets] = useState<TargetJob[]>(initialData.targets);
  const [activeId, setActiveId] = useState<string | null>(initialData.active);
  const [sessions, setSessions] = useState<SessionAnswer[]>(initialData.sessions);
  const [customQuestions, setCustomQuestions] = useState<Record<string, string[]>>(initialData.custom);
  const [checks, setChecks] = useState<Record<string, boolean>>(initialData.checks);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(initialData.selectedPersonaId || 'kore');
  const [activeTab, setActiveTab] = useState<ActiveTab>('practice');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isMockOpen, setIsMockOpen] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Active Target Job
  const activeTarget = useMemo(() => {
    return targets.find((t) => t.id === activeId) || targets[0] || null;
  }, [targets, activeId]);

  // Selected Voice Persona
  const selectedPersona = useMemo(() => {
    return INTERVIEWER_PERSONAS.find((p) => p.id === selectedPersonaId) || INTERVIEWER_PERSONAS[0];
  }, [selectedPersonaId]);

  // Apply dark mode to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDark]);

  // Save changes to localStorage
  useEffect(() => {
    storageService.save({
      targets,
      sessions,
      active: activeId,
      custom: customQuestions,
      checks,
      selectedPersonaId,
    });
  }, [targets, sessions, activeId, customQuestions, checks, selectedPersonaId]);

  // Question Pool for the active target
  const questionPool = useMemo((): QuestionItem[] => {
    if (!activeTarget) return [];

    const companyName = activeTarget.company || 'this company';
    const roleName = activeTarget.role;

    // 1. General bank questions
    const list: QuestionItem[] = BANK.general.map(([q, cat]) => ({
      q: q.replace('{company}', companyName).replace('{role}', roleName),
      cat,
    }));

    // 2. Role-field specific questions
    const fieldQuestions = BANK[activeTarget.type] || [];
    fieldQuestions.forEach(([q, cat]) => {
      list.push({
        q: q.replace('{company}', companyName).replace('{role}', roleName),
        cat,
      });
    });

    // 3. Dynamic questions from job skills
    activeTarget.skills.forEach((skill) => {
      list.push({
        q: `Tell me about a time you used ${skill} to deliver a concrete result.`,
        cat: 'Job-post skills',
      });
      list.push({
        q: `How would you evaluate your proficiency in ${skill}, and how are you continuing to sharpen it?`,
        cat: 'Job-post skills',
      });
    });

    // 4. Custom user-added or AI-generated questions
    const customForTarget = customQuestions[activeTarget.id] || [];
    customForTarget.forEach((q) => {
      list.push({ q, cat: 'Your questions' });
    });

    return list;
  }, [activeTarget, customQuestions]);

  // Current active question
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null);

  // Pick question algorithm: prioritize unanswered and lower-rated questions (spaced repetition)
  const pickNextQuestion = useCallback(
    (excludeQuestion?: string) => {
      if (!activeTarget || questionPool.length === 0) {
        setCurrentQuestion(null);
        return;
      }

      const targetSessions = sessions.filter((s) => s.tid === activeTarget.id);

      // Score formula matching original algorithm: lower rating gets prioritized
      const score = (q: QuestionItem) => {
        const matching = targetSessions.filter((s) => s.q === q.q);
        if (!matching.length) return -1;
        const lastRating = matching[matching.length - 1].rating;
        return lastRating - matching.length * 0.1;
      };

      const sorted = questionPool
        .map((q) => ({ q, s: score(q) + Math.random() * 0.8 }))
        .sort((a, b) => a.s - b.s);

      const candidate = sorted.find((x) => x.q.q !== excludeQuestion) || sorted[0];
      setCurrentQuestion(candidate ? candidate.q : questionPool[0]);
    },
    [activeTarget, questionPool, sessions]
  );

  // When active target changes, pick an initial question
  useEffect(() => {
    if (activeTarget) {
      pickNextQuestion();
    }
  }, [activeTarget?.id]);

  // Last session for the current question
  const lastSessionForCurrent = useMemo(() => {
    if (!activeTarget || !currentQuestion) return undefined;
    const matching = sessions.filter((s) => s.tid === activeTarget.id && s.q === currentQuestion.q);
    return matching[matching.length - 1];
  }, [activeTarget, currentQuestion, sessions]);

  // Handlers
  const handleAddTarget = (newTargetData: Omit<TargetJob, 'id' | 'createdAt'>) => {
    const newTarget: TargetJob = {
      ...newTargetData,
      id: `target-${Date.now()}`,
      createdAt: Date.now(),
    };
    setTargets((prev) => [...prev, newTarget]);
    setActiveId(newTarget.id);
    setActiveTab('practice');
  };

  const handleDeleteTarget = (targetId: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
    setSessions((prev) => prev.filter((s) => s.tid !== targetId));
    if (activeId === targetId) {
      const remaining = targets.filter((t) => t.id !== targetId);
      setActiveId(remaining[0]?.id || null);
    }
  };

  const handleSaveAnswer = (
    answerText: string,
    ratingScore: number,
    secs: number,
    feedback?: AnswerFeedback,
    audioBlobUrl?: string
  ) => {
    if (!activeTarget || !currentQuestion) return;

    const newSession: SessionAnswer = {
      id: `session-${Date.now()}`,
      tid: activeTarget.id,
      q: currentQuestion.q,
      cat: currentQuestion.cat,
      answer: answerText,
      rating: ratingScore,
      secs,
      ts: Date.now(),
      feedback,
      audioBlobUrl,
    };

    setSessions((prev) => [...prev, newSession]);
    pickNextQuestion(currentQuestion.q);
  };

  const handleAddCustomQuestion = (questionText: string) => {
    if (!activeTarget) return;
    setCustomQuestions((prev) => ({
      ...prev,
      [activeTarget.id]: [...(prev[activeTarget.id] || []), questionText],
    }));
    setCurrentQuestion({ q: questionText, cat: 'Your questions' });
  };

  const handleGenerateAIQuestions = async () => {
    if (!activeTarget) return;
    setIsGeneratingQuestions(true);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: activeTarget.role,
          company: activeTarget.company,
          field: activeTarget.type,
          skills: activeTarget.skills,
          jobDescription: activeTarget.jobDescription,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && Array.isArray(data.questions)) {
          const newQStrings = data.questions.map((item: any) => item.q);
          setCustomQuestions((prev) => ({
            ...prev,
            [activeTarget.id]: [...(prev[activeTarget.id] || []), ...newQStrings],
          }));

          // Set current to first generated question
          if (data.questions[0]) {
            setCurrentQuestion({
              q: data.questions[0].q,
              cat: data.questions[0].cat || 'Role skills',
              rationale: data.questions[0].rationale,
            });
          }
        }
      } else {
        throw new Error('Static deployment');
      }
    } catch (e) {
      // Local fallback for GitHub Pages
      const role = activeTarget.role;
      const co = activeTarget.company || 'our company';
      const fallbackList = [
        `How have your past experiences uniquely prepared you to excel as ${role} at ${co}?`,
        `Walk me through an end-to-end initiative you drove as ${role} where you solved an ambiguous problem.`,
        activeTarget.skills[0]
          ? `How do you apply ${activeTarget.skills[0]} to balance rapid delivery with top-tier quality?`
          : `How do you approach learning and mastering new tools in high-velocity teams?`,
        `Describe a scenario where a project was falling behind schedule. What interventions did you make?`,
        `What is the most critical metric you would focus on during your first 90 days as ${role} at ${co}?`,
      ];

      setCustomQuestions((prev) => ({
        ...prev,
        [activeTarget.id]: [...(prev[activeTarget.id] || []), ...fallbackList],
      }));

      setCurrentQuestion({
        q: fallbackList[0],
        cat: 'Role skills',
        rationale: 'Evaluates core competencies and execution capabilities',
      });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handlePractiseAgain = (questionText: string, cat: string) => {
    setCurrentQuestion({ q: questionText, cat });
    setActiveTab('practice');
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleToggleCheck = (index: number) => {
    setChecks((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCheckAll = () => {
    const all: Record<string, boolean> = {};
    for (let i = 0; i < 9; i++) all[i] = true;
    setChecks(all);
  };

  const handleResetChecks = () => {
    setChecks({});
  };

  const handleSaveCompletedMock = (mockSessions: SessionAnswer[]) => {
    setSessions((prev) => [...prev, ...mockSessions]);
    setActiveTab('history');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-8 flex flex-col gap-6">
      {/* 1. App Header */}
      <Header
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        selectedPersona={selectedPersona}
        onSelectPersona={(p) => setSelectedPersonaId(p.id)}
        onStartMockInterview={() => setIsMockOpen(true)}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak((a) => !a)}
      />

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left Sidebar */}
        <Sidebar
          targets={targets}
          activeId={activeTarget?.id || null}
          onSelectTarget={(id) => {
            setActiveId(id);
            setActiveTab('practice');
          }}
          onAddTarget={handleAddTarget}
          onDeleteTarget={handleDeleteTarget}
          sessions={sessions}
          selectedPersona={selectedPersona}
          onSelectPersona={(p) => setSelectedPersonaId(p.id)}
        />

        {/* Right Main Content */}
        <main className="flex flex-col gap-4 min-w-0">
          {/* Section Navigation Tabs */}
          <nav
            role="tablist"
            aria-label="Sections"
            className="flex items-center gap-2 border-b border-[#D5DBE6] dark:border-[#26324A] pb-1 overflow-x-auto text-sm"
          >
            {[
              { id: 'practice', label: 'Practice Stage' },
              { id: 'history', label: `Past Answers (${sessions.filter((s) => s.tid === activeTarget?.id).length})` },
              { id: 'progress', label: 'Progress & Trends' },
              { id: 'setup', label: 'Online Setup Check' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`px-3 py-2 font-semibold text-xs md:text-sm whitespace-nowrap border-b-2 transition cursor-pointer ${
                    isSelected
                      ? 'border-[#FFB400] text-[#101828] dark:text-[#EEF2FA]'
                      : 'border-transparent text-[#5B6577] dark:text-[#99A4B8] hover:text-[#101828] dark:hover:text-[#EEF2FA]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          {activeTab === 'practice' && (
            <VoiceInterviewerStage
              activeTarget={activeTarget}
              currentQuestion={currentQuestion}
              onNextQuestion={() => pickNextQuestion(currentQuestion?.q)}
              onSkipQuestion={() => pickNextQuestion(currentQuestion?.q)}
              onSaveAnswer={handleSaveAnswer}
              onAddCustomQuestion={handleAddCustomQuestion}
              selectedPersona={selectedPersona}
              autoSpeak={autoSpeak}
              lastSession={lastSessionForCurrent}
              onGenerateAIQuestions={handleGenerateAIQuestions}
              isGeneratingQuestions={isGeneratingQuestions}
            />
          )}

          {activeTab === 'history' && (
            <PastAnswersTab
              activeTarget={activeTarget}
              sessions={sessions}
              onPractiseAgain={handlePractiseAgain}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressTab activeTarget={activeTarget} sessions={sessions} />
          )}

          {activeTab === 'setup' && (
            <SetupTab
              checks={checks}
              onToggleCheck={handleToggleCheck}
              onCheckAll={handleCheckAll}
              onResetChecks={handleResetChecks}
            />
          )}
        </main>
      </div>

      {/* 3. Full Mock Interview Modal */}
      {isMockOpen && activeTarget && (
        <MockInterviewModal
          isOpen={isMockOpen}
          onClose={() => setIsMockOpen(false)}
          activeTarget={activeTarget}
          selectedPersona={selectedPersona}
          onSaveCompletedMock={handleSaveCompletedMock}
        />
      )}
    </div>
  );
}
