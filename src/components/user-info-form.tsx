'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAssessment } from '@/context/AssessmentContext';
import type { UserInfo } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardContent, CardFooter } from '@/components/ui/card'; // Removed unused Card import
import { ArrowRight } from 'lucide-react';

const userInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Nome completo deve ter pelo menos 2 caracteres.' }),
  jobTitle: z.string().min(2, { message: 'Cargo deve ter pelo menos 2 caracteres.' }),
  company: z.string().min(2, { message: 'Empresa deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  phone: z.string().min(10, { message: 'Telefone deve ter pelo menos 10 dígitos.' }).regex(/^\+?[0-9\s\-()]+$/, {message: 'Formato de telefone inválido.'}),
});

// Placeholder data for skipping validation
const placeholderUserInfo: UserInfo = {
    fullName: 'Test User',
    jobTitle: 'Tester',
    company: 'Test Inc.',
    email: 'test@example.com',
    phone: '0000000000',
};


export const UserInfoForm: React.FC = () => {
  const { updateUserInfo } = useAssessment();
  const form = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    // Use placeholder data as default for inputs, but validation is bypassed
    defaultValues: placeholderUserInfo,
  });

  // Standard onSubmit function - Not used directly by the button for now
  const onSubmit = (data: UserInfo) => {
    updateUserInfo(data);
    // Context handles stage transition
  };

  // Function to directly proceed with placeholder data
  const handleNextClick = () => {
      updateUserInfo(placeholderUserInfo);
      // updateUserInfo automatically advances the stage
  };


  return (
    <Form {...form}>
      {/* form tag is still useful for structure, but onSubmit is bypassed */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <CardContent className="space-y-4 p-0">
          {/* Add a temporary message indicating bypass */}
           <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded-md mb-4" role="alert">
                <p className="text-sm"><strong>Modo de Teste:</strong> Validação de dados do usuário temporariamente desativada. Clique em "Próximo" para continuar.</p>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    {/* Fields are still here but not required for progression */}
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu cargo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

           <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <Input placeholder="Empresa onde trabalha" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu.email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-0">
           {/* Button now directly calls handleNextClick, bypassing form submission */}
           <Button type="button" onClick={handleNextClick}>
             Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
