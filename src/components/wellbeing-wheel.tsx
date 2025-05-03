
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts'; // Added Sector
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, ItemScore, getCategoryForItem, getItemDetails, WellbeingItem } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star, TrendingUp, XCircle } from 'lucide-react'; // Added XCircle
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { CategoryScoresDisplay } from './category-scores-display';
import { Badge } from '@/components/ui/badge'; // Import Badge

interface WellbeingWheelProps {
  scoreType: 'current' | 'desired' | 'select';
}

// Interface for data passed to Pie/Sector components
interface PieDataItem extends ItemScore {
  itemId: string;
  name: string;
  categoryName: string;
  categoryColor: string; // Base category color
  value: number; // Fixed value for equal slices
  displayLabel: string; // Label for inner display (name + diff in select mode)
  difference?: number | null;
  order: number;
  scoreValue: number | null; // The relevant score (current or desired) for fill calculation
  isImprovementItem: boolean; // Flag if this item is selected for improvement
  // Recharts injected props for activeShape
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string; // Base category color is passed here by Pie's Cell
  payload?: any; // Reference to the original PieDataItem object
  // Props for ActiveShape state management
  isActive?: boolean; // Indicates if this is the currently rendered active shape/focused item (for scoring interaction)
}


const RADIAN = Math.PI / 180;
const SELECTION_COLOR = 'hsl(var(--destructive))'; // A distinct color for selected items
const MUTED_FILL_COLOR = 'hsl(var(--muted))'; // Initial gray color for slices without scores
const MUTED_STROKE_COLOR = 'hsl(var(--border))'; // Subtle border for slices
const ACTIVE_STROKE_COLOR = 'hsl(var(--ring))'; // Ring color for active slice
const FOREGROUND_TEXT_COLOR = 'hsl(var(--foreground))'; // Default text color for labels


