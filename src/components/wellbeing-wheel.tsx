
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, ItemScore, getCategoryForItem, getItemDetails, WellbeingItem } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ActionPlan } from './action-plan'; // Keep import, but conditionally render
import { CategoryScoresDisplay } from './category-scores-display'; // Displays percentages now

interface WellbeingWheelProps {
  scoreType: 'current' | 'desired' | 'select';
}

interface PieDataItem extends ItemScore {
  itemId: string;
  name: string;
  categoryName: string;
  categoryColor: string;
  value: number; // Fixed value for equal slices
  fillColor: string;
  label: string; // Display label (score or checkmark)
  difference?: number | null;
  order: number;
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  percent?: number;
  payload?: any;
}

const RADIAN = Math.PI / 180;

export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType }) => {
  const {
    assessmentData,
    updateItemScore,
    selectImprovementItem,
    removeImprovementItem,
    goToStage,
    isItemSelectedForImprovement,
    getActionsForItem, // Keep if needed elsewhere, not used in this component now
  } = useAssessment();
  const { itemScores, stage, improvementItems } = assessmentData;
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(5);
  const [isClient, setIsClient] = useState(false);

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

  useEffect(() => {
    if (selectedItemData && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      setSliderValue(selectedItemData[scoreKey] ?? 5);
    } else if (isSelectionMode) {
       // In selection mode, don't automatically deselect if the item is selected
       // Just keep track of the last clicked item for potential visual feedback (like border)
       // Also, reset slider value when switching to selection mode or deselecting
       if (!selectedItemId) {
            setSliderValue(5); // Reset slider if no item is selected in select mode
       }
    } else if (!isSelectionMode && !selectedItemId) {
         setSliderValue(5);
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]);


 const handlePieClick = useCallback((data: any, index: number) => {
    const clickedItem = data?.payload as PieDataItem;

    if (!clickedItem || !clickedItem.itemId) {
        console.error("Pie click error: Invalid payload data", data);
        return;
    }
    const itemId = clickedItem.itemId;

    setSelectedItemId(itemId); // Always update the selected item ID on click

    if (isSelectionMode) {
        if (isItemSelectedForImprovement(itemId)) {
            removeImprovementItem(itemId);
            // Don't nullify selectedItemId here, keep it selected for potential UI feedback
        } else {
            if (improvementItems.length < 3) {
                selectImprovementItem(itemId);
            } else {
                toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
                // Keep the item visually selected even if limit reached, user can click again to deselect
            }
        }
    }
    // In scoring modes, setting selectedItemId above handles showing the slider
  }, [isSelectionMode, isItemSelectedForImprovement, removeImprovementItem, improvementItems.length, selectImprovementItem, toast]);


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
      setSelectedItemId(null); // Deselect after confirming score in scoring modes
    }
  };


  const calculateFillColor = useCallback((itemScore: ItemScore, defaultColor: string): string => {
    const baseColor = defaultColor;
    const itemId = itemScore.itemId;

    if (isSelectionMode) {
        // Highlight selected items in selection mode
        return isItemSelectedForImprovement(itemId) ? 'hsl(var(--accent))' : baseColor;
    }

    // Scoring modes: Apply opacity based on score or highlight if currently selected for scoring
    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const score = itemScore[scoreKey];

    if (selectedItemId === itemId) {
         return 'hsl(var(--ring))'; // Use ring color for active scoring item
    }

    if (score === null) {
        return 'hsl(var(--muted))'; // Muted color for unscored items
    }

    // Adjust opacity more aggressively: start lower, reach full opacity faster
    const opacity = Math.min(1, Math.max(0.15, (score / 8))); // Opacity from 0.15 to 1, reaches 1 at score 8

    try {
      // Use regex to extract HSL values, then format as HSLA with calculated opacity
      const hslMatch = baseColor.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
      if (hslMatch) {
        // Ensure opacity is within the valid range [0, 1]
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${clampedOpacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    return baseColor; // Fallback to base color
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


 const pieData: PieDataItem[] = useMemo(() => {
    // Sort items based on the defined order in wellbeingItems
    const orderedItemIds = wellbeingItems.map(item => item.id);

    const data = wellbeingItems.map((item, index) => {
        const category = getCategoryForItem(item.id);
        const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
        const categoryColor = category?.color ?? 'hsl(var(--secondary))';

        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        const currentDisplayScore = itemScoreData.currentScore;
        const desiredDisplayScore = itemScoreData.desiredScore;
        const scoreForColor = itemScoreData[scoreKey];

        let labelValue: string | number = '';
        let difference: number | null = null;

        if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
            difference = itemScoreData.desiredScore - itemScoreData.currentScore;
        }

        if (isSelectionMode) {
          if (isItemSelectedForImprovement(item.id)) {
            labelValue = '✓';
          } else if (difference !== null) {
             labelValue = difference > 0 ? `+${difference}` : difference.toString();
          } else if (currentDisplayScore !== null) {
             labelValue = currentDisplayScore;
          }
        } else {
           const score = itemScoreData[scoreKey];
           labelValue = score !== null ? score : '';
        }

        return {
          ...itemScoreData,
          itemId: item.id,
          name: item.name,
          categoryName: category?.name ?? 'Unknown',
          categoryColor: categoryColor,
          value: 1,
          fillColor: calculateFillColor(itemScoreData, categoryColor),
          label: labelValue.toString(),
          difference: difference,
          order: index, // Keep original index if needed, but we sort below
        };
      });

      // Ensure the data is sorted according to the wellbeingItems order
      data.sort((a, b) => orderedItemIds.indexOf(a.itemId) - orderedItemIds.indexOf(b.itemId));
      return data;

  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement, calculateFillColor]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        // Need at least one item selected to proceed
        return improvementItems.length === 0;
    } else {
        // Need scores for all items in the current/desired mode
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKeyToCompare] === null);
    }
   }, [isSelectionMode, improvementItems.length, itemScores, scoreType]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as PieDataItem;
      if (!data || !data.itemId) return null;

      const itemDetails = getItemDetails(data.itemId);
      // Use the actual scores from the payload for tooltip display
      const currentScore = data.currentScore;
      const desiredScore = data.desiredScore;
      const difference = currentScore !== null && desiredScore !== null ? desiredScore - currentScore : null;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs">
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

           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && (
               <p className="mt-2 text-accent font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-accent" />Selecionado para Melhoria</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length < 3 && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para selecionar para melhoria.</p>
           )}
           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && (
                <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para remover da seleção.</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}
           {/* Show scoring prompt in tooltip for scoring modes */}
            {!isSelectionMode && selectedItemId !== data.itemId && data[scoreType === 'current' ? 'currentScore' : 'desiredScore'] === null && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para definir a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
             {!isSelectionMode && selectedItemId !== data.itemId && data[scoreType === 'current' ? 'currentScore' : 'desiredScore'] !== null && (
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para editar a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
        </div>
      );
    }
    return null;
  };

    // Label for item names outside the pie
    const renderCustomizedNameLabel = useCallback(({ cx, cy, midAngle, outerRadius, payload }: any) => {
        const entry = payload as PieDataItem;
        if (!entry || !midAngle) return null;

        const radius = outerRadius * 1.15; // Adjust distance from pie edge
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const name = entry.name;

        // Simple split, assuming names are short enough or handle longer names if needed
        const nameParts = name.split(' ');
        const line1 = nameParts[0];
        const line2 = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        return (
            <text
                x={x}
                y={y}
                fill="hsl(var(--foreground))"
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[10px] sm:text-xs pointer-events-none" // Smaller font size
                 style={{ fontWeight: 500 }}
            >
                 <tspan x={x} dy={line2 ? "-0.6em" : "0"}>{line1}</tspan>
                 {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
        );
    }, []);

     // Label for scores/checks inside the pie slices
     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
         const entry = payload as PieDataItem;
         if (!entry || entry.label === '' || !midAngle) return null;

         const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // Position inside slice
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);
         const isCheckmark = isSelectionMode && entry.label === '✓';
         const difference = entry.difference;
         const isDifferenceLabel = isSelectionMode && difference !== null && entry.label === (difference > 0 ? `+${difference}` : difference.toString());

         let fillColor = "hsl(var(--primary-foreground))"; // Default: white/light text
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 20 : 16; // Adjusted sizes

         if (isDifferenceLabel && difference !== null) {
             // Use darker text for better contrast on potentially lighter difference colors
             if (difference > 0) fillColor = 'hsl(142, 71%, 20%)'; // Darker Green
             else if (difference < 0) fillColor = 'hsl(0, 84%, 25%)'; // Darker Red
             else fillColor = 'hsl(var(--muted-foreground))';
             fontSize = 14;
             fontWeight = 600;
         } else if (!isCheckmark && !isDifferenceLabel) {
            // For regular scores, ensure contrast against the slice color
            // This is a simplified check; might need more robust contrast logic
            const scoreValue = parseInt(entry.label);
            if (!isNaN(scoreValue) && scoreValue < 4) { // Example: Use light text for low scores if slice is dark
                 fillColor = "hsl(var(--primary-foreground))";
            } else { // Use dark text for high scores if slice is light/opaque
                 fillColor = "hsl(var(--foreground))"; // Or a specific dark color
                 // Adjust if background is dark theme
                 // if (document.documentElement.classList.contains('dark')) {
                 //     fillColor = "hsl(var(--primary-foreground))";
                 // }
            }
         }


         return (
         <text
             x={x}
             y={y}
             fill={fillColor}
             textAnchor="middle"
             dominantBaseline="central"
             fontWeight={fontWeight}
             fontSize={fontSize}
             className="pointer-events-none"
         >
             {entry.label}
         </text>
         );
     }, [isSelectionMode]);


    if (!isClient) {
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
     // Main container using flex column
     <div className="flex flex-col items-center w-full gap-8">

        {/* Chart Area */}
        <div className="relative w-full max-w-3xl aspect-square mx-auto"> {/* Increased max-width and aspect-square */}
             <ResponsiveContainer width="100%" height="100%">
                 {/* Increased margins significantly for labels */}
                 <PieChart margin={{ top: 60, right: 60, bottom: 60, left: 60 }}>
                   {/* Outer Pie for slices and outer labels */}
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="80%" // Good size
                     innerRadius="30%" // Creates the donut hole
                     dataKey="value" // Use fixed value for equal slices
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     label={renderCustomizedNameLabel} // Use name labels here
                     startAngle={90 + (360 / wellbeingItems.length / 2)} // Start top-center-ish
                     endAngle={90 + (360 / wellbeingItems.length / 2) - 360} // Go full circle counter-clockwise
                     stroke="hsl(var(--background))" // Add background color stroke for separation
                     strokeWidth={1}
                   >
                     {pieData.map((entry, index) => {
                       const isCurrentlySelected = selectedItemId === entry.itemId;
                       // Determine stroke based on scoring state or selection state
                       let strokeColor = 'hsl(var(--background))'; // Default border same as background
                       let strokeWidth = 1;
                       if (isCurrentlySelected) {
                           if (isSelectionMode) {
                               // Use ring color when initially clicked in selection mode
                               strokeColor = 'hsl(var(--ring))';
                           } else {
                               // Use ring color when selected for scoring
                               strokeColor = 'hsl(var(--ring))';
                           }
                           strokeWidth = 3; // Make border thicker when selected
                       }
                       // Always highlight items selected for improvement with accent color border in selection mode
                       if (isSelectionMode && isItemSelectedForImprovement(entry.itemId)) {
                            strokeColor = 'hsl(var(--accent))';
                            strokeWidth = 2;
                       }


                       return (
                         <Cell
                           key={`cell-${entry.itemId}`}
                           fill={entry.fillColor}
                           stroke={strokeColor}
                           strokeWidth={strokeWidth}
                           className="focus:outline-none transition-all duration-300 hover:opacity-80"
                           tabIndex={0} // Make cells focusable
                           payload={entry} // Pass the full data entry to payload
                           aria-label={`${entry.name}: ${scoreType === 'current' ? (entry.currentScore ?? 'Não avaliado') : scoreType === 'desired' ? (entry.desiredScore ?? 'Não definido') : (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado para melhoria' : 'Não selecionado')}`} // ARIA label
                         />
                       );
                     })}
                   </Pie>
                    {/* Inner Pie layer ONLY for internal score/check labels */}
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%" // Match outer radius
                        innerRadius="30%" // Match inner radius
                        dataKey="value" // Still based on equal slices
                        label={renderCustomizedScoreLabel} // Render scores/checks inside
                        startAngle={90 + (360 / wellbeingItems.length / 2)}
                        endAngle={90 + (360 / wellbeingItems.length / 2) - 360}
                        isAnimationActive={false} // No animation for this static layer
                        className="pointer-events-none" // Make this layer non-interactive
                        stroke="none" // No border for label layer cells
                    >
                        {/* Transparent cells for the label layer */}
                        {pieData.map((entry) => (
                            <Cell key={`label-cell-${entry.itemId}`} fill="transparent" />
                        ))}
                    </Pie>

                   {/* Tooltip shown on hover */}
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                 </PieChart>
             </ResponsiveContainer>

             {/* Center Icon/Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-4">
                  {/* Choose icon based on scoreType */}
                  {scoreType === 'current' && <Target className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                  {scoreType === 'desired' && <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                  {scoreType === 'select' && <Star className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                 {/* Text below icon */}
                 <span className="text-base sm:text-lg font-medium text-foreground uppercase tracking-wider mt-1">
                     {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
                 </span>
              </div>
           </div>

         {/* Controls Area (Slider or Selection Prompt/Action Plan) */}
         <div className="w-full max-w-lg">
            {/* Scoring Slider Card (only in scoring modes and when an item is selected) */}
            {selectedItemId && !isSelectionMode && (
                <Card className="w-full shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-10">
                    <CardHeader>
                        <CardTitle className="text-lg text-center">Avaliar: <span className="text-primary">{selectedItemDetails?.name}</span></CardTitle>
                        <CardDescription className="text-center">
                            {scoreType === 'current' ? 'Qual sua satisfação atual (1-10)?' : 'Qual nota você deseja alcançar (1-10)?'}
                            {/* Show current score for reference in 'desired' mode */}
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
                             {/* Show difference from current score in 'desired' mode */}
                            {scoreType === 'desired' && selectedItemData?.currentScore !== null && (
                                <span className={cn("text-base font-medium flex items-center",
                                    (sliderValue - selectedItemData.currentScore) > 0 ? "text-green-600" :
                                    (sliderValue - selectedItemData.currentScore) < 0 ? "text-red-600" :
                                    "text-muted-foreground")}>
                                    ({sliderValue - selectedItemData.currentScore >= 0 ? '+' : ''}{sliderValue - selectedItemData.currentScore})
                                    {/* Show trend icon if difference is not zero */}
                                    {(sliderValue - selectedItemData.currentScore) !== 0 && <TrendingUp className="w-4 h-4 ml-1"/>}
                                </span>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 pb-4">
                        {/* Cancel button deselects the item */}
                        <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>Cancelar</Button>
                        {/* Confirm button saves the score and deselects */}
                        <Button size="sm" onClick={confirmScore}>Confirmar Nota</Button>
                    </CardFooter>
                </Card>
            )}

             {/* Selection Mode Prompt/Action Plan */}
             {isSelectionMode && (
                <div className="w-full">
                    {improvementItems.length === 0 && ( // Show prompt if no items are selected yet
                       <Card className="w-full shadow-sm bg-muted/50">
                           <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                               {`Itens selecionados: ${improvementItems.length}/3. Clique nos itens do gráfico que deseja melhorar.`}
                               {selectedItemId && !isItemSelectedForImprovement(selectedItemId) && improvementItems.length < 3 && (
                                   <span className="block mt-1 text-xs italic">Clique novamente em "{selectedItemDetails?.name}" para confirmar a seleção.</span>
                               )}
                               {selectedItemId && isItemSelectedForImprovement(selectedItemId) && (
                                    <span className="block mt-1 text-xs italic">Clique novamente em "{selectedItemDetails?.name}" para remover da seleção.</span>
                               )}
                           </CardContent>
                       </Card>
                   )}
                   {/* Render ActionPlan only if items HAVE been selected */}
                   {improvementItems.length > 0 && (
                       <div className="mt-4">
                           {/* Pass only the ID of the *last clicked* item if you want to show actions for just that one */}
                           {/* <ActionPlan selectedItemId={selectedItemId} renderAllSelected={false} /> */}

                           {/* Or, keep showing the prompt until user clicks next */}
                             <Card className="w-full shadow-sm bg-muted/50">
                               <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                                   {`Itens selecionados: ${improvementItems.length}/3.`}
                                   <span className="block mt-1">Clique em "Próximo" para definir as ações.</span>
                               </CardContent>
                           </Card>
                       </div>
                   )}
                </div>
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


        {/* Category Percentages Display */}
        <div className="w-full max-w-2xl">
             {/* Determine which score type to display percentages for */}
            <CategoryScoresDisplay scoreType={scoreType === 'select' ? 'desired' : scoreType} />
        </div>

        {/* Navigation Buttons */}
        <div className="mt-0 flex justify-between w-full max-w-lg"> {/* Reduced margin-top */}
            {/* Go back button */}
            <Button variant="outline" onClick={() => goToStage(prevStage)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {/* Go next button, disabled based on stage completion */}
            <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
        {/* Message shown if next is disabled in scoring modes */}
        {isNextDisabled && !isSelectionMode && (
            <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Por favor, avalie todos os itens antes de prosseguir.
            </p>
        )}
        {/* Message shown if next is disabled in selection mode */}
        {isNextDisabled && isSelectionMode && (
             <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Selecione pelo menos um item para melhorar antes de prosseguir.
            </p>
        )}
     </div>
   );
};

// Removed extraneous closing tag
// ```
