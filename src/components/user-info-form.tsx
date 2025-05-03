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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const userInfoSchema = z.object({
  fullName: z.string().min(2, { message: 'Nome completo deve ter pelo menos 2 caracteres.' }),
  jobTitle: z.string().min(2, { message: 'Cargo deve ter pelo menos 2 caracteres.' }),
  company: z.string().min(2, { message: 'Empresa deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  phone: z.string().min(10, { message: 'Telefone deve ter pelo menos 10 dígitos.' }).regex(/^\+?[0-9\s\-()]+$/, {message: 'Formato de telefone inválido.'}),
});

// Temporary placeholder data for development
const placeholderUserInfo: UserInfo = {
  fullName: 'Usuário Teste',
  jobTitle: 'Cargo Teste',
  company: 'Empresa Teste',
  email: 'teste@exemplo.com',
  phone: '0000000000',
};

export const UserInfoForm: React.FC = () => {
  const { updateUserInfo } = useAssessment();
  const form = useForm<UserInfo>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: { // Keep default values, but they won't be strictly enforced for submission temporarily
      fullName: '',
      jobTitle: '',
      company: '',
      email: '',
      phone: '',
    },
  });

  // Original onSubmit function for when validation is re-enabled
  const onSubmit = (data: UserInfo) => {
    updateUserInfo(data);
    // Context handles stage transition
  };

  // Temporary function to bypass validation
  const handleTempSubmit = () => {
    console.warn("Bypassing user info validation for development.");
    updateUserInfo(placeholderUserInfo); // Use placeholder data
    // Context handles stage transition
  };


  return (
    <Form {...form}>
      {/* The form structure remains for eventual re-activation, but submit uses the temporary handler */}
      <form onSubmit={(e) => { e.preventDefault(); handleTempSubmit(); }} className="space-y-6">
        <CardContent className="space-y-4 p-0">
          <p className="text-sm text-destructive">**Aviso:** Validação temporariamente desativada para desenvolvimento.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} disabled />
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
                    <Input placeholder="Seu cargo" {...field} disabled />
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
                  <Input placeholder="Empresa onde trabalha" {...field} disabled />
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
                    <Input type="email" placeholder="seu.email@exemplo.com" {...field} disabled/>
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
                    <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} disabled/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end p-0">
           {/* Use the temporary submit handler */}
           <Button type="submit">
            Pular Informações (Temp) <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
};
