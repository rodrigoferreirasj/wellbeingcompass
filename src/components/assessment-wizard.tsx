
'use client';

import React from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { UserInfoForm } from './user-info-form';
import { WellbeingWheel } from './wellbeing-wheel';
import { ActionPlan } from './action-plan'; // Will need updates
import { SummaryDisplay } from './summary-display'; // Will need updates
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { wellbeingItems } from '@/types/assessment'; // Import items

export const AssessmentWizard: React.FC = () => {
  const { assessmentData } = useAssessment();
  const { stage } = assessmentData;

  // Update stage names and components
  const stageComponents: { [key in typeof stage]: React.ReactNode } = {
    userInfo: <UserInfoForm />,
    currentScore: <WellbeingWheel scoreType="current" />,
    desiredScore: <WellbeingWheel scoreType="desired" />,
    selectItems: <WellbeingWheel scoreType="select" />, // Changed from selectAreas
    // defineActions now renders ActionPlan directly, showing all selected items
    defineActions: <ActionPlan renderAllSelected={true} />,
    summary: <SummaryDisplay />, // SummaryDisplay component needs updates
  };

  // Update titles
  const stageTitles: { [key in typeof stage]: string } = {
    userInfo: 'Informações Pessoais',
    currentScore: 'Avalie seu Bem-Estar Atual (por Item)',
    desiredScore: 'Defina seu Bem-Estar Desejado (por Item)',
    selectItems: 'Selecione Itens e Defina Ações', // Combined selection and initial action view
    defineActions: 'Revise e Complete seu Plano de Ação', // Changed
    summary: 'Resumo da Avaliação',
  };

   // Update descriptions
   const stageDescriptions: { [key in typeof stage]: string } = {
    userInfo: 'Por favor, preencha suas informações para começar.',
    currentScore: `Clique em cada item da Roda do Bem-Estar para dar uma nota de 1 a 10 para sua satisfação atual. Veja as médias por categoria ao lado.`,
    desiredScore: `Agora, clique novamente em cada item para indicar a nota que você deseja alcançar (1 a 10). Veja a nota atual para referência e as médias desejadas ao lado.`,
    selectItems: `Selecione até 3 itens para melhorar clicando no gráfico. Defina ações para o item selecionado ao lado (ou abaixo em telas menores).`, // Changed
    defineActions: 'Revise todas as ações para os itens selecionados. Certifique-se de que cada ação tenha uma descrição e uma data de conclusão.', // Changed
    summary: 'Revise sua avaliação e plano de ação. Você pode imprimir esta página.',
  };

  // Update progress steps if needed (keeping 6 stages for now)
  const stageProgress: { [key in typeof stage]: number } = {
    userInfo: 0,
    currentScore: 17,
    desiredScore: 34,
    selectItems: 51, // Changed
    defineActions: 68, // Keep as is for now
    summary: 100,
  };

  const currentStageProgress = stageProgress[stage];

  return (
    // Increased max-width further for the 3-column layout potential
    <Card className="w-full max-w-7xl shadow-lg">
       <CardHeader>
         <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
           <div className="flex-1">
              <CardTitle className="text-2xl font-bold text-primary">{stageTitles[stage]}</CardTitle>
              <CardDescription className="text-muted-foreground mt-1">{stageDescriptions[stage]}</CardDescription>
            </div>
            {stage !== 'userInfo' && stage !== 'summary' && (
                 <div className="text-sm text-muted-foreground whitespace-nowrap pt-1">
                    Progresso: {Math.round(currentStageProgress)}%
                </div>
             )}
         </div>
         {stage !== 'userInfo' && stage !== 'summary' && (
            <Progress value={currentStageProgress} className="w-full h-2" />
         )}

      </CardHeader>
       {/* Reduced padding for content area to maximize space */}
      <CardContent className="p-4 md:p-6">
        {stageComponents[stage]}
      </CardContent>
    </Card>
  );
};
