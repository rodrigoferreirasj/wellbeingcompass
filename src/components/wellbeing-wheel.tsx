
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
    } else if (!isSelectionMode && !selectedItemId) {
         setSliderValue(5);
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]); // Removed isItemSelectedForImprovement dependency


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

    const opacity = Math.max(0.1, score / 10);
    try {
      const hslMatch = baseColor.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
      if (hslMatch) {
        return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    return baseColor; // Fallback to base color
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


 const pieData: PieDataItem[] = useMemo(() => {
    return wellbeingItems.map((item, index) => {
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
          order: index,
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
   }, [isSelectionMode, improvementItems, itemScores, scoreType]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as PieDataItem;
      if (!data || !data.itemId) return null;

      const itemDetails = getItemDetails(data.itemId);
      const difference = data.currentScore !== null && data.desiredScore !== null ? data.desiredScore - data.currentScore : null;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs">
          <p className="font-semibold text-primary">{data.name} <span className="text-xs text-muted-foreground">({data.categoryName})</span></p>
          {itemDetails?.description && <p className="text-muted-foreground text-xs mt-1">{itemDetails.description}</p>}

          <div className="mt-2 space-y-1">
              {data.currentScore !== null && <p>Atual: <span className="font-medium">{data.currentScore}</span></p>}
              {data.desiredScore !== null && <p>Desejado: <span className="font-medium">{data.desiredScore}</span></p>}
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
        </div>
      );
    }
    return null;
  };

    const renderCustomizedNameLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
        const entry = payload as PieDataItem;
        if (!entry || !midAngle) return null;

        // Increase multiplier for larger distance
        const radius = outerRadius * 1.25; // Adjusted multiplier
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const name = entry.name;

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
                className="text-xs sm:text-sm pointer-events-none" // Slightly larger text
                 style={{ fontWeight: 500 }}
            >
                 <tspan x={x} dy={line2 ? "-0.5em" : "0"}>{line1}</tspan>
                 {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
        );
    }, []);

     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
         const entry = payload as PieDataItem;
         if (!entry || entry.label === '' || !midAngle) return null;

         const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);
         const isCheckmark = isSelectionMode && entry.label === '✓';
         const difference = entry.difference;
         const isDifferenceLabel = isSelectionMode && difference !== null && entry.label === (difference > 0 ? `+${difference}` : difference.toString());

         let fillColor = "hsl(var(--primary-foreground))";
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 24 : 18; // Larger font size

         if (isDifferenceLabel && difference !== null) {
             if (difference > 0) fillColor = 'hsl(142 71% 90%)';
             else if (difference < 0) fillColor = 'hsl(0 84% 90%)';
             else fillColor = 'hsl(var(--muted-foreground))';
             fontSize = 16; // Slightly larger difference font size
             fontWeight = 600;
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
     // Removed grid layout, using flex column now
     <div className="flex flex-col items-center w-full gap-8">

        {/* Chart Area */}
        <div className="relative w-full max-w-3xl aspect-square mx-auto"> {/* Increased max-width and aspect-square */}
             <ResponsiveContainer width="100%" height="100%">
                 {/* Increased margins significantly */}
                 <PieChart margin={{ top: 80, right: 80, bottom: 80, left: 80 }}>
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="80%" // Increased outerRadius
                     innerRadius="30%"
                     dataKey="value"
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     label={renderCustomizedNameLabel}
                     startAngle={90 + (360 / wellbeingItems.length / 2)}
                     endAngle={90 + (360 / wellbeingItems.length / 2) - 360}
                   >
                     {pieData.map((entry, index) => {
                       const isCurrentlySelected = selectedItemId === entry.itemId;
                       // Determine stroke based on scoring state or selection state
                       let strokeColor = 'hsl(var(--background))';
                       let strokeWidth = 1;
                       if (isCurrentlySelected) {
                           if (isSelectionMode) {
                               strokeColor = isItemSelectedForImprovement(entry.itemId) ? 'hsl(var(--accent))' : 'hsl(var(--ring))'; // Accent if selected, Ring if just clicked
                           } else {
                               strokeColor = 'hsl(var(--ring))'; // Ring color when selected for scoring
                           }
                           strokeWidth = 3;
                       } else if (isSelectionMode && isItemSelectedForImprovement(entry.itemId)) {
                           // Keep accent border for items selected for improvement even if not the *last clicked*
                           strokeColor = 'hsl(var(--accent))';
                           strokeWidth = 2;
                       }

                       return (
                         <Cell
                           key={`cell-${entry.itemId}`} // Simplified key
                           fill={entry.fillColor}
                           stroke={strokeColor}
                           strokeWidth={strokeWidth}
                           className="focus:outline-none transition-all duration-300 hover:opacity-80"
                           tabIndex={0}
                           payload={entry}
                           aria-label={`${entry.name}`}
                         />
                       );
                     })}
                   </Pie>
                    {/* Second Pie layer for internal score/check labels */}
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%" // Match outerRadius
                        innerRadius="30%"
                        dataKey="value"
                        label={renderCustomizedScoreLabel}
                        startAngle={90 + (360 / wellbeingItems.length / 2)}
                        endAngle={90 + (360 / wellbeingItems.length / 2) - 360}
                        isAnimationActive={false}
                        className="pointer-events-none"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`label-cell-${entry.itemId}`} fill="transparent" stroke="none" />
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

         {/* Controls Area (Slider or Selection Prompt) */}
         <div className="w-full max-w-lg">
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
                                    {sliderValue - selectedItemData.currentScore !== 0 && <TrendingUp className="w-4 h-4 ml-1"/>}
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

            {!selectedItemId && ( // Show prompt when no item is selected
                <Card className="w-full shadow-sm bg-muted/50">
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                    {isSelectionMode
                    ? `Itens selecionados: ${improvementItems.length}/3. Clique nos itens do gráfico que deseja melhorar.`
                    : `Clique em um item do gráfico para definir a pontuação ${scoreType === 'current' ? 'atual' : 'desejada'}.`
                    }
                </CardContent>
                </Card>
            )}
         </div>


        {/* Category Percentages Display */}
        <div className="w-full max-w-2xl">
            <CategoryScoresDisplay scoreType={scoreType === 'select' ? 'desired' : scoreType} />
        </div>

        {/* Navigation Buttons */}
        <div className="mt-0 flex justify-between w-full max-w-lg"> {/* Reduced margin-top */}
            <Button variant="outline" onClick={() => goToStage(prevStage)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
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

        {/* Action Plan - Hidden in 'select' mode now */}
        {/* {isSelectionMode && (
            <div className="w-full max-w-2xl mt-8">
                 Action Plan component would be rendered here if needed in this stage
                 but requirement is to show it in the next stage ('defineActions')
            </div>
        )} */}
     </div>
   );
};
```