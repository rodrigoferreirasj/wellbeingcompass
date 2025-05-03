
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
  isActive?: boolean; // Indicates if this is the currently rendered active shape/focused item
}


const RADIAN = Math.PI / 180;
const SELECTION_COLOR = 'hsl(var(--destructive))'; // A distinct color for selected items
const MUTED_BACKGROUND_FILL = 'hsl(var(--muted) / 0.1)'; // Very subtle muted background for unscored/background part
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
        // If clicking the *same* item that is currently active/focused
        if (activeIndex === index) {
             if (isItemSelectedForImprovement(itemId)) {
                removeImprovementItem(itemId);
                // Deselect visually
                setActiveIndex(null);
                setSelectedItemId(null);
            } else {
                if (improvementItems.length < 3) {
                    selectImprovementItem(itemId);
                    // Keep it visually active after selecting
                    setActiveIndex(index);
                    setSelectedItemId(itemId); // Ensure selectedItemId is also set
                } else {
                    toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
                     setActiveIndex(null); // Don't keep focus if limit is hit
                     setSelectedItemId(null);
                }
            }
        } else {
             // If clicking a *different* item, just set it as the currently active/focused item
             setActiveIndex(index);
             setSelectedItemId(itemId);
             // Don't toggle selection here, wait for a second click/confirmation
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
      let scoreKey: 'currentScore' | 'desiredScore' = 'currentScore'; // Default for 'select'
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
        // Must select at least one item (triggers action plan rendering)
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
           {/* Hint when focused but not selected */}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length < 3 && activeIndex === data.order && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para confirmar a seleção.</p>
           )}
            {/* Hint when hovering but not focused/selected */}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length < 3 && activeIndex !== data.order && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para focar, clique novamente para selecionar.</p>
           )}
           {/* Hint when focused and selected */}
           {isSelectionMode && data.isImprovementItem && activeIndex === data.order && (
                <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para remover da seleção.</p>
           )}
           {/* Hint when limit reached */}
           {isSelectionMode && !data.isImprovementItem && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}

           {/* Scoring Mode Tooltip Hints */}
            {!isSelectionMode && activeIndex !== data.order && data.scoreValue === null && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para definir a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
             {!isSelectionMode && activeIndex !== data.order && data.scoreValue !== null && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para editar a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
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
            // fill is the base category color passed from Cell
            payload, // This should contain our PieDataItem
            scoreValue, // The specific score (current or desired based on stage)
            order,
            isActive // Passed based on activeIndex comparison
        } = props as PieDataItem & { isActive?: boolean };

         // Ensure payload has the expected structure
         if (!payload || typeof payload !== 'object' || !payload.itemId) {
             return <Sector {...props} fill={MUTED_BACKGROUND_FILL} stroke="none" />;
         }

         // Now we know payload is valid PieDataItem
         const { itemId, displayLabel, categoryColor, isImprovementItem } = payload;

         // Determine the fill color for the scored portion
         const scoredFillColor = isImprovementItem ? SELECTION_COLOR : categoryColor;

         // Calculate percentage fill (score 1-10)
         const scorePercentage = (scoreValue ?? 0) / 10; // Default 0 if null (no fill)
         const fillEndAngle = startAngle + (endAngle - startAngle) * scorePercentage;

         // Label positioning logic
         const midAngleRad = (startAngle + endAngle) / 2 * RADIAN;
         const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
         const x = cx + radius * Math.cos(-midAngleRad);
         const y = cy + radius * Math.sin(-midAngleRad);

        // Determine label color based on background fill for contrast
         let labelColor = FOREGROUND_TEXT_COLOR; // Default to foreground
         // If the slice is filled significantly and the fill color is dark, use light text.
         // Note: This is a basic check; real-world contrast calculation is complex.
         if (scorePercentage > 0.3) { // Only adjust if there's substantial fill
             try {
                 // Attempt to parse HSL color (robustness could be improved)
                 const match = scoredFillColor.match(/hsl\((\d+)\s*,\s*(\d+)%\s*,\s*([\d.]+)%\)/);
                 if (match) {
                     const lightness = parseFloat(match[3]);
                     // If lightness is low (dark color), use primary-foreground (typically light)
                     if (lightness < 45) {
                         labelColor = "hsl(var(--primary-foreground))";
                     }
                 }
             } catch (e) { /* Ignore parsing errors, use default */ }
         } else if (scorePercentage === 0 && !isActive && !isImprovementItem) {
            // If no score and not active/selected, use muted text on the muted background
             labelColor = MUTED_TEXT_COLOR;
         }


         // Simple split for multi-line labels
          const nameParts = displayLabel.split(' ');
          let line1 = displayLabel;
          let line2 = '';
          if (displayLabel.length > 13 && nameParts.length > 1) {
              const midIndex = Math.ceil(nameParts.length / 2);
              line1 = nameParts.slice(0, midIndex).join(' ');
              line2 = nameParts.slice(midIndex).join(' ');
          }

        // Determine stroke color and width based on state
        let strokeColor = MUTED_STROKE_COLOR;
        let strokeWidth = 1;
        if (isImprovementItem) {
            strokeColor = SELECTION_COLOR;
            strokeWidth = 3;
        } else if (isActive) {
            strokeColor = ACTIVE_STROKE_COLOR;
            strokeWidth = 3;
        }

        return (
            <g>
                 {/* Background Sector (Full slice shape, always present) */}
                 {/* The fill here acts as the background *behind* the potential scored fill */}
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={MUTED_BACKGROUND_FILL} // Always subtle background
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
                     fill={labelColor} // Use calculated label color for contrast
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
     <div className="flex flex-col items-start w-full gap-6 px-4"> {/* Main container: Always column */}

        {/* Chart Area */}
        <div className="relative w-full max-w-3xl mx-auto aspect-square"> {/* Increased max-width and kept aspect ratio */}
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
                     //strokeWidth={1} // Base stroke width removed
                     activeIndex={activeIndex ?? undefined} // Control which sector uses renderActiveShape
                     // Ensure activeShape receives the `isActive` prop correctly
                     activeShape={(props: any) => renderActiveShape({ ...props, isActive: props.index === activeIndex })}
                     isAnimationActive={true} // Keep animation for active shape
                     // Remove default label rendering from Pie component itself
                     label={false}
                     // Set inactive shape to also use our custom renderer to ensure consistent styling
                     inactiveShape={(props: any) => renderActiveShape({ ...props, isActive: false })}
                   >
                    {/* Cells define the base category color passed to renderActiveShape's 'fill' prop */}
                     {pieData.map((entry, index) => (
                          <Cell
                           key={`cell-${entry.itemId}`}
                           // Pass the category color. renderActiveShape will decide final fill.
                           fill={entry.categoryColor} // Base color for score fill
                           //stroke="none" // No stroke on the cell itself
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

         {/* Controls & Category Scores Area Below Chart */}
         <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-6"> {/* Max width matches chart */}

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
                                    // Find the corresponding PieDataItem to get the correct index for handlePieClick
                                    const pieItemIndex = pieData.findIndex(p => p.itemId === item.itemId);
                                    return (
                                        <Badge
                                            key={item.itemId}
                                            // Use explicit style for selection color for more control if needed
                                            // style={{ backgroundColor: SELECTION_COLOR, color: 'hsl(var(--primary-foreground))' }}
                                            variant="destructive" // Assuming destructive maps visually to selection color
                                            className="text-sm font-normal cursor-pointer flex items-center gap-1 px-3 py-1" // Increased padding
                                            onClick={() => pieItemIndex !== -1 && handlePieClick({ payload: pieData[pieItemIndex] }, pieItemIndex)} // Allow removing by clicking badge
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
                                Limite de 3 itens atingido. Clique em um item selecionado (no gráfico ou acima) para remover.
                            </p>
                        )}
                    </CardContent>
                     {/* Conditionally render ActionPlan within selection mode once items are chosen */}
                     {/* {improvementItems.length > 0 && (
                         <CardFooter className="p-0">
                            <ActionPlan renderAllSelected={false} />
                         </CardFooter>
                      )} */}
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

            {/* Category Percentages Display - Combined */}
            <div className="w-full">
                 <CategoryScoresDisplay scoreType="combined" />
            </div>

            {/* Navigation Buttons */}
            <div className="mt-4 flex justify-between w-full">
                <Button variant="outline" onClick={() => goToStage(prevStage)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
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
             {isNextDisabled && isSelectionMode && (
                  <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                     Selecione pelo menos um item para melhorar antes de prosseguir.
                 </p>
             )}
         </div>
     </div>
   );
};
