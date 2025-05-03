
'use client';

import React, { useMemo } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CategoryScoresDisplayProps {
  scoreType: 'current' | 'desired';
}

export const CategoryScoresDisplay: React.FC<CategoryScoresDisplayProps> = ({ scoreType }) => {
  const { calculateCategoryPercentages } = useAssessment(); // Use the new percentage calculation function

  // Use the percentage calculation function
  const categoryPercentages = useMemo(() => {
    return calculateCategoryPercentages();
  }, [calculateCategoryPercentages]);

  const percentageKey = scoreType === 'current' ? 'currentPercentage' : 'desiredPercentage';
  const title = scoreType === 'current' ? 'Percentual Atual por Categoria' : 'Percentual Desejado por Categoria';

  // Check if any percentages are available for the current type
  const hasPercentages = categoryPercentages.some(score => score[percentageKey] !== null);

  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-center text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryPercentages.length > 0 && hasPercentages ? (
          categoryPercentages.map(score => {
            const percentage = score[percentageKey];

            return (
              <div key={score.categoryId} className="flex flex-col space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium" style={{ color: score.categoryColor }}>
                    {score.categoryName}
                  </span>
                  <span className={cn("font-semibold", percentage === null ? "text-muted-foreground" : "text-foreground")}>
                    {percentage !== null ? `${percentage.toFixed(0)}%` : 'N/A'} {/* Display as percentage */}
                  </span>
                </div>
                <Progress
                    value={percentage ?? 0} // Pass percentage directly to Progress
                    className="h-2"
                    style={{ '--progress-color': score.categoryColor } as React.CSSProperties}
                    indicatorClassName={cn(percentage === null ? 'bg-muted' : 'progress-indicator-custom')} // Apply custom class conditionally
                 />
              </div>
            );
          })
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            {scoreType === 'current'
              ? 'Avalie os itens no gráfico para ver os percentuais atuais.'
              : 'Defina as notas desejadas no gráfico para ver os percentuais.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
