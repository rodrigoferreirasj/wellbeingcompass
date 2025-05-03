
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import type {
  AssessmentData,
  UserInfo,
  ItemScore, // Changed
  ImprovementItem, // Changed
  AssessmentStage,
  WellbeingCategory,
  WellbeingItem,
  ActionItem
} from '@/types/assessment';
import { initialItemScores, wellbeingCategories, wellbeingItems, getCategoryForItem, getItemDetails } from '@/types/assessment'; // Updated imports
import { sendUserDataEmail, type UserData } from '@/services/email-service';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns'; // For formatting dates in email
import { ptBR } from 'date-fns/locale'; // For formatting dates in email

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  currentAverage: number | null;
  desiredAverage: number | null;
}
interface AssessmentContextProps {
  assessmentData: AssessmentData;
  setAssessmentData: Dispatch<SetStateAction<AssessmentData>>;
  updateUserInfo: (info: UserInfo) => void;
  updateItemScore: (itemId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => void; // Renamed
  selectImprovementItem: (itemId: string) => void; // Renamed
  removeImprovementItem: (itemId: string) => void; // Renamed
  updateActionItem: (itemId: string, actionIndex: number, text: string) => void;
  updateActionDate: (itemId: string, actionIndex: number, date: Date | null) => void;
  // addActionItem: (itemId: string) => void; // Keep if needed, but might be handled by initialization
  removeActionItem: (itemId: string, actionIndex: number) => void; // Clears action
  goToStage: (stage: AssessmentStage) => void;
  submitAssessment: () => Promise<void>;
  isItemSelectedForImprovement: (itemId: string) => boolean; // Renamed
  calculateCategoryScores: () => CategoryScore[]; // New function
  getActionsForItem: (itemId: string) => ActionItem[]; // New helper
}

const AssessmentContext = createContext<AssessmentContextProps | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    userInfo: null,
    itemScores: initialItemScores, // Use initialItemScores
    improvementItems: [], // Use improvementItems
    stage: 'userInfo',
  });

  const updateUserInfo = useCallback((info: UserInfo) => {
    setAssessmentData(prev => ({ ...prev, userInfo: info, stage: 'currentScore' }));
  }, []);

  // Renamed from updateScore to updateItemScore
  const updateItemScore = useCallback((itemId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => {
    setAssessmentData(prev => ({
      ...prev,
      itemScores: prev.itemScores.map(s =>
        s.itemId === itemId ? { ...s, [scoreType]: score } : s
      ),
    }));
  }, []);

  // Renamed from selectImprovementArea
 const selectImprovementItem = useCallback((itemId: string) => {
    setAssessmentData(prev => {
        // Limit to 3 items - Check if item already exists
      if (prev.improvementItems.length >= 3 || prev.improvementItems.some(ii => ii.itemId === itemId)) {
         if (prev.improvementItems.some(ii => ii.itemId === itemId)) {
             // If already selected, maybe do nothing or provide feedback?
             // toast({ title: "Item já selecionado", description: `${getItemDetails(itemId)?.name} já está na sua lista.` });
         } else {
             toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
         }
        return prev;
      }
      const newItem: ImprovementItem = {
        itemId: itemId,
        // Initialize with 3 empty action slots
        actions: Array(3).fill(null).map((_, index) => ({ id: `${itemId}-action-${index}-${Date.now()}`, text: '', completionDate: null })),
      };
      return {
        ...prev,
        improvementItems: [...prev.improvementItems, newItem],
      };
    });
     toast({ title: `Item "${getItemDetails(itemId)?.name}" selecionado para melhoria.` });
  }, [toast]);


  // Renamed from removeImprovementArea
  const removeImprovementItem = useCallback((itemId: string) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementItems: prev.improvementItems.filter(ii => ii.itemId !== itemId),
    }));
     toast({ title: `Item "${getItemDetails(itemId)?.name}" removido da seleção.` });
  }, [toast]);

  // Renamed from isAreaSelectedForImprovement
  const isItemSelectedForImprovement = useCallback((itemId: string): boolean => {
    return assessmentData.improvementItems.some(ii => ii.itemId === itemId);
  }, [assessmentData.improvementItems]);


   const getActionsForItem = useCallback((itemId: string): ActionItem[] => {
       const improvementItem = assessmentData.improvementItems.find(ii => ii.itemId === itemId);
       return improvementItem ? improvementItem.actions : [];
   }, [assessmentData.improvementItems]);


  const updateActionItem = useCallback((itemId: string, actionIndex: number, text: string) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementItems: prev.improvementItems.map(ii =>
        ii.itemId === itemId
          ? {
              ...ii,
              actions: ii.actions.map((action, index) =>
                index === actionIndex ? { ...action, text: text } : action
              ),
            }
          : ii
      ),
    }));
  }, []);

 const updateActionDate = useCallback((itemId: string, actionIndex: number, date: Date | null) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementItems: prev.improvementItems.map(ii =>
        ii.itemId === itemId
          ? {
              ...ii,
              actions: ii.actions.map((action, index) =>
                index === actionIndex ? { ...action, completionDate: date } : action
              ),
            }
          : ii
      ),
    }));
  }, []);


  // No longer needed if always 3 slots? If enabling add, implement here.
  // const addActionItem = useCallback((itemId: string) => {}, []);

  // Renamed from removeActionItem, clears action text/date
  const removeActionItem = useCallback((itemId: string, actionIndex: number) => {
       setAssessmentData(prev => ({
        ...prev,
        improvementItems: prev.improvementItems.map(ii =>
          ii.itemId === itemId
            ? {
                ...ii,
                actions: ii.actions.map((action, index) =>
                  index === actionIndex ? { ...action, text: '', completionDate: null } : action // Clear the specific action
                ),
              }
            : ii
        ),
      }));
       toast({ title: "Ação Limpa", description: "O texto e a data da ação foram removidos." });
  }, [toast]);


  const goToStage = useCallback((stage: AssessmentStage) => {
     // Adjust stage names if needed, e.g., 'selectAreas' -> 'selectItems'
     const correctedStage = stage === 'selectAreas' ? 'selectItems' : stage;
     setAssessmentData(prev => ({ ...prev, stage: correctedStage }));
  }, []);


  // New function to calculate average scores per category
  const calculateCategoryScores = useCallback((): CategoryScore[] => {
    return wellbeingCategories.map(category => {
      const itemsInCategory = wellbeingItems.filter(item => item.categoryId === category.id);
      const itemScoresInCategory = assessmentData.itemScores.filter(score =>
        itemsInCategory.some(item => item.id === score.itemId)
      );

      const validCurrentScores = itemScoresInCategory.map(s => s.currentScore).filter(s => s !== null) as number[];
      const validDesiredScores = itemScoresInCategory.map(s => s.desiredScore).filter(s => s !== null) as number[];

      const currentAverage = validCurrentScores.length > 0
        ? validCurrentScores.reduce((sum, score) => sum + score, 0) / validCurrentScores.length
        : null;

      const desiredAverage = validDesiredScores.length > 0
        ? validDesiredScores.reduce((sum, score) => sum + score, 0) / validDesiredScores.length
        : null;

      return {
        categoryId: category.id,
        categoryName: category.name,
        currentAverage: currentAverage !== null ? parseFloat(currentAverage.toFixed(1)) : null, // Rounded to 1 decimal
        desiredAverage: desiredAverage !== null ? parseFloat(desiredAverage.toFixed(1)) : null, // Rounded to 1 decimal
      };
    });
  }, [assessmentData.itemScores]);


  // Updated formatAssessmentResults for items and categories
  const formatAssessmentResults = useCallback((): string => {
    let resultString = "Resultados da Roda do Bem-Estar:\n\n";
    const categoryScores = calculateCategoryScores();

    resultString += "--- Médias por Categoria ---\n";
    categoryScores.forEach(catScore => {
        resultString += `${catScore.categoryName}:\n`;
        resultString += `  - Média Atual: ${catScore.currentAverage ?? 'N/A'}\n`;
        resultString += `  - Média Desejada: ${catScore.desiredAverage ?? 'N/A'}\n\n`;
    });

    resultString += "--- Pontuações por Item ---\n";
    assessmentData.itemScores.forEach(itemScore => {
      const item = getItemDetails(itemScore.itemId);
      const category = item ? getCategoryForItem(item.id) : undefined;
      resultString += `${item?.name} (${category?.name}):\n`;
      resultString += `  - Pontuação Atual: ${itemScore.currentScore ?? 'N/A'}\n`;
      resultString += `  - Pontuação Desejada: ${itemScore.desiredScore ?? 'N/A'}\n`;
      const difference = itemScore.currentScore !== null && itemScore.desiredScore !== null ? itemScore.desiredScore - itemScore.currentScore : null;
      resultString += `  - Diferença: ${difference !== null ? difference : 'N/A'}\n\n`;
    });

    return resultString;
  }, [assessmentData.itemScores, calculateCategoryScores]);


   // Updated formatActionPlan for items
  const formatActionPlan = useCallback((): string => {
     if (assessmentData.improvementItems.length === 0) {
        return "Nenhum item selecionado para melhoria ou plano de ação definido.\n";
     }

    let planString = "Plano de Ação:\n\n";
    assessmentData.improvementItems.forEach(impItem => {
      const item = getItemDetails(impItem.itemId);
      const category = item ? getCategoryForItem(item.id) : undefined;
      planString += `Item: ${item?.name} (${category?.name})\n`;
      impItem.actions.forEach((action, index) => {
        // Only include actions that have text or a date
        if (action.text.trim() !== '' || action.completionDate) {
            planString += `  Ação ${index + 1}: ${action.text || '(Ação não definida)'}\n`;
            planString += `    Data de Conclusão: ${action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : '(Data não definida)'}\n`;
        }
      });
      planString += "\n";
    });
    return planString;
  }, [assessmentData.improvementItems]);


  // Updated submitAssessment validation and data formatting
  const submitAssessment = useCallback(async () => {
     if (!assessmentData.userInfo) {
      toast({ title: "Erro", description: "Informações do usuário estão faltando.", variant: "destructive" });
      goToStage('userInfo');
      return;
    }

    const allCurrentScored = assessmentData.itemScores.every(s => s.currentScore !== null);
    const allDesiredScored = assessmentData.itemScores.every(s => s.desiredScore !== null);
    const itemsSelected = assessmentData.improvementItems.length > 0;
    // Ensure every selected improvement item has at least one action with text and a date
    const actionsDefined = assessmentData.improvementItems.every(ii =>
      ii.actions.some(a => a.text.trim() !== '' && a.completionDate !== null) && // at least one complete action
      ii.actions.every(a => a.text.trim() === '' || a.completionDate !== null) // all actions with text have a date
    );


    if (!allCurrentScored || !allDesiredScored || !itemsSelected || !actionsDefined) {
       let description = "Por favor, complete todas as etapas antes de concluir:\n";
       if (!allCurrentScored) description += "- Avalie todos os itens no estágio 'Atual'.\n";
       if (!allDesiredScored) description += "- Defina notas desejadas para todos os itens.\n";
       if (!itemsSelected) description += "- Selecione pelo menos um item para melhorar.\n";
       if (!actionsDefined) description += "- Para cada item selecionado, defina pelo menos uma ação completa (texto e data). Certifique-se de que todas as ações com texto tenham uma data.";

       toast({
        title: "Informações Incompletas",
        description: description,
        variant: "destructive",
        duration: 7000, // Longer duration for more text
      });

      // Guide user to the specific stage
      if (!allCurrentScored) goToStage('currentScore');
      else if (!allDesiredScored) goToStage('desiredScore');
      else if (!itemsSelected) goToStage('selectItems'); // Updated stage name
      else goToStage('defineActions');
      return;
    }


    const userDataToSend: UserData = {
      ...assessmentData.userInfo,
      assessmentResults: formatAssessmentResults(),
      actionPlan: formatActionPlan(),
    };

    try {
      // TODO: Replace console.log with actual email sending logic
      // await sendUserDataEmail(userDataToSend);
      console.log("Dados a serem enviados:", JSON.stringify(userDataToSend, null, 2)); // Pretty print
      toast({
        title: "Sucesso!",
        description: "Sua avaliação foi enviada com sucesso. Verifique seu e-mail (simulado).",
      });
      goToStage('summary');
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro ao Enviar",
        description: "Houve um problema ao enviar sua avaliação. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [assessmentData, formatAssessmentResults, formatActionPlan, goToStage, toast, calculateCategoryScores]); // Added calculateCategoryScores dependency


  const value = {
    assessmentData,
    setAssessmentData,
    updateUserInfo,
    updateItemScore, // Renamed
    selectImprovementItem, // Renamed
    removeImprovementItem, // Renamed
    updateActionItem,
    updateActionDate,
    removeActionItem, // Function to clear action
    goToStage,
    submitAssessment,
    isItemSelectedForImprovement, // Renamed
    calculateCategoryScores, // Added
    getActionsForItem, // Added
  };

  return <AssessmentContext.Provider value={value}>{children}</AssessmentContext.Provider>;
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (context === undefined) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
