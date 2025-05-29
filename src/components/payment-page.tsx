
'use client';

import React from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, CreditCard } from 'lucide-react';

interface PaymentPageProps {
  onNext: () => Promise<void>; // Callback for downloading screenshot
}

export const PaymentPage: React.FC<PaymentPageProps> = ({ onNext }) => {
  const { goToStage } = useAssessment();

  const handleSimulatePayment = async () => {
    // In a real app, this would involve API calls to a payment provider
    // For now, we simulate success and proceed
    await onNext(); // Trigger download
    goToStage('desiredScore');
  };

  const handleGoBack = () => {
    goToStage('currentScore');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-4">
            <CreditCard className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-semibold text-primary">Acesso Premium à Avaliação Completa</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Para desbloquear a definição de metas, o plano de ação personalizado e o resumo detalhado,
            é necessário adquirir o acesso premium.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 py-8 text-center">
          <div className="bg-muted/50 p-4 rounded-md border border-border">
            <p className="text-lg font-semibold">Valor: R$ 29,90</p>
            <p className="text-sm text-muted-foreground">Pagamento único para acesso completo a esta avaliação.</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Ao clicar em "Simular Pagamento", você prosseguirá para as próximas etapas como se o pagamento tivesse sido efetuado.
            Esta é uma simulação para fins de demonstração.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 p-6">
          <Button variant="outline" onClick={handleGoBack} className="w-full sm:w-auto">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Avaliação Atual
          </Button>
          <Button onClick={handleSimulatePayment} className="w-full sm:w-auto">
            Simular Pagamento e Continuar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
