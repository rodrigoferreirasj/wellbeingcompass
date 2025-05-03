
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
import { ActionPlan } from './action-plan'; // Import ActionPlan

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
  isActive?: boolean; // Indicates if this is the currently rendered active shape/focused item
}


const RADIAN = Math.PI / 180;
const SELECTION_COLOR = 'hsl(var(--destructive))'; // A distinct color for selected items
const MUTED_BACKGROUND_FILL = 'hsl(var(--muted) / 0.1)'; // Very subtle muted background for unscored/background part
// const TRANSPARENT_FILL = 'transparent'; // Make unscored sections transparent
const MUTED_STROKE_COLOR = 'hsl(var(--border))'; // Subtle border for unscored slices
const ACTIVE_STROKE_COLOR = 'hsl(var(--ring))'; // Ring color for active slice
const FOREGROUND_TEXT_COLOR = 'hsl(var(--foreground))'; // Default text color for labels
const MUTED_TEXT_COLOR = 'hsl(var(--muted-foreground))'; // For labels on muted background if needed


export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType }) => {
  const {
    assessmentData,
    updateItemScore,
    selectImprovementItem,
    removeImprovementItem,
    goToStage,
    isItemSelectedForImprovement,
    getActionsForItem, // Needed for selection mode logic
  } = useAssessment();
  const { itemScores, stage, improvementItems } = assessmentData;
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(5);
  const [isClient, setIsClient] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // For active shape rendering

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
    } else if (!selectedItemId) {
         setSliderValue(5); // Reset slider if no item selected
    }
     // In selection mode, slider value isn't directly tied to selection
     // But if selecting an item shows the action plan, ensure slider is reset
     if (isSelectionMode) {
       setSelectedItemId(null); // Clear item selection used for scoring slider
       setActiveIndex(null); // Clear active index used for scoring slider
       setSliderValue(5); // Reset slider
     }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]);


 const handlePieClick = useCallback((data: any, index: number) => {
    // data might be the event or the payload depending on recharts version/context
    // Safely access payload - prefer payload from the event/data if possible, fallback to payload property
    const clickedPayload = data?.payload?.payload || data?.payload || data;
    const itemId = clickedPayload?.itemId;

    if (!itemId) {
        console.error("Pie click error: Invalid payload data", data);
        setActiveIndex(null); // Deselect visually if click is invalid
        setSelectedItemId(null);
        return;
    }

    // Handle selection logic differently
    if (isSelectionMode) {
        // Clicking toggles selection
        if (isItemSelectedForImprovement(itemId)) {
            removeImprovementItem(itemId);
            setActiveIndex(null); // Deselect visually
            setSelectedItemId(null); // Ensure slider/scoring selection is cleared
        } else {
            if (improvementItems.length < 3) {
                selectImprovementItem(itemId);
                // In selection mode, clicking an item directly selects it for the action plan below
                // We don't keep it 'active' in the same way as scoring mode
                setActiveIndex(null); // Don't keep it visually active for scoring
                setSelectedItemId(null); // Don't select for slider
            } else {
                toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
                 setActiveIndex(null); // Don't keep focus if limit is hit
                 setSelectedItemId(null);
            }
        }
    } else {
         // In scoring modes, clicking always selects the item for scoring
         setActiveIndex(index);
         setSelectedItemId(itemId);
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
      setSelectedItemId(null); // Deselect item after confirming score
      setActiveIndex(null); // Deactivate shape
    }
  };

  const pieData: PieDataItem[] = useMemo(() => {
    // Ensure items are consistently ordered based on the predefined wellbeingItems array
    return wellbeingItems.map((item, index) => {
      const category = getCategoryForItem(item.id);
      const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
      const categoryColor = category?.color ?? 'hsl(var(--secondary))';
      const isImprovement = isItemSelectedForImprovement(item.id);

      // Determine the score value relevant for the current context
      // Use the score of the current stage ('current' or 'desired'). For 'select', visualize 'current' score.
      let scoreKey: 'currentScore' | 'desiredScore' = 'currentScore'; // Default for 'select' visualization
      if (scoreType === 'current') scoreKey = 'currentScore';
      if (scoreType === 'desired') scoreKey = 'desiredScore';

      const scoreValueForFill = itemScoreData[scoreKey];

      let difference: number | null = null;
      if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
        difference = itemScoreData.desiredScore - itemScoreData.currentScore;
      }

      // Display Label: Name + Difference in selection mode
      let displayLabelValue = item.name;
       // Only show difference in selection mode
      if (isSelectionMode && difference !== null) {
           displayLabelValue += ` (${difference >= 0 ? '+' : ''}${difference})`;
      }

      return {
        ...itemScoreData,
        itemId: item.id,
        name: item.name, // Keep original name for tooltips/logic
        categoryName: category?.name ?? 'Unknown',
        categoryColor: categoryColor,
        value: 1, // Equal size slice
        displayLabel: displayLabelValue, // Label for display inside slice
        difference: difference,
        order: index, // Use index from the definitive wellbeingItems array
        scoreValue: scoreValueForFill, // Pass the relevant score for rendering radial fill
        isImprovementItem: isImprovement,
      };
    });
  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        // Must select at least one item to proceed to action definition
        return improvementItems.length === 0;
    } else {
        // Must score all items in current or desired stage
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKeyToCompare] === null);
    }
   }, [isSelectionMode, improvementItems.length, itemScores, scoreType]);

  const CustomTooltip = ({ active, payload }: any) => {
     // Use the payload from the first item, which corresponds to the hovered sector
    const data = payload && payload.length ? (payload[0].payload as PieDataItem) : null;

    if (active && data && data.itemId) {
      const itemDetails = getItemDetails(data.itemId);
      const currentScore = data.currentScore;
      const desiredScore = data.desiredScore;
      const difference = data.difference; // Already calculated in pieData

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs z-50"> {/* Ensure tooltip is above */}
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

           {/* Selection Mode Tooltip Hints */}
           {isSelectionMode && data.isImprovementItem && (
               <p className="mt-2 text-destructive font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-destructive" />Selecionado para Melhoria</p>
           )}
           {/* Hint when hovering over an item that CAN be selected */}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length < 3 && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para selecionar este item para melhoria.</p>
           )}
            {/* Hint when hovering over an item that is already selected */}
           {isSelectionMode && data.isImprovementItem && (
                <p className="mt-2 text-muted-foreground text-xs italic">Clique para remover este item da seleção.</p>
           )}
           {/* Hint when limit reached */}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}

           {/* Scoring Mode Tooltip Hints */}
            {!isSelectionMode && activeIndex !== data.order && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para {data.scoreValue === null ? 'definir' : 'editar'} a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
        </div>
      );
    }
    return null;
  };


    // Custom Active Shape for Radial Fill Effect and Labels
    const renderActiveShape = (props: any) => {
        // Destructure with defaults and type assertion
        const {
            cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0,
            // fill is the base category color passed from Cell - NOT USED FOR FILL DIRECTLY
            payload, // This should contain our PieDataItem
            scoreValue, // The specific score (current or desired based on stage)
            order,
            isActive // Passed based on activeIndex comparison (for SCORING mode)
        } = props as PieDataItem & { isActive?: boolean };

         // Ensure payload has the expected structure
         if (!payload || typeof payload !== 'object' || !payload.itemId) {
             // Render a basic, uncolored sector if payload is invalid
             return <Sector {...props} fill="transparent" stroke={MUTED_STROKE_COLOR} strokeWidth={1} />;
         }

         // Now we know payload is valid PieDataItem
         const { itemId, displayLabel, categoryColor, isImprovementItem } = payload;

         // Determine the color for the scored portion
         const scoredFillColor = isImprovementItem ? SELECTION_COLOR : categoryColor;

         // Calculate percentage fill (score 1-10)
         const scorePercentage = scoreValue !== null ? (scoreValue / 10) : 0; // Use 0 if score is null
         const fillEndAngle = startAngle + (endAngle - startAngle) * scorePercentage;

         // Label positioning logic
         const midAngleRad = (startAngle + endAngle) / 2 * RADIAN;
         // Adjust radius factor for better positioning, potentially smaller for more lines
         const radius = innerRadius + (outerRadius - innerRadius) * 0.6; // Try 60% out
         const x = cx + radius * Math.cos(-midAngleRad);
         const y = cy + radius * Math.sin(-midAngleRad);

         // Label Color: Always use foreground for visibility on transparent/filled bg
         let labelColor = FOREGROUND_TEXT_COLOR;

         // Simple split for multi-line labels if needed
          const nameParts = displayLabel.split(' ');
          let line1 = displayLabel;
          let line2 = '';
          // Adjust length threshold and split logic as needed
          if (displayLabel.length > 12 && nameParts.length > 1) { // Example threshold
              const midIndex = Math.ceil(nameParts.length / 2);
              line1 = nameParts.slice(0, midIndex).join(' ');
              line2 = nameParts.slice(midIndex).join(' ');
          }

        // Determine stroke color and width based on state
        let strokeColor = MUTED_STROKE_COLOR;
        let strokeWidth = 1; // Default stroke width
         if (isSelectionMode) {
             if (isImprovementItem) {
                 strokeColor = SELECTION_COLOR;
                 strokeWidth = 3; // Thicker stroke for selected items
             } else {
                 // Subtle hover effect in selection mode (optional)
                  // strokeColor = props.isHovered ? ACTIVE_STROKE_COLOR : MUTED_STROKE_COLOR;
                  // strokeWidth = props.isHovered ? 2 : 1;
                  strokeColor = MUTED_STROKE_COLOR;
                  strokeWidth = 1;
             }
         } else { // Scoring modes
             if (isActive) {
                strokeColor = ACTIVE_STROKE_COLOR; // Highlight active item for scoring
                strokeWidth = 3; // Thicker stroke
             }
         }


        return (
            <g>
                 {/* Base Sector Shape (Always present, defines the slice area) */}
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill="transparent" // Make base transparent
                    stroke={strokeColor} // Use calculated stroke
                    strokeWidth={strokeWidth} // Use calculated width
                  />

                {/* Filled Sector based on score percentage (only if score exists) */}
                 {scorePercentage > 0 && (
                     <Sector
                         cx={cx}
                         cy={cy}
                         innerRadius={innerRadius}
                         outerRadius={outerRadius}
                         startAngle={startAngle}
                         endAngle={fillEndAngle} // End angle determined by score
                         fill={scoredFillColor} // Actual score color
                         stroke="none" // No stroke needed for the fill itself
                     />
                 )}

                 {/* Text Label - Always visible */}
                 <text
                     x={x}
                     y={y}
                     fill={labelColor} // Always use foreground
                     textAnchor="middle"
                     dominantBaseline="central"
                     className="text-[8px] sm:text-[10px] pointer-events-none font-medium select-none" // Prevent text selection
                 >
                   {/* Render tspans for potential multi-line */}
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
     <div className="flex flex-col lg:flex-row items-start w-full gap-6 px-4"> {/* Changed to row layout on large screens */}

        {/* Chart Area */}
        <div className="relative w-full lg:w-2/3 max-w-3xl mx-auto aspect-square"> {/* Chart takes more space on large */}
             <ResponsiveContainer width="100%" height="100%">
                 <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false} // Lines disabled
                     outerRadius="95%" // Adjust as needed
                     innerRadius="25%" // Adjust as needed for donut hole size
                     dataKey="value" // `value: 1` makes all slices equal size
                     onClick={handlePieClick}
                     animationDuration={300} // Faster animation
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     startAngle={90} // Start at the top
                     endAngle={-270} // Go full circle
                     stroke="none" // Base stroke removed, handled by activeShape
                     activeIndex={activeIndex ?? undefined} // Control which sector uses renderActiveShape (for scoring)
                     activeShape={(props: any) => renderActiveShape({ ...props, isActive: props.index === activeIndex })}
                     isAnimationActive={true} // Keep animation for active shape
                     label={false} // Disable default label rendering from Pie component
                     inactiveShape={(props: any) => renderActiveShape({ ...props, isActive: false })}
                   >
                    {/* Cells still needed for Recharts internal mapping, but fill is ignored by renderActiveShape */}
                     {pieData.map((entry, index) => (
                          <Cell
                           key={`cell-${entry.itemId}`}
                           fill={entry.categoryColor} // Pass color, renderActiveShape decides final fill
                           // Make cell transparent by default - renderActiveShape handles the actual fill
                           // fill="transparent"
                           stroke="none" // No stroke on the cell itself
                           className="focus:outline-none transition-opacity duration-300 hover:opacity-90"
                           tabIndex={-1} // Pie handles focus
                           aria-label={`${entry.name}: ${entry.scoreValue ?? (isSelectionMode ? (entry.isImprovementItem ? 'Selecionado' : 'Não selecionado') : 'Não avaliado')}`}
                         />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                 </PieChart>
             </ResponsiveContainer>

              {/* Center Icon/Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-2">
                  {scoreType === 'current' && <Target className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                  {scoreType === 'desired' && <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                  {scoreType === 'select' && <Star className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                 <span className="text-sm sm:text-base font-medium text-foreground uppercase tracking-wider mt-1">
                     {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
                 </span>
              </div>
           </div>

         {/* Controls & Category Scores Area (Sidebar on large screens) */}
         <div className="w-full lg:w-1/3 flex flex-col items-center gap-6"> {/* Takes remaining space on large */}

            {/* Category Percentages Display - Combined */}
            <div className="w-full">
                 <CategoryScoresDisplay scoreType="combined" />
            </div>

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
                                            variant="destructive" // Maps visually to selection color
                                            className="text-sm font-normal cursor-pointer flex items-center gap-1 px-3 py-1" // Increased padding
                                            onClick={() => removeImprovementItem(item.itemId)} // Allow removing by clicking badge
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

            {/* --- Scoring Mode Controls --- */}
            <div className="w-full">
                {/* Scoring Slider Card */}
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
                            <Button variant="outline" size="sm" onClick={() => { setSelectedItemId(null); setActiveIndex(null); }}>Cancelar</Button> {/* Deactivate on cancel */}
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
            </div>

             {/* --- Action Plan Area (only in selectItems stage AFTER items are selected) --- */}
             {isSelectionMode && improvementItems.length > 0 && (
                 <div className="w-full mt-4">
                    <ActionPlan renderAllSelected={true} /> {/* Always render all selected items here */}
                 </div>
             )}


            {/* Navigation Buttons */}
            <div className="mt-4 flex justify-between w-full">
                <Button variant="outline" onClick={() => goToStage(prevStage)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                {/* In selection mode, the "Next" button only appears *after* items are selected */}
                {/* It should lead to the defineActions stage if that's a separate step */}
                {/* OR, if actions are defined on this screen, the button's logic changes */}
                {/* Current setup: Actions defined on *next* screen (defineActions stage) */}
                <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
                    Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            {/* Messages for disabled Next button */}
             {isNextDisabled && !isSelectionMode && (
                 <p className="text-xs text-destructive text-center mt-2 w-full">
                     Por favor, avalie todos os itens antes de prosseguir.
                 </p>
             )}
             {/* Updated message for selection mode */}
             {isNextDisabled && isSelectionMode && (
                  <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                     Selecione pelo menos um item para o qual definir ações antes de prosseguir.
                 </p>
             )}
         </div>
     </div>
   );
};
