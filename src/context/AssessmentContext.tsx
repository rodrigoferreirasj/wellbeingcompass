
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import type {
  AssessmentData,
  UserInfo,
  ItemScore,
  ImprovementItem,
  AssessmentStage,
  WellbeingCategory,
  WellbeingItem,
  ActionItem
} from '@/types/assessment';
import { initialItemScores, wellbeingCategories, wellbeingItems, getCategoryForItem, getItemDetails } from '@/types/assessment';
import { sendUserDataEmail, type UserData } from '@/services/email-service';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface for average scores (kept for potential internal use or chart)
interface CategoryScore {
  categoryId: string;
  categoryName: string;
  categoryColor: string; // Added color
  currentAverage: number | null;
  desiredAverage: number | null;
}

// Interface for percentage scores
interface CategoryPercentage {
  categoryId: string;
  categoryName: string;
  categoryColor: string; // Added color
  currentPercentage: number | null;
  desiredPercentage: number | null;
}

interface AssessmentContextProps {
  assessmentData: AssessmentData;
  setAssessmentData: Dispatch<SetStateAction<AssessmentData>>;
  updateUserInfo: (info: UserInfo) => void;
  updateItemScore: (itemId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => void;
  selectImprovementItem: (itemId: string) => void;
  removeImprovementItem: (itemId: string) => void;
  updateActionItem: (itemId: string, actionIndex: number, text: string) => void;
  updateActionDate: (itemId: string, actionIndex: number, date: Date | null) => void;
  removeActionItem: (itemId: string, actionIndex: number) => void;
  goToStage: (stage: AssessmentStage) => void;
  submitAssessment: () => Promise<void>;
  isItemSelectedForImprovement: (itemId: string) => boolean;
  calculateCategoryScores: () => CategoryScore[]; // Calculates averages
  calculateCategoryPercentages: () => CategoryPercentage[]; // Calculates percentages
  getActionsForItem: (itemId: string) => ActionItem[];
  resetAssessment: () => void; // Added reset function
}

const AssessmentContext = createContext<AssessmentContextProps | undefined>(undefined);

const initialAssessmentState: AssessmentData = {
  userInfo: null,
  itemScores: initialItemScores.map(item => ({ ...item })), // Deep copy initial scores
  improvementItems: [],
  stage: 'userInfo',
};


export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(initialAssessmentState);

  const updateUserInfo = useCallback((info: UserInfo) => {
    setAssessmentData(prev => ({ ...prev, userInfo: info, stage: 'currentScore' }));
  }, []);

