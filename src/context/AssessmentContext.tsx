
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction, useEffect } from 'react';
import emailjs from '@emailjs/browser';
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
import { initialItemScores, wellbeingCategories, wellbeingItems, getCategoryForItem, getItemDetails, generateActionId } from '@/types/assessment';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  currentAverage: number | null;
  desiredAverage: number | null;
}

interface CategoryPercentage {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
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
  addActionItemSlot: (itemId: string) => void;
  goToStage: (stage: AssessmentStage) => void;
  submitAssessment: () => Promise<void>;
  isItemSelectedForImprovement: (itemId: string) => boolean;
  calculateCategoryScores: () => CategoryScore[];
  calculateCategoryPercentages: () => CategoryPercentage[];
  formatAssessmentResults: () => string;
  formatActionPlan: () => string;
  getActionsForItem: (itemId: string) => ActionItem[];
  resetAssessment: () => void;
}

const AssessmentContext = createContext<AssessmentContextProps | undefined>(undefined);

const initialAssessmentState: AssessmentData = {
  userInfo: null,
  itemScores: initialItemScores.map(item => ({ ...item })),
  improvementItems: [],
  stage: 'userInfo',
};


export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(initialAssessmentState);
  const [lastAction, setLastAction] = useState<{ type: string, payload?: any } | null>(null);

  useEffect(() => {
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'ITEM_SELECTED':
        toast({ title: `"${lastAction.payload.itemName}" selecionado para melhoria.` });
        break;
      case 'SELECTION_LIMIT':
        toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
        break;
      case 'ITEM_REMOVED':
        toast({ title: `"${lastAction.payload.itemName}" removido da seleção.` });
        break;
      case 'ACTION_REMOVED':
        toast({ title: "Ação Removida", description: "A ação selecionada foi removida." });
        break;
      case 'ACTION_CLEARED':
         toast({ title: "Ação Limpa", description: "O conteúdo da ação foi limpo." });
        break;
      case 'ACTION_ADDED':
        toast({ title: "Ação Adicionada", description: "Um novo campo de ação foi adicionado." });
        break;
    }
    setLastAction(null); // Reset after showing toast
  }, [lastAction, toast]);


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
      const alreadySelected = prev.improvementItems.some(ii => ii.itemId === itemId);
      if (alreadySelected) {
         return prev;
      }
      if (prev.improvementItems.length >= 3) {
         setLastAction({ type: 'SELECTION_LIMIT' });
         return prev;
      }
      const newItem: ImprovementItem = {
        itemId: itemId,
        actions: [ { id: generateActionId(itemId, 0), text: '', completionDate: null } ],
      };
      const itemName = getItemDetails(itemId)?.name ?? 'Item';
      setLastAction({ type: 'ITEM_SELECTED', payload: { itemName } });
      return {
        ...prev,
        improvementItems: [...prev.improvementItems, newItem],
      };
    });
 }, []);

  const removeImprovementItem = useCallback((itemId: string) => {
     setAssessmentData(prev => {
        const exists = prev.improvementItems.some(ii => ii.itemId === itemId);
        if (exists) {
            const itemName = getItemDetails(itemId)?.name ?? 'Item';
            setLastAction({ type: 'ITEM_REMOVED', payload: { itemName } });
            return {
                ...prev,
                improvementItems: prev.improvementItems.filter(ii => ii.itemId !== itemId),
            };
        }
        return prev;
     });
  }, []);

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
       setAssessmentData(prev => {
        let actionWasActuallyRemoved = false;
        const newImprovementItems = prev.improvementItems.map(ii => {
          if (ii.itemId === itemId) {
              if (ii.actions.length <= 1) {
                  // Clear the last item instead of removing
                  return {
                      ...ii,
                      actions: [{ ...ii.actions[0], text: '', completionDate: null }]
                  };
              }
              // Remove the action at the specified index
              const updatedActions = ii.actions.filter((_, index) => index !== actionIndex);
              actionWasActuallyRemoved = true;
              return { ...ii, actions: updatedActions };
          }
          return ii;
        });

        if (actionWasActuallyRemoved) {
            setLastAction({ type: 'ACTION_REMOVED' });
        } else {
            setLastAction({ type: 'ACTION_CLEARED' });
        }
        return { ...prev, improvementItems: newImprovementItems };
      });
  }, []);


  const addActionItemSlot = useCallback((itemId: string) => {
      setAssessmentData(prev => ({
          ...prev,
          improvementItems: prev.improvementItems.map(ii => {
              if (ii.itemId === itemId) {
                  const nextIndex = ii.actions.length;
                  const newAction: ActionItem = {
                      id: generateActionId(itemId, nextIndex),
                      text: '',
                      completionDate: null,
                  };
                  return {
                      ...ii,
                      actions: [...ii.actions, newAction],
                  };
              }
              return ii;
          }),
      }));
      setLastAction({ type: 'ACTION_ADDED' });
  }, []);



  const goToStage = useCallback((stage: AssessmentStage) => {
     setAssessmentData(prev => ({ ...prev, stage: stage }));
  }, []);

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
        categoryColor: category.color,
        currentAverage: currentAverage,
        desiredAverage: desiredAverage,
      };
    });
  }, [assessmentData.itemScores]);

  const calculateCategoryPercentages = useCallback((): CategoryPercentage[] => {
    return wellbeingCategories.map(category => {
        const itemsInCategory = wellbeingItems.filter(item => item.categoryId === category.id);
        const itemScoresInCategory = assessmentData.itemScores.filter(score =>
            itemsInCategory.some(item => item.id === score.itemId)
        );

        const maxScorePerItem = 10;
        const totalPossibleScore = itemsInCategory.length * maxScorePerItem;

        const currentScores = itemScoresInCategory.map(s => s.currentScore).filter((s): s is number => s !== null);
        const desiredScores = itemScoresInCategory.map(s => s.desiredScore).filter((s): s is number => s !== null);

        const currentSum = currentScores.reduce((sum, score) => sum + score, 0);
        const desiredSum = desiredScores.reduce((sum, score) => sum + score, 0);

        const currentPercentage = totalPossibleScore > 0 && currentScores.length > 0
            ? (currentSum / totalPossibleScore) * 100
            : null;

        const desiredPercentage = totalPossibleScore > 0 && desiredScores.length > 0
            ? (desiredSum / totalPossibleScore) * 100
            : null;

        return {
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color,
            currentPercentage: currentPercentage,
            desiredPercentage: desiredPercentage,
        };
    });
 }, [assessmentData.itemScores]);


  const formatAssessmentResults = useCallback((): string => {
    let resultString = "Resultados da Roda do Bem-Estar:\n\n";
    const categoryPercentages = calculateCategoryPercentages();

    resultString += "--- Percentuais por Categoria ---\n";
    categoryPercentages.forEach(catPerc => {
        resultString += `${catPerc.categoryName}:\n`;
        resultString += `  - Percentual Atual: ${catPerc.currentPercentage !== null ? catPerc.currentPercentage.toFixed(0) + '%' : 'N/A'}\n`;
        resultString += `  - Percentual Desejado: ${catPerc.desiredPercentage !== null ? catPerc.desiredPercentage.toFixed(0) + '%' : 'N/A'}\n\n`;
    });

    resultString += "--- Pontuações Detalhadas por Item ---\n";
    assessmentData.itemScores.forEach(itemScore => {
      const item = getItemDetails(itemScore.itemId);
      const category = item ? getCategoryForItem(item.id) : undefined;
      resultString += `${item?.name} (${category?.name ?? 'N/A'}):\n`;
      resultString += `  - Pontuação Atual: ${itemScore.currentScore ?? 'N/A'}\n`;
      resultString += `  - Pontuação Desejada: ${itemScore.desiredScore ?? 'N/A'}\n`;
      const difference = itemScore.currentScore !== null && itemScore.desiredScore !== null ? itemScore.desiredScore - itemScore.currentScore : null;
      resultString += `  - Diferença: ${difference !== null ? (difference > 0 ? '+' : '') + difference : 'N/A'}\n\n`;
    });

    return resultString;
  }, [assessmentData.itemScores, calculateCategoryPercentages]);


  const formatActionPlan = useCallback((): string => {
     if (assessmentData.improvementItems.length === 0) {
        return "Nenhum item selecionado para melhoria ou plano de ação definido.\n";
     }

    let planString = "Plano de Ação:\n\n";
    assessmentData.improvementItems.forEach(impItem => {
      const item = getItemDetails(impItem.itemId);
      const category = item ? getCategoryForItem(item.id) : undefined;
       const validActions = impItem.actions.filter(a => a.text.trim() !== '' || a.completionDate);

        if (validActions.length > 0) {
            planString += `Item: ${item?.name} (${category?.name ?? 'N/A'})\n`;
            validActions.forEach((action, index) => {
                planString += `  Ação ${index + 1}: ${action.text || '(Ação não definida)'}\n`;
                planString += `    Data de Conclusão: ${action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : '(Data não definida)'}\n`;
            });
             planString += "\n";
         }
    });
     if (planString === "Plano de Ação:\n\n") {
         return "Itens selecionados para melhoria, mas nenhum plano de ação definido.\n";
     }
    return planString;
  }, [assessmentData.improvementItems]);

   const validateAssessmentCompletion = useCallback(() => {
    if (!assessmentData.userInfo) {
        return { valid: false, message: "Informações do usuário estão faltando.", stage: 'userInfo' as AssessmentStage };
    }
    const allCurrentScored = assessmentData.itemScores.every(s => s.currentScore !== null);
    if (!allCurrentScored) {
        return { valid: false, message: "Avalie todos os itens no estágio 'Atual'.", stage: 'currentScore' as AssessmentStage };
    }
    
    const allDesiredScored = assessmentData.itemScores.every(s => s.desiredScore !== null);
    if (!allDesiredScored) {
        return { valid: false, message: "Defina notas desejadas para todos os itens.", stage: 'desiredScore' as AssessmentStage };
    }
    const itemsSelected = assessmentData.improvementItems.length > 0;
    if (!itemsSelected) {
        return { valid: false, message: "Selecione pelo menos um item para melhorar.", stage: 'selectItems' as AssessmentStage };
    }
     const actionsDefined = assessmentData.improvementItems.every(ii =>
        ii.actions.some(a => a.text.trim() !== '' && a.completionDate !== null)
     );
    if (!actionsDefined) {
        return { valid: false, message: "Para cada item selecionado, defina pelo menos uma ação completa (texto e data).", stage: 'defineActions' as AssessmentStage };
    }
    return { valid: true, message: "Assessment complete and valid.", stage: null };
  }, [assessmentData]);


  const submitAssessment = useCallback(async () => {
    const validation = validateAssessmentCompletion();
    if (!validation.valid) {
      toast({
        title: "Informações Incompletas",
        description: validation.message,
        variant: "destructive",
        duration: 7000,
      });
      if (validation.stage) {
        goToStage(validation.stage);
      }
      return;
    }
  
    // EmailJS sending logic
    const serviceId = "service_jmkr2dn";
    const templateId = "assessment_template";
    const publicKey = "dh8MnuS1CHuhkCk4X";
  
    const assessmentSummary = formatAssessmentResults();
    const actionPlan = formatActionPlan();
  
    const templateParams = {
      user_origem: 'Wellbeing Compass App',
      user_name: assessmentData.userInfo?.fullName,
      user_position: assessmentData.userInfo?.jobTitle,
      user_company: assessmentData.userInfo?.company,
      user_email: assessmentData.userInfo?.email,
      user_whatsapp: assessmentData.userInfo?.phone,
      assessment_name: 'Wellbeing Compass',
      timestamp: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      assessment_summary_block: assessmentSummary,
      assessment_details_block: actionPlan,
      assessment_tags: '#wellbeing #assessment #pontosfortes',
      // The destination email is configured in the EmailJS template
    };
  
    try {
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      toast({
        title: "Relatório Enviado",
        description: "O resumo da sua avaliação foi enviado com sucesso.",
      });
    } catch (error) {
      console.error("EmailJS error:", error);
      toast({
        title: "Erro no Envio",
        description: "Não foi possível enviar o relatório por email. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  
    // Proceed to summary page regardless of email success
    goToStage('summary');
  }, [validateAssessmentCompletion, goToStage, toast, assessmentData, formatAssessmentResults, formatActionPlan]);
  

  const resetAssessment = useCallback(() => {
    setAssessmentData({
        userInfo: null,
        itemScores: initialItemScores.map(item => ({ ...item })),
        improvementItems: [],
        stage: 'userInfo',
    });
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
    addActionItemSlot,
    goToStage,
    submitAssessment,
    isItemSelectedForImprovement,
    calculateCategoryScores,
    calculateCategoryPercentages,
    formatAssessmentResults,
    formatActionPlan,
    getActionsForItem,
    resetAssessment,
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
