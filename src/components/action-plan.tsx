
'use client';

import React, { useState, useEffect } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, getItemDetails, getCategoryForItem, ActionItem } from '@/types/assessment'; // Updated imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Trash2, PlusCircle, ArrowLeft, ArrowRight } from 'lucide-react'; // Added navigation arrows
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface ActionPlanProps {
  // If rendering only for one item (e.g., in selection mode)
  selectedItemId?: string | null;
   // If rendering all selected items (e.g., in defineActions stage)
  renderAllSelected?: boolean;
}

export const ActionPlan: React.FC<ActionPlanProps> = ({ selectedItemId, renderAllSelected = false }) => {
  const {
      assessmentData,
      updateActionItem,
      updateActionDate,
      removeActionItem, // Clears the action
      goToStage, // For navigation in defineActions stage
      submitAssessment, // For final submission
      getActionsForItem, // Get actions for a specific item
      isItemSelectedForImprovement, // Check if item is selected
  } = useAssessment();
  const { stage, improvementItems } = assessmentData; // Get stage and all improvement items
  const { toast } = useToast();
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

  // Determine which items to display actions for
  const itemsToDisplay = renderAllSelected
      ? improvementItems // Show all selected items in defineActions stage
      : selectedItemId && isItemSelectedForImprovement(selectedItemId)
          ? improvementItems.filter(item => item.itemId === selectedItemId) // Show only the selected item
          : []; // Show nothing if no item selected or not in improvement list


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
     removeActionItem(itemId, actionIndex); // This clears the action item text and date
  };

   // Check if the plan is complete (only relevant for the defineActions stage)
  const isPlanComplete = () => {
      if (!renderAllSelected || improvementItems.length === 0) return false;

      return improvementItems.every(item =>
          // Ensure at least one action has text and a date for each item
          item.actions.some(action => action.text.trim() !== '' && action.completionDate !== null) &&
          // Ensure ALL actions with text also have a date for each item
          item.actions.every(action => action.text.trim() === '' || action.completionDate !== null)
      );
  };

  if (itemsToDisplay.length === 0 && renderAllSelected) {
      return <p className="text-center text-muted-foreground">Nenhum item selecionado para melhoria. Volte para a etapa anterior para selecionar.</p>;
  }
   if (itemsToDisplay.length === 0 && !renderAllSelected) {
       // This case shouldn't typically be shown as the parent controls visibility, but added as a fallback
       return <p className="text-center text-muted-foreground">Selecione um item para definir ações.</p>;
   }


  return (
    <div className="w-full space-y-6">
       {/* Conditionally render title only when showing all items */}
       {renderAllSelected && (
            <h2 className="text-xl font-semibold text-center mb-6 text-primary">Defina Suas Ações</h2>
        )}

      {itemsToDisplay.map((improvementItem) => {
        const itemDetails = getItemDetails(improvementItem.itemId);
        const categoryDetails = itemDetails ? getCategoryForItem(itemDetails.id) : undefined;
        const actions = improvementItem.actions; // Actions for this specific item

        return (
          <Card key={improvementItem.itemId} className="overflow-hidden shadow-sm">
              {/* Header adjusted: Always show simple header for clarity */}
              <CardHeader className="bg-muted/50 p-4 border-b">
                  <CardTitle className="text-lg text-primary">{itemDetails?.name}</CardTitle>
                  {categoryDetails && <CardDescription>{categoryDetails.name}</CardDescription>}
              </CardHeader>


            <CardContent className="p-4 md:p-6 space-y-4">
              {actions.map((action, index) => {
                 const popoverId = `${improvementItem.itemId}-${index}`;
                 return (
                     <div key={action.id} className="space-y-3 p-4 border rounded-md bg-background relative group">
                         <p className="font-medium text-sm text-muted-foreground">Ação {index + 1}</p>
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
                           {/* Remove button - appears on hover */}
                           <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleRemoveAction(improvementItem.itemId, index)}
                               className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive sm:relative sm:opacity-100 sm:top-auto sm:right-auto" // Adjust for smaller screens?
                               aria-label="Limpar Ação"
                            >
                                <Trash2 className="h-4 w-4"/>
                           </Button>
                         </div>
                          {action.text.trim() !== '' && !action.completionDate && !renderAllSelected && ( // Show warning only in single-item view
                              <p className="text-xs text-destructive mt-1">Defina uma data de conclusão para esta ação.</p>
                           )}
                     </div>
                 );
               })}
               {/* Add Action button - Currently fixed at 3 slots, so not needed */}
               {/* <Button variant="outline" size="sm" onClick={() => addActionItem(improvementItem.itemId)} className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Ação</Button> */}
            </CardContent>
          </Card>
        );
      })}

       {/* Navigation/Submit buttons - only in defineActions stage */}
       {renderAllSelected && (
           <div className="mt-8 flex justify-between w-full">
                {/* Go back to Select Items stage */}
               <Button variant="outline" onClick={() => goToStage('selectItems')}>
                 <ArrowLeft className="mr-2 h-4 w-4" /> Voltar (Seleção/Ações)
               </Button>
               <Button onClick={submitAssessment} disabled={!isPlanComplete()}>
                  Concluir Avaliação <ArrowRight className="ml-2 h-4 w-4" />
               </Button>
           </div>
       )}
        {renderAllSelected && !isPlanComplete() && improvementItems.length > 0 && (
           <p className="text-sm text-destructive text-center mt-4">
               Complete pelo menos uma ação (com texto e data) para cada item selecionado antes de concluir. Todas as ações com texto devem ter uma data.
           </p>
       )}
    </div>
  );
};
