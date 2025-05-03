
'use client';

import React, { useMemo } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress'; // Use Progress for visual representation
import { cn } from '@/lib/utils';

interface CategoryScoresDisplayProps {
  scoreType: 'current' | 'desired';
}

export const CategoryScoresDisplay: React.FC<CategoryScoresDisplayProps> = ({ scoreType }) => {
  const { calculateCategoryScores } = useAssessment();

  const categoryScores = useMemo(() => {
    return calculateCategoryScores();
  }, [calculateCategoryScores]);

  const scoreKey = scoreType === 'current' ? 'currentAverage' : 'desiredAverage';
  const title = scoreType === 'current' ? 'Médias Atuais por Categoria' : 'Médias Desejadas por Categoria';

  // Check if any scores are available for the current type
  const hasScores = categoryScores.some(score => score[scoreKey] !== null);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-center text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryScores.length > 0 && hasScores ? (
          categoryScores.map(score => {
            const average = score[scoreKey];
            const percentage = average !== null ? (average / 10) * 100 : 0; // Calculate percentage for progress bar

            return (
              <div key={score.categoryId} className="flex flex-col space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium" style={{ color: score.categoryColor }}>
                    {score.categoryName}
                  </span>
                  <span className={cn("font-semibold", average === null ? "text-muted-foreground" : "text-foreground")}>
                    {average !== null ? average.toFixed(1) : 'N/A'}
                  </span>
                </div>
                <Progress
                    value={percentage}
                    className="h-2"
                    style={{ '--progress-color': score.categoryColor } as React.CSSProperties} // Custom property for color
                    indicatorClassName={average === null ? 'bg-muted' : ''} // Use muted if no score
                 />
              </div>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            {scoreType === 'current'
              ? 'Avalie os itens no gráfico para ver as médias atuais.'
              : 'Defina as notas desejadas no gráfico para ver as médias.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Add custom progress indicator styling in globals.css if needed, or use inline style if simple enough
// Example for globals.css (if needed for more complex styling or themes):
/*
.progress-indicator-custom {
  background-color: var(--progress-color, hsl(var(--primary)));
}
*/
// Update Progress component to accept indicatorClassName
