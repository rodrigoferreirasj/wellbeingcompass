'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAssessment } from '@/context/AssessmentContext';
import { wellbeingAreas } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, LabelList, ResponsiveContainer } from 'recharts';
import { Printer, Download, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define colors based on the theme (ensure consistency with wellbeing-wheel)
const COLORS = [
  'hsl(var(--chart-1))', // Teal
  'hsl(var(--chart-2))', // Orange
  'hsl(var(--chart-3))', // Muted Blue
  'hsl(var(--chart-4))', // Green
  'hsl(var(--chart-5))', // Purple
];

interface PieData {
  id: string;
  name: string;
  currentScore: number | null;
  desiredScore: number | null;
  value: number; // For chart segment size
  color: string;
}

export const SummaryDisplay: React.FC = () => {
  const { assessmentData, setAssessmentData } = useAssessment();
  const { userInfo, scores, improvementAreas } = assessmentData;
  const printRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // Indicate that we are now on the client side
  }, []);

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (printContents) {
       const printWindow = window.open('', '_blank', 'height=600,width=800');
       if (printWindow) {
            printWindow.document.write(`
              <html>
              <head>
                <title>Wellbeing Compass - Resumo</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .print-container { width: 100%; }
                    .user-info, .scores-summary, .action-plan { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 8px; }
                    h2, h3 { color: #008080; /* Teal */ margin-bottom: 10px;}
                    h3 { margin-top: 15px; border-bottom: 1px solid #ccc; padding-bottom: 5px;}
                    ul { list-style: none; padding: 0; }
                    li { margin-bottom: 8px; }
                    strong { font-weight: bold; }
                    .area-section { margin-bottom: 15px; }
                    .action-item { margin-left: 20px; margin-bottom: 5px; }
                    .chart-container { text-align: center; margin-bottom: 20px; }
                     @media print {
                        body { margin: 0; } /* Adjust margins for printing */
                        .no-print { display: none; } /* Hide buttons */
                        .print-container { border: none; padding: 0; box-shadow: none; }
                        .user-info, .scores-summary, .action-plan { border: none; padding: 0; border-radius: 0; margin-bottom: 15px;}
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
            // Delay print slightly to ensure content is rendered
            setTimeout(() => {
                 printWindow.print();
                 // printWindow.close(); // Close window after print dialog
            }, 500);
        }
    }
  };


  const handleRestart = () => {
     // Reset assessment data to initial state
     setAssessmentData({
        userInfo: null,
        scores: wellbeingAreas.map(area => ({
            areaId: area.id,
            currentScore: null,
            desiredScore: null,
         })),
        improvementAreas: [],
        stage: 'userInfo',
     });
  };


  const pieData: PieData[] = scores.map((score, index) => {
    const area = wellbeingAreas.find(a => a.id === score.areaId);
     const baseColor = COLORS[index % COLORS.length];
     const opacity = score.currentScore !== null ? score.currentScore / 10 : 0.1; // Use score for opacity, default low if null

     // Simple HSL to RGBA (adjust as needed for accuracy)
     let rgbaColor = baseColor; // Fallback
     try {
         const hslMatch = baseColor.match(/hsl\((\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\)/);
         if (hslMatch) {
             rgbaColor = `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${opacity})`;
         }
     } catch (e) { console.error("Color conversion error", e); }


    return {
      id: score.areaId,
      name: area?.name ?? score.areaId,
      currentScore: score.currentScore,
      desiredScore: score.desiredScore,
      value: 1, // Equal size slices
      color: rgbaColor,
    };
  });

   const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieData;
      return (
        <div className="bg-background border border-border rounded-md shadow-lg p-3 text-sm">
          <p className="font-semibold text-primary">{data.name}</p>
          {data.currentScore !== null && <p className="mt-1">Atual: <span className="font-medium">{data.currentScore}</span></p>}
          {data.desiredScore !== null && <p>Desejado: <span className="font-medium">{data.desiredScore}</span></p>}
        </div>
      );
    }
    return null;
  };


  if (!isClient) {
    // Render placeholder or loading state during server-side rendering / initial hydration
    return <Card className="w-full max-w-4xl"><CardContent><p>Carregando resumo...</p></CardContent></Card>;
  }


  return (
    <Card className="w-full max-w-4xl">
      {/* CardHeader is in AssessmentWizard */}
      <CardContent ref={printRef}>
         {/* User Info Section */}
         {userInfo && (
           <div className="user-info mb-6">
             <h2 className="text-xl font-semibold mb-3 text-primary">Informações do Usuário</h2>
             <ul>
               <li><strong>Nome:</strong> {userInfo.fullName}</li>
               <li><strong>Cargo:</strong> {userInfo.jobTitle}</li>
               <li><strong>Empresa:</strong> {userInfo.company}</li>
               <li><strong>Email:</strong> {userInfo.email}</li>
               <li><strong>Telefone:</strong> {userInfo.phone}</li>
             </ul>
           </div>
         )}

         {/* Scores Summary Section */}
         <div className="scores-summary mb-6">
           <h2 className="text-xl font-semibold mb-3 text-primary">Resultados da Roda do Bem-Estar</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               {/* Chart */}
              <div className="chart-container h-64 md:h-80">
                   <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                           <Pie
                             data={pieData}
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             outerRadius="100%"
                             innerRadius="30%"
                             dataKey="value"
                             animationDuration={0} // No animation needed for static summary
                           >
                             {pieData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={1}/>
                             ))}
                             <LabelList dataKey="currentScore" position="inside" fill="#fff" fontSize={12} fontWeight="bold" formatter={(val: number | null) => val ?? ''} />
                           </Pie>
                           <Tooltip content={<CustomTooltip />} />
                       </PieChart>
                   </ResponsiveContainer>
               </div>

               {/* Scores List */}
               <div>
                   <ul>
                     {scores.map(score => {
                       const area = wellbeingAreas.find(a => a.id === score.areaId);
                       const difference = score.currentScore !== null && score.desiredScore !== null ? score.desiredScore - score.currentScore : null;
                       const diffColor = difference === null ? '' : difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-muted-foreground';
                       const diffSign = difference === null ? '' : difference > 0 ? '+' : '';

                       return (
                         <li key={score.areaId} className="mb-2 border-b pb-2 last:border-b-0">
                           <strong>{area?.name}:</strong>
                           <span className="ml-2">Atual: {score.currentScore ?? 'N/A'}</span>
                           <span className="ml-2">Desejado: {score.desiredScore ?? 'N/A'}</span>
                           {difference !== null && (
                             <span className={`ml-2 font-medium ${diffColor}`}>({diffSign}{difference})</span>
                           )}
                         </li>
                       );
                     })}
                   </ul>
               </div>
           </div>
         </div>

         {/* Action Plan Section */}
         {improvementAreas.length > 0 && (
           <div className="action-plan">
             <h2 className="text-xl font-semibold mb-3 text-primary">Plano de Ação</h2>
             {improvementAreas.map(impArea => {
               const area = wellbeingAreas.find(a => a.id === impArea.areaId);
               return (
                 <div key={impArea.areaId} className="area-section mb-4">
                   <h3 className="text-lg font-medium">{area?.name}</h3>
                   {impArea.actions.filter(a => a.text.trim() !== '').map((action, index) => ( // Only display actions with text
                     <div key={action.id} className="action-item ml-4 mt-2 text-sm">
                       <p><strong>Ação {index + 1}:</strong> {action.text}</p>
                       <p className="text-muted-foreground">
                           <strong>Data de Conclusão:</strong> {action.completionDate ? format(action.completionDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Não definida'}
                       </p>
                     </div>
                   ))}
                 </div>
               );
             })}
           </div>
         )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6 no-print">
        <Button variant="outline" onClick={handleRestart}>
           <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar Avaliação
        </Button>
         <Button onClick={handlePrint}>
           <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
         </Button>
         {/* Optionally add a download button if PDF generation logic exists */}
         {/* <Button variant="outline">
           <Download className="mr-2 h-4 w-4" /> Baixar PDF
         </Button> */}
      </CardFooter>
    </Card>
  );
};
