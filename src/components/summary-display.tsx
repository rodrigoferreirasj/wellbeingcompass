
'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, getItemDetails, getCategoryForItem } from '@/types/assessment'; // Updated imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'; // Using BarChart now
import { Printer, RotateCcw, TrendingUp } from 'lucide-react'; // Added TrendingUp
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChartData {
  name: string; // Category Name
  id: string; // Category ID
  current: number | null;
  desired: number | null;
  color: string;
}

export const SummaryDisplay: React.FC = () => {
  const { assessmentData, setAssessmentData, calculateCategoryScores } = useAssessment();
  const { userInfo, itemScores, improvementItems } = assessmentData;
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Indicate client-side rendering
  }, []);

  // Calculate category scores using the context function
  const categoryScores = useMemo(() => {
      if (!isClient) return []; // Avoid calculation on server
      return calculateCategoryScores();
  }, [calculateCategoryScores, isClient]);


  // Prepare data for the Bar Chart (using category averages)
  const chartData: ChartData[] = useMemo(() => {
      return categoryScores.map(catScore => {
          const category = wellbeingCategories.find(c => c.id === catScore.categoryId);
          return {
              id: catScore.categoryId,
              name: catScore.categoryName,
              current: catScore.currentAverage,
              desired: catScore.desiredAverage,
              color: category?.color ?? 'hsl(var(--secondary))', // Use category color
          };
      });
  }, [categoryScores]);


  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (printContents && window) {
       const printWindow = window.open('', '_blank', 'height=800,width=1000');
       if (printWindow) {
            printWindow.document.write(`
              <html>
              <head>
                <title>Wellbeing Compass - Resumo</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .print-container { width: 100%; }
                    h1 { text-align: center; color: #008080; margin-bottom: 30px; } /* Teal */
                    .section { margin-bottom: 25px; border: 1px solid #eee; padding: 20px; border-radius: 8px; background-color: #fff; }
                    h2 { color: #008080; /* Teal */ border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 15px; font-size: 1.4em;}
                    h3 { color: #333; margin-top: 20px; margin-bottom: 10px; font-size: 1.1em; }
                    ul { list-style: none; padding: 0; }
                    li { margin-bottom: 10px; line-height: 1.5; }
                    strong { font-weight: bold; }
                    .category-summary li { border-bottom: 1px dotted #eee; padding-bottom: 5px; }
                    .item-score { margin-left: 15px; padding-left: 15px; border-left: 2px solid #eee; margin-top: 5px; }
                    .item-score strong { color: #555; }
                    .action-plan .item-section { margin-bottom: 20px; }
                    .action-plan h3 { border-bottom: none; margin-bottom: 5px; }
                    .action-item { margin-left: 20px; margin-bottom: 8px; font-size: 0.95em; }
                    .action-item p { margin: 2px 0; }
                    .chart-placeholder { display: none; } /* Hide chart placeholder in print */
                    .chart-container { display: block; text-align: center; margin-bottom: 30px; } /* Show chart container */
                    /* Basic Table Styling */
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 0.9em; }
                    th { background-color: #f2f2f2; color: #333; }
                    td span { margin-left: 5px; }
                     @media print {
                        body { margin: 0; color: #000; } /* Ensure black text for print */
                        .no-print { display: none; } /* Hide buttons */
                        .print-container { border: none; padding: 0; box-shadow: none; }
                        .section { border: none; padding: 0; border-radius: 0; margin-bottom: 20px; background-color: transparent; }
                        h1, h2 { color: #000 !important; } /* Black headings for print */
                        h3 { color: #000 !important; }
                        .category-summary li { border-color: #ccc; }
                        .item-score { border-left-color: #ccc; }
                         /* Attempt to include chart - might not work perfectly */
                        .chart-container svg { max-width: 100% !important; height: auto !important; }
                     }
                </style>
              </head>
              <body>
                <div class="print-container">
                    <h1>Resumo da Roda do Bem-Estar</h1>
                    ${printContents.replace('<div class="chart-container', '<div class="chart-container')}
                 </div>
              </body>
              </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                 printWindow.print();
            }, 500); // Delay to allow rendering
        }
    }
  };


  const handleRestart = () => {
     setAssessmentData({
        userInfo: null,
        itemScores: wellbeingItems.map(item => ({ itemId: item.id, currentScore: null, desiredScore: null })), // Reset item scores
        improvementItems: [],
        stage: 'userInfo',
     });
  };


   const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartData;
      const currentVal = payload.find((p: any) => p.dataKey === 'current')?.value;
      const desiredVal = payload.find((p: any) => p.dataKey === 'desired')?.value;

      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm">
          <p className="font-semibold text-primary">{label}</p>
          {currentVal !== null && <p className="mt-1" style={{ color: payload.find((p: any) => p.dataKey === 'current')?.color }}>Atual: <span className="font-medium">{currentVal}</span></p>}
          {desiredVal !== null && <p style={{ color: payload.find((p: any) => p.dataKey === 'desired')?.color }}>Desejado: <span className="font-medium">{desiredVal}</span></p>}
        </div>
      );
    }
    return null;
  };


  if (!isClient) {
    return <Card className="w-full max-w-4xl"><CardContent><p>Carregando resumo...</p></CardContent></Card>;
  }


  return (
    <Card className="w-full max-w-5xl"> {/* Increased max-width */}
      <CardContent ref={printRef} className="space-y-8 pt-6">
         {/* User Info Section */}
         {userInfo && (
           <div className="user-info section">
             <h2 className="text-xl font-semibold mb-3">Informações do Usuário</h2>
             <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
               <li><strong>Nome:</strong> {userInfo.fullName}</li>
               <li><strong>Cargo:</strong> {userInfo.jobTitle}</li>
               <li><strong>Empresa:</strong> {userInfo.company}</li>
               <li><strong>Email:</strong> {userInfo.email}</li>
               <li><strong>Telefone:</strong> {userInfo.phone}</li>
             </ul>
           </div>
         )}

        {/* Scores Summary Section - Using Bar Chart for Categories */}
         <div className="scores-summary section">
           <h2 className="text-xl font-semibold mb-4">Médias por Categoria</h2>
           <div className="chart-container h-64 md:h-80"> {/* Keep chart container */}
              {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}> {/* Adjust margins */}
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }}/>
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.3)' }}/>
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="current" name="Média Atual" fill="hsla(var(--chart-1), 0.7)" radius={[4, 4, 0, 0]} barSize={20}>
                               <LabelList dataKey="current" position="top" fontSize={10} formatter={(val: number | null) => val?.toFixed(1) ?? ''}/>
                          </Bar>
                          <Bar dataKey="desired" name="Média Desejada" fill="hsla(var(--chart-2), 0.7)" radius={[4, 4, 0, 0]} barSize={20}>
                               <LabelList dataKey="desired" position="top" fontSize={10} formatter={(val: number | null) => val?.toFixed(1) ?? ''}/>
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
               ) : (
                    <p className="text-muted-foreground text-center chart-placeholder">Calculando médias...</p>
               )}
           </div>
         </div>


         {/* Detailed Item Scores Table */}
          <div className="item-scores section">
               <h2 className="text-xl font-semibold mb-4">Pontuações Detalhadas por Item</h2>
               <div className="overflow-x-auto">
                   <table>
                       <thead>
                           <tr>
                               <th>Categoria</th>
                               <th>Item</th>
                               <th>Atual</th>
                               <th>Desejada</th>
                               <th>Diferença</th>
                           </tr>
                       </thead>
                       <tbody>
                           {wellbeingItems.map(item => {
                               const score = itemScores.find(s => s.itemId === item.id);
                               const category = getCategoryForItem(item.id);
                               const current = score?.currentScore;
                               const desired = score?.desiredScore;
                               const difference = (current !== null && desired !== null) ? desired - current : null;
                               const diffColor = difference === null ? '' : difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-muted-foreground';
                               const diffSign = difference === null ? '' : difference > 0 ? '+' : '';

                               return (
                                   <tr key={item.id}>
                                       <td style={{ color: category?.color }}>{category?.name ?? 'N/A'}</td>
                                       <td>{item.name}</td>
                                       <td>{current ?? 'N/A'}</td>
                                       <td>{desired ?? 'N/A'}</td>
                                       <td>
                                           {difference !== null ? (
                                               <span className={`font-medium ${diffColor} flex items-center`}>
                                                   {diffSign}{difference}
                                                    {difference !== 0 && <TrendingUp className="w-3 h-3 ml-1"/>}
                                               </span>
                                           ) : (
                                               'N/A'
                                           )}
                                       </td>
                                   </tr>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
           </div>


         {/* Action Plan Section */}
         {improvementItems.length > 0 && (
           <div className="action-plan section">
             <h2 className="text-xl font-semibold mb-3">Plano de Ação</h2>
             {improvementItems.map(impItem => {
               const item = getItemDetails(impItem.itemId);
               const category = item ? getCategoryForItem(item.id) : undefined;
               // Filter out actions that are completely empty (no text and no date)
               const validActions = impItem.actions.filter(a => a.text.trim() !== '' || a.completionDate);

                if (validActions.length === 0) return null; // Don't render item if no valid actions

               return (
                 <div key={impItem.itemId} className="item-section mb-4">
                   <h3 className="text-lg font-medium">{item?.name} <span className="text-sm text-muted-foreground">({category?.name})</span></h3>
                   {validActions.map((action, index) => (
                     <div key={action.id} className="action-item ml-4 mt-2 text-sm">
                       <p><strong>Ação {index + 1}:</strong> {action.text || <span className="text-muted-foreground italic">(Ação não definida)</span>}</p>
                       <p className="text-muted-foreground">
                           <strong>Data de Conclusão:</strong> {action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : <span className="italic">(Data não definida)</span>}
                       </p>
                     </div>
                   ))}
                 </div>
               );
             })}
           </div>
         )}
         {improvementItems.length === 0 && (
            <div className="action-plan section">
                <h2 className="text-xl font-semibold mb-3">Plano de Ação</h2>
                <p className="text-muted-foreground">Nenhum item selecionado para melhoria ou plano de ação definido.</p>
            </div>
         )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6 no-print border-t mt-6">
        <Button variant="outline" onClick={handleRestart}>
           <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar Avaliação
        </Button>
         <Button onClick={handlePrint}>
           <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
         </Button>
      </CardFooter>
    </Card>
  );
};
