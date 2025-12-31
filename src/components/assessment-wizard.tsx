
'use client';

import React, { useRef } from 'react';
import Link from 'next/link'; // Import Link for the button
import { useAssessment } from '@/context/AssessmentContext';
import { UserInfoForm } from './user-info-form';
import { WellbeingWheel } from './wellbeing-wheel';
import { ActionPlan } from './action-plan';
import { SummaryDisplay } from './summary-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button'; // Import Button
import { Calendar } from 'lucide-react'; // Import icon if needed
import * as htmlToImage from 'html-to-image';

export const AssessmentWizard: React.FC = () => {
  const { assessmentData, goToStage } = useAssessment();
  const { stage } = assessmentData;
  const componentRef = useRef<HTMLDivElement>(null);

  const handleNextStageWithDownload = async () => {
    if (componentRef.current) {
        try {
            const dataUrl = await htmlToImage.toPng(componentRef.current, { 
              quality: 0.95, 
              backgroundColor: '#FFFCFA' // Match body background
            });
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `wellbeing-compass-${stage}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading image on stage transition:", error);
        }
    }
    // Determine next stage logic from context or specific components
    // For most stages, the next stage is determined within the component itself (e.g., WellbeingWheel, ActionPlan)
    // For UserInfoForm, it's handled in its onSubmit
    if (stage === 'userInfo') goToStage('currentScore'); // Example, actual logic might be in UserInfoForm
    // If on summary, submitAssessment handles it (though there's no 'Next' from summary)
    else if (stage === 'summary') {
        // No "Next" from summary, but if there was a final action:
        // await submitAssessment(); // Example
    }
    // Other stage transitions are handled within their respective components or the context's goToStage calls
  };


  const stageComponents: { [key in typeof stage]: React.ReactNode } = {
    userInfo: <UserInfoForm />,
    currentScore: <WellbeingWheel scoreType="current" onNext={handleNextStageWithDownload} />,
    desiredScore: <WellbeingWheel scoreType="desired" onNext={handleNextStageWithDownload} />,
    selectItems: <WellbeingWheel scoreType="select" onNext={handleNextStageWithDownload} />,
    defineActions: <ActionPlan renderAllSelected={true} />, // ActionPlan handles its own "Concluir" which calls submitAssessment
    summary: <SummaryDisplay />,
  };

  const stageTitles: { [key in typeof stage]: string } = {
    userInfo: 'Informações Pessoais',
    currentScore: 'Avalie seu Bem-Estar Atual (por Item)',
    desiredScore: 'Defina seu Bem-Estar Desejado (por Item)',
    selectItems: 'Selecione Itens para Melhorar',
    defineActions: 'Defina seu Plano de Ação',
    summary: 'Resumo da Avaliação',
  };

   const stageDescriptions: { [key in typeof stage]: string } = {
    userInfo: 'Por favor, preencha suas informações para começar.',
    currentScore: `Clique em cada item da Roda do Bem-Estar para dar uma nota de 1 a 10 para sua satisfação atual. Veja os percentuais por categoria abaixo.`,
    desiredScore: `Agora, clique novamente em cada item para indicar a nota que você deseja alcançar (1 a 10). Veja a nota atual para referência e os percentuais desejados abaixo.`,
    selectItems: `Selecione até 3 itens para melhorar clicando no gráfico. Clique em "Próximo" para definir as ações.`,
    defineActions: 'Para cada item selecionado, defina pelo menos uma ação com descrição e data de conclusão.',
    summary: 'Revise sua avaliação e plano de ação. Você pode imprimir esta página.',
  };

  const stageProgress: { [key in typeof stage]: number } = {
    userInfo: 0,
    currentScore: 20,
    desiredScore: 40,
    selectItems: 60,
    defineActions: 80,
    summary: 100,
  };

  const currentStageProgress = stageProgress[stage];

  const handleDownloadSummary = async () => {
      if (componentRef.current) {
          try {
              const dataUrl = await htmlToImage.toPng(componentRef.current, {
                quality: 0.95,
                backgroundColor: '#FFFCFA' // Match body background
              });
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = `wellbeing-compass-summary.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch (error) {
              console.error("Error downloading summary image:", error);
          }
      }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl gap-6">
      <div ref={componentRef} className="w-full"> {/* Ensure this div wraps content to be captured */}
        <Card className="w-full shadow-lg">
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
          <CardContent className="p-4 md:p-6">
            {stageComponents[stage]}
          </CardContent>
        </Card>
      </div>

       {stage !== 'summary' && (
        <div className="w-full text-center p-4 border-t border-border mt-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
                Agora, para analisar seus dados e te ajudar com seu plano de ação, entre em contato com o Coach Rodrigo Ferreira e agende uma devolutiva grátis sobre o seu resultado.
            </p>
            <Button asChild size="sm">
                <Link href="https://cal.com/pontosfortes/sessao-gratis" target="_blank" rel="noopener noreferrer">
                    Agendar devolutiva grátis
                </Link>
            </Button>
        </div>
       )}

       <div className="w-full text-center p-4 mt-4 bg-muted/50 rounded-lg">
            <Button size="sm" onClick={handleDownloadSummary}>
                   Download dos resultados
            </Button>
        </div>
    </div>
  );
};
