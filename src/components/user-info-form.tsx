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


export const UserInfoForm: React.FC = () => {
  const { updateUserInfo } = useAssessment();
  const form = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    // Set default values to empty strings
    defaultValues: {
      fullName: '',
      jobTitle: '',
      company: '',
      email: '',
      phone: '',
    },
  });

  // Standard onSubmit function - Used for form submission with validation
  const onSubmit = (data: UserInfo) => {
    updateUserInfo(data);
    // Context handles stage transition
  };
  
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        // Handle international numbers separately
        if (value.startsWith('+')) {
            value = '+' + value.substring(1).replace(/\D/g, '');
        } else {
            value = value.replace(/\D/g, '');
            if (value.length > 2) {
                value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
            } else if (value.length > 0) {
                 value = `(${value}`;
            }

            if (value.length > 9 && value.length <= 14) { // Landline or old cell
                 if (value.length > 9 && value.includes(' ')) {
                    const parts = value.split(' ');
                    if (parts[1].length > 4) {
                       parts[1] = `${parts[1].substring(0, 4)}-${parts[1].substring(4)}`;
                       value = parts.join(' ');
                    }
                 }
            } else if (value.length > 14) { // New cell format
                 const parts = value.split(' ');
                 if (parts[1] && parts[1].length > 5) {
                    parts[1] = `${parts[1].substring(0, 5)}-${parts[1].substring(5,9)}`;
                    value = parts.join(' ');
                 }
            }
        }
        form.setValue('phone', value);
    };


  return (
    <Form {...form}>
      {/* form tag now uses the actual onSubmit handler */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <CardContent className="space-y-4 p-0">
          {/* Remove the temporary message indicating bypass */}
          {/*
           <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded-md mb-4" role="alert">
                <p className="text-sm"><strong>Modo de Teste:</strong> Validação de dados do usuário temporariamente desativada. Clique em "Próximo" para continuar.</p>
           </div>
           */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
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
                    <Input 
                        type="tel" 
                        placeholder="(XX) XXXXX-XXXX" 
                        {...field} 
                        onChange={handlePhoneChange}
                        maxLength={16} // To accomodate for (XX) XXXXX-XXXX and a space
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-0">
           {/* Button now uses type="submit" to trigger form validation */}
           <Button type="submit">
             Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
