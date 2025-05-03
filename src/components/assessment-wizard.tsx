
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

  const stageComponents: { [key in typeof stage]: React.ReactNode } = {
    userInfo: <UserInfoForm />,
    currentScore: <WellbeingWheel scoreType="current" />,
    desiredScore: <WellbeingWheel scoreType="desired" />,
    selectItems: <WellbeingWheel scoreType="select" />, // Only shows the wheel for selection
    defineActions: <ActionPlan renderAllSelected={true} />, // Shows ActionPlan for all selected items
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
    currentScore: 17,
    desiredScore: 34,
    selectItems: 51,
    defineActions: 68,
    summary: 100,
  };

  const currentStageProgress = stageProgress[stage];

  const handleDownload = async () => {
      if (componentRef.current) {
          try {
              const dataUrl = await htmlToImage.toPng(componentRef.current);

              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = `wellbeing-compass-${stage}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch (error) {
              console.error("Error downloading image:", error);
          }
      }
  };

  return (
    // Wrap Card and Footer in a flex column container to keep footer below card
    <div className="flex flex-col items-center w-full max-w-7xl gap-6" ref={componentRef}>
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
         {/* Footer moved outside CardContent if it shouldn't scroll with content */}
         {/* Example: Placing Action Plan navigation within CardFooter if needed */}
         {/* {stage === 'defineActions' && (
           <CardFooter className="flex justify-between p-4 md:p-6 border-t">
              <Button variant="outline" onClick={() => goToStage('selectItems')}> ... </Button>
              <Button onClick={submitAssessment} disabled={!isPlanComplete()}> ... </Button>
           </CardFooter>
         )} */}
      </Card>

       {/* New Footer Section below the Card */}
       {stage !== 'summary' && ( // Optionally hide on summary stage
        <div className="w-full text-center p-4 border-t border-border mt-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
                Agora, para analisar seus dados e te ajudar com seu plano de ação, entre em contato com o Coach Rodrigo Ferreira e agende uma devolutiva grátis sobre o seu resultado.
            </p>
            <Button asChild size="sm">
                <Link href="https://cal.com/pontosfortes/sessao-gratis" target="_blank" rel="noopener noreferrer">
                    {/* <Calendar className="mr-2 h-4 w-4" /> Optional Icon */}
                    Agendar devolutiva grátis
                </Link>
            </Button>
        </div>
       )}

       {/* Download Button Section - always visible */}
       <div className="w-full text-center p-4 mt-4 bg-muted/50 rounded-lg">
            <Button size="sm" onClick={handleDownload}>
                   Download dos resultados
            </Button>
        </div>
    </div>
  );
};
