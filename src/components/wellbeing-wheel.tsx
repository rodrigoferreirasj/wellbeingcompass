
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
import { ActionPlan } from './action-plan';
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
  label: string; // Display label for inner score/check
  nameLabel: string; // Display label for outer name
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
            return baseColor; // Default color if not selected or focused
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
      const hslMatch = baseColor.match(/hsl\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
      if (hslMatch) {
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${clampedOpacity})`;
      }
    } catch (e) {
      console.error("Color conversion error", e);
    }

    // Fallback to base color if HSL parsing fails
    return baseColor;
  }, [isSelectionMode, isItemSelectedForImprovement, scoreType, selectedItemId]);


  const pieData: PieDataItem[] = useMemo(() => {
    // The fixed order as defined in wellbeingItems
    const orderedItems = wellbeingItems;

    const data = orderedItems.map((item, index) => {
        const category = getCategoryForItem(item.id);
        const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
        const categoryColor = category?.color ?? 'hsl(var(--secondary))';

        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        const currentDisplayScore = itemScoreData.currentScore;
        const desiredDisplayScore = itemScoreData.desiredScore;

        let labelValue: string | number = ''; // For inner score/check label
        let nameLabelValue = item.name; // For outer name label
        let difference: number | null = null;

        if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
            difference = itemScoreData.desiredScore - itemScoreData.currentScore;
        }

        // Determine the inner label (score, check, difference)
        if (isSelectionMode) {
          if (isItemSelectedForImprovement(item.id)) {
            labelValue = '✓'; // Checkmark for selected items
          } else if (difference !== null && difference !== 0) { // Show difference if non-zero
             labelValue = difference > 0 ? `+${difference}` : difference.toString();
          } else if (currentDisplayScore !== null) { // Fallback to current score if no difference/selection
             labelValue = currentDisplayScore;
          }
          // Keep nameLabelValue as item.name
        } else {
           // In scoring modes, show the relevant score inside
           const score = itemScoreData[scoreKey];
           labelValue = score !== null ? score : '';
           // Keep nameLabelValue as item.name
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
          nameLabel: nameLabelValue, // Use the item's name for the outer label
          difference: difference,
          order: index, // Store the original index for potential sorting/reference
           // Default placeholder values, will be calculated next
           midAngle: 0,
           labelX: 0,
           labelY: 0,
           labelAnchor: 'middle',
        };
        return pieEntry;
      });

       // Calculate label positions based on the fixed order
       const numItems = data.length;
       const angleStep = 360 / numItems;
       // Ensure consistent start angle for label positioning
       const startAngleOffset = 90 + (angleStep / 2); // Adjusted start: center of first slice at 12 o'clock

       return data.map((entry, index) => {
            const baseOuterRadius = 80; // Percentage for pie slice edge
            const labelRadiusMultiplier = 1.25; // Distance for name labels

            // Calculate midAngle based on fixed index
            const midAngle = startAngleOffset - (index * angleStep); // Center angle for the slice
            const outerRadiusValue = baseOuterRadius;
            const labelRadius = outerRadiusValue * labelRadiusMultiplier; // Calculate radius for name label

            // Using dummy cx, cy as relative positioning will happen in the render function
            const cx = 50; // Assuming center is 50%
            const cy = 50;

            const x = cx + labelRadius * Math.cos(-midAngle * RADIAN);
            const y = cy + labelRadius * Math.sin(-midAngle * RADIAN);
            const textAnchor = x > cx + 1 ? 'start' : x < cx - 1 ? 'end' : 'middle'; // Add tolerance for middle anchor


            return {
                ...entry,
                midAngle: midAngle,
                labelX: x, // Store calculated X position (as percentage)
                labelY: y, // Store calculated Y position (as percentage)
                labelAnchor: textAnchor, // Store text anchor
            };
       });


  }, [itemScores, scoreType, isSelectionMode, isItemSelectedForImprovement, calculateFillColor]); // Dependencies for pieData calculation


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

    // Renders the outer name labels
    const renderCustomizedNameLabel = useCallback(({ payload, cx, cy }: any) => {
        const entry = payload as PieDataItem;
        // Use the pre-calculated positions from pieData
        if (!entry || entry.labelX === undefined || entry.labelY === undefined || !entry.nameLabel) return null;

        const name = entry.nameLabel;
        // Simple split for multi-line labels
        const nameParts = name.split(' ');
        const line1 = nameParts.length > 2 ? nameParts.slice(0, -1).join(' ') : nameParts[0]; // Take all but last word for line 1 if > 2 words
        const line2 = nameParts.length > 1 ? nameParts[nameParts.length-1] : ''; // Take last word for line 2 if > 1 word

        // Adjust y based on whether there are two lines
        const yPosition = entry.labelY; // Use precalculated Y

        return (
             <text
                // Use percentage-based positioning relative to the container
                x={`${entry.labelX}%`}
                y={`${yPosition}%`} // Use precalculated Y
                fill="hsl(var(--foreground))"
                textAnchor={entry.labelAnchor}
                dominantBaseline="central"
                className="text-[9px] sm:text-[11px] pointer-events-none" // Slightly smaller font
                style={{ fontWeight: 500 }}
             >
                {/* Render tspans for potential multi-line */}
                <tspan x={`${entry.labelX}%`} dy={line2 ? "-0.6em" : "0"}>{line1}</tspan>
                {line2 && <tspan x={`${entry.labelX}%`} dy="1.2em">{line2}</tspan>}
             </text>
        );
    }, []); // No dependencies needed if positions are pre-calculated in pieData


     // Renders the inner score/check labels
     const renderCustomizedScoreLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, payload }: any) => {
         const entry = payload as PieDataItem;
         if (!entry || entry.label === '' || !midAngle) return null; // Check if label exists

         // Calculate position based on angles and radii provided by Recharts
         const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
         const x = cx + radius * Math.cos(-midAngle * RADIAN);
         const y = cy + radius * Math.sin(-midAngle * RADIAN);

         const isCheckmark = isSelectionMode && entry.label === '✓';
         const difference = entry.difference;
         // Check if the label *is* the difference string
         const isDifferenceLabel = isSelectionMode && difference !== null && entry.label === (difference > 0 ? `+${difference}` : difference.toString());

         let fillColor = "hsl(var(--primary-foreground))"; // Default: light text
         let fontWeight: string | number = 'bold';
         let fontSize = isCheckmark ? 20 : 16; // Larger checkmark

         // Style for difference labels
         if (isDifferenceLabel && difference !== null) {
             if (difference > 0) fillColor = 'hsl(142, 71%, 20%)'; // Dark green text
             else if (difference < 0) fillColor = 'hsl(0, 84%, 25%)'; // Dark red text
             else fillColor = 'hsl(var(--muted-foreground))'; // Muted for zero difference
             fontSize = 14;
             fontWeight = 600;
         } else if (!isCheckmark && !isDifferenceLabel) {
            // Style for regular score labels
            const scoreValue = parseInt(entry.label);
             if (!isNaN(scoreValue)) {
                 // Basic contrast logic: Light text for low scores/opaque, Dark text for high scores/transparent
                 const scoreOpacity = Math.min(1, Math.max(0.15, (scoreValue / 8)));
                 if (scoreValue < 5 || scoreOpacity > 0.6) { // Darker background? Use light text.
                     fillColor = "hsl(var(--primary-foreground))";
                 } else { // Lighter background? Use dark text.
                     fillColor = "hsl(var(--foreground))";
                 }
             }
         }

         // Style for checkmark
         if (isCheckmark) {
              fillColor = "hsl(var(--primary-foreground))"; // Ensure checkmark is visible on accent background
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
             className="pointer-events-none" // Don't interfere with clicks on the slice
         >
             {entry.label}
         </text>
         );
     }, [isSelectionMode]); // Dependency on isSelectionMode


    if (!isClient) {
      return <div className="flex justify-center items-center h-96"><p>Carregando roda...</p></div>;
    }

  return (
     <div className="flex flex-col lg:flex-row items-start w-full gap-6 lg:gap-8 px-4"> {/* Main container: row layout on large screens */}

        {/* Left Side: Chart Area */}
        <div className="relative w-full lg:w-[60%] aspect-square mx-auto lg:mx-0"> {/* Chart takes more space */}
             <ResponsiveContainer width="100%" height="100%">
                 <PieChart margin={{ top: 50, right: 50, bottom: 50, left: 50 }}> {/* Increased margins for labels */}
                   {/* Outer Pie for Interaction and Names */}
                   <Pie
                     data={pieData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     outerRadius="80%" // Keep outer radius
                     innerRadius="30%" // Keep inner radius
                     dataKey="value" // Use the 'value: 1' for equal slices
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     label={renderCustomizedNameLabel} // Outer labels (names)
                     startAngle={90} // Start at 12 o'clock
                     endAngle={-270} // Go full circle counter-clockwise
                     stroke="hsl(var(--background))" // Background color border
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
                    {/* Inner Pie for Scores/Checks (non-interactive) */}
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%" // Match outer radius
                        innerRadius="30%" // Match inner radius
                        dataKey="value" // Use dummy value
                        label={renderCustomizedScoreLabel} // Inner labels (scores/checks)
                        startAngle={90} // Match start angle
                        endAngle={-270} // Match end angle
                        isAnimationActive={false} // No animation needed
                        className="pointer-events-none" // Make it non-interactive
                        stroke="none" // No border for the inner labels pie
                    >
                        {/* Map cells just to provide structure, fill is transparent */}
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

         {/* Right Side: Controls and Category Scores */}
         <div className="w-full lg:w-[40%] flex flex-col gap-6"> {/* Takes remaining width */}
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

                {/* Selection Mode Prompt & Action Plan (ActionPlan moved to its own stage) */}
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
                         {/* Action Plan for the currently selected item (in selection mode only) */}
                         {selectedItemId && isSelectionMode && (
                             <ActionPlan selectedItemId={selectedItemId} renderAllSelected={false} />
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
