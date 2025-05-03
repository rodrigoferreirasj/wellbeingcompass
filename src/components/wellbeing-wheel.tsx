
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
import { ActionPlan } from './action-plan'; // Assuming ActionPlan is used in 'defineActions' stage now
import { CategoryScoresDisplay } from './category-scores-display';

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
  displayLabel: string; // Label for inner display (score, check, diff, or name) - Renamed from 'label'
  nameLabel: string; // Display label for outer name - Keeping for reference, might remove usage
  difference?: number | null;
  order: number;
  // Recharts injected props
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  percent?: number;
  payload?: any;
  // Custom props for positioning - No longer needed for outer labels
  // labelX?: number;
  // labelY?: number;
  // labelAnchor?: 'start' | 'middle' | 'end';
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
       if (!selectedItemId) {
            setSliderValue(5); // Reset slider if no item is selected in selection mode
       }
       // Don't change slider value if an item *is* selected in selection mode
    } else if (!isSelectionMode && !selectedItemId) {
         setSliderValue(5); // Reset slider if no item selected in scoring modes
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]);


 const handlePieClick = useCallback((data: any, index: number) => {
    const clickedItem = data?.payload as PieDataItem;

    if (!clickedItem || !clickedItem.itemId) {
        console.error("Pie click error: Invalid payload data", data);
        return;
    }
    const itemId = clickedItem.itemId;


    // Handle selection logic differently
    if (isSelectionMode) {
        // If clicking the *same* item, toggle its selection
        if (selectedItemId === itemId) {
             if (isItemSelectedForImprovement(itemId)) {
                removeImprovementItem(itemId);
                setSelectedItemId(null); // Deselect after removing
            } else {
                if (improvementItems.length < 3) {
                    selectImprovementItem(itemId);
                    // Keep it selected visually after adding
                } else {
                     toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
                }
            }
        } else {
             // If clicking a *different* item, just set it as the currently focused item
             setSelectedItemId(itemId);
             // Don't toggle selection here, wait for a second click or confirmation
        }
    } else {
         // In scoring modes, clicking always selects the item for scoring
         setSelectedItemId(itemId);
    }

  }, [isSelectionMode, isItemSelectedForImprovement, removeImprovementItem, improvementItems.length, selectImprovementItem, toast, selectedItemId]); // Added selectedItemId dependency


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
    }
  };


  const calculateFillColor = useCallback((itemScore: ItemScore, defaultColor: string): string => {
    const baseColor = defaultColor;
    const itemId = itemScore.itemId;

     // Selection Mode Highlighting (overrides other states)
     if (isSelectionMode) {
        if (isItemSelectedForImprovement(itemId)) {
            return 'hsl(var(--accent))'; // Highlight confirmed selections with accent
        } else if (selectedItemId === itemId) {
             return 'hsl(var(--ring) / 0.7)'; // Highlight item currently focused for potential selection
        } else {
            // In selection mode, use full opacity if not selected/focused
             return baseColor;
        }
    }

    // Scoring Mode Highlighting
    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const score = itemScore[scoreKey];

    if (selectedItemId === itemId) {
         return 'hsl(var(--ring))'; // Ring color when actively scoring
    }

    if (score === null) {
        return 'hsl(var(--muted))'; // Muted if not scored yet
    }

    // Opacity based on score
    const opacity = Math.min(1, Math.max(0.15, (score / 8))); // Adjust opacity range/curve if needed

    try {
      // Try to parse HSL(A) color to adjust opacity
      const match = baseColor.match(/hsla?\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/);
      if (match) {
        const [h, s, l] = match.slice(1, 4);
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        return `hsla(${h}, ${s}%, ${l}%, ${clampedOpacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    // Fallback to base color if HSL parsing fails
    return baseColor;
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


  const pieData: PieDataItem[] = useMemo(() => {
    const orderedItems = wellbeingItems; // Use the fixed order

    return orderedItems.map((item, index) => {
      const category = getCategoryForItem(item.id);
      const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
      const categoryColor = category?.color ?? 'hsl(var(--secondary))';
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';

      let difference: number | null = null;
      if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
        difference = itemScoreData.desiredScore - itemScoreData.currentScore;
      }

      // The inner label will now be the item name
      const displayLabelValue = item.name;
      const nameLabelValue = item.name; // Keep for potential tooltip/future use

      return {
        ...itemScoreData,
        itemId: item.id,
        name: item.name,
        categoryName: category?.name ?? 'Unknown',
        categoryColor: categoryColor,
        value: 1, // Equal size slice
        fillColor: calculateFillColor(itemScoreData, categoryColor),
        displayLabel: displayLabelValue, // Use item name for inner display
        nameLabel: nameLabelValue,
        difference: difference,
        order: index,
      };
    });
  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement, calculateFillColor]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        return improvementItems.length === 0; // Must select at least one item
    } else {
        // Must score all items in current or desired stage
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKeyToCompare] === null);
    }
   }, [isSelectionMode, improvementItems.length, itemScores, scoreType]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as PieDataItem;
      if (!data || !data.itemId) return null;

      const itemDetails = getItemDetails(data.itemId);
      const currentScore = data.currentScore;
      const desiredScore = data.desiredScore;
      const difference = currentScore !== null && desiredScore !== null ? desiredScore - currentScore : null;

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
           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && (
               <p className="mt-2 text-accent font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-accent" />Selecionado para Melhoria</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length < 3 && selectedItemId === data.itemId && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para confirmar a seleção.</p>
           )}
            {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length < 3 && selectedItemId !== data.itemId && (
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para focar, clique novamente para selecionar.</p>
           )}
           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && selectedItemId === data.itemId && (
                <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para remover da seleção.</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}

           {/* Scoring Mode Tooltip Hints */}
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

     // Renders the inner item name labels
     const renderCustomizedNameLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
         const entry = payload as PieDataItem;
         if (!entry || !entry.displayLabel || !midAngle) return null;

         const radius = innerRadius + (outerRadius - innerRadius) * 0.55; // Position slightly outwards from center
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);

         // Basic contrast logic: Determine text color based on fill color's perceived lightness
         let fillColor = "hsl(var(--foreground))"; // Default to dark text
         try {
            // Extract HSL values from the fillColor
            const match = entry.fillColor.match(/hsla?\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/);
            if (match) {
                const lightness = parseFloat(match[3]);
                const alpha = match[4] ? parseFloat(match[4]) : 1;
                // If background is dark (low lightness or high opacity on dark color), use light text
                if (lightness < 55 && alpha > 0.5) {
                    fillColor = "hsl(var(--primary-foreground))"; // Light text
                }
            }
         } catch (e) {
             console.error("Error determining label color based on background", e);
         }
          // Ensure visibility for selected/focused items
         if (selectedItemId === entry.itemId || (isSelectionMode && isItemSelectedForImprovement(entry.itemId))) {
             fillColor = "hsl(var(--primary-foreground))"; // Use light text on selection highlights
         }


         // Simple split for multi-line labels - keep it concise
         const nameParts = entry.displayLabel.split(' ');
         let line1 = entry.displayLabel;
         let line2 = '';
         if (entry.displayLabel.length > 15 && nameParts.length > 1) { // Adjust length threshold if needed
            const breakPoint = Math.ceil(nameParts.length / 2);
            line1 = nameParts.slice(0, breakPoint).join(' ');
            line2 = nameParts.slice(breakPoint).join(' ');
         }


         return (
            <text
                x={x}
                y={y}
                fill={fillColor}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[8px] sm:text-[10px] pointer-events-none font-medium" // Smaller, medium weight
            >
              {/* Render tspans for potential multi-line */}
              <tspan x={x} dy={line2 ? "-0.6em" : "0"}>{line1}</tspan>
              {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
         );
     }, [isSelectionMode, selectedItemId, isItemSelectedForImprovement]); // Add dependencies


    if (!isClient) {
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
     <div className="flex flex-col items-start w-full gap-6 px-4"> {/* Main container: Always column */}

        {/* Chart Area */}
        <div className="relative w-full max-w-3xl mx-auto aspect-square"> {/* Increased max-width and kept aspect ratio */}
             <ResponsiveContainer width="100%" height="100%">
                 {/* Single Pie for Interaction and Labels */}
                 <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}> {/* Reduced margin */}
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="95%" // Use almost full radius
                     innerRadius="25%" // Smaller inner radius
                     dataKey="value"
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     label={renderCustomizedNameLabel} // Render inner name labels
                     startAngle={90}
                     endAngle={-270}
                     stroke="hsl(var(--background))"
                     strokeWidth={1}
                   >
                     {pieData.map((entry) => {
                       const isCurrentlySelected = selectedItemId === entry.itemId;
                       const isConfirmedSelection = isSelectionMode && isItemSelectedForImprovement(entry.itemId);

                       let strokeColor = 'hsl(var(--background))'; // Default border
                       let strokeWidth = 1;

                       if (isConfirmedSelection) {
                           strokeColor = 'hsl(var(--accent))'; // Accent border for confirmed selection
                           strokeWidth = 3; // Thicker border for confirmed
                       } else if (isCurrentlySelected) {
                           strokeColor = 'hsl(var(--ring))'; // Ring color for scoring or focused selection
                           strokeWidth = 3; // Thicker border for focus/scoring
                       }

                       return (
                         <Cell
                           key={`cell-${entry.itemId}`}
                           fill={entry.fillColor} // Calculated fill based on state
                           stroke={strokeColor}
                           strokeWidth={strokeWidth}
                           className="focus:outline-none transition-all duration-300 hover:opacity-80" // Added hover effect
                           tabIndex={0} // Make focusable
                           payload={entry} // Pass data to handlers/tooltips
                           aria-label={`${entry.name}: ${scoreType === 'current' ? (entry.currentScore ?? 'Não avaliado') : scoreType === 'desired' ? (entry.desiredScore ?? 'Não definido') : (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado para melhoria' : 'Não selecionado')}`}
                         />
                       );
                     })}
                   </Pie>
                   {/* Tooltip remains the same */}
                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                 </PieChart>
             </ResponsiveContainer>

              {/* Center Icon/Text - slightly smaller and adjusted position */}
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
            {/* Controls Area */}
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
                            <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>Cancelar</Button>
                            <Button size="sm" onClick={confirmScore}>Confirmar Nota</Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Selection Mode Prompt */}
                 {isSelectionMode && (
                    <div className="w-full">
                        <Card className="w-full shadow-sm bg-muted/50 mb-6">
                            <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                                {`Itens selecionados: ${improvementItems.length}/3. `}
                                {improvementItems.length < 3 && !selectedItemId && 'Clique em um item para focar.'}
                                {improvementItems.length < 3 && selectedItemId && !isItemSelectedForImprovement(selectedItemId) && `Focado em "${selectedItemDetails?.name}". Clique novamente para selecionar.`}
                                {improvementItems.length < 3 && selectedItemId && isItemSelectedForImprovement(selectedItemId) && `"${selectedItemDetails?.name}" selecionado. Clique novamente para remover.`}
                                {improvementItems.length >= 3 && !isItemSelectedForImprovement(selectedItemId ?? '') && 'Limite de 3 itens atingido.'}
                                 {improvementItems.length >= 3 && isItemSelectedForImprovement(selectedItemId ?? '') && `"${selectedItemDetails?.name}" selecionado. Clique novamente para remover.`}
                            </CardContent>
                        </Card>
                         {/* Action Plan is now handled in a separate stage ('defineActions') */}
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
                 <p className="text-xs text-destructive text-center mt-2 w-full">
                    Selecione pelo menos um item para melhorar antes de prosseguir.
                </p>
            )}
         </div>
     </div>
   );
};

    