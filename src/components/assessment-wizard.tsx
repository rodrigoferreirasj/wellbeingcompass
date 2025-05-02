'use client';

import React from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { UserInfoForm } from './user-info-form';
import { WellbeingWheel } from './wellbeing-wheel';
import { ActionPlan } from './action-plan';
import { SummaryDisplay } from './summary-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { wellbeingAreas } from '@/types/assessment';

export const AssessmentWizard: React.FC = () => {
  const { assessmentData } = useAssessment();
  const { stage } = assessmentData;

  const stageComponents: { [key in typeof stage]: React.ReactNode } = {
    userInfo: <UserInfoForm />,
    currentScore: <WellbeingWheel scoreType="current" />,
    desiredScore: <WellbeingWheel scoreType="desired" />,
    selectAreas: <WellbeingWheel scoreType="select" />,
    defineActions: <ActionPlan />,
    summary: <SummaryDisplay />,
  };

  const stageTitles: { [key in typeof stage]: string } = {
    userInfo: 'Informações Pessoais',
    currentScore: 'Avalie seu Bem-Estar Atual',
    desiredScore: 'Defina seu Bem-Estar Desejado',
    selectAreas: 'Selecione Áreas para Melhorar',
    defineActions: 'Defina seu Plano de Ação',
    summary: 'Resumo da Avaliação',
  };

   const stageDescriptions: { [key in typeof stage]: string } = {
    userInfo: 'Por favor, preencha suas informações para começar.',
    currentScore: `Clique em cada fatia da Roda do Bem-Estar para dar uma nota de 1 a 10 para sua satisfação atual em cada área.`,
    desiredScore: `Agora, clique novamente em cada fatia para indicar a nota que você deseja alcançar em cada área (1 a 10).`,
    selectAreas: `Selecione até 3 áreas nas quais você gostaria de focar para melhorar. Clique nas fatias desejadas.`,
    defineActions: 'Para cada área selecionada, defina 3 ações específicas e datas para concluí-las.',
    summary: 'Revise sua avaliação e plano de ação. Você pode imprimir esta página.',
  };

  const stageProgress: { [key in typeof stage]: number } = {
    userInfo: 0,
    currentScore: 17,
    desiredScore: 34,
    selectAreas: 51,
    defineActions: 68,
    summary: 100,
  };

  const currentStageProgress = stageProgress[stage];

  return (
    <Card className="w-full max-w-4xl shadow-lg">
       <CardHeader>
         <div className="flex justify-between items-start mb-4">
           <div>
              <CardTitle className="text-2xl font-bold text-primary">{stageTitles[stage]}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">{stageDescriptions[stage]}</CardDescription>
            </div>
            {stage !== 'userInfo' && stage !== 'summary' && (
                 <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Progresso: {Math.round(currentStageProgress)}%
                </div>
             )}
         </div>
         {stage !== 'userInfo' && stage !== 'summary' && (
            <Progress value={currentStageProgress} className="w-full h-2" />
         )}

      </CardHeader>
      <CardContent>
        {stageComponents[stage]}
      </CardContent>
    </Card>
  );
};
