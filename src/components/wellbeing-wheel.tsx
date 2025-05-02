'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, LabelList } from 'recharts';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingAreas, AreaScore } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, CheckCircle, Target, Star } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

interface WellbeingWheelProps {
  scoreType: 'current' | 'desired' | 'select';
}

// Define colors based on the theme
const COLORS = [
  'hsl(var(--chart-1))', // Teal
  'hsl(var(--chart-2))', // Orange
  'hsl(var(--chart-3))', // Muted Blue
  'hsl(var(--chart-4))', // Green
  'hsl(var(--chart-5))', // Purple
];
const SELECTED_COLOR = 'hsl(var(--accent))'; // Use accent color (Orange) for selection
const DEFAULT_COLOR = 'hsl(var(--secondary))'; // Use secondary color (Soft Gray) for unselected/empty

interface PieData extends AreaScore {
  name: string;
  value: number; // Fixed value for equal slices
  color: string;
  label: string; // Display label (score or area name)
}

export const WellbeingWheel: React.FC<WellbeingWheelProps> = ({ scoreType }) => {
  const {
    assessmentData,
    updateScore,
    selectImprovementArea,
    removeImprovementArea,
    goToStage,
    isAreaSelectedForImprovement,
  } = useAssessment();
  const { scores, stage } = assessmentData;
  const { toast } = useToast();
  const [selectedArea, setSelectedArea] = useState<AreaScore | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(5); // Default slider value

  // Determine the next and previous stages
  const nextStage = scoreType === 'current' ? 'desiredScore' : (scoreType === 'desired' ? 'selectAreas' : 'defineActions');
  const prevStage = scoreType === 'current' ? 'userInfo' : (scoreType === 'desired' ? 'currentScore' : 'desiredScore');

  const isSelectionMode = scoreType === 'select';

  useEffect(() => {
    // Reset selected area when changing score type or stage
    setSelectedArea(null);
  }, [scoreType, stage]);

  // Update slider when selectedArea changes (only in scoring modes)
  useEffect(() => {
    if (selectedArea && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      setSliderValue(selectedArea[scoreKey] ?? 5); // Default to 5 if score is null
    }
  }, [selectedArea, scoreType, isSelectionMode]);

  const handlePieClick = (entry: PieData) => {
    if (isSelectionMode) {
      const areaId = entry.areaId;
      if (isAreaSelectedForImprovement(areaId)) {
        removeImprovementArea(areaId);
        toast({ title: `Área "${entry.name}" removida da seleção.` });
      } else {
        if (assessmentData.improvementAreas.length < 3) {
          selectImprovementArea(areaId);
          toast({ title: `Área "${entry.name}" selecionada para melhoria.` });
        } else {
          toast({ title: "Limite Atingido", description: "Você já selecionou 3 áreas para melhorar.", variant: "destructive" });
        }
      }
       // No need to set selectedArea in selection mode
       setSelectedArea(null);
    } else {
      const clickedAreaData = scores.find(s => s.areaId === entry.areaId);
      if (clickedAreaData) {
        setSelectedArea(clickedAreaData);
        // Slider value is updated via useEffect
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
  };

  const confirmScore = () => {
    if (selectedArea && !isSelectionMode) {
      const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
      updateScore(selectedArea.areaId, scoreKey, sliderValue);
      toast({
        title: "Pontuação Salva",
        description: `Nota ${sliderValue} salva para ${wellbeingAreas.find(a => a.id === selectedArea.areaId)?.name}.`,
      });
      setSelectedArea(null); // Deselect after confirming
    }
  };

   const calculateFillColor = (scoreData: AreaScore, index: number): string => {
    const baseColor = COLORS[index % COLORS.length];

    if (isSelectionMode) {
      return isAreaSelectedForImprovement(scoreData.areaId) ? SELECTED_COLOR : baseColor; // Highlight selected areas
    }

    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const score = scoreData[scoreKey];

     if (score === null) {
        // If selected, use accent, otherwise secondary
        return selectedArea?.areaId === scoreData.areaId ? SELECTED_COLOR : DEFAULT_COLOR;
     }

     // For scored areas, use a blend or opacity based on score
     // This example uses opacity, adjust as needed for better visuals
     const opacity = score / 10;
     // Convert baseColor (HSL string) to RGBA with opacity
     // Basic HSL to RGB/A conversion (simplified)
     try {
         const hslMatch = baseColor.match(/hsl\((\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\)/);
         if (hslMatch) {
             // Note: This is a placeholder for a proper HSL to RGBA conversion
             // You might need a library or a more robust function for accurate color conversion with opacity
             return `hsl(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`; // CSS4 allows HSL with alpha
         }
     } catch (e) { console.error("Color conversion error", e); }

    return baseColor; // Fallback to base color
  };


  const pieData: PieData[] = scores.map((scoreData, index) => {
    const area = wellbeingAreas.find(a => a.id === scoreData.areaId);
    const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
    const currentDisplayScore = scoreData.currentScore;
    const desiredDisplayScore = scoreData.desiredScore;

    let label = area?.name ?? scoreData.areaId; // Default label is area name
    let displayValue: string | number = ''; // Value shown on the slice

     if (isSelectionMode) {
        // In selection mode, show checkmark if selected
        if (isAreaSelectedForImprovement(scoreData.areaId)) {
           displayValue = '✓'; // Or use a Lucide Check icon component if preferred
        } else {
           displayValue = ''; // Empty if not selected
        }
     } else {
        // In scoring modes
        const currentScore = scoreData[scoreKey];
        if (currentScore !== null) {
            displayValue = currentScore; // Show the score number
        }
         // Optionally, show difference in desired score mode if current score exists
         if (scoreType === 'desired' && scoreData.currentScore !== null && currentScore !== null) {
             const diff = currentScore - scoreData.currentScore;
             const diffSign = diff > 0 ? '+' : (diff < 0 ? '' : '');
             // Append difference to the label, not replace the display value
             // label = `${label} (${diffSign}${diff})`; // Show diff in label, keep score in displayValue
         }
     }


    return {
      ...scoreData,
      name: area?.name ?? scoreData.areaId,
      value: 1, // Equal value for equal slices
      color: calculateFillColor(scoreData, index),
      label: label, // Keep label as area name (potentially with diff)
      displayValue: displayValue // Use this for the value inside the slice
    };
  });

   const isNextDisabled = () => {
    if (isSelectionMode) {
        return assessmentData.improvementAreas.length === 0; // Need at least one area selected
    } else {
        const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
        return scores.some(s => s[scoreKey] === null); // Ensure all areas are scored
    }
   }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieData;
      const areaMeta = wellbeingAreas.find(a => a.id === data.areaId);

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm">
          <p className="font-semibold text-primary">{data.name}</p>
          {areaMeta?.description && <p className="text-muted-foreground text-xs mt-1">{areaMeta.description}</p>}
          {!isSelectionMode && (
             <>
              {data.currentScore !== null && <p className="mt-2">Atual: <span className="font-medium">{data.currentScore}</span></p>}
              {data.desiredScore !== null && <p>Desejado: <span className="font-medium">{data.desiredScore}</span></p>}
             </>
          )}
           {isSelectionMode && isAreaSelectedForImprovement(data.areaId) && (
               <p className="mt-2 text-accent font-medium flex items-center"><Star className="w-3 h-3 mr-1 fill-accent" />Selecionado para Melhoria</p>
           )}
        </div>
      );
    }
    return null;
  };


  return (
    <div className="flex flex-col items-center w-full">
       {selectedArea && !isSelectionMode ? (
           <Card className="w-full max-w-md mb-6 shadow-md">
                <CardHeader>
                   <CardTitle className="text-lg text-center">Avaliar: <span className="text-primary">{wellbeingAreas.find(a => a.id === selectedArea.areaId)?.name}</span></CardTitle>
                    <CardDescription className="text-center">
                      {scoreType === 'current' ? 'Qual sua satisfação atual nesta área (1-10)?' : 'Qual nota você deseja alcançar nesta área (1-10)?'}
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
                     aria-label={`Score for ${wellbeingAreas.find(a => a.id === selectedArea.areaId)?.name}`}
                  />
                  <span className="mt-2 text-2xl font-bold text-primary">{sliderValue}</span>
               </CardContent>
               <CardFooter className="flex justify-center gap-4 pb-4">
                  <Button variant="outline" onClick={() => setSelectedArea(null)}>Cancelar</Button>
                  <Button onClick={confirmScore}>Confirmar Nota</Button>
               </CardFooter>
           </Card>
       ) : (
            <div className="mb-6 text-center text-muted-foreground h-[220px] flex items-center justify-center">
              {!isSelectionMode && <p>Clique em uma área do gráfico para definir a pontuação.</p>}
              {isSelectionMode && <p>Clique nas áreas do gráfico que você deseja focar para melhorar (máx. 3).</p>}
            </div>
       )}


      <div className="relative w-full max-w-lg aspect-square mx-auto">
        <PieChart width={500} height={500} className="[&_.recharts-layer:focus]:outline-none [&_.recharts-sector:focus]:outline-none" style={{ width: '100%', height: '100%' }}>
          <defs>
             {/* Define patterns for scored areas */}
             {scores.map((scoreData, index) => {
                 const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
                 const score = scoreData[scoreKey];
                 if (score === null || isSelectionMode) return null; // No pattern if not scored or in selection mode

                 const baseColor = COLORS[index % COLORS.length];
                 // Simple diagonal line pattern
                 return (
                    <pattern
                        key={`pattern-${scoreData.areaId}-${scoreType}`}
                        id={`pattern-${scoreData.areaId}-${scoreType}`}
                        patternUnits="userSpaceOnUse"
                        width="8" // Adjust pattern density
                        height="8"
                        patternTransform={`rotate(${45})`} // Adjust angle
                    >
                    <rect width="8" height="8" fill={baseColor} />
                     {/* Draw lines with increasing density based on score */}
                     {Array.from({length: score}).map((_, i) => (
                           <line
                             key={i}
                             x1="0"
                             y1={i * (8 / score)}
                             x2="8"
                             y2={i * (8 / score)}
                             stroke="rgba(255,255,255,0.4)" // White lines, adjust opacity
                             strokeWidth="0.5" // Adjust line thickness
                           />
                      ))}

                    </pattern>
                 );
             })}
          </defs>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="100%" // Adjust as needed
            innerRadius="30%" // Creates the donut hole
            dataKey="value"
            onClick={(_, index) => handlePieClick(pieData[index])} // Use processed pieData index
            animationDuration={500}
            animationEasing="ease-out"
            className="cursor-pointer focus:outline-none"
          >
            {pieData.map((entry, index) => {
               const scoreKey = scoreType === 'current' ? 'currentScore' : 'desiredScore';
               const score = entry[scoreKey];
               const fillColor = (score !== null && !isSelectionMode)
                  ? `url(#pattern-${entry.areaId}-${scoreType})` // Use pattern if scored
                  : entry.color; // Otherwise use calculated color (selection/default/base)

              return (
                 <Cell
                    key={`cell-${index}`}
                    fill={fillColor}
                    stroke={selectedArea?.areaId === entry.areaId ? 'hsl(var(--ring))' : 'hsl(var(--background))'} // Highlight border or background color
                    strokeWidth={selectedArea?.areaId === entry.areaId ? 3 : 1}
                    className="focus:outline-none transition-all duration-300 hover:opacity-80"
                    tabIndex={0} // Make cells focusable
                    aria-label={`${entry.name}: ${isSelectionMode ? (isAreaSelectedForImprovement(entry.areaId) ? 'Selecionado' : 'Clique para selecionar') : (entry[scoreKey] ?? 'Não avaliado')}`}
                 />
             );
             })}
             <LabelList
                  dataKey="displayValue"
                  position="inside"
                  fill="hsl(var(--primary-foreground))" // White text inside slices
                  fontSize={16}
                  fontWeight="bold"
                  // Conditional rendering for icons
                  formatter={(value: string | number) => {
                      if(isSelectionMode && value === '✓') {
                           // Cannot directly render component here, need a workaround or use text char
                           return '✓';
                       }
                       return value;
                   }}
                  className="pointer-events-none"
              />
          </Pie>
           <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
        </PieChart>
          {/* Central label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {scoreType === 'current' && <Target className="w-8 h-8 text-primary mb-1"/>}
              {scoreType === 'desired' && <CheckCircle className="w-8 h-8 text-primary mb-1"/>}
              {scoreType === 'select' && <Star className="w-8 h-8 text-primary mb-1"/>}
             <span className="text-sm font-medium text-foreground uppercase tracking-wider">
                 {scoreType === 'current' ? 'Atual' : scoreType === 'desired' ? 'Desejado' : 'Melhorar'}
             </span>
          </div>
      </div>


      <div className="mt-8 flex justify-between w-full">
        <Button variant="outline" onClick={() => goToStage(prevStage)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={() => goToStage(nextStage)} disabled={isNextDisabled()}>
           Próximo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
