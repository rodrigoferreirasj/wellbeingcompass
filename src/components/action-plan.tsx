
'use client';

import React, { useState } from 'react'; // Removed useEffect as openPopovers handles itself
import { useAssessment } from '@/context/AssessmentContext';
import { getItemDetails, getCategoryForItem } from '@/types/assessment'; // Removed ActionItem, wellbeingItems imports
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Trash2, PlusCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
// Removed useToast import as it's handled in context now

interface ActionPlanProps {
  // renderAllSelected is always true when this component is used in defineActions stage
  renderAllSelected: true;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({ renderAllSelected }) => { // renderAllSelected is always true here
  const {
      assessmentData,
      updateActionItem,
      updateActionDate,
      removeActionItem, // Removes action by index
      addActionItemSlot, // Adds a new action slot
      goToStage,
      submitAssessment,
      getActionsForItem,
  } = useAssessment();
  const { improvementItems } = assessmentData;
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Always display all selected items in this stage
  const itemsToDisplay = improvementItems;

  const togglePopover = (popoverId: string) => {
    setOpenPopovers(prev => ({ ...prev, [popoverId]: !prev[popoverId] }));
  };

  const closePopover = (popoverId: string) => {
    setOpenPopovers(prev => ({ ...prev, [popoverId]: false }));
  };

  const handleDateSelect = (itemId: string, actionIndex: number, date: Date | undefined) => {
    if (date) {
      updateActionDate(itemId, actionIndex, date);
      closePopover(`${itemId}-${actionIndex}`);
    }
  };

  const handleRemoveAction = (itemId: string, actionIndex: number) => {
     removeActionItem(itemId, actionIndex);
  };

   const handleAddAction = (itemId: string) => {
       addActionItemSlot(itemId);
   };

   // Validation: At least one action must have text AND date for EACH selected item
  const isPlanComplete = () => {
      if (improvementItems.length === 0) return false; // No items selected, cannot complete

      return improvementItems.every(item =>
          // Ensure at least ONE action has both text and a date for this item
          item.actions.some(action => action.text.trim() !== '' && action.completionDate !== null)
      );
  };

  if (itemsToDisplay.length === 0) {
      return <p className="text-center text-muted-foreground">Nenhum item selecionado para melhoria. Volte para a etapa anterior para selecionar.</p>;
  }


  return (
    <div className="w-full space-y-6">
        <h2 className="text-xl font-semibold text-center mb-6 text-primary">Defina Suas Ações</h2>

      {itemsToDisplay.map((improvementItem) => {
        const itemDetails = getItemDetails(improvementItem.itemId);
        const categoryDetails = itemDetails ? getCategoryForItem(itemDetails.id) : undefined;
        const actions = getActionsForItem(improvementItem.itemId); // Use getter to ensure reactivity

        return (
          <Card key={improvementItem.itemId} className="overflow-hidden shadow-sm">
              <CardHeader className="bg-muted/50 p-4 border-b">
                  <CardTitle className="text-lg text-primary">{itemDetails?.name}</CardTitle>
                  {categoryDetails && <CardDescription>{categoryDetails.name}</CardDescription>}
              </CardHeader>

            <CardContent className="p-4 md:p-6 space-y-4">
              {actions.map((action, index) => {
                 const popoverId = `${improvementItem.itemId}-${index}`;
                 return (
                     <div key={action.id} className="space-y-3 p-4 border rounded-md bg-background relative group">
                         <div className="flex justify-between items-center mb-1">
                            <p className="font-medium text-sm text-muted-foreground">Ação {index + 1}</p>
                             {/* Remove button - appears on hover or always on small screens */}
                           <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleRemoveAction(improvementItem.itemId, index)}
                               className={cn(
                                   "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive sm:relative sm:opacity-100 sm:top-auto sm:right-auto",
                                   actions.length <= 1 && "hidden" // Hide remove if only one action left
                               )}
                               aria-label="Remover Ação"
                            >
                                <Trash2 className="h-4 w-4"/>
                           </Button>
                         </div>
                         <Textarea
                            placeholder={`Descreva a ação ${index + 1} para ${itemDetails?.name}...`}
                            value={action.text}
                            onChange={(e) => updateActionItem(improvementItem.itemId, index, e.target.value)}
                            className="min-h-[60px]"
                         />
                         <div className="flex items-center gap-4 flex-wrap">
                           <Popover open={openPopovers[popoverId]} onOpenChange={() => togglePopover(popoverId)}>
                             <PopoverTrigger asChild>
                               <Button
                                 variant={"outline"}
                                 className={cn(
                                   "w-full sm:w-[240px] justify-start text-left font-normal", // Full width on small screens
                                   !action.completionDate && "text-muted-foreground"
                                 )}
                               >
                                 <CalendarIcon className="mr-2 h-4 w-4" />
                                 {action.completionDate ? format(action.completionDate, 'PPP', { locale: ptBR }) : <span>Data de conclusão</span>}
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-auto p-0" align="start">
                               <Calendar
                                 mode="single"
                                 selected={action.completionDate ?? undefined}
                                 onSelect={(date) => handleDateSelect(improvementItem.itemId, index, date)}
                                 initialFocus
                                 locale={ptBR}
                                 disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
                               />
                             </PopoverContent>
                           </Popover>
                         </div>
                          {/* Warning if text exists but date is missing */}
                          {action.text.trim() !== '' && !action.completionDate && (
                              <p className="text-xs text-destructive mt-1">Defina uma data de conclusão para esta ação.</p>
                           )}
                     </div>
                 );
               })}
               {/* Add Action button */}
               <Button variant="outline" size="sm" onClick={() => handleAddAction(improvementItem.itemId)} className="mt-4 w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Outra Ação
                </Button>
            </CardContent>
          </Card>
        );
      })}

       {/* Navigation/Submit buttons */}
       <div className="mt-8 flex justify-between w-full">
            {/* Go back to Select Items stage */}
           <Button variant="outline" onClick={() => goToStage('selectItems')}>
             <ArrowLeft className="mr-2 h-4 w-4" /> Voltar (Seleção)
           </Button>
           <Button onClick={submitAssessment} disabled={!isPlanComplete()}>
              Concluir Avaliação <ArrowRight className="ml-2 h-4 w-4" />
           </Button>
       </div>
        {/* Validation Message */}
        {!isPlanComplete() && improvementItems.length > 0 && (
           <p className="text-sm text-destructive text-center mt-4">
               Complete pelo menos uma ação (com texto e data) para cada item selecionado antes de concluir.
           </p>
       )}
    </div>
  );
};
