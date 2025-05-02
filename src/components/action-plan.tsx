'use client';

import React, { useState } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingAreas } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Use Textarea for action text
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Import Portuguese locale
import { Calendar as CalendarIcon, ArrowRight, ArrowLeft, Trash2, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

export const ActionPlan: React.FC = () => {
  const { assessmentData, updateActionItem, updateActionDate, addActionItem, removeActionItem, goToStage, submitAssessment } = useAssessment();
  const { improvementAreas } = assessmentData;
  const { toast } = useToast();
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({}); // Track open state for each popover

   // Function to toggle popover state
   const togglePopover = (popoverId: string) => {
     setOpenPopovers(prev => ({ ...prev, [popoverId]: !prev[popoverId] }));
   };

    // Function to close a specific popover
  const closePopover = (popoverId: string) => {
    setOpenPopovers(prev => ({ ...prev, [popoverId]: false }));
  };

  const handleDateSelect = (areaId: string, actionIndex: number, date: Date | undefined) => {
    if (date) {
      updateActionDate(areaId, actionIndex, date);
      closePopover(`${areaId}-${actionIndex}`); // Close popover after selecting a date
    }
  };

  const handleRemoveAction = (areaId: string, actionIndex: number) => {
     removeActionItem(areaId, actionIndex); // This now clears the action item
     toast({ title: "Ação Limpa", description: "O texto e a data da ação foram removidos."});
  };


  // Check if all required actions and dates are filled
  const isPlanComplete = () => {
    if (improvementAreas.length === 0) return false; // Need at least one area
    return improvementAreas.every(area =>
      // Ensure at least one action has text and a date
       area.actions.some(action => action.text.trim() !== '' && action.completionDate !== null) &&
        // Ensure ALL actions with text also have a date
        area.actions.every(action => action.text.trim() === '' || action.completionDate !== null)
    );
  };


  return (
    <div className="w-full">
      {improvementAreas.length === 0 ? (
        <p className="text-center text-muted-foreground">Nenhuma área selecionada para melhoria. Volte para a etapa anterior para selecionar.</p>
      ) : (
        <Accordion type="multiple" defaultValue={improvementAreas.map(a => a.areaId)} className="w-full space-y-4">
          {improvementAreas.map((area) => {
            const areaMeta = wellbeingAreas.find(a => a.id === area.areaId);
            return (
              <AccordionItem value={area.areaId} key={area.areaId} className="border rounded-lg shadow-sm bg-card overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline bg-muted/50">
                  <span className="text-lg font-semibold text-primary">{areaMeta?.name}</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-4 pb-6 space-y-6">
                  {area.actions.map((action, index) => {
                     const popoverId = `${area.areaId}-${index}`;
                     return (
                         <div key={action.id} className="space-y-3 p-4 border rounded-md bg-background relative group">
                             <p className="font-medium text-sm text-muted-foreground">Ação {index + 1}</p>
                             <Textarea
                                placeholder={`Descreva a ação ${index + 1} para ${areaMeta?.name}...`}
                                value={action.text}
                                onChange={(e) => updateActionItem(area.areaId, index, e.target.value)}
                                className="min-h-[60px]" // Smaller textarea
                             />
                             <div className="flex items-center gap-4">
                               <Popover open={openPopovers[popoverId]} onOpenChange={() => togglePopover(popoverId)}>
                                 <PopoverTrigger asChild>
                                   <Button
                                     variant={"outline"}
                                     className={cn(
                                       "w-[240px] justify-start text-left font-normal",
                                       !action.completionDate && "text-muted-foreground"
                                     )}
                                   >
                                     <CalendarIcon className="mr-2 h-4 w-4" />
                                     {action.completionDate ? format(action.completionDate, 'PPP', { locale: ptBR }) : <span>Escolha a data</span>}
                                   </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-auto p-0" align="start">
                                   <Calendar
                                     mode="single"
                                     selected={action.completionDate ?? undefined}
                                     onSelect={(date) => handleDateSelect(area.areaId, index, date)}
                                     initialFocus
                                     locale={ptBR} // Use Portuguese locale
                                   />
                                 </PopoverContent>
                               </Popover>
                               {/* Remove button - appears on hover */}
                               <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleRemoveAction(area.areaId, index)}
                                   className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                   aria-label="Remover Ação"
                                >
                                    <Trash2 className="h-4 w-4"/>
                               </Button>
                             </div>

                         </div>
                     );
                   })}
                   {/* Add action button - currently disabled as we enforce 3 actions */}
                   {/* <Button
                       variant="outline"
                       size="sm"
                       onClick={() => addActionItem(area.areaId)}
                       className="mt-4"
                       disabled // Disable for now
                    >
                       <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Ação
                    </Button> */}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <div className="mt-8 flex justify-between w-full">
        <Button variant="outline" onClick={() => goToStage('selectAreas')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={submitAssessment} disabled={!isPlanComplete()}>
           Concluir Avaliação <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
       {!isPlanComplete() && improvementAreas.length > 0 && (
           <p className="text-sm text-destructive text-center mt-4">
               Complete pelo menos uma ação (com texto e data) para cada área selecionada antes de concluir. Todas as ações com texto devem ter uma data.
           </p>
       )}
    </div>
  );
};
