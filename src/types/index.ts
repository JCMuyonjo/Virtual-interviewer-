export type FieldType = 'tech' | 'product' | 'sales' | 'data' | 'ops' | 'general';

export interface TargetJob {
  id: string;
  role: string;
  company: string;
  type: FieldType;
  skills: string[];
  jobDescription?: string;
  createdAt: number;
}

export interface QuestionItem {
  q: string;
  cat: string;
  rationale?: string;
}

export interface StarBreakdown {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface AnswerFeedback {
  rating: number;
  summary: string;
  starBreakdown: StarBreakdown;
  strengths: string[];
  improvements: string[];
  followUpQuestion?: string;
  verbalReaction?: string;
}

export interface SessionAnswer {
  id: string;
  tid: string;
  q: string;
  cat: string;
  answer: string;
  audioBlobUrl?: string;
  rating: number;
  secs: number;
  ts: number;
  feedback?: AnswerFeedback;
}

export type VoicePersona = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface InterviewerPersona {
  id: string;
  name: string;
  title: string;
  style: string;
  voice: VoicePersona;
  avatarColor: string;
  tagline: string;
}

export type ActiveTab = 'practice' | 'mock' | 'history' | 'progress' | 'setup';
