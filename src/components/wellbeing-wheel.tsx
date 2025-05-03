
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
  midAngle: number; // Added for label positioning
  innerRadius: number; // Added for label positioning
  outerRadius: number; // Added for label positioning
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
  const { itemScores, stage, improvementItems } = assessmentData;
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
        // If clicking an already selected item, deselect it
        removeImprovementItem(itemId);
        setSelectedItemId(null); // Deselect for action plan view
      } else {
        // Select the item if limit not reached
        if (improvementItems.length < 3) {
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
    // Calculate the base angle and properties needed for labels later
    const numItems = wellbeingItems.length;
    const anglePerItem = 360 / numItems;

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
            labelValue = '✓'; // Checkmark for selected items
          } else if (currentDisplayScore !== null && desiredDisplayScore !== null) {
             difference = desiredDisplayScore - currentDisplayScore;
             labelValue = difference > 0 ? `+${difference}` : difference.toString(); // Show difference
          } else if (currentDisplayScore !== null) {
             labelValue = currentDisplayScore; // Show current if no desired yet
          }
        } else {
           // Scoring modes: Always show the relevant score
           const currentScore = itemScoreData.currentScore;
           const desiredScore = itemScoreData.desiredScore;

            if (scoreType === 'current') {
                labelValue = currentScore !== null ? currentScore : ''; // Show current score or empty
            } else { // desiredScore mode
                 labelValue = desiredScore !== null ? desiredScore : ''; // Show desired score or empty
                 if (currentScore !== null && desiredScore !== null) {
                   difference = desiredScore - currentScore; // Calculate difference for display elsewhere if needed
                 }
            }
        }

         // Basic calculation for midAngle (adjust startAngle as needed)
         const startAngle = index * anglePerItem;
         const endAngle = startAngle + anglePerItem;
         const midAngle = startAngle + anglePerItem / 2;

        return {
          ...itemScoreData,
          name: item.name,
          categoryName: category?.name ?? 'Unknown',
          categoryColor: categoryColor,
          value: 1, // Equal value for equal slices
          fillColor: calculateFillColor(itemScoreData, categoryColor),
          label: labelValue.toString(), // Convert to string for the Label component
          difference: difference,
          order: index, // Keep original order for sorting consistency
          // Dummy values for radius, will be calculated by Recharts
          midAngle: midAngle,
          innerRadius: 0, // Placeholder
          outerRadius: 0, // Placeholder
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
        return improvementItems.length === 0; // Need at least one item selected
    } else {
        const scoreKeyToCompare = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return itemScores.some(s => s[scoreKeyToCompare] === null); // Ensure all items are scored for the current stage
    }
   }, [isSelectionMode, improvementItems, itemScores, scoreType]);

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
               {/* Always show difference if both scores exist, regardless of mode */}
              {data.currentScore !== null && data.desiredScore !== null && data.difference !== null && (
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

   // Custom label rendering function for names OUTSIDE the pie
    const renderCustomizedNameLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
        const radius = outerRadius * 1.1; // Position labels outside the main radius
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const name = payload.name; // Use the item name

        // Basic line splitting for longer names
        const nameParts = name.split(' ');
        const line1 = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
        const line2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');


        return (
            <text
                x={x}
                y={y}
                fill="hsl(var(--foreground))" // Use theme foreground color
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[10px] sm:text-[11px] pointer-events-none" // Adjust size as needed
                 style={{ fontWeight: 500 }} // Slightly bolder
            >
                 <tspan x={x} dy={line2 ? "-0.3em" : "0"}>{line1}</tspan>
                {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
        );
    }, []);

     // Custom label rendering function for scores/checkmarks INSIDE the pie
     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
         const entry = pieData[index]; // Get the data for this segment
         if (!entry || entry.label === '') return null; // Don't render if label is empty

         const radius = innerRadius + (outerRadius - innerRadius) * 0.5; // Position inside segment
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);
         const isCheckmark = isSelectionMode && entry.label === '✓';
         const isDifference = isSelectionMode && entry.label.match(/^[-+]\d+$/); // Check if label is a difference like "+2" or "-1"

         let fillColor = "hsl(var(--primary-foreground))"; // Default white
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 18 : 14; // Checkmark larger

         // Style difference numbers
         if (isDifference) {
             const diffValue = parseInt(entry.label, 10);
             if (diffValue > 0) fillColor = 'hsl(142 71% 90%)'; // Light green text
             else if (diffValue < 0) fillColor = 'hsl(0 84% 90%)'; // Light red text
             else fillColor = 'hsl(var(--muted-foreground))'; // Muted for zero difference
             fontSize = 13; // Slightly smaller for difference
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
     }, [pieData, isSelectionMode]); // Depend on pieData and isSelectionMode


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
                     {/* Show current score for reference in desired mode */}
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
                 {/* Show score and difference */}
                 <div className="mt-2 flex items-center gap-2">
                     <span className="text-2xl font-bold text-primary">{sliderValue}</span>
                     {scoreType === 'desired' && selectedItemData?.currentScore !== null && (
                        <span className={cn("text-sm font-medium flex items-center",
                             (sliderValue - selectedItemData.currentScore) > 0 ? "text-green-600" :
                             (sliderValue - selectedItemData.currentScore) < 0 ? "text-red-600" :
                             "text-muted-foreground")}>
                              ({sliderValue - selectedItemData.currentScore >= 0 ? '+' : ''}{sliderValue - selectedItemData.currentScore}) {/* Always show sign */}
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
        {/* Adjust height based on card height or make it dynamic */}
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
               {/* Adjusted margin for external labels */}
              <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="70%" // Adjust radius to make space for name labels
                  innerRadius="30%"
                  dataKey="value"
                  onClick={(_, index) => handlePieClick(pieData[index])}
                  animationDuration={500}
                  animationEasing="ease-out"
                  className="cursor-pointer focus:outline-none"
                  label={renderCustomizedNameLabel} // Render names outside
                  startAngle={90} // Start at the top
                  endAngle={-270} // Go clockwise
                >
                  {pieData.map((entry, index) => {
                    const isSelected = selectedItemId === entry.itemId;
                    const scoreKey = scoreType === 'current' ? 'currentScore' : scoreType === 'desired' ? 'desiredScore' : '';

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fillColor}
                        stroke={isSelected ? 'hsl(var(--ring))' : 'hsl(var(--background))'}
                        strokeWidth={isSelected ? 3 : 1}
                        className="focus:outline-none transition-all duration-300 hover:opacity-80"
                        tabIndex={0}
                        aria-label={`${entry.name}: ${isSelectionMode ? (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado' : 'Clique para selecionar') : (scoreKey && entry[scoreKey] !== null ? entry[scoreKey] : 'Não avaliado')}`}

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
                     outerRadius="70%" // Match the outer radius of the first pie
                     innerRadius="30%" // Match the inner radius of the first pie
                     dataKey="value"
                     label={renderCustomizedScoreLabel} // Render scores/checks inside
                     startAngle={90} // Match start angle
                     endAngle={-270} // Match end angle
                     isAnimationActive={false} // No animation for the label layer
                     className="pointer-events-none" // Don't interact with this layer
                 >
                     {/* Render transparent cells so labels have context */}
                     {pieData.map((entry, index) => (
                         <Cell key={`label-cell-${index}`} fill="transparent" stroke="none" />
                     ))}
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
