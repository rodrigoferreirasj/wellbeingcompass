
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
// import { ActionPlan } from './action-plan'; // Removed import - Action Plan is shown in its own stage
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
  label: string; // Display label (score or checkmark)
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
  // Custom props for positioning
  labelX?: number;
  labelY?: number;
  labelAnchor?: 'start' | 'middle' | 'end';
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
            setSliderValue(5);
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
        } else {
            if (improvementItems.length < 3) {
                selectImprovementItem(itemId);
            } else {
                toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
            }
        }
    }
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
      setSelectedItemId(null);
    }
  };


  const calculateFillColor = useCallback((itemScore: ItemScore, defaultColor: string): string => {
    const baseColor = defaultColor;
    const itemId = itemScore.itemId;

    if (isSelectionMode) {
        return isItemSelectedForImprovement(itemId) ? 'hsl(var(--accent))' : baseColor;
    }

    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const score = itemScore[scoreKey];

    if (selectedItemId === itemId) {
         return 'hsl(var(--ring))';
    }

    if (score === null) {
        return 'hsl(var(--muted))';
    }

    const opacity = Math.min(1, Math.max(0.15, (score / 8)));

    try {
      const hslMatch = baseColor.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
      if (hslMatch) {
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${clampedOpacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    return baseColor;
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


  const pieData: PieDataItem[] = useMemo(() => {
    const orderedItemIds = wellbeingItems.map(item => item.id);

    const data = wellbeingItems.map((item, index) => {
        const category = getCategoryForItem(item.id);
        const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
        const categoryColor = category?.color ?? 'hsl(var(--secondary))';

        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        const currentDisplayScore = itemScoreData.currentScore;
        const desiredDisplayScore = itemScoreData.desiredScore;

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

        // Initial data structure
        const pieEntry: PieDataItem = {
          ...itemScoreData,
          itemId: item.id,
          name: item.name,
          categoryName: category?.name ?? 'Unknown',
          categoryColor: categoryColor,
          value: 1, // Equal size slice
          fillColor: calculateFillColor(itemScoreData, categoryColor),
          label: labelValue.toString(),
          difference: difference,
          order: index,
        };
        return pieEntry;
      });

      // Sort data according to wellbeingItems order
      data.sort((a, b) => orderedItemIds.indexOf(a.itemId) - orderedItemIds.indexOf(b.itemId));

       // Calculate label positions after sorting
       const numItems = data.length;
       const angleStep = 360 / numItems;
       const baseOuterRadius = 80; // Percentage
       const labelRadiusMultiplier = 1.25; // Increased multiplier for more distance

      return data.map((entry, index) => {
            const midAngle = 90 + (angleStep / 2) - (index * angleStep) - (angleStep / 2); // Center angle for the slice
            const outerRadiusValue = baseOuterRadius; // Could adjust per slice if needed
            const labelRadius = outerRadiusValue * labelRadiusMultiplier; // Calculate radius for label

            // Using dummy cx, cy as relative positioning will happen in the render function
            const cx = 50; // Assuming center is 50%
            const cy = 50;

            const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
            const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
            const textAnchor = x > cx ? 'start' : 'end';

            return {
                ...entry,
                midAngle: midAngle, // Store midAngle if needed elsewhere
                labelX: x, // Store calculated X position (as percentage)
                labelY: y, // Store calculated Y position (as percentage)
                labelAnchor: textAnchor, // Store text anchor
            };
       });


  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement, calculateFillColor]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        return improvementItems.length === 0;
    } else {
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

    // Updated label renderer using pre-calculated positions
    const renderCustomizedNameLabel = useCallback(({ payload, cx, cy }: any) => {
        const entry = payload as PieDataItem;
        if (!entry || entry.labelX === undefined || entry.labelY === undefined) return null;

        const name = entry.name;
        // Simple split for multi-line labels
        const nameParts = name.split(' ');
        const line1 = nameParts[0];
        const line2 = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        // Adjust y based on whether there are two lines
        const yPosition = entry.labelY + (line2 ? -5 : 0); // Shift up slightly if two lines

        return (
             <text
                // Use percentage-based positioning relative to the container
                x={`${entry.labelX}%`}
                y={`${yPosition}%`}
                fill="hsl(var(--foreground))"
                textAnchor={entry.labelAnchor}
                dominantBaseline="central"
                className="text-[9px] sm:text-[11px] pointer-events-none" // Slightly smaller font
                style={{ fontWeight: 500 }}
             >
                <tspan x={`${entry.labelX}%`} dy={line2 ? "-0.4em" : "0"}>{line1}</tspan>
                {line2 && <tspan x={`${entry.labelX}%`} dy="1.1em">{line2}</tspan>}
             </text>
        );
    }, []);


     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
         const entry = payload as PieDataItem;
         if (!entry || entry.label === '' || !midAngle) return null;

         const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);
         const isCheckmark = isSelectionMode && entry.label === '✓';
         const difference = entry.difference;
         const isDifferenceLabel = isSelectionMode && difference !== null && entry.label === (difference > 0 ? `+${difference}` : difference.toString());

         let fillColor = "hsl(var(--primary-foreground))";
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 20 : 16;

         if (isDifferenceLabel && difference !== null) {
             if (difference > 0) fillColor = 'hsl(142, 71%, 20%)';
             else if (difference < 0) fillColor = 'hsl(0, 84%, 25%)';
             else fillColor = 'hsl(var(--muted-foreground))';
             fontSize = 14;
             fontWeight = 600;
         } else if (!isCheckmark && !isDifferenceLabel) {
            const scoreValue = parseInt(entry.label);
            // Basic contrast logic (light text on dark/opaque, dark text on light/transparent)
            // This assumes defaultColor/fillColor gives an idea of background lightness
            // A more robust solution would analyze the actual fill color's lightness
            const scoreOpacity = Math.min(1, Math.max(0.15, (scoreValue / 8)));
            if (scoreValue < 5 || scoreOpacity > 0.6) { // Example threshold
                 fillColor = "hsl(var(--primary-foreground))";
            } else {
                 fillColor = "hsl(var(--foreground))";
                 // Adjust for dark mode if needed
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
     <div className="flex flex-col items-center w-full gap-6"> {/* Reduced gap slightly */}

        {/* Chart Area - Increased size */}
        <div className="relative w-full max-w-4xl aspect-square mx-auto"> {/* Increased max-width */}
             <ResponsiveContainer width="100%" height="100%">
                 <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}> {/* Adjusted margins if needed */}
                   {/* Outer Pie */}
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="80%"
                     innerRadius="30%"
                     dataKey="value"
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     label={renderCustomizedNameLabel} // Outer labels (names)
                     startAngle={90} // Start at 12 o'clock
                     endAngle={-270} // Go full circle counter-clockwise
                     stroke="hsl(var(--background))"
                     strokeWidth={1}
                   >
                     {pieData.map((entry) => {
                       const isCurrentlySelected = selectedItemId === entry.itemId;
                       let strokeColor = 'hsl(var(--background))';
                       let strokeWidth = 1;
                       if (isCurrentlySelected) {
                           strokeColor = 'hsl(var(--ring))'; // Ring color for scoring/initial select
                           strokeWidth = 3;
                       }
                       if (isSelectionMode && isItemSelectedForImprovement(entry.itemId)) {
                            strokeColor = 'hsl(var(--accent))'; // Accent border for confirmed selection
                            strokeWidth = 2;
                       }

                       return (
                         <Cell
                           key={`cell-${entry.itemId}`}
                           fill={entry.fillColor}
                           stroke={strokeColor}
                           strokeWidth={strokeWidth}
                           className="focus:outline-none transition-all duration-300 hover:opacity-80"
                           tabIndex={0}
                           payload={entry}
                           aria-label={`${entry.name}: ${scoreType === 'current' ? (entry.currentScore ?? 'Não avaliado') : scoreType === 'desired' ? (entry.desiredScore ?? 'Não definido') : (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado para melhoria' : 'Não selecionado')}`}
                         />
                       );
                     })}
                   </Pie>
                    {/* Inner Pie for Scores/Checks */}
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        innerRadius="30%"
                        dataKey="value"
                        label={renderCustomizedScoreLabel} // Inner labels (scores/checks)
                        startAngle={90}
                        endAngle={-270}
                        isAnimationActive={false}
                        className="pointer-events-none"
                        stroke="none"
                    >
                        {pieData.map((entry) => (
                            <Cell key={`label-cell-${entry.itemId}`} fill="transparent" />
                        ))}
                    </Pie>

                   <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                 </PieChart>
             </ResponsiveContainer>

              {/* Center Icon/Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-4">
                  {scoreType === 'current' && <Target className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                  {scoreType === 'desired' && <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                  {scoreType === 'select' && <Star className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-1"/>}
                 <span className="text-base sm:text-lg font-medium text-foreground uppercase tracking-wider mt-1">
                     {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
                 </span>
              </div>
           </div>

         {/* Controls Area Below Chart */}
         <div className="w-full max-w-lg"> {/* Centered controls */}
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
                    <Card className="w-full shadow-sm bg-muted/50">
                        <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                            {`Itens selecionados: ${improvementItems.length}/3. `}
                            {improvementItems.length < 3 ? 'Clique nos itens do gráfico que deseja melhorar.' : 'Limite atingido.'}
                            {selectedItemId && !isItemSelectedForImprovement(selectedItemId) && improvementItems.length < 3 && (
                                <span className="block mt-1 text-xs italic">Clique novamente em "{selectedItemDetails?.name}" para confirmar a seleção.</span>
                            )}
                            {selectedItemId && isItemSelectedForImprovement(selectedItemId) && (
                                <span className="block mt-1 text-xs italic">Clique novamente em "{selectedItemDetails?.name}" para remover da seleção.</span>
                            )}
                        </CardContent>
                    </Card>
                   {/* Action Plan is NOT rendered here anymore, only in defineActions stage */}
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
        <div className="w-full max-w-2xl">
            {/* Always render the combined display */}
            <CategoryScoresDisplay scoreType="combined" />
        </div>

        {/* Navigation Buttons */}
        <div className="mt-4 flex justify-between w-full max-w-lg"> {/* Adjusted margin */}
            <Button variant="outline" onClick={() => goToStage(prevStage)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
        {/* Messages for disabled Next button */}
        {isNextDisabled && !isSelectionMode && (
            <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Por favor, avalie todos os itens antes de prosseguir.
            </p>
        )}
        {isNextDisabled && isSelectionMode && (
             <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Selecione pelo menos um item para melhorar antes de prosseguir.
            </p>
        )}
     </div>
   );
};
