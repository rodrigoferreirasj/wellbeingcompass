
'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingItems, wellbeingCategories, getItemDetails, getCategoryForItem } from '@/types/assessment'; // Updated imports
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Import Table components
import { Printer, RotateCcw, TrendingUp } from 'lucide-react'; // Added TrendingUp
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CategoryScoresDisplay } from './category-scores-display'; // Import CategoryScoresDisplay

// Removed ChartData interface as we use CategoryScoresDisplay now

export const SummaryDisplay: React.FC = () => {
  const { assessmentData, setAssessmentData, calculateCategoryScores, resetAssessment, calculateCategoryPercentages } = useAssessment(); // Added resetAssessment and calculateCategoryPercentages
  const { userInfo, itemScores, improvementItems } = assessmentData;
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Indicate client-side rendering
  }, []);

  // No longer need separate chartData calculation, will use CategoryScoresDisplay directly

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (printContents && window) {
       const printWindow = window.open('', '_blank', 'height=800,width=1000');
       if (printWindow) {
            // Updated CSS for better print layout and table spacing
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
                    .category-scores-display { margin-bottom: 30px; } /* Added margin for category display */
                    /* Table Styling */
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 10px 12px; /* Increased padding */ text-align: left; font-size: 0.9em; }
                    th { background-color: #f2f2f2; color: #333; font-weight: bold; }
                    td span { margin-left: 5px; }
                     @media print {
                        body { margin: 0; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; } /* Ensure black text & colors */
                        .no-print { display: none; } /* Hide buttons */
                        .print-container { border: none; padding: 0; box-shadow: none; }
                        .section { border: none; padding: 0; border-radius: 0; margin-bottom: 20px; background-color: transparent; }
                        h1, h2 { color: #000 !important; } /* Black headings for print */
                        h3 { color: #000 !important; }
                        .category-summary li { border-color: #ccc; }
                        .item-score { border-left-color: #ccc; }
                        /* Ensure progress bars print colors */
                        .progress-indicator-custom { background-color: var(--progress-color) !important; }
                        progress { color: var(--progress-color) !important; } /* Attempt for native progress */
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; } /* Repeat header on new pages */
                        tfoot { display: table-footer-group; }
                     }
                </style>
              </head>
              <body>
                <div class="print-container">
                    <h1>Resumo da Roda do Bem-Estar</h1>
                    ${printContents}
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
     resetAssessment(); // Use the reset function from context
  };

   // Removed CustomTooltip as the chart is replaced by CategoryScoresDisplay

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

         {/* Category Scores Display Section - Replaced Chart */}
         <div className="category-scores-display section">
             <h2 className="text-xl font-semibold mb-4">Percentuais por Categoria</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Grid layout for scores */}
                <CategoryScoresDisplay scoreType="current" />
                <CategoryScoresDisplay scoreType="desired" />
             </div>
         </div>


         {/* Detailed Item Scores Table */}
          <div className="item-scores section">
               <h2 className="text-xl font-semibold mb-4">Pontuações Detalhadas por Item</h2>
               <div className="overflow-x-auto">
                   {/* Use ShadCN Table components */}
                   <Table>
                       <TableHeader>
                           <TableRow>
                               {/* Added explicit px-6 and py-3 for consistent padding */}
                               <TableHead className="px-4 sm:px-6 py-3 w-[150px]">Categoria</TableHead>
                               <TableHead className="px-4 sm:px-6 py-3">Item</TableHead>
                               <TableHead className="px-4 sm:px-6 py-3 text-center w-[100px]">Atual</TableHead>
                               <TableHead className="px-4 sm:px-6 py-3 text-center w-[100px]">Desejada</TableHead>
                               <TableHead className="px-4 sm:px-6 py-3 text-center w-[100px]">Diferença</TableHead>
                           </TableRow>
                       </TableHeader>
                       <TableBody>
                           {wellbeingItems.map(item => {
                               const score = itemScores.find(s => s.itemId === item.id);
                               const category = getCategoryForItem(item.id);
                               const current = score?.currentScore;
                               const desired = score?.desiredScore;
                               const difference = (current !== null && desired !== null) ? desired - current : null;
                               const diffColor = difference === null ? '' : difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-muted-foreground';
                               const diffSign = difference === null ? '' : difference > 0 ? '+' : '';

                               return (
                                   <TableRow key={item.id}>
                                       {/* Added explicit px-6 and py-4 */}
                                       <TableCell className="px-4 sm:px-6 py-4 font-medium" style={{ color: category?.color }}>{category?.name ?? 'N/A'}</TableCell>
                                       <TableCell className="px-4 sm:px-6 py-4">{item.name}</TableCell>
                                       <TableCell className="px-4 sm:px-6 py-4 text-center">{current ?? 'N/A'}</TableCell>
                                       <TableCell className="px-4 sm:px-6 py-4 text-center">{desired ?? 'N/A'}</TableCell>
                                       <TableCell className="px-4 sm:px-6 py-4 text-center">
                                           {difference !== null ? (
                                               <span className={cn(`font-medium ${diffColor} flex items-center justify-center`)}>
                                                   {diffSign}{difference}
                                                    {difference !== 0 && <TrendingUp className="w-3 h-3 ml-1"/>}
                                               </span>
                                           ) : (
                                               'N/A'
                                           )}
                                       </TableCell>
                                   </TableRow>
                               );
                           })}
                       </TableBody>
                   </Table>
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
