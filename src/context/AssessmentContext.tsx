'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import type { AssessmentData, UserInfo, AreaScore, ImprovementArea, AssessmentStage } from '@/types/assessment';
import { initialScores, wellbeingAreas } from '@/types/assessment';
import { sendUserDataEmail, type UserData } from '@/services/email-service';
import { useToast } from "@/hooks/use-toast";

interface AssessmentContextProps {
  assessmentData: AssessmentData;
  setAssessmentData: Dispatch<SetStateAction<AssessmentData>>;
  updateUserInfo: (info: UserInfo) => void;
  updateScore: (areaId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => void;
  selectImprovementArea: (areaId: string) => void;
  removeImprovementArea: (areaId: string) => void;
  updateActionItem: (areaId: string, actionIndex: number, text: string) => void;
  updateActionDate: (areaId: string, actionIndex: number, date: Date | null) => void;
  addActionItem: (areaId: string) => void;
  removeActionItem: (areaId: string, actionIndex: number) => void;
  goToStage: (stage: AssessmentStage) => void;
  submitAssessment: () => Promise<void>;
  isAreaSelectedForImprovement: (areaId: string) => boolean;
}

const AssessmentContext = createContext<AssessmentContextProps | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    userInfo: null,
    scores: initialScores,
    improvementAreas: [],
    stage: 'userInfo',
  });

  const updateUserInfo = useCallback((info: UserInfo) => {
    setAssessmentData(prev => ({ ...prev, userInfo: info, stage: 'currentScore' }));
  }, []);

  const updateScore = useCallback((areaId: string, scoreType: 'currentScore' | 'desiredScore', score: number) => {
    setAssessmentData(prev => ({
      ...prev,
      scores: prev.scores.map(s =>
        s.areaId === areaId ? { ...s, [scoreType]: score } : s
      ),
    }));
  }, []);

 const selectImprovementArea = useCallback((areaId: string) => {
    setAssessmentData(prev => {
      if (prev.improvementAreas.length >= 3 || prev.improvementAreas.some(ia => ia.areaId === areaId)) {
        return prev; // Limit to 3 areas and prevent duplicates
      }
      const newArea: ImprovementArea = {
        areaId: areaId,
        actions: Array(3).fill(null).map((_, index) => ({ id: `${areaId}-action-${index}-${Date.now()}`, text: '', completionDate: null })),
      };
      return {
        ...prev,
        improvementAreas: [...prev.improvementAreas, newArea],
      };
    });
  }, []);


  const removeImprovementArea = useCallback((areaId: string) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementAreas: prev.improvementAreas.filter(ia => ia.areaId !== areaId),
    }));
  }, []);

  const isAreaSelectedForImprovement = useCallback((areaId: string): boolean => {
    return assessmentData.improvementAreas.some(ia => ia.areaId === areaId);
  }, [assessmentData.improvementAreas]);

  const updateActionItem = useCallback((areaId: string, actionIndex: number, text: string) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementAreas: prev.improvementAreas.map(ia =>
        ia.areaId === areaId
          ? {
              ...ia,
              actions: ia.actions.map((action, index) =>
                index === actionIndex ? { ...action, text: text } : action
              ),
            }
          : ia
      ),
    }));
  }, []);

 const updateActionDate = useCallback((areaId: string, actionIndex: number, date: Date | null) => {
    setAssessmentData(prev => ({
      ...prev,
      improvementAreas: prev.improvementAreas.map(ia =>
        ia.areaId === areaId
          ? {
              ...ia,
              actions: ia.actions.map((action, index) =>
                index === actionIndex ? { ...action, completionDate: date } : action
              ),
            }
          : ia
      ),
    }));
  }, []);


  const addActionItem = useCallback((areaId: string) => {
      // No-op as we always have 3 items, maybe enable adding more later?
      // For now, ensure 3 slots exist in selectImprovementArea
  }, []);

  const removeActionItem = useCallback((areaId: string, actionIndex: number) => {
      // Set text and date to default instead of removing, to maintain 3 slots
       setAssessmentData(prev => ({
        ...prev,
        improvementAreas: prev.improvementAreas.map(ia =>
          ia.areaId === areaId
            ? {
                ...ia,
                actions: ia.actions.map((action, index) =>
                  index === actionIndex ? { ...action, text: '', completionDate: null } : action
                ),
              }
            : ia
        ),
      }));
  }, []);


  const goToStage = useCallback((stage: AssessmentStage) => {
    setAssessmentData(prev => ({ ...prev, stage }));
  }, []);

  const formatAssessmentResults = useCallback((): string => {
    let resultString = "Resultados da Roda do Bem-Estar:\n\n";

    assessmentData.scores.forEach(score => {
      const area = wellbeingAreas.find(a => a.id === score.areaId);
      resultString += `${area?.name}:\n`;
      resultString += `  - Pontuação Atual: ${score.currentScore ?? 'N/A'}\n`;
      resultString += `  - Pontuação Desejada: ${score.desiredScore ?? 'N/A'}\n`;
      resultString += `  - Diferença: ${score.currentScore !== null && score.desiredScore !== null ? score.desiredScore - score.currentScore : 'N/A'}\n\n`;
    });

    return resultString;
  }, [assessmentData.scores]);

  const formatActionPlan = useCallback((): string => {
     if (assessmentData.improvementAreas.length === 0) {
        return "Nenhuma área de melhoria selecionada ou plano de ação definido.\n";
     }

    let planString = "Plano de Ação:\n\n";
    assessmentData.improvementAreas.forEach(impArea => {
      const area = wellbeingAreas.find(a => a.id === impArea.areaId);
      planString += `Área: ${area?.name}\n`;
      impArea.actions.forEach((action, index) => {
        if (action.text || action.completionDate) { // Only include non-empty actions
            planString += `  Ação ${index + 1}: ${action.text || '(Ação não definida)'}\n`;
            planString += `    Data de Conclusão: ${action.completionDate ? action.completionDate.toLocaleDateString('pt-BR') : '(Data não definida)'}\n`;
        }
      });
      planString += "\n";
    });
    return planString;
  }, [assessmentData.improvementAreas]);


  const submitAssessment = useCallback(async () => {
     if (!assessmentData.userInfo) {
      toast({
        title: "Erro",
        description: "Informações do usuário estão faltando.",
        variant: "destructive",
      });
      goToStage('userInfo'); // Redirect to user info stage
      return;
    }

    // Basic validation check
    const allCurrentScored = assessmentData.scores.every(s => s.currentScore !== null);
    const allDesiredScored = assessmentData.scores.every(s => s.desiredScore !== null);
    const areasSelected = assessmentData.improvementAreas.length > 0;
    const actionsDefined = assessmentData.improvementAreas.every(ia => ia.actions.some(a => a.text !== '')); // Check if at least one action is defined per area


    if (!allCurrentScored || !allDesiredScored || !areasSelected || !actionsDefined) {
       toast({
        title: "Informações Incompletas",
        description: "Por favor, preencha todas as pontuações, selecione áreas de melhoria e defina pelo menos uma ação para cada área selecionada antes de concluir.",
        variant: "destructive",
      });
      // Optionally guide the user to the specific incomplete stage
      if (!allCurrentScored) goToStage('currentScore');
      else if (!allDesiredScored) goToStage('desiredScore');
      else if (!areasSelected) goToStage('selectAreas');
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
      console.log("Dados a serem enviados:", userDataToSend);
      toast({
        title: "Sucesso!",
        description: "Sua avaliação foi enviada com sucesso. Verifique seu e-mail (simulado).",
      });
      goToStage('summary'); // Or potentially reset the state for a new assessment
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
      toast({
        title: "Erro ao Enviar",
        description: "Houve um problema ao enviar sua avaliação. Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  }, [assessmentData, formatAssessmentResults, formatActionPlan, goToStage, toast]);

  const value = {
    assessmentData,
    setAssessmentData,
    updateUserInfo,
    updateScore,
    selectImprovementArea,
    removeImprovementArea,
    updateActionItem,
    updateActionDate,
    addActionItem,
    removeActionItem,
    goToStage,
    submitAssessment,
    isAreaSelectedForImprovement,
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
