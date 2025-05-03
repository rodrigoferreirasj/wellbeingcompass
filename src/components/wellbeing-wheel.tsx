
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'; // Removed Label import
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, ItemScore, getCategoryForItem, getItemDetails, WellbeingItem } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star, TrendingUp } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { ActionPlan } from './action-plan';
import { CategoryScoresDisplay } from './category-scores-display'; // Import the new component

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
    } else if (isSelectionMode) {
      // In selection mode, keep selectedItemId if it's still in improvementItems
       if (selectedItemId && !isItemSelectedForImprovement(selectedItemId)) {
           setSelectedItemId(null); // Deselect if removed from improvement list
       }
    } else if (!isSelectionMode && !selectedItemId) {
        // If no item is selected in scoring mode, reset slider (optional)
         setSliderValue(5);
    }
  }, [selectedItemData, scoreType, isSelectionMode, selectedItemId, isItemSelectedForImprovement]);


  // FIX: Use payload data to get the correct itemId on click
  const handlePieClick = useCallback((data: any, index: number) => {
    // data.payload contains the actual PieDataItem passed to the Cell
    const clickedItem = data.payload as PieDataItem;
    if (!clickedItem || !clickedItem.itemId) {
        console.error("Pie click error: Invalid payload data", data);
        return; // Exit if payload is invalid
    }
    const itemId = clickedItem.itemId;

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

    // Use the order directly from wellbeingItems (already sorted in the desired visual order)
    return wellbeingItems.map((item, index) => { // Index here is the visual order index
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
         const startAngle = index * anglePerItem; // Use index from the map
         const endAngle = startAngle + anglePerItem;
         const midAngle = startAngle + anglePerItem / 2;

        return {
          ...itemScoreData,
          itemId: item.id, // Ensure itemId is correctly passed
          name: item.name,
          categoryName: category?.name ?? 'Unknown',
          categoryColor: categoryColor,
          value: 1, // Equal value for equal slices
          fillColor: calculateFillColor(itemScoreData, categoryColor),
          label: labelValue.toString(), // Convert to string for the Label component
          difference: difference,
          order: index, // Store the visual order index
          // Dummy values for radius, will be calculated by Recharts
          midAngle: midAngle,
          innerRadius: 0, // Placeholder
          outerRadius: 0, // Placeholder
        };
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

   // Custom Tooltip Component - Fixed to use correct data item
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // payload[0].payload corresponds to the specific PieDataItem for the hovered segment
      const data = payload[0].payload as PieDataItem;
      const itemDetails = getItemDetails(data.itemId); // Get full item details

      // Recalculate difference here for tooltip consistency if needed
       const difference = data.currentScore !== null && data.desiredScore !== null ? data.desiredScore - data.currentScore : null;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm max-w-xs">
          <p className="font-semibold text-primary">{data.name} <span className="text-xs text-muted-foreground">({data.categoryName})</span></p>
           {/* Use description from itemDetails */}
          {itemDetails?.description && <p className="text-muted-foreground text-xs mt-1">{itemDetails.description}</p>}

          <div className="mt-2 space-y-1">
              {data.currentScore !== null && <p>Atual: <span className="font-medium">{data.currentScore}</span></p>}
              {data.desiredScore !== null && <p>Desejado: <span className="font-medium">{data.desiredScore}</span></p>}
               {/* Show difference calculated within the tooltip */}
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
        </div>
      );
    }
    return null;
  };

   // Custom label rendering function for names OUTSIDE the pie
    const renderCustomizedNameLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
        const radius = outerRadius * 1.15; // Position labels further outside
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const textAnchor = x > cx ? 'start' : 'end';
        const name = payload.name; // Use the item name from the payload

        // Basic line splitting for longer names
        const nameParts = name.split(' ');
        // Simple split: first word on line 1, rest on line 2, or handle single word
        const line1 = nameParts[0];
        const line2 = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        return (
            <text
                x={x}
                y={y}
                fill="hsl(var(--foreground))" // Use theme foreground color
                textAnchor={textAnchor}
                dominantBaseline="central"
                className="text-[11px] sm:text-xs pointer-events-none" // Slightly larger, adjust as needed
                 style={{ fontWeight: 500 }} // Slightly bolder
            >
                 <tspan x={x} dy={line2 ? "-0.5em" : "0"}>{line1}</tspan>
                 {line2 && <tspan x={x} dy="1.2em">{line2}</tspan>}
            </text>
        );
    }, []); // No dependencies needed if RADIAN is constant

     // Custom label rendering function for scores/checkmarks INSIDE the pie
     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
         const entry = payload as PieDataItem; // Cast payload to PieDataItem
         if (!entry || entry.label === '') return null; // Don't render if label is empty

         const radius = innerRadius + (outerRadius - innerRadius) * 0.55; // Adjust position inside segment
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);
         const isCheckmark = isSelectionMode && entry.label === '✓';
          // Use the difference calculated in pieData for consistency
         const difference = entry.difference;
         const isDifferenceLabel = isSelectionMode && difference !== null && entry.label === (difference > 0 ? `+${difference}` : difference.toString());

         let fillColor = "hsl(var(--primary-foreground))"; // Default white
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 20 : 16; // Checkmark larger

         // Style difference numbers
         if (isDifferenceLabel && difference !== null) {
             if (difference > 0) fillColor = 'hsl(142 71% 90%)'; // Light green text
             else if (difference < 0) fillColor = 'hsl(0 84% 90%)'; // Light red text
             else fillColor = 'hsl(var(--muted-foreground))'; // Muted for zero difference
             fontSize = 14; // Slightly smaller for difference
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
     }, [isSelectionMode]); // Depend on isSelectionMode


  // Render function
    if (!isClient) {
      // Render placeholder or loading state during server-side rendering / initial hydration
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
     // Main container using grid for better layout control
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">

       {/* Left Column: Slider/Prompt and Category Scores */}
       <div className="lg:col-span-1 flex flex-col gap-6 order-2 lg:order-1">
          {/* Scoring Slider Card (only in scoring modes and when an item is selected) */}
          {selectedItemId && !isSelectionMode && (
              <Card className="w-full shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-10">
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
                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-3xl font-bold text-primary">{sliderValue}</span>
                        {scoreType === 'desired' && selectedItemData?.currentScore !== null && (
                           <span className={cn("text-base font-medium flex items-center",
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
                    <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>Cancelar</Button>
                    <Button size="sm" onClick={confirmScore}>Confirmar Nota</Button>
                 </CardFooter>
              </Card>
          )}

           {/* Placeholder/Prompt Card */}
           {!selectedItemId && (
             <Card className="w-full shadow-sm bg-muted/50">
               <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                 {isSelectionMode
                   ? "Clique nos itens do gráfico que deseja melhorar (máx. 3)."
                   : `Clique em um item do gráfico para definir a pontuação ${scoreType === 'current' ? 'atual' : 'desejada'}. ${scoreType === 'desired' ? ' A nota atual será exibida para referência.' : ''}`
                 }
               </CardContent>
             </Card>
           )}

           {/* Category Scores Display */}
           <CategoryScoresDisplay scoreType={scoreType === 'select' ? 'desired' : scoreType} /> {/* Show desired scores in select mode */}


           {/* Action Plan Area (only in select mode) - Shown below category scores */}
           {isSelectionMode && (
              <div className="mt-4 lg:hidden"> {/* Show only on smaller screens here */}
                <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                    Plano de Ação
                </h3>
                {selectedItemId ? (
                    <ActionPlan selectedItemId={selectedItemId} />
                ) : (
                    <div className="h-full flex items-center justify-center text-center text-muted-foreground p-8 border rounded-lg bg-muted/50">
                        <p>Selecione um item no gráfico para definir ou visualizar o plano de ação.</p>
                    </div>
                )}
              </div>
           )}

        </div>


        {/* Center Column: Pie Chart and Navigation */}
        <div className="lg:col-span-1 flex flex-col items-center order-1 lg:order-2">
          {/* Pie Chart - Increased Size */}
          <div className="relative w-full max-w-xl aspect-square mx-auto"> {/* Increased max-width */}
             <ResponsiveContainer width="100%" height="100%">
                 <PieChart margin={{ top: 50, right: 50, bottom: 50, left: 50 }}> {/* Increased margins */}
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="75%" // Increased outer radius
                     innerRadius="30%" // Keep inner radius reasonable
                     dataKey="value"
                     onClick={handlePieClick} // Pass the raw event data
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
                           // Ensure payload is passed correctly for tooltip and click handler
                            payload={entry} // Pass the entry data as payload
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
                        outerRadius="75%" // Match the outer radius
                        innerRadius="30%" // Match the inner radius
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
               {/* Central label */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center -mt-4">
                   {scoreType === 'current' && <Target className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                   {scoreType === 'desired' && <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                   {scoreType === 'select' && <Star className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-1"/>}
                  <span className="text-sm sm:text-base font-medium text-foreground uppercase tracking-wider mt-1">
                      {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
                  </span>
               </div>
           </div>

           {/* Navigation Buttons */}
           <div className="mt-8 flex justify-between w-full max-w-lg">
             <Button variant="outline" onClick={() => goToStage(prevStage)}>
               <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
             </Button>
             {/* Corrected usage of isNextDisabled */}
             <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
            {/* Corrected usage of isNextDisabled */}
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


       {/* Right Column: Action Plan (only in select mode, shown on larger screens) */}
       {isSelectionMode && (
          <div className="lg:col-span-1 hidden lg:flex lg:flex-col order-3">
                <h3 className="text-xl font-semibold mb-4 text-center text-primary">
                    Plano de Ação
                </h3>
              {selectedItemId ? (
                   <ActionPlan selectedItemId={selectedItemId} />
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
