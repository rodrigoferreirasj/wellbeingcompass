
'use client';

import React, { useMemo } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CategoryScoresDisplayProps {
  scoreType: 'current' | 'desired' | 'combined'; // Added 'combined' type
}

export const CategoryScoresDisplay: React.FC<CategoryScoresDisplayProps> = ({ scoreType }) => {
  const { calculateCategoryPercentages } = useAssessment();

  const categoryPercentages = useMemo(() => {
    return calculateCategoryPercentages();
  }, [calculateCategoryPercentages]);

  // Determine title based on scoreType
  const getTitle = () => {
    switch (scoreType) {
      case 'current':
        return 'Percentual Atual por Categoria';
      case 'desired':
        return 'Percentual Desejado por Categoria';
      case 'combined':
        return 'Percentuais por Categoria (Atual vs. Desejado)';
      default:
        return 'Percentuais por Categoria';
    }
  };

  const title = getTitle();

  // Check if any percentages are available at all
  const hasAnyPercentages = categoryPercentages.some(
    score => score.currentPercentage !== null || score.desiredPercentage !== null
  );

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-center text-primary">{title}</CardTitle>
         {scoreType === 'combined' && (
            <CardDescription className="text-center text-xs text-muted-foreground">
               Barra mais clara: Atual | Barra mais escura: Desejado
            </CardDescription>
         )}
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryPercentages.length > 0 && hasAnyPercentages ? (
          categoryPercentages.map(score => {
            const currentPercentage = score.currentPercentage;
            const desiredPercentage = score.desiredPercentage;
            const showCurrent = scoreType === 'current' || scoreType === 'combined';
            const showDesired = scoreType === 'desired' || scoreType === 'combined';

            return (
              <div key={score.categoryId} className="flex flex-col space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium" style={{ color: score.categoryColor }}>
                    {score.categoryName}
                  </span>
                  {/* Display percentages side-by-side in combined mode */}
                  {scoreType === 'combined' && (
                    <div className="flex gap-2 items-center">
                         <span className={cn("font-semibold text-xs", currentPercentage === null ? "text-muted-foreground/70" : "text-foreground/80")}>
                            {currentPercentage !== null ? `${currentPercentage.toFixed(0)}%` : 'N/A'}
                         </span>
                         <span className="text-muted-foreground text-xs">|</span>
                         <span className={cn("font-semibold text-xs", desiredPercentage === null ? "text-muted-foreground" : "text-foreground")}>
                            {desiredPercentage !== null ? `${desiredPercentage.toFixed(0)}%` : 'N/A'}
                         </span>
                    </div>
                  )}
                  {/* Display single percentage otherwise */}
                  {scoreType !== 'combined' && (
                     <span className={cn("font-semibold",
                         (scoreType === 'current' && currentPercentage === null) || (scoreType === 'desired' && desiredPercentage === null)
                         ? "text-muted-foreground" : "text-foreground")}>
                         {scoreType === 'current' ? (currentPercentage !== null ? `${currentPercentage.toFixed(0)}%` : 'N/A')
                         : (desiredPercentage !== null ? `${desiredPercentage.toFixed(0)}%` : 'N/A')}
                     </span>
                  )}
                </div>
                {/* Progress Bar(s) */}
                <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
                    {/* Current Progress (lighter, behind) - only if showing current or combined */}
                    {showCurrent && currentPercentage !== null && (
                        <Progress
                            value={currentPercentage}
                            className="absolute h-full w-full bg-transparent" // Transparent container
                            style={{ '--progress-color': score.categoryColor } as React.CSSProperties}
                             // Apply custom class with opacity
                            indicatorClassName="progress-indicator-custom opacity-50"
                        />
                    )}
                     {/* Desired Progress (darker, potentially overlaying) - only if showing desired or combined */}
                    {showDesired && desiredPercentage !== null && (
                         <Progress
                            value={desiredPercentage}
                             // Use 'absolute' only in combined mode to overlay, otherwise 'relative' is fine
                            className={cn("h-full w-full bg-transparent", scoreType === 'combined' ? "absolute" : "relative")}
                            style={{ '--progress-color': score.categoryColor } as React.CSSProperties}
                             // Apply custom class without opacity
                            indicatorClassName="progress-indicator-custom"
                        />
                    )}
                    {/* Show gray bar if no value is present for the mode */}
                     {((scoreType === 'current' && currentPercentage === null) ||
                       (scoreType === 'desired' && desiredPercentage === null) ||
                       (scoreType === 'combined' && currentPercentage === null && desiredPercentage === null)) && (
                         <Progress value={0} className="h-full w-full" indicatorClassName="bg-muted" />
                     )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            {scoreType === 'current'
              ? 'Avalie os itens no gráfico para ver os percentuais atuais.'
              : scoreType === 'desired'
              ? 'Defina as notas desejadas no gráfico para ver os percentuais.'
              : 'Avalie os itens ou defina notas desejadas para ver os percentuais.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
