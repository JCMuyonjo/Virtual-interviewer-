import { TargetJob, SessionAnswer } from '../types';

interface AppState {
  targets: TargetJob[];
  sessions: SessionAnswer[];
  active: string | null;
  custom: Record<string, string[]>;
  checks: Record<string, boolean>;
  selectedPersonaId: string;
}

const DEFAULT_TARGETS: TargetJob[] = [
  {
    id: 't-demo-1',
    role: 'Senior Product Designer',
    company: 'Stripe',
    type: 'product',
    skills: ['design systems', 'stakeholder alignment', 'user research', 'Figma', 'A/B testing'],
    jobDescription: 'Leading checkout and billing UX with high precision and measurable conversion improvements.',
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 't-demo-2',
    role: 'Staff Full-Stack Engineer',
    company: 'Vercel',
    type: 'tech',
    skills: ['TypeScript', 'Next.js', 'Distributed Systems', 'Edge runtime', 'CI/CD performance'],
    jobDescription: 'Designing resilient cloud infrastructure and developer tooling for global web teams.',
    createdAt: Date.now() - 86400000 * 2,
  },
];

const DEFAULT_SESSIONS: SessionAnswer[] = [
  {
    id: 's-demo-1',
    tid: 't-demo-1',
    q: 'Tell me about yourself and what brought you to this stage in your career.',
    cat: 'Intro',
    answer: 'I started my career over 6 years ago focusing on enterprise SaaS UX. At my current company, I spearheaded the overhaul of our checkout workflow, boosting conversion by 14%. I am especially excited about Stripe because of your obsessive focus on developer ergonomics and craft.',
    rating: 4,
    secs: 68,
    ts: Date.now() - 86400000,
    feedback: {
      rating: 4,
      summary: 'Strong, articulate intro with a quantifiable business impact right up front.',
      starBreakdown: {
        situation: 'Set up 6 years in SaaS product design clearly.',
        task: 'Stated goal to overhaul checkout experience.',
        action: 'Spearheaded the redesign and design systems cohesion.',
        result: 'Quoted a solid 14% conversion uplift.',
      },
      strengths: ['Immediate metric (+14% conversion)', 'Clear alignment with Stripe core values'],
      improvements: ['Mention how you collaborated with product and engineering leads'],
      followUpQuestion: 'How did you handle pushback from engineering when the redesign required refactoring legacy endpoints?',
      verbalReaction: 'Excellent opening. The 14% conversion lift immediately establishes tangible business impact.',
    },
  },
];

const STORAGE_KEY = 'rr_voice_app_v2';
const LEGACY_KEY = 'rr1';

export const storageService = {
  load(): AppState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }

      // Check legacy format
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return {
          targets: parsed.targets?.length ? parsed.targets : DEFAULT_TARGETS,
          sessions: parsed.sessions || [],
          active: parsed.active || (parsed.targets?.[0]?.id ?? 't-demo-1'),
          custom: parsed.custom || {},
          checks: {},
          selectedPersonaId: 'kore',
        };
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }

    return {
      targets: DEFAULT_TARGETS,
      sessions: DEFAULT_SESSIONS,
      active: 't-demo-1',
      custom: {},
      checks: {},
      selectedPersonaId: 'kore',
    };
  },

  save(state: AppState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },
};
