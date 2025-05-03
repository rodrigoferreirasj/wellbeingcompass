
export interface UserInfo {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
}

export interface WellbeingCategory {
  id: 'career' | 'social' | 'financial' | 'physical' | 'community';
  name: string;
  color: string; // Base color for the category
}

export interface WellbeingItem {
  id: string; // e.g., 'trabalho', 'familia'
  name: string;
  categoryId: WellbeingCategory['id'];
  description?: string; // Optional description for tooltips
}

export interface ItemScore {
  itemId: string;
  currentScore: number | null;
  desiredScore: number | null;
}

export interface ActionItem {
  id: string; // Unique ID for each action item
  text: string;
  completionDate: Date | null;
}

export interface ImprovementItem {
  itemId: string;
  actions: ActionItem[]; // Starts with one, user can add more
}

// Stages might need adjustment based on new flow
export type AssessmentStage = 'userInfo' | 'currentScore' | 'desiredScore' | 'selectItems' | 'defineActions' | 'summary';

export interface AssessmentData {
  userInfo: UserInfo | null;
  itemScores: ItemScore[]; // Changed from scores
  improvementItems: ImprovementItem[]; // Changed from improvementAreas
  stage: AssessmentStage;
}

// Define Categories
export const wellbeingCategories: WellbeingCategory[] = [
  { id: 'career', name: 'Carreira', color: 'hsl(var(--chart-1))' }, // Teal
  { id: 'social', name: 'Social', color: 'hsl(var(--chart-2))' }, // Orange
  { id: 'financial', name: 'Financeiro', color: 'hsl(var(--chart-3))' }, // Muted Blue
  { id: 'physical', name: 'Saúde', color: 'hsl(var(--chart-4))' }, // Green (Renamed from 'physical' to 'Saúde' for consistency)
  { id: 'community', name: 'Comunitário', color: 'hsl(var(--chart-5))' }, // Purple
];

// Define Items based on the requested visual clockwise order starting from the top
export const wellbeingItems: WellbeingItem[] = [
  // Order based on user request for visual representation on the chart
  // Starting roughly at 12 o'clock and going clockwise
  { id: 'trabalho', name: 'Trabalho', categoryId: 'career', description: 'Satisfação com sua ocupação principal e ambiente de trabalho.' },
  { id: 'desenvolvimento', name: 'Desenvolvimento Intelectual', categoryId: 'career', description: 'Aprendizado contínuo e crescimento de habilidades.' },
  { id: 'realizacao', name: 'Realização e Propósito', categoryId: 'career', description: 'Sentimento de significado e contribuição através do seu trabalho ou vocação.' },
  { id: 'familia', name: 'Família', categoryId: 'social', description: 'Qualidade dos relacionamentos com membros da família.' },
  { id: 'amigos', name: 'Amigos', categoryId: 'social', description: 'Conexões sociais e suporte de amigos.' },
  { id: 'lazer', name: 'Lazer', categoryId: 'social', description: 'Tempo dedicado a atividades prazerosas e relaxantes.' },
  { id: 'relacionamento', name: 'Relacionamento Amoroso', categoryId: 'social', description: 'Satisfação com a parceria íntima, se aplicável.' },
  { id: 'hobbies', name: 'Hobbies e Diversão', categoryId: 'social', description: 'Engajamento em atividades recreativas e interesses pessoais.' },
  { id: 'controle', name: 'Controle Financeiro', categoryId: 'financial', description: 'Capacidade de gerenciar suas finanças e orçamento.' },
  { id: 'recursos', name: 'Recursos Financeiros', categoryId: 'financial', description: 'Suficiência de dinheiro para atender às necessidades e desejos.' },
  { id: 'fisica', name: 'Física', categoryId: 'physical', description: 'Nível de saúde física, energia e vitalidade.' },
  { id: 'emocional', name: 'Emocional', categoryId: 'physical', description: 'Bem-estar mental, gerenciamento de estresse e resiliência.' },
  { id: 'espiritual', name: 'Espiritual', categoryId: 'physical', description: 'Conexão com valores, crenças ou um senso de propósito maior.' },
  { id: 'contribuicao', name: 'Contribuição', categoryId: 'community', description: 'Envolvimento em atividades que beneficiam a comunidade ou causas maiores.' },
  { id: 'conexao', name: 'Conexão', categoryId: 'community', description: 'Sentimento de pertencimento e conexão com a comunidade local ou grupos.' },
];


// Helper to generate unique action IDs
export const generateActionId = (itemId: string, index: number): string => {
    return `${itemId}-action-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};


// Initial state helper for item scores - derived automatically from the ordered wellbeingItems
export const initialItemScores: ItemScore[] = wellbeingItems.map(item => ({
  itemId: item.id,
  currentScore: null,
  desiredScore: null,
}));

// Helper function to get category for an item
export const getCategoryForItem = (itemId: string): WellbeingCategory | undefined => {
    const item = wellbeingItems.find(i => i.id === itemId);
    return item ? wellbeingCategories.find(c => c.id === item.categoryId) : undefined;
};

// Helper function to get item details
export const getItemDetails = (itemId: string): WellbeingItem | undefined => {
    return wellbeingItems.find(i => i.id === itemId);
};
