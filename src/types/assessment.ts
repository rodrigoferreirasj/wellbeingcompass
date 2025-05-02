export interface UserInfo {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
}

export interface WellbeingArea {
  id: string;
  name: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>; // Use Lucide icons or similar
}

export interface AreaScore {
  areaId: string;
  currentScore: number | null;
  desiredScore: number | null;
}

export interface ActionItem {
  id: string; // Unique ID for each action item
  text: string;
  completionDate: Date | null;
}

export interface ImprovementArea {
  areaId: string;
  actions: ActionItem[];
}

export type AssessmentStage = 'userInfo' | 'currentScore' | 'desiredScore' | 'selectAreas' | 'defineActions' | 'summary';

export interface AssessmentData {
  userInfo: UserInfo | null;
  scores: AreaScore[];
  improvementAreas: ImprovementArea[];
  stage: AssessmentStage;
}

export const wellbeingAreas: WellbeingArea[] = [
  { id: 'career', name: 'Carreira', description: 'Gostar do que você faz todos os dias.' },
  { id: 'social', name: 'Social', description: 'Ter relacionamentos fortes em sua vida.' },
  { id: 'financial', name: 'Financeiro', description: 'Gerenciar sua vida econômica de forma eficaz.' },
  { id: 'physical', name: 'Físico', description: 'Ter boa saúde e energia suficiente para fazer as coisas diariamente.' },
  { id: 'community', name: 'Comunidade', description: 'Gostar de onde você mora, sentir-se seguro e ter orgulho de sua comunidade.' },
];

// Initial state helper
export const initialScores = wellbeingAreas.map(area => ({
  areaId: area.id,
  currentScore: null,
  desiredScore: null,
}));