export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType }) => {
  const {
    assessmentData,
    updateItemScore,
    selectImprovementItem,
    removeImprovementItem,
    goToStage,
    isItemSelectedForImprovement,
  } = useAssessment();
  const { itemScores, stage, improvementItems } = assessmentData;
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(5);
  const [isClient, setIsClient] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // For active shape rendering during scoring interaction

  useEffect(() => {
    setIsClient(true);
  }, []);


  const nextStage = scoreType === 'current' ? 'desiredScore' : (scoreType === 'desired' ? 'selectItems' : 'defineActions');
  const prevStage = scoreType === 'current' ? 'userInfo' : (scoreType === 'desired' ? 'currentScore' : 'desiredScore');

  const isSelectionMode = scoreType === 'select';

  const selectedItemData = useMemo(() => {
      if (!selectedItemId) return null;
      return itemScores.find(s => s.itemId === selectedItemId) ?? null;
  }, [selectedItemId, itemScores]);

  const selectedItemDetails = useMemo(() => {
      if (!selectedItemId) return null;
      return getItemDetails(selectedItemId);
  }, [selectedItemId]);

  // Update slider when selected item changes in scoring modes
  useEffect(() => {
    if (selectedItemData && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      setSliderValue(selectedItemData[scoreKey] ?? 5);
    } else if (!selectedItemId && !isSelectionMode) { // Only reset slider in scoring modes
         setSliderValue(5); // Reset slider if no item selected for scoring
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]);


 const handlePieClick = useCallback((data: any, index: number) => {
    const clickedPayload = data?.payload?.payload || data?.payload || data;
    const itemId = clickedPayload?.itemId;

    if (!itemId) {
        console.error("Pie click error: Invalid payload data", data);
        setActiveIndex(null); // Deselect visually if click is invalid
        setSelectedItemId(null);
        return;
    }

    if (isSelectionMode) {
        // Clicking toggles selection
        if (isItemSelectedForImprovement(itemId)) {
            removeImprovementItem(itemId);
        } else {
            if (improvementItems.length < 3) {
                selectImprovementItem(itemId);
            } else {
                toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
            }
        }
        // Clear scoring-related state in selection mode clicks
        setActiveIndex(null);
        setSelectedItemId(null);
    } else {
         // Scoring modes: clicking selects/deselects the item for scoring interaction
         if (activeIndex === index) {
             // If clicking the already active item, deselect it for scoring
             setActiveIndex(null);
             setSelectedItemId(null);
         } else {
             // Select the new item for scoring
             setActiveIndex(index);
             setSelectedItemId(itemId);
         }
    }

  }, [isSelectionMode, isItemSelectedForImprovement, removeImprovementItem, improvementItems.length, selectImprovementItem, toast, activeIndex]);


  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
  };

  const confirmScore = () => {
    if (selectedItemId && selectedItemDetails && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      updateItemScore(selectedItemId, scoreKey, sliderValue);
      toast({
        title: "Pontuação Salva",
        description: `Nota ${sliderValue} salva para ${selectedItemDetails.name}.`,
      });
      // Keep the item selected visually and the slider open until user clicks away
      // setSelectedItemId(null); // Keep selected
      // setActiveIndex(null); // Keep active for visual feedback
    }
  };

  const pieData: PieDataItem[] = useMemo(() => {
    return wellbeingItems.map((item, index) => {
      const category = getCategoryForItem(item.id);
      const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
      const categoryColor = category?.color ?? 'hsl(var(--secondary))';
      const isImprovement = isItemSelectedForImprovement(item.id);

      let scoreKey: 'currentScore' | 'desiredScore' = 'currentScore';
      if (scoreType === 'current') scoreKey = 'currentScore';
      if (scoreType === 'desired') scoreKey = 'desiredScore';

      const scoreValueForFill = itemScoreData[scoreKey];

      let difference: number | null = null;
      if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
        difference = itemScoreData.desiredScore - itemScoreData.currentScore;
      }

      let displayLabelValue = item.name;
      if (isSelectionMode && difference !== null) {
           displayLabelValue += ` (${difference >= 0 ? '+' : ''}${difference})`;
      }

      return {
        ...itemScoreData,
        itemId: item.id,
        name: item.name,
        categoryName: category?.name ?? 'Unknown',
        categoryColor: categoryColor,
        value: 1, // Equal size slice
        displayLabel: displayLabelValue,
        difference: difference,
        order: index,
        scoreValue: scoreValueForFill,
        isImprovementItem: isImprovement,
      };
    });
  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        return improvementItems.length === 0;
    } else {
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKeyToCompare] === null);
    }
   }, [isSelectionMode, improvementItems.length, itemScores, scoreType]);

  const CustomTooltip = ({ active, payload }: any) => {
    const data = payload && payload.length ? (payload[0].payload as PieDataItem) : null;

    if (active && data && data.itemId) {
      const itemDetails = getItemDetails(data.itemId);
      const currentScore = data.currentScore;
      const desiredScore = data.desiredScore;
      const difference = data.difference;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs z-50">
          <p className="font-semibold text-primary">{data.name} <span className="text-xs text-muted-foreground">({data.categoryName})</span></p>
          {itemDetails?.description && <p className="text-muted-foreground text-xs mt-1">{itemDetails.description}</p>}

          <div className="mt-2 space-y-1">
              {currentScore !== null && <p>Atual: <span className="font-medium">{currentScore}</span></p>}
              {desiredScore !== null && <p>Desejado: <span className="font-medium">{desiredScore}</span></p>}
              {difference !== null && (
                 <p className={cn("flex items-center", difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : "text-muted-foreground")}>
                     Diferença: <span className="font-medium ml-1">{difference > 0 ? '+' : ''}{difference}</span>
                     {difference !== 0 && <TrendingUp className="w-3 h-3 ml-1"/>}
                </p>
              )}
          </div>

           {isSelectionMode && data.isImprovementItem && (
               <p className="mt-2 text-destructive font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-destructive" />Selecionado para Melhoria</p>
           )}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length < 3 && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para selecionar este item para melhoria.</p>
           )}
           {isSelectionMode && data.isImprovementItem && (
                <p className="mt-2 text-muted-foreground text-xs italic">Clique para remover este item da seleção.</p>
           )}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}

            {!isSelectionMode && activeIndex !== data.order && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para {data.scoreValue === null ? 'definir' : 'editar'} a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
             {!isSelectionMode && activeIndex === data.order && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para cancelar a avaliação deste item.</p>
            )}
        </div>
      );
    }
    return null;
  };


    // Custom Active Shape for Radial Fill Effect and Labels
    const renderActiveShape = (props: any) => {
        const {
            cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0,
            payload, // This contains our PieDataItem
            isActive // Passed based on activeIndex comparison (for SCORING mode interaction)
        } = props as PieDataItem & { isActive?: boolean };

         if (!payload || typeof payload !== 'object' || !payload.itemId) {
             return <Sector {...props} fill={MUTED_FILL_COLOR} stroke={MUTED_STROKE_COLOR} strokeWidth={1} />;
         }

         const { scoreValue, displayLabel, categoryColor, isImprovementItem } = payload;

         // Determine the color for the scored portion
         let scoredFillColor = isImprovementItem ? SELECTION_COLOR : categoryColor;
         // Base fill is always muted gray
         const baseFillColor = MUTED_FILL_COLOR;

         // Calculate percentage fill (score 1-10)
         const scorePercentage = scoreValue !== null ? (scoreValue / 10) : 0;
         // Vertical fill: calculate radius based on percentage
         const fillOuterRadius = innerRadius + (outerRadius - innerRadius) * scorePercentage;

         // Label positioning logic
         const midAngleRad = (startAngle + endAngle) / 2 * RADIAN;
         const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.6; // Adjust as needed
         const x = cx + labelRadius * Math.cos(-midAngleRad);
         const y = cy + labelRadius * Math.sin(-midAngleRad);
         const labelColor = FOREGROUND_TEXT_COLOR;

          const nameParts = displayLabel.split(' ');
          let line1 = displayLabel;
          let line2 = '';
          if (displayLabel.length > 12 && nameParts.length > 1) {
              const midIndex = Math.ceil(nameParts.length / 2);
              line1 = nameParts.slice(0, midIndex).join(' ');
              line2 = nameParts.slice(midIndex).join(' ');
          }

        // Determine stroke color and width based on state
        let strokeColor = MUTED_STROKE_COLOR;
        let strokeWidth = 1;
         if (isSelectionMode) {
             if (isImprovementItem) {
                 strokeColor = SELECTION_COLOR;
                 strokeWidth = 3;
             }
         } else { // Scoring modes
             if (isActive) { // isActive is true only when index === activeIndex
                strokeColor = ACTIVE_STROKE_COLOR;
                strokeWidth = 3;
             }
         }

        return (
            <g>
                 {/* Base Sector Shape (Always visible, filled with muted gray) */}
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius} // Full outer radius for the base
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={baseFillColor} // Always muted gray
                    stroke={strokeColor} // Use calculated stroke based on interaction/selection
                    strokeWidth={strokeWidth} // Use calculated width
                  />

                {/* Filled Sector based on score percentage (overlaying the gray base) */}
                 {scorePercentage > 0 && (
                     <Sector
                         cx={cx}
                         cy={cy}
                         innerRadius={innerRadius} // Start from inner radius
                         outerRadius={fillOuterRadius} // End at calculated radius based on score
                         startAngle={startAngle}
                         endAngle={endAngle}
                         fill={scoredFillColor} // Actual score color (category or selection)
                         stroke="none" // No stroke for the fill part itself
                     />
                 )}

                 {/* Text Label - Always visible */}
                 <text
                     x={x}
                     y={y}
                     fill={labelColor} // Always use foreground
                     textAnchor="middle"
                     dominantBaseline="central"
                     className="text-[8px] sm:text-[10px] pointer-events-none font-medium select-none"
                 >
                   <tspan x={x} dy={line2 ? "-0.6em" : "0"}>{line1}</tspan>
                   {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
                 </text>
            </g>
        );
    };


    if (!isClient) {
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
     // Main container: Controls/Selection above, Chart below, Percentages beside chart on large screens
     <div className="flex flex-col w-full gap-6 px-4">

         {/* --- Top Section: Controls / Selection Info --- */}
         <div className="w-full max-w-md mx-auto">
             {/* --- Scoring Mode Controls --- */}
             {selectedItemId && !isSelectionMode && (
                 <Card className="w-full shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-10">
                     <CardHeader>
                         <CardTitle className="text-lg text-center">Avaliar: <span className="text-primary">{selectedItemDetails?.name}</span></CardTitle>
                         <CardDescription className="text-center">
                             {scoreType === 'current' ? 'Qual sua satisfação atual (1-10)?' : 'Qual nota você deseja alcançar (1-10)?'}
                             {scoreType === 'desired' && selectedItemData?.currentScore !== null && ` (Atual: ${selectedItemData.currentScore})`}
                         </CardDescription>
                     </CardHeader>
                     <CardContent className="flex flex-col items-center px-6 pb-4">
                         <Slider
                             min={1}
                             max={10}
                             step={1}
                             value={[sliderValue]}
                             onValueChange={handleSliderChange}
                             className="w-full"
                             aria-label={`Score for ${selectedItemDetails?.name}`}
                         />
                         <div className="mt-3 flex items-center gap-2">
                             <span className="text-3xl font-bold text-primary">{sliderValue}</span>
                             {scoreType === 'desired' && selectedItemData?.currentScore !== null && (
                                 <span className={cn("text-base font-medium flex items-center",
                                     (sliderValue - selectedItemData.currentScore) > 0 ? "text-green-600" :
                                     (sliderValue - selectedItemData.currentScore) < 0 ? "text-red-600" :
                                     "text-muted-foreground")}>
                                     ({sliderValue - selectedItemData.currentScore >= 0 ? '+' : ''}{sliderValue - selectedItemData.currentScore})
                                     {(sliderValue - selectedItemData.currentScore) !== 0 && <TrendingUp className="w-4 h-4 ml-1"/>}
                                 </span>
                             )}
                         </div>
                     </CardContent>
                     <CardFooter className="flex justify-center gap-4 pb-4">
                         <Button variant="outline" size="sm" onClick={() => { setSelectedItemId(null); setActiveIndex(null); }}>Cancelar</Button>
                         <Button size="sm" onClick={confirmScore}>Confirmar Nota</Button>
                     </CardFooter>
                 </Card>
             )}

             {/* Prompt for scoring modes when no item is selected */}
             {!selectedItemId && !isSelectionMode && (
                 <Card className="w-full shadow-sm bg-muted/50">
                     <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                         Clique em um item do gráfico para definir a pontuação {scoreType === 'current' ? 'atual' : 'desejada'}.
                     </CardContent>
                 </Card>
             )}

             {/* --- Selection Mode: Display Selected Items --- */}
             {isSelectionMode && (
                <Card className="w-full shadow-sm bg-muted/50">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-center text-base text-primary">
                            Itens Selecionados para Melhoria ({improvementItems.length}/3)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                        {improvementItems.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                {improvementItems.map(item => {
                                    const details = getItemDetails(item.itemId);
                                    return (
                                        <Badge
                                            key={item.itemId}
                                            variant="destructive"
                                            className="text-sm font-normal cursor-pointer flex items-center gap-1 px-3 py-1"
                                            onClick={() => removeImprovementItem(item.itemId)}
                                            title={`Clique para remover "${details?.name}"`}
                                        >
                                            {details?.name}
                                            <XCircle className="h-3 w-3 ml-1 opacity-70 hover:opacity-100" />
                                        </Badge>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground text-sm mt-2">
                                Clique nos itens do gráfico para selecionar até 3 áreas para focar.
                            </p>
                        )}
                        {improvementItems.length >= 3 && (
                            <p className="text-center text-destructive text-xs mt-3">
                                Limite de 3 itens atingido. Clique em um item selecionado acima para remover.
                            </p>
                        )}
                    </CardContent>
                </Card>
             )}
         </div>


        {/* --- Chart and Percentages Section --- */}
        <div className="flex flex-col lg:flex-row items-start w-full gap-6">

            {/* Chart Area */}
            <div className="relative w-full lg:w-2/3 max-w-3xl mx-auto aspect-square">
                 <ResponsiveContainer width="100%" height="100%">
                     <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                       <Pie
                         data={pieData}
                         cx="50%"
                         cy="50%"
                         labelLine={false}
                         outerRadius="95%"
                         innerRadius="25%"
                         dataKey="value"
                         onClick={handlePieClick}
                         // Keep animation duration 0 or low to prevent weird transitions on update
                         animationDuration={0}
                         className="cursor-pointer focus:outline-none"
                         startAngle={90}
                         endAngle={-270}
                         stroke="none"
                         activeIndex={activeIndex ?? undefined} // Control visual highlight during scoring interaction
                         activeShape={(props: any) => renderActiveShape({ ...props, isActive: props.index === activeIndex })}
                         // Ensure isAnimationActive is false to prevent flickering on data updates
                         isAnimationActive={false}
                         label={false}
                         inactiveShape={(props: any) => renderActiveShape({ ...props, isActive: false })} // Render all shapes consistently
                       >
                        {/* Key needs to be stable but also reflect data changes */}
                         {pieData.map((entry, index) => (
                              <Cell
                               key={`cell-${entry.itemId}`} // Use stable itemId, renderActiveShape handles score changes
                               fill={MUTED_FILL_COLOR} // Passed to renderActiveShape, but it decides final fill
                               stroke="none"
                               className="focus:outline-none transition-opacity duration-300 hover:opacity-90"
                               tabIndex={-1}
                               aria-label={`${entry.name}: ${entry.scoreValue ?? (isSelectionMode ? (entry.isImprovementItem ? 'Selecionado' : 'Não selecionado') : 'Não avaliado')}`}
                             />
                         ))}
                       </Pie>
                       <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                     </PieChart>
                 </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-2">
                      {scoreType === 'current' && <Target className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                      {scoreType === 'desired' && <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                      {scoreType === 'select' && <Star className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                     <span className="text-sm sm:text-base font-medium text-foreground uppercase tracking-wider mt-1">
                         {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
                     </span>
                  </div>
               </div>

             <div className="w-full lg:w-1/3 flex flex-col items-center gap-6">
                 <CategoryScoresDisplay scoreType="combined" />
             </div>
        </div>


        <div className="mt-4 flex justify-between w-full max-w-5xl mx-auto">
            <Button variant="outline" onClick={() => goToStage(prevStage)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
               Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
         {isNextDisabled && !isSelectionMode && (
             <p className="text-xs text-destructive text-center mt-2 w-full max-w-5xl mx-auto">
                 Por favor, avalie todos os itens antes de prosseguir.
             </p>
         )}
         {isNextDisabled && isSelectionMode && (
              <p className="text-xs text-destructive text-center mt-2 max-w-lg mx-auto">
                 Selecione pelo menos um item para melhorar antes de prosseguir.
             </p>
         )}
     </div>
   );
};
