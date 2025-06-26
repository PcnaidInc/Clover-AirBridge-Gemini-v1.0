'use server';

import { airBridgeTroubleshooter, AirBridgeTroubleshooterInput } from '@/ai/flows/airbridge-troubleshooter';
import { z } from 'zod';

const FormSchema = z.object({
  issueDescription: z.string().min(10, {
    message: "Please describe your issue in at least 10 characters.",
  }),
});

export type TroubleshooterState = {
  data?: { potentialSolutions: string; };
  error?: string;
  message?: string;
}

export async function getTroubleshootingSuggestion(
  prevState: TroubleshooterState,
  formData: FormData,
): Promise<TroubleshooterState> {
  const validatedFields = FormSchema.safeParse({
    issueDescription: formData.get('issueDescription'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors.issueDescription?.join(', '),
    };
  }
  
  const input: AirBridgeTroubleshooterInput = {
      issueDescription: validatedFields.data.issueDescription,
  };

  try {
    const result = await airBridgeTroubleshooter(input);
    if (result && result.potentialSolutions) {
       return { data: result, message: 'Suggestion generated.' };
    }
    return { error: 'AI could not provide a solution. Please try rephrasing your issue.' };
  } catch (error) {
    console.error(error);
    return { error: 'An unexpected error occurred. Please try again later.' };
  }
}
