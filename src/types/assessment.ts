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
  actions: ActionItem[];
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

// Define Items based on the image
export const wellbeingItems: WellbeingItem[] = [
  // Carreira
  { id: 'trabalho', name: 'Trabalho', categoryId: 'career' },
  { id: 'desenvolvimento', name: 'Desenvolvimento Intelectual', categoryId: 'career' },
  { id: 'realizacao', name: 'Realização e Propósito', categoryId: 'career' },
  // Social
  { id: 'familia', name: 'Família', categoryId: 'social' },
  { id: 'amigos', name: 'Amigos', categoryId: 'social' },
  { id: 'lazer', name: 'Lazer', categoryId: 'social' },
  { id: 'relacionamento', name: 'Relacionamento Amoroso', categoryId: 'social' },
  { id: 'hobbies', name: 'Hobbies e Diversão', categoryId: 'social' },
  // Financeiro
  { id: 'controle', name: 'Controle Financeiro', categoryId: 'financial' },
  { id: 'recursos', name: 'Recursos Financeiros', categoryId: 'financial' },
  // Saúde (Previously Physical) - Includes items listed under Saúde in the image
  { id: 'fisica', name: 'Física', categoryId: 'physical' }, // Mapped Física under Saúde category
  { id: 'emocional', name: 'Emocional', categoryId: 'physical' }, // Mapped Emocional under Saúde category
  { id: 'espiritual', name: 'Espiritual', categoryId: 'physical' }, // Mapped Espiritual under Saúde category
  // Comunitário
  { id: 'contribuicao', name: 'Contribuição', categoryId: 'community' },
  { id: 'conexao', name: 'Conexão', categoryId: 'community' },
];


// Initial state helper for item scores
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
