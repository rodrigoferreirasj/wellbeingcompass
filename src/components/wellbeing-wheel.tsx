
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, ItemScore, getCategoryForItem, getItemDetails, WellbeingItem, AssessmentStage } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star, TrendingUp, XCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { CategoryScoresDisplay } from './category-scores-display';
import { Badge } from '@/components/ui/badge';

interface WellbeingWheelProps {
  scoreType: 'current' | 'desired' | 'select';
  onNext: () => Promise<void>; // Callback for downloading screenshot
}

interface PieDataItem extends ItemScore {
  itemId: string;
  name: string;
  categoryName: string;
  categoryColor: string;
  value: number;
  displayLabel: string;
  difference?: number | null;
  order: number;
  scoreValue: number | null;
  isImprovementItem: boolean;
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  payload?: any;
  isActive?: boolean;
}

const RADIAN = Math.PI / 180;
const SELECTION_COLOR = 'hsl(var(--destructive))';
const MUTED_FILL_COLOR = 'hsl(var(--muted))';
const MUTED_STROKE_COLOR = 'hsl(var(--border))';
const ACTIVE_STROKE_COLOR = 'hsl(var(--ring))';
const FOREGROUND_TEXT_COLOR = 'hsl(var(--foreground))';
const TRANSPARENT_COLOR = 'transparent';

export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType, onNext }) => {
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  let nextStage: AssessmentStage;
  let prevStage: AssessmentStage;

  if (scoreType === 'current') {
    nextStage = 'desiredScore';
    prevStage = 'userInfo';
  } else if (scoreType === 'desired') {
    nextStage = 'selectItems';
    prevStage = 'currentScore';
  } else { // scoreType === 'select'
    nextStage = 'defineActions';
    prevStage = 'desiredScore';
  }


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
    } else if (!selectedItemId && !isSelectionMode) {
         setSliderValue(5);
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId]);


 const handlePieClick = useCallback((data: any, index: number) => {
    const clickedPayload = data?.payload?.payload || data?.payload || data;
    const itemId = clickedPayload?.itemId;

    if (!itemId) {
        console.error("Pie click error: Invalid payload data", data);
        setActiveIndex(null);
        setSelectedItemId(null);
        return;
    }

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
        setActiveIndex(null);
        setSelectedItemId(null);
    } else {
         if (activeIndex === index) {
             setActiveIndex(null);
             setSelectedItemId(null);
         } else {
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
      const scoreKeyToUpdate = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      updateItemScore(selectedItemId, scoreKeyToUpdate, sliderValue);
      toast({
        title: "Pontuação Salva",
        description: `Nota ${sliderValue} salva para ${selectedItemDetails.name}.`,
      });
      // Do not deselect item after confirming score, allow user to click away or confirm another.
      // setActiveIndex(null); // Keep active
      // setSelectedItemId(null); // Keep selected
    }
  };

  const pieData: PieDataItem[] = useMemo(() => {
    return wellbeingItems.map((item, index) => {
      const category = getCategoryForItem(item.id);
      const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
      const categoryColor = category?.color ?? MUTED_FILL_COLOR;
      const isImprovement = isItemSelectedForImprovement(item.id);

      let scoreKeyForFill: 'currentScore' | 'desiredScore' = 'currentScore';
      if (scoreType === 'current') scoreKeyForFill = 'currentScore';
      else if (scoreType === 'desired') scoreKeyForFill = 'desiredScore';
      // For 'select' mode, we might want to display based on 'currentScore' or 'desiredScore' or difference,
      // but for fill color logic, let's assume it's not directly tied to a single score in the same way.

      const scoreValueForFill = itemScoreData[scoreKeyForFill];

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
        value: 1,
        displayLabel: displayLabelValue,
        difference: difference,
        order: index,
        scoreValue: scoreValueForFill, // This is the score used for fill calculation
        isImprovementItem: isImprovement,
      };
    });
  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement]);


   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        return improvementItems.length === 0;
    } else {
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        // Check if ANY item score for the current/desired type is still null
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


    const renderActiveShape = (props: any) => {
        const {
            cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0,
            payload,
            isActive
        } = props as PieDataItem & { isActive?: boolean };

         if (!payload || typeof payload !== 'object' || !payload.itemId) {
             return <Sector {...props} fill={MUTED_FILL_COLOR} stroke={MUTED_STROKE_COLOR} strokeWidth={1} />;
         }

         const { scoreValue, displayLabel, categoryColor, isImprovementItem } = payload;

         let baseFillColor = MUTED_FILL_COLOR;
         let scoredFillColor = isImprovementItem && isSelectionMode ? SELECTION_COLOR : categoryColor;

         const scorePercentage = scoreValue !== null ? (scoreValue / 10) : 0;
         const fillOuterRadius = innerRadius + (outerRadius - innerRadius) * scorePercentage;

         const midAngleRad = (startAngle + endAngle) / 2 * RADIAN;
         const labelRadius = innerRadius + (outerRadius - innerRadius) * 0.6;
         const x = cx + labelRadius * Math.cos(-midAngleRad);
         const y = cy + labelRadius * Math.sin(-midAngleRad);

         let labelColor = FOREGROUND_TEXT_COLOR;
         // Basic check for dark background color to switch text to light
         const colorMatch = categoryColor.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/);
         if (colorMatch) {
             const lightness = parseFloat(colorMatch[3]);
             const alpha = colorMatch[4] ? parseFloat(colorMatch[4]) : 1;
             if (lightness < 55 && alpha > 0.5) { // Heuristic for dark color
                 labelColor = "hsl(var(--primary-foreground))"; // Light text for dark backgrounds
             }
         }


          const nameParts = displayLabel.split(' ');
          let line1 = displayLabel;
          let line2 = '';
          if (displayLabel.length > 12 && nameParts.length > 1) {
              const midIndex = Math.ceil(nameParts.length / 2);
              line1 = nameParts.slice(0, midIndex).join(' ');
              line2 = nameParts.slice(midIndex).join(' ');
          }

        let strokeColor = MUTED_STROKE_COLOR;
        let strokeWidth = 1;
         if (isSelectionMode) {
             if (isImprovementItem) {
                 strokeColor = SELECTION_COLOR;
                 strokeWidth = 3;
             }
         } else {
             if (isActive) {
                strokeColor = ACTIVE_STROKE_COLOR;
                strokeWidth = 3;
             }
         }

        return (
            <g>
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={baseFillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />

                 {scorePercentage > 0 && (
                     <Sector
                         cx={cx}
                         cy={cy}
                         innerRadius={innerRadius}
                         outerRadius={fillOuterRadius}
                         startAngle={startAngle}
                         endAngle={endAngle}
                         fill={scoredFillColor}
                         stroke="none"
                     />
                 )}
                 <text
                     x={x}
                     y={y}
                     fill={labelColor}
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
     <div className="flex flex-col w-full gap-6 px-4">
         <div className="w-full max-w-md mx-auto">
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

             {!selectedItemId && !isSelectionMode && (
                 <Card className="w-full shadow-sm bg-muted/50">
                     <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                         Clique em um item do gráfico para definir a pontuação {scoreType === 'current' ? 'atual' : 'desejada'}.
                     </CardContent>
                 </Card>
             )}

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

        <div className="flex flex-col lg:flex-row items-start w-full gap-6">
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
                         animationDuration={0}
                         className="cursor-pointer focus:outline-none"
                         startAngle={90}
                         endAngle={-270}
                         stroke="none"
                         activeIndex={activeIndex ?? undefined}
                         activeShape={(props: any) => renderActiveShape({ ...props, isActive: props.index === activeIndex })}
                         isAnimationActive={false}
                         label={false} // Labels are rendered by activeShape
                         inactiveShape={(props: any) => renderActiveShape({ ...props, isActive: false })}
                       >
                         {pieData.map((entry, index) => (
                              <Cell
                               key={`cell-${entry.itemId}-${entry.scoreValue}-${entry.isImprovementItem}-${index === activeIndex}`}
                               fill={MUTED_FILL_COLOR}
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
            <Button
                onClick={async () => {
                    await onNext(); // Trigger download first
                    goToStage(nextStage); // Then navigate
                }}
                disabled={isNextDisabled}
            >
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
