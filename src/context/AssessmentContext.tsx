
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
import { initialItemScores, wellbeingCategories, wellbeingItems, getCategoryForItem, getItemDetails, generateActionId } from '@/types/assessment';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { httpsCallable } from 'firebase/functions'; // Import Firebase functions
import { functions } from '@/lib/firebase'; // Import initialized functions instance

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
  removeActionItem: (itemId: string, actionIndex: number) => void; // For clearing text/date
  addActionItemSlot: (itemId: string) => void; // Added function to add new action slot
  goToStage: (stage: AssessmentStage) => void;
  submitAssessment: () => Promise<void>; // This transitions to summary and saves data
  isItemSelectedForImprovement: (itemId: string) => boolean;
  calculateCategoryScores: () => CategoryScore[]; // Calculates averages
  calculateCategoryPercentages: () => CategoryPercentage[]; // Calculates percentages
  formatAssessmentResults: () => string; // Function to format results for email/display
  formatActionPlan: () => string; // Function to format action plan for email/display
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
    let itemSelected = false;
    let limitReached = false;
    let alreadySelected = false;

    setAssessmentData(prev => {
      alreadySelected = prev.improvementItems.some(ii => ii.itemId === itemId);
      if (alreadySelected) {
         return prev; // Will be handled by removeImprovementItem if clicked again
      }
      if (prev.improvementItems.length >= 3) {
         limitReached = true;
         return prev; // Limit reached
      }
      // Start with one action item when selecting
      const newItem: ImprovementItem = {
        itemId: itemId,
        actions: [ { id: generateActionId(itemId, 0), text: '', completionDate: null } ],
      };
      itemSelected = true; // Mark item as selected in this update cycle
      return {
        ...prev,
        improvementItems: [...prev.improvementItems, newItem],
      };
    });

    // Separate toast logic after state update attempt
    if (limitReached) {
        try {
            toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
        } catch (e) { console.error("Toast failed:", e); }
    } else if (itemSelected) { // Only toast if it was actually selected in this call
        // Use try-catch block for safer toast call if needed
        try {
             const itemName = getItemDetails(itemId)?.name ?? 'Item';
             toast({ title: `"${itemName}" selecionado para melhoria.` });
        } catch (e) {
             console.error("Toast notification failed:", e);
        }
    }
 }, [toast]);

  const removeImprovementItem = useCallback((itemId: string) => {
     let itemRemoved = false;
     setAssessmentData(prev => {
        const exists = prev.improvementItems.some(ii => ii.itemId === itemId);
        if (exists) {
            itemRemoved = true;
            return {
                ...prev,
                improvementItems: prev.improvementItems.filter(ii => ii.itemId !== itemId),
            };
        }
        return prev; // No change if item wasn't selected
     });

      // Separate toast logic after state update attempt
     if (itemRemoved) {
        // Use try-catch block for safer toast call if needed
        try {
            const itemName = getItemDetails(itemId)?.name ?? 'Item';
            toast({ title: `"${itemName}" removido da seleção.` });
        } catch (e) {
            console.error("Toast notification failed:", e);
        }
     }
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

  // Remove action by index (retains order)
  const removeActionItem = useCallback((itemId: string, actionIndex: number) => {
       let actionWasRemoved = false;
       setAssessmentData(prev => ({
        ...prev,
        improvementItems: prev.improvementItems.map(ii => {
          if (ii.itemId === itemId) {
              // Prevent removing the last action item
              if (ii.actions.length <= 1) {
                  // Instead of removing, clear the last item
                  return {
                      ...ii,
                      actions: [{ ...ii.actions[0], text: '', completionDate: null }]
                  };
              }
              // Remove the action at the specified index
              const updatedActions = ii.actions.filter((_, index) => index !== actionIndex);
              actionWasRemoved = true;
              return { ...ii, actions: updatedActions };
          }
          return ii;
        }),
      }));
       // Call toast *after* the state update
       // Use try-catch block for safer toast call if needed
        if (actionWasRemoved) {
             try {
                 toast({ title: "Ação Removida", description: "A ação selecionada foi removida." });
             } catch (e) {
                 console.error("Toast notification failed:", e);
             }
        } else {
            try {
                 toast({ title: "Ação Limpa", description: "O conteúdo da ação foi limpo." });
            } catch (e) {
                 console.error("Toast notification failed:", e);
            }
        }
  }, [toast]);


  // Function to add a new empty action slot to an improvement item
  const addActionItemSlot = useCallback((itemId: string) => {
      setAssessmentData(prev => ({
          ...prev,
          improvementItems: prev.improvementItems.map(ii => {
              if (ii.itemId === itemId) {
                  const nextIndex = ii.actions.length; // Index for the new action
                  const newAction: ActionItem = {
                      id: generateActionId(itemId, nextIndex),
                      text: '',
                      completionDate: null,
                  };
                  return {
                      ...ii,
                      actions: [...ii.actions, newAction], // Add the new empty action
                  };
              }
              return ii;
          }),
      }));
      // Optional: Toast notification
       try {
            toast({ title: "Ação Adicionada", description: "Um novo campo de ação foi adicionado." });
       } catch (e) {
            console.error("Toast notification failed:", e);
       }
  }, [toast]);



  const goToStage = useCallback((stage: AssessmentStage) => {
     setAssessmentData(prev => ({ ...prev, stage: stage }));
  }, []);

  // Calculates average scores per category (kept for potential future use)
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

  // Calculates percentage scores per category based on total possible score
  const calculateCategoryPercentages = useCallback((): CategoryPercentage[] => {
    return wellbeingCategories.map(category => {
        const itemsInCategory = wellbeingItems.filter(item => item.categoryId === category.id);
        const itemScoresInCategory = assessmentData.itemScores.filter(score =>
            itemsInCategory.some(item => item.id === score.itemId)
        );

        const maxScorePerItem = 10;
        const totalPossibleScore = itemsInCategory.length * maxScorePerItem;

        // Filter out null scores and sum them up
        const currentScores = itemScoresInCategory.map(s => s.currentScore).filter((s): s is number => s !== null);
        const desiredScores = itemScoresInCategory.map(s => s.desiredScore).filter((s): s is number => s !== null);

        const currentSum = currentScores.reduce((sum, score) => sum + score, 0);
        const desiredSum = desiredScores.reduce((sum, score) => sum + score, 0);

        // Calculate percentage only if there are items in the category and scores have been entered
        const currentPercentage = totalPossibleScore > 0 && currentScores.length > 0
            ? (currentSum / totalPossibleScore) * 100
            : null; // Return null if no scores or no items

        const desiredPercentage = totalPossibleScore > 0 && desiredScores.length > 0
            ? (desiredSum / totalPossibleScore) * 100
            : null; // Return null if no scores or no items

        return {
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color,
            currentPercentage: currentPercentage,
            desiredPercentage: desiredPercentage,
        };
    });
 }, [assessmentData.itemScores]);


  // Format results using percentages
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
       // Filter out actions that are completely empty (no text and no date)
       const validActions = impItem.actions.filter(a => a.text.trim() !== '' || a.completionDate);

        // Only include the item in the plan if it has valid actions
        if (validActions.length > 0) {
            planString += `Item: ${item?.name} (${category?.name ?? 'N/A'})\n`;
            validActions.forEach((action, index) => {
                planString += `  Ação ${index + 1}: ${action.text || '(Ação não definida)'}\n`;
                planString += `    Data de Conclusão: ${action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : '(Data não definida)'}\n`;
            });
             planString += "\n";
         }
    });
     // Handle case where items were selected but no actions were defined
     if (planString === "Plano de Ação:\n\n") {
         return "Itens selecionados para melhoria, mas nenhum plano de ação definido.\n";
     }
    return planString;
  }, [assessmentData.improvementItems]);

   // Internal validation function
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
     // Updated validation: At least one action must have text AND date for EACH selected item
     const actionsDefined = assessmentData.improvementItems.every(ii =>
        ii.actions.some(a => a.text.trim() !== '' && a.completionDate !== null)
     );
    if (!actionsDefined) {
        return { valid: false, message: "Para cada item selecionado, defina pelo menos uma ação completa (texto e data).", stage: 'defineActions' as AssessmentStage };
    }
    return { valid: true, message: "Assessment complete and valid.", stage: null }; // Added stage: null for valid case
  }, [assessmentData]);


  // Function to submit assessment: Validate, save data via Cloud Function, then go to summary
  const submitAssessment = useCallback(async () => {
     const validation = validateAssessmentCompletion();
     if (!validation.valid) {
        try {
            toast({
                title: "Informações Incompletas",
                description: validation.message,
                variant: "destructive",
                duration: 7000,
            });
        } catch (e) { console.error("Toast failed:", e); }
        if (validation.stage) {
            goToStage(validation.stage);
        }
        return;
     }

     // Validation passed, try saving data to Firebase
     try {
       const saveAssessmentDataFunction = httpsCallable(functions, 'saveAssessmentData');
       // Prepare data to send (remove stage, potentially serialize dates if needed)
        const dataToSend = {
           ...assessmentData,
           stage: undefined, // Don't save stage to Firestore
            improvementItems: assessmentData.improvementItems.map(item => ({
                ...item,
                actions: item.actions.map(action => ({
                ...action,
                // Firestore handles Date objects, but ensure it's Date or null
                completionDate: action.completionDate ? action.completionDate : null,
                }))
            })),
        };
       const result = await saveAssessmentDataFunction(dataToSend);
       console.log('Assessment data saved successfully:', result.data);
       toast({
           title: "Avaliação Salva",
           description: "Seus dados foram salvos com sucesso.",
       });

       // Proceed to summary only after successful save
       goToStage('summary');

     } catch (error: any) {
       console.error("Error saving assessment data via Cloud Function:", error);
       toast({
           title: "Erro ao Salvar",
           description: `Não foi possível salvar seus dados: ${error.message}. Por favor, tente novamente.`,
           variant: "destructive",
       });
       // Do not proceed to summary if save fails
     }

  }, [validateAssessmentCompletion, goToStage, toast, assessmentData]);

  // Function to reset the assessment state to initial values
  const resetAssessment = useCallback(() => {
    setAssessmentData({
        userInfo: null,
        itemScores: initialItemScores.map(item => ({ ...item })), // Ensure fresh copy
        improvementItems: [],
        stage: 'userInfo',
    });
     try {
        toast({ title: "Avaliação Reiniciada", description: "Você pode começar uma nova avaliação." });
     } catch (e) { console.error("Toast failed:", e); }
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
    removeActionItem, // Function to remove action by index
    addActionItemSlot, // Function to add new action slot
    goToStage,
    submitAssessment, // Moves to summary and saves data
    isItemSelectedForImprovement,
    calculateCategoryScores, // Calculates averages
    calculateCategoryPercentages, // Calculates percentages
    formatAssessmentResults,
    formatActionPlan,
    getActionsForItem,
    resetAssessment, // Function to reset entire assessment
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