  const updateItemScore = useCallback((itemId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => {
    setAssessmentData(prev => ({
      ...prev,
      itemScores: prev.itemScores.map(s =>
        s.itemId === itemId ? { ...s, [scoreType]: score } : s
      ),
    }));
  }, []);

 const selectImprovementItem = useCallback((itemId: string) => {
    setAssessmentData(prev => {
      if (prev.improvementItems.some(ii => ii.itemId === itemId)) {
         // Already selected, do nothing or provide feedback (handled in component)
         return prev;
      }
      if (prev.improvementItems.length >= 3) {
         toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
         return prev; // Don't add if limit reached
      }
      const newItem: ImprovementItem = {
        itemId: itemId,
        actions: Array(3).fill(null).map((_, index) => ({ id: `${itemId}-action-${index}-${Date.now()}`, text: '', completionDate: null })),
      };
      toast({ title: `Item "${getItemDetails(itemId)?.name}" selecionado para melhoria.` });
      return {
        ...prev,
        improvementItems: [...prev.improvementItems, newItem],
      };
    });
  }, [toast]);

  const removeImprovementItem = useCallback((itemId: string) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementItems: prev.improvementItems.filter(ii => ii.itemId !== itemId),
    }));
     toast({ title: `Item "${getItemDetails(itemId)?.name}" removido da seleção.` });
  }, [toast]);

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

  const removeActionItem = useCallback((itemId: string, actionIndex: number) => {
       setAssessmentData(prev => ({
        ...prev,
        improvementItems: prev.improvementItems.map(ii =>
          ii.itemId === itemId
            ? {
                ...ii,
                actions: ii.actions.map((action, index) =>
                  index === actionIndex ? { ...action, text: '', completionDate: null } : action
                ),
              }
            : ii
        ),
      }));
       toast({ title: "Ação Limpa", description: "O texto e a data da ação foram removidos." });
  }, [toast]);

  const goToStage = useCallback((stage: AssessmentStage) => {
     // Ensure stage names are correct if they were changed (e.g., 'selectAreas' -> 'selectItems')
     // const correctedStage = stage === 'selectAreas' ? 'selectItems' : stage;
     setAssessmentData(prev => ({ ...prev, stage: stage }));
  }, []);

  // Calculates average scores per category
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
        categoryColor: category.color, // Include color
        currentAverage: currentAverage, // Keep raw average
        desiredAverage: desiredAverage, // Keep raw average
      };
    });
  }, [assessmentData.itemScores]);

  // Calculates percentage scores per category
  const calculateCategoryPercentages = useCallback((): CategoryPercentage[] => {
    return wellbeingCategories.map(category => {
        const itemsInCategory = wellbeingItems.filter(item => item.categoryId === category.id);
        const itemScoresInCategory = assessmentData.itemScores.filter(score =>
            itemsInCategory.some(item => item.id === score.itemId)
        );

        const maxScorePerItem = 10;
        const totalPossibleScore = itemsInCategory.length * maxScorePerItem;

        const validCurrentScores = itemScoresInCategory.map(s => s.currentScore).filter(s => s !== null) as number[];
        const validDesiredScores = itemScoresInCategory.map(s => s.desiredScore).filter(s => s !== null) as number[];

        // Calculate sum only if there are valid scores, otherwise sum is 0
        const currentSum = validCurrentScores.length > 0 ? validCurrentScores.reduce((sum, score) => sum + score, 0) : 0;
        const desiredSum = validDesiredScores.length > 0 ? validDesiredScores.reduce((sum, score) => sum + score, 0) : 0;

        // Calculate percentage only if total possible score is greater than 0
        const currentPercentage = totalPossibleScore > 0 && validCurrentScores.length > 0
            ? (currentSum / totalPossibleScore) * 100
            : null;
        const desiredPercentage = totalPossibleScore > 0 && validDesiredScores.length > 0
            ? (desiredSum / totalPossibleScore) * 100
            : null;


        return {
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color, // Include color
            currentPercentage: currentPercentage,
            desiredPercentage: desiredPercentage,
        };
    });
 }, [assessmentData.itemScores]);


  // Updated formatAssessmentResults to include percentages
  const formatAssessmentResults = useCallback((): string => {
    let resultString = "Resultados da Roda do Bem-Estar:\n\n";
    const categoryPercentages = calculateCategoryPercentages(); // Get percentages

    resultString += "--- Percentuais por Categoria ---\n";
    categoryPercentages.forEach(catPerc => {
        resultString += `${catPerc.categoryName}:\n`;
        resultString += `  - Percentual Atual: ${catPerc.currentPercentage !== null ? catPerc.currentPercentage.toFixed(0) + '%' : 'N/A'}\n`;
        resultString += `  - Percentual Desejado: ${catPerc.desiredPercentage !== null ? catPerc.desiredPercentage.toFixed(0) + '%' : 'N/A'}\n\n`;
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
  }, [assessmentData.itemScores, calculateCategoryPercentages]); // Use percentage function


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
        if (action.text.trim() !== '' || action.completionDate) {
            planString += `  Ação ${index + 1}: ${action.text || '(Ação não definida)'}\n`;
            planString += `    Data de Conclusão: ${action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : '(Data não definida)'}\n`;
        }
      });
      planString += "\n";
    });
    return planString;
  }, [assessmentData.improvementItems]);


  const submitAssessment = useCallback(async () => {
     if (!assessmentData.userInfo) {
      toast({ title: "Erro", description: "Informações do usuário estão faltando.", variant: "destructive" });
      goToStage('userInfo');
      return;
    }

    const allCurrentScored = assessmentData.itemScores.every(s => s.currentScore !== null);
    const allDesiredScored = assessmentData.itemScores.every(s => s.desiredScore !== null);
    const itemsSelected = assessmentData.improvementItems.length > 0;
    const actionsDefined = assessmentData.improvementItems.every(ii =>
      ii.actions.some(a => a.text.trim() !== '' && a.completionDate !== null) &&
      ii.actions.every(a => a.text.trim() === '' || a.completionDate !== null)
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
        duration: 7000,
      });

      if (!allCurrentScored) goToStage('currentScore');
      else if (!allDesiredScored) goToStage('desiredScore');
      else if (!itemsSelected) goToStage('selectItems');
      else goToStage('defineActions');
      return;
    }


    const userDataToSend: UserData = {
      ...assessmentData.userInfo,
      assessmentResults: formatAssessmentResults(), // Uses percentages now
      actionPlan: formatActionPlan(),
    };

    try {
      // TODO: Replace console.log with actual email sending logic
      // await sendUserDataEmail(userDataToSend);
      console.log("Dados a serem enviados:", JSON.stringify(userDataToSend, null, 2));
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
  }, [assessmentData, formatAssessmentResults, formatActionPlan, goToStage, toast, calculateCategoryPercentages]);

  // Function to reset the assessment state
  const resetAssessment = useCallback(() => {
    setAssessmentData(initialAssessmentState);
    toast({ title: "Avaliação Reiniciada", description: "Você pode começar uma nova avaliação." });
  }, [toast]);


  const value = {
    assessmentData,
    setAssessmentData,
    updateUserInfo,
    updateItemScore,
    selectImprovementItem,
    removeImprovementItem,
    updateActionItem,
    updateActionDate,
    removeActionItem,
    goToStage,
    submitAssessment,
    isItemSelectedForImprovement,
    calculateCategoryScores, // Calculates averages
    calculateCategoryPercentages, // Calculates percentages
    getActionsForItem,
    resetAssessment, // Added reset function
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
```