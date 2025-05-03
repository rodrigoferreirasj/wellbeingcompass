
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from 'recharts';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, ItemScore, getCategoryForItem, getItemDetails, WellbeingItem } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star, Minus, Plus, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ActionPlan } from './action-plan'; // Import ActionPlan

interface WellbeingWheelProps {
  scoreType: 'current' | 'desired' | 'select';
}

interface PieDataItem extends ItemScore {
  name: string;
  categoryName: string;
  categoryColor: string;
  value: number; // Fixed value for equal slices
  fillColor: string;
  label: string; // Display label (score or checkmark)
  difference?: number | null; // Difference between desired and current
  order: number; // For consistent segment ordering
}

// Define angles for labels
const RADIAN = Math.PI / 180;

export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType }) => {
  const {
    assessmentData,
    updateItemScore,
    selectImprovementItem,
    removeImprovementItem,
    goToStage,
    isItemSelectedForImprovement,
    getActionsForItem, // Get actions for the selected item
  } = useAssessment();
  const { itemScores, stage } = assessmentData;
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null); // Track selected item ID
  const [sliderValue, setSliderValue] = useState<number>(5); // Default slider value
  const [isClient, setIsClient] = useState(false); // For hydration safety

  useEffect(() => {
    setIsClient(true);
  }, []);


  // Determine the next and previous stages
  const nextStage = scoreType === 'current' ? 'desiredScore' : (scoreType === 'desired' ? 'selectItems' : 'defineActions');
  const prevStage = scoreType === 'current' ? 'userInfo' : (scoreType === 'desired' ? 'currentScore' : 'desiredScore');

  const isSelectionMode = scoreType === 'select';

  // Get the currently selected item's data
  const selectedItemData = useMemo(() => {
      if (!selectedItemId) return null;
      return itemScores.find(s => s.itemId === selectedItemId) ?? null;
  }, [selectedItemId, itemScores]);

  const selectedItemDetails = useMemo(() => {
      if (!selectedItemId) return null;
      return getItemDetails(selectedItemId);
  }, [selectedItemId]);

  // Update slider when selectedItem changes (only in scoring modes)
  useEffect(() => {
    if (selectedItemData && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      setSliderValue(selectedItemData[scoreKey] ?? 5); // Default to 5 if score is null
    } else if (!isSelectionMode) {
        // If no item is selected in scoring mode, reset slider (optional)
        // setSliderValue(5);
    }
  }, [selectedItemData, scoreType, isSelectionMode]);


  const handlePieClick = useCallback((entry: PieDataItem) => {
    const itemId = entry.itemId;

    if (isSelectionMode) {
      if (isItemSelectedForImprovement(itemId)) {
        // If clicking an already selected item, potentially deselect or do nothing?
        // Current behavior: Clicking toggles selection, also sets selectedItemId for action plan display
        removeImprovementItem(itemId);
        setSelectedItemId(null); // Deselect for action plan view if removing
      } else {
        if (assessmentData.improvementItems.length < 3) {
          selectImprovementItem(itemId);
          setSelectedItemId(itemId); // Select for action plan view
        } else {
          toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
          setSelectedItemId(null); // Don't select if limit reached
        }
      }
    } else {
      // Scoring modes: set the selected item for the slider
       setSelectedItemId(itemId);
    }
  }, [isSelectionMode, isItemSelectedForImprovement, removeImprovementItem, assessmentData.improvementItems.length, selectImprovementItem, toast]);

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
      setSelectedItemId(null); // Deselect after confirming score
    }
  };


  const calculateFillColor = useCallback((itemScore: ItemScore, defaultColor: string): string => {
    const baseColor = defaultColor;
    const itemId = itemScore.itemId;

    if (isSelectionMode) {
        // Use accent color if selected for improvement
        return isItemSelectedForImprovement(itemId) ? 'hsl(var(--accent))' : baseColor;
    }

    // Scoring modes
    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const score = itemScore[scoreKey];

    if (score === null) {
        // If selected for scoring, use accent, otherwise secondary (gray)
        return selectedItemId === itemId ? 'hsl(var(--accent))' : 'hsl(var(--secondary))';
    }

    // Apply opacity based on score
    const opacity = Math.max(0.1, score / 10); // Ensure minimum opacity
    try {
      const hslMatch = baseColor.match(/hsl\((\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\)/);
      if (hslMatch) {
        // Use HSLA for opacity
        return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    return baseColor; // Fallback
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


  // Memoize pieData calculation
 const pieData: PieDataItem[] = useMemo(() => {
    return wellbeingItems
      .map((item, index) => {
        const category = getCategoryForItem(item.id);
        const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
        const categoryColor = category?.color ?? 'hsl(var(--secondary))'; // Fallback color

        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        const currentDisplayScore = itemScoreData.currentScore;
        const desiredDisplayScore = itemScoreData.desiredScore;
        const scoreForColor = itemScoreData[scoreKey];

        let labelValue: string | number = '';
        let difference: number | null = null;

        if (isSelectionMode) {
          if (isItemSelectedForImprovement(item.id)) {
            labelValue = '✓';
          }
        } else {
          const currentScore = itemScoreData.currentScore;
          const desiredScore = itemScoreData.desiredScore;

          if (scoreType === 'current' && currentScore !== null) {
            labelValue = currentScore;
          } else if (scoreType === 'desired') {
            if (desiredScore !== null) {
               labelValue = desiredScore; // Show desired score
            }
            if (currentScore !== null && desiredScore !== null) {
              difference = desiredScore - currentScore; // Calculate difference
            }
          }
        }

        return {
          ...itemScoreData,
          name: item.name,
          categoryName: category?.name ?? 'Unknown',
          categoryColor: categoryColor,
          value: 1, // Equal value for equal slices
          fillColor: calculateFillColor(itemScoreData, categoryColor),
          label: labelValue,
          difference: difference,
          order: index, // Keep original order
        };
      })
       // Sort primarily by category, then by original item order within category
      .sort((a, b) => {
         const catAIndex = wellbeingCategories.findIndex(c => c.name === a.categoryName);
         const catBIndex = wellbeingCategories.findIndex(c => c.name === b.categoryName);
         if (catAIndex !== catBIndex) {
             return catAIndex - catBIndex;
         }
         return a.order - b.order; // Maintain original order within category
      });
  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement, calculateFillColor]);



   // Check if ready to proceed to the next stage
   const isNextDisabled = useMemo(() => {
    if (isSelectionMode) {
        return assessmentData.improvementItems.length === 0; // Need at least one item selected
    } else {
        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKey] === null); // Ensure all items are scored
    }
   }, [isSelectionMode, assessmentData.improvementItems, itemScores, scoreType]);

   // Custom Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieDataItem;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs">
          <p className="font-semibold text-primary">{data.name} <span className="text-xs text-muted-foreground">({data.categoryName})</span></p>
          {getItemDetails(data.itemId)?.description && <p className="text-muted-foreground text-xs mt-1">{getItemDetails(data.itemId)?.description}</p>}

          <div className="mt-2 space-y-1">
              {data.currentScore !== null && <p>Atual: <span className="font-medium">{data.currentScore}</span></p>}
              {data.desiredScore !== null && <p>Desejado: <span className="font-medium">{data.desiredScore}</span></p>}
              {scoreType === 'desired' && data.difference !== null && (
                 <p className={cn("flex items-center", data.difference > 0 ? "text-green-600" : data.difference < 0 ? "text-red-600" : "text-muted-foreground")}>
                     Diferença: <span className="font-medium ml-1">{data.difference > 0 ? '+' : ''}{data.difference}</span>
                     {data.difference !== 0 && <TrendingUp className="w-3 h-3 ml-1"/>}
                </p>
              )}
          </div>

           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && (
               <p className="mt-2 text-accent font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-accent" />Selecionado para Melhoria</p>
           )}
        </div>
      );
    }
    return null;
  };

   // Custom label rendering function
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 1.15; // Adjust multiplier for label distance
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';

        // Split long names (simple split on spaces)
        const nameParts = payload.name.split(' ');
        const line1 = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
        const line2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

        return (
            <text
                x={x}
                y={y}
                fill="hsl(var(--foreground))"
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[10px] sm:text-xs pointer-events-none" // Smaller text, responsive
            >
                <tspan x={x} dy={line2 ? "-0.3em" : "0"}>{line1}</tspan>
                {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
        );
    };

  // Render function
    if (!isClient) {
      // Render placeholder or loading state during server-side rendering / initial hydration
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
    <div className="flex flex-col lg:flex-row items-start w-full gap-8">
      {/* Left Side: Wheel and Controls */}
      <div className="w-full lg:w-1/2 flex flex-col items-center">
       {/* Scoring Slider Card (only in scoring modes and when an item is selected) */}
       {selectedItemId && !isSelectionMode && (
           <Card className="w-full max-w-md mb-6 shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-10">
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
                 <div className="mt-2 flex items-center gap-2">
                     <span className="text-2xl font-bold text-primary">{sliderValue}</span>
                     {scoreType === 'desired' && selectedItemData?.currentScore !== null && (
                        <span className={cn("text-sm font-medium flex items-center",
                             (sliderValue - selectedItemData.currentScore) > 0 ? "text-green-600" :
                             (sliderValue - selectedItemData.currentScore) < 0 ? "text-red-600" :
                             "text-muted-foreground")}>
                             ({sliderValue - selectedItemData.currentScore > 0 ? '+' : ''}{sliderValue - selectedItemData.currentScore})
                             {sliderValue - selectedItemData.currentScore !== 0 && <TrendingUp className="w-4 h-4 ml-1"/>}
                        </span>
                     )}
                 </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-4 pb-4">
                 <Button variant="outline" onClick={() => setSelectedItemId(null)}>Cancelar</Button>
                 <Button onClick={confirmScore}>Confirmar Nota</Button>
              </CardFooter>
           </Card>
       )}

        {/* Placeholder for when no item is selected for scoring/selection prompt */}
        {!selectedItemId && !isSelectionMode && (
           <div className="h-[244px] flex items-center justify-center text-center text-muted-foreground mb-6 px-4">
              Clique em um item do gráfico para definir a pontuação {scoreType === 'current' ? 'atual' : 'desejada'}.
              {scoreType === 'desired' && ' A nota atual será exibida para referência.'}
           </div>
       )}
       {isSelectionMode && !selectedItemId && (
           <div className="h-[244px] flex items-center justify-center text-center text-muted-foreground mb-6 px-4">
               Clique nos itens que deseja melhorar (máx. 3). O plano de ação aparecerá ao lado.
           </div>
       )}


      {/* Pie Chart */}
      <div className="relative w-full max-w-lg aspect-square mx-auto mt-4">
          <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 30, right: 30, bottom: 30, left: 30 }}> {/* Add margin for labels */}
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="75%" // Smaller radius to allow for external labels
                  innerRadius="35%"
                  dataKey="value"
                  onClick={(_, index) => handlePieClick(pieData[index])}
                  animationDuration={500}
                  animationEasing="ease-out"
                  className="cursor-pointer focus:outline-none"
                  label={renderCustomizedLabel} // Use custom label renderer
                >
                  {pieData.map((entry, index) => {
                    const isSelected = selectedItemId === entry.itemId;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fillColor}
                        stroke={isSelected ? 'hsl(var(--ring))' : 'hsl(var(--background))'}
                        strokeWidth={isSelected ? 3 : 1}
                        className="focus:outline-none transition-all duration-300 hover:opacity-80"
                        tabIndex={0}
                        aria-label={`${entry.name}: ${isSelectionMode ? (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado' : 'Clique para selecionar') : (entry[scoreKey] ?? 'Não avaliado')}`}
                      />
                    );
                  })}
                   {/* Internal labels (score/checkmark) */}
                   <Label
                      content={({ viewBox, value, index }) => {
                          const entry = pieData[index];
                          if (!entry || entry.label === '') return null; // Don't render if label is empty

                          const { cx, cy } = viewBox;
                          const angle = entry.midAngle; // Use midAngle from pieData if available, else calculate
                          const radius = entry.innerRadius + (entry.outerRadius - entry.innerRadius) * 0.5; // Position inside segment
                          const x = cx + radius * Math.cos(-angle * RADIAN);
                          const y = cy + radius * Math.sin(-angle * RADIAN);
                          const isCheckmark = isSelectionMode && entry.label === '✓';


                          return (
                          <text
                              x={x}
                              y={y}
                              fill="hsl(var(--primary-foreground))" // White text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontWeight="bold"
                              fontSize={isCheckmark ? 18 : 16} // Slightly larger checkmark
                              className="pointer-events-none"
                          >
                              {entry.label}
                          </text>
                          );
                      }}
                      dataKey="label" // Use the pre-calculated label
                      position="inside" // Ensure Recharts handles positioning context
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
              </PieChart>
          </ResponsiveContainer>
            {/* Central label - Adjusted position/styling slightly */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-4">
                {scoreType === 'current' && <Target className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-1"/>}
                {scoreType === 'desired' && <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-1"/>}
                {scoreType === 'select' && <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-1"/>}
               <span className="text-xs sm:text-sm font-medium text-foreground uppercase tracking-wider">
                   {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
               </span>
            </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between w-full max-w-lg">
          <Button variant="outline" onClick={() => goToStage(prevStage)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled()}>
             Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        {isNextDisabled() && !isSelectionMode && (
            <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Por favor, avalie todos os itens antes de prosseguir.
            </p>
        )}
        {isNextDisabled() && isSelectionMode && (
             <p className="text-xs text-destructive text-center mt-2 max-w-lg">
                Selecione pelo menos um item para melhorar antes de prosseguir.
            </p>
        )}
      </div>

      {/* Right Side: Action Plan (only in select mode and when an item is selected) */}
      {isSelectionMode && (
        <div className="w-full lg:w-1/2 mt-8 lg:mt-0">
           {selectedItemId ? (
               <>
                   <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                       Plano de Ação para: {selectedItemDetails?.name}
                   </h3>
                    {/* Pass only the relevant improvement item to ActionPlan */}
                    <ActionPlan selectedItemId={selectedItemId} />
               </>
           ) : (
               <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8 border rounded-lg bg-muted/50">
                   <p>Selecione um item no gráfico para definir ou visualizar o plano de ação.</p>
               </div>
           )}
        </div>
      )}
    </div>
  );
};

// Helper to get score key
const scoreKey = (type: 'current' | 'desired'): 'currentScore' | 'desiredScore' => {
    return type === 'current' ? 'currentScore' : 'desiredScore';
}
