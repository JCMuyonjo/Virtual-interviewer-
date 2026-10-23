import { QuestionItem, InterviewerPersona } from '../types';

export const BANK: Record<string, [string, string][]> = {
  general: [
    ['Tell me about yourself and what brought you to this stage in your career.', 'Intro'],
    ['Why do you want to work at {company} specifically?', 'Motivation'],
    ['Why are you the ideal fit for the {role} position?', 'Motivation'],
    ['Tell me about a time you had a significant disagreement with a teammate or stakeholder.', 'Behavioral'],
    ['Describe a mistake you made, how you handled it, and what you changed afterwards.', 'Behavioral'],
    ['Tell me about a time you had to learn a complex domain or tool under tight deadlines.', 'Behavioral'],
    ['What is an area of development or weakness you are actively working on?', 'Behavioral'],
    ['Where do you want to be in your career over the next three years?', 'Motivation'],
    ['Tell me about a project or achievement you are most proud of.', 'Behavioral'],
    ['Do you have any thoughtful questions for our team or company leadership?', 'Closing'],
  ],
  tech: [
    ['Walk me through how you would debug a critical production issue that you cannot easily reproduce.', 'Role skills'],
    ['Explain a major architectural or technical trade-off you navigated and what made it successful.', 'Role skills'],
    ['How do you approach code reviews to balance code quality with team velocity?', 'Role skills'],
    ['Describe a distributed system or key component you designed. What would you do differently today?', 'Role skills'],
    ['How do you handle technical debt when product managers demand fast feature turnaround?', 'Role skills'],
  ],
  product: [
    ['How would you decide what to build next when competing stakeholders all claim their request is urgent?', 'Role skills'],
    ['Walk me through a product or major feature you shipped from initial discovery to launch.', 'Role skills'],
    ['How do you handle qualitative user feedback that directly contradicts quantitative analytics?', 'Role skills'],
    ['How do you earn respect and work effectively with engineers when scope and deadlines are tight?', 'Role skills'],
    ['Define your favorite product metric and explain how you would measure retention vs acquisition.', 'Role skills'],
  ],
  sales: [
    ['Walk me through how you handle a prospective customer who insists your solution is too expensive.', 'Role skills'],
    ['Tell me about the biggest deal or account you won, saved, or expanded.', 'Role skills'],
    ['How do you prepare and build rapport before a first discovery call with a high-value client?', 'Role skills'],
    ['Tell me about an important customer you lost. What did you learn and implement next?', 'Role skills'],
  ],
  data: [
    ['How do you verify that an incoming dataset is trustworthy and unbiased before modeling or analyzing?', 'Role skills'],
    ['Describe an analysis you performed that directly changed a company or product strategy.', 'Role skills'],
    ['How would you explain a complex statistical finding or regression to non-technical executive stakeholders?', 'Role skills'],
    ['How do you decide which North Star metric matters most in ambiguous business contexts?', 'Role skills'],
  ],
  ops: [
    ['Tell me about a time you redesigned an inefficient process and quantified the time or cost saved.', 'Role skills'],
    ['How do you ruthlessly prioritize when your team is overloaded with incoming escalations?', 'Role skills'],
    ['Describe how you handled an underperforming team member or vendor bottleneck.', 'Role skills'],
    ['How do you keep cross-functional teams aligned and motivated during high-stakes organizational change?', 'Role skills'],
  ],
};

export const CHECKLIST_ITEMS = [
  'Test your camera and microphone in the exact application (Zoom, Teams, Google Meet).',
  'Position your camera at eye level and maintain natural eye contact with the lens.',
  'Face a soft light source (window or lamp) so your face is evenly illuminated with no harsh backlighting.',
  'Use wired or low-latency headphones to eliminate echo and filter background room noise.',
  'Silence computer notifications, Slack/Teams pings, and set your phone to Do Not Disturb.',
  'Plug in your laptop charger and verify stable high-speed Wi-Fi or Ethernet connection.',
  'Have your resume, target job description, key metrics, and STAR stories open on a side monitor or notepad.',
  'Prepare 3 thoughtful questions about company culture, team roadmap, and success criteria for the first 90 days.',
  'Keep a fresh glass of water nearby and join 3-5 minutes before scheduled start time.',
];

export const INTERVIEWER_PERSONAS: InterviewerPersona[] = [
  {
    id: 'kore',
    name: 'Sarah Chen',
    title: 'Senior Hiring Manager',
    style: 'Calm, thoughtful, and analytical. Focuses on trade-offs and impact.',
    voice: 'Kore',
    avatarColor: 'from-amber-500 to-orange-600',
    tagline: 'Empathetic yet rigorous interviewer',
  },
  {
    id: 'fenrir',
    name: 'Marcus Vance',
    title: 'VP of Engineering & Strategy',
    style: 'Crisp, fast-paced, and incisive. Probes deeply on architecture and metrics.',
    voice: 'Fenrir',
    avatarColor: 'from-blue-600 to-indigo-700',
    tagline: 'Technical deep-diver',
  },
  {
    id: 'zephyr',
    name: 'Elena Rostova',
    title: 'Head of Talent Acquisition',
    style: 'Warm, encouraging, and conversational. Emphasizes culture and team collaboration.',
    voice: 'Zephyr',
    avatarColor: 'from-emerald-500 to-teal-700',
    tagline: 'Culture & values evaluator',
  },
  {
    id: 'puck',
    name: 'David Miller',
    title: 'Executive Behavioral Coach',
    style: 'Direct, structured, and constructive. Evaluates leadership and STAR method clarity.',
    voice: 'Puck',
    avatarColor: 'from-purple-600 to-rose-600',
    tagline: 'STAR structure specialist',
  },
];
