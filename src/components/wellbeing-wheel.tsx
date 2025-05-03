
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

interface PieDataItem extends ItemScore {
  itemId: string;
  name: string;
  categoryName: string;
  categoryColor: string;
  value: number; // Fixed value for equal slices
  fillColor: string; // Base color or selection color
  displayLabel: string; // Label for inner display (name + diff in select mode)
  nameLabel: string; // Display label for outer name (not used anymore)
  difference?: number | null;
  order: number;
  scoreValue: number | null; // The relevant score (current or desired)
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
  // Props for ActiveShape
  isActive?: boolean; // Indicates if this is the currently rendered active shape
}


const RADIAN = Math.PI / 180;
const SELECTION_COLOR = 'hsl(var(--destructive))'; // A distinct color for selected items, e.g., destructive color

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
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // For active shape

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
                setActiveIndex(null); // Deactivate shape
            } else {
                if (improvementItems.length < 3) {
                    selectImprovementItem(itemId);
                    // Keep it selected visually after adding
                     setActiveIndex(index); // Keep shape active
                } else {
                     toast({ title: "Limite Atingido", description: "Você já selecionou 3 itens para melhorar.", variant: "destructive" });
                }
            }
        } else {
             // If clicking a *different* item, just set it as the currently focused item
             setSelectedItemId(itemId);
             setActiveIndex(index); // Activate shape
             // Don't toggle selection here, wait for a second click or confirmation
        }
    } else {
         // In scoring modes, clicking always selects the item for scoring
         setSelectedItemId(itemId);
         setActiveIndex(index); // Activate shape
    }

  }, [isSelectionMode, isItemSelectedForImprovement, removeImprovementItem, improvementItems.length, selectImprovementItem, toast, selectedItemId]);


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


 const calculateFillColor = useCallback((itemScore: ItemScore, defaultColor: string): string => {
    const itemId = itemScore.itemId;

     if (isSelectionMode) {
        if (isItemSelectedForImprovement(itemId)) {
            return SELECTION_COLOR; // Use distinct selection color
        } else if (selectedItemId === itemId) {
             // Highlight focused item slightly, but not the main selection color yet
             return defaultColor.replace(/hsl(a?)\(([^)]+)\)/, (match, a, values) => {
                 const parts = values.split(',');
                 const lightness = parseFloat(parts[2]);
                 // Make it slightly brighter or use a subtle overlay effect if needed
                 return `hsla(${parts[0]}, ${parts[1]}, ${Math.min(100, lightness + 10)}%, ${a ? parts[3] : 0.8})`;
             });
        } else {
             return defaultColor; // Regular category color
        }
    }

     // Scoring Mode: Base color is always the category color
     return defaultColor;

  }, [isSelectionMode, isItemSelectedForImprovement, selectedItemId]);


  const pieData: PieDataItem[] = useMemo(() => {
    // Ensure items are consistently ordered based on the predefined wellbeingItems array
    return wellbeingItems.map((item, index) => {
      const category = getCategoryForItem(item.id);
      const itemScoreData = itemScores.find(s => s.itemId === item.id) || { itemId: item.id, currentScore: null, desiredScore: null };
      const categoryColor = category?.color ?? 'hsl(var(--secondary))';

      // Determine the score value relevant for the current context (current, desired, or null if not applicable)
      const scoreKey = scoreType === 'current' ? 'currentScore' : scoreType === 'desired' ? 'desiredScore' : null;
      const scoreValue = scoreKey ? itemScoreData[scoreKey] : null;

      let difference: number | null = null;
      if (itemScoreData.currentScore !== null && itemScoreData.desiredScore !== null) {
        difference = itemScoreData.desiredScore - itemScoreData.currentScore;
      }

      // Display Label: Name + Difference in selection mode
      let displayLabelValue = item.name;
      if (isSelectionMode && difference !== null) {
           displayLabelValue += ` (${difference > 0 ? '+' : ''}${difference})`;
      }

      return {
        ...itemScoreData,
        itemId: item.id,
        name: item.name, // Keep original name for tooltips/logic
        categoryName: category?.name ?? 'Unknown',
        categoryColor: categoryColor,
        value: 1, // Equal size slice
        fillColor: calculateFillColor(itemScoreData, categoryColor),
        displayLabel: displayLabelValue, // Label for display inside slice
        nameLabel: item.name, // Not currently used for outer labels, kept for potential use
        difference: difference,
        order: index, // Use index from the definitive wellbeingItems array
        scoreValue: scoreValue, // Pass the relevant score for rendering radial fill
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
           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && (
               <p className="mt-2 text-destructive font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-destructive" />Selecionado para Melhoria</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length < 3 && activeIndex === data.order && ( // Use activeIndex
               <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para confirmar a seleção.</p>
           )}
            {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length < 3 && activeIndex !== data.order && ( // Use activeIndex
               <p className="mt-2 text-muted-foreground text-xs italic">Clique para focar, clique novamente para selecionar.</p>
           )}
           {isSelectionMode && isItemSelectedForImprovement(data.itemId) && activeIndex === data.order && ( // Use activeIndex
                <p className="mt-2 text-muted-foreground text-xs italic">Clique novamente para remover da seleção.</p>
           )}
           {isSelectionMode && !isItemSelectedForImprovement(data.itemId) && improvementItems.length >= 3 && (
                <p className="mt-2 text-destructive text-xs italic">Limite de 3 itens selecionados atingido.</p>
           )}

           {/* Scoring Mode Tooltip Hints */}
            {!isSelectionMode && activeIndex !== data.order && data.scoreValue === null && ( // Use activeIndex and scoreValue
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para definir a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
             {!isSelectionMode && activeIndex !== data.order && data.scoreValue !== null && ( // Use activeIndex and scoreValue
                 <p className="mt-2 text-muted-foreground text-xs italic">Clique para editar a nota {scoreType === 'current' ? 'atual' : 'desejada'}.</p>
            )}
        </div>
      );
    }
    return null;
  };


    // Custom Active Shape for Radial Fill Effect and Labels
    const renderActiveShape = (props: any) => {
        const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, scoreValue, order } = props as PieDataItem & { isActive?: boolean }; // Added isActive

        if (!payload) {
             // Render a simple sector if no payload
             return <Sector {...props} />;
         }

        const scorePercentage = (scoreValue ?? 0) / 10; // Score out of 10, default 0 if null
        const filledOuterRadius = innerRadius + (outerRadius - innerRadius) * scorePercentage;

        // Create a gradient ID based on item ID
        const gradientId = `gradient-${payload.itemId}`;

         // Determine label color based on fill brightness (simple contrast)
         let labelColor = "hsl(var(--foreground))"; // Default dark text
         try {
            const match = fill.match(/hsla?\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/);
            if (match) {
                const lightness = parseFloat(match[3]);
                const alpha = match[4] ? parseFloat(match[4]) : 1; // Fix: Correct parsing of alpha
                if (lightness < 55 && alpha > 0.5) {
                    labelColor = "hsl(var(--primary-foreground))"; // Light text for dark backgrounds
                }
            }
         } catch (e) { console.error("Label color determination error", e); }

          // Override for selected items in selection mode
         if (isSelectionMode && isItemSelectedForImprovement(payload.itemId)) {
             labelColor = "hsl(var(--primary-foreground))"; // Ensure contrast against selection color
             // Make selection color slightly brighter for the text background contrast maybe? Or just keep it simple.
         }


        // Label positioning logic
        const midAngleRad = (startAngle + endAngle) / 2 * RADIAN;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.55; // Position slightly outwards from center
        const x = cx + radius * Math.cos(-midAngleRad);
        const y = cy + radius * Math.sin(-midAngleRad);

        // Simple split for multi-line labels
         const nameParts = payload.displayLabel.split(' ');
         let line1 = payload.displayLabel;
         let line2 = '';
         // Attempt to break long labels intelligently
         if (payload.displayLabel.length > 13 && nameParts.length > 1) {
             // Find a good breaking point (e.g., middle word or space)
             const midIndex = Math.ceil(nameParts.length / 2);
             line1 = nameParts.slice(0, midIndex).join(' ');
             line2 = nameParts.slice(midIndex).join(' ');
         }


        return (
            <g>
                {/* Define the radial gradient */}
                 <defs>
                    <radialGradient id={gradientId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                      {/* Start with full color at the center */}
                      <stop offset="0%" stopColor={fill} stopOpacity="1" />
                       {/* Fade to a less opaque version towards the edge */}
                       <stop offset={`${scorePercentage * 100}%`} stopColor={fill} stopOpacity="1" />
                       {/* Transparent beyond the score */}
                       <stop offset={`${scorePercentage * 100 + 0.1}%`} stopColor={fill} stopOpacity="0.15" />
                       <stop offset="100%" stopColor={fill} stopOpacity="0.15" />
                    </radialGradient>
                 </defs>

                 {/* Base Sector (always full size, slightly muted background) */}
                  <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill} // Use the base fill color
                    opacity={0.15} // Make the background muted
                    stroke={'hsl(var(--background))'} // Background color stroke
                    strokeWidth={1}
                  />

                {/* Filled Sector using the gradient */}
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius} // Apply gradient to the full sector size
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={`url(#${gradientId})`} // Use the radial gradient
                    stroke={activeIndex === order || (isSelectionMode && isItemSelectedForImprovement(payload.itemId)) ? (isItemSelectedForImprovement(payload.itemId) ? SELECTION_COLOR : 'hsl(var(--ring))') : 'hsl(var(--background))'} // Highlight border if active/selected
                    strokeWidth={activeIndex === order || (isSelectionMode && isItemSelectedForImprovement(payload.itemId)) ? 3 : 1} // Thicker border if active/selected
                />


                {/* Text Label */}
                 <text
                     x={x}
                     y={y}
                     fill={labelColor}
                     textAnchor="middle"
                     dominantBaseline="central"
                     className="text-[8px] sm:text-[10px] pointer-events-none font-medium" // Smaller, medium weight
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
                     labelLine={false} // Line labels disabled as text is inside sector
                     outerRadius="95%" // Adjust as needed
                     innerRadius="25%" // Adjust as needed
                     dataKey="value" // `value: 1` makes all slices equal size
                     onClick={handlePieClick}
                     animationDuration={500}
                     animationEasing="ease-out"
                     className="cursor-pointer focus:outline-none"
                     startAngle={90} // Start at the top
                     endAngle={-270} // Go full circle counter-clockwise mathematically (visually clockwise)
                     stroke="hsl(var(--background))" // Separator color
                     strokeWidth={1}
                     activeIndex={activeIndex ?? undefined} // Control which sector uses renderActiveShape
                     activeShape={renderActiveShape} // Use custom shape for radial fill and labels
                     isAnimationActive={true} // Enable animation for active shape transition
                   >
                    {/* Cells are only needed if NOT using activeShape for everything */}
                     {pieData.map((entry, index) => (
                          <Cell
                           key={`cell-${entry.itemId}`}
                           fill={entry.fillColor} // Use pre-calculated fill (handles selection color)
                           stroke="none" // No stroke here, handled by Sector/activeShape
                           className="focus:outline-none transition-opacity duration-300 hover:opacity-90"
                           tabIndex={-1} // Pie handles focus
                           payload={entry} // Ensure payload is passed for activeShape/tooltip
                           aria-label={`${entry.name}: ${entry.scoreValue ?? (isSelectionMode ? (isItemSelectedForImprovement(entry.itemId) ? 'Selecionado' : 'Não selecionado') : 'Não avaliado')}`}
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
                                            variant="destructive" // Use destructive variant which maps to SELECTION_COLOR
                                            className="text-sm font-normal cursor-pointer flex items-center gap-1"
                                            onClick={() => pieItemIndex !== -1 && handlePieClick({ payload: pieData[pieItemIndex] }, pieItemIndex)} // Allow removing by clicking badge
                                            title={`Clique para remover "${details?.name}"`}
                                        >
                                            {details?.name}
                                            <XCircle className="h-3 w-3" />
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
                 <p className="text-xs text-destructive text-center mt-2 w-full">
                    Selecione pelo menos um item para melhorar antes de prosseguir.
                </p>
            )}
         </div>
     </div>
   );
};
