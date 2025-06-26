'use server';

/**
 * @fileOverview An AI troubleshooter for Clover AirBridge setup issues.
 *
 * - airBridgeTroubleshooter - A function that provides potential solutions to AirBridge setup problems.
 * - AirBridgeTroubleshooterInput - The input type for the airBridgeTroubleshooter function.
 * - AirBridgeTroubleshooterOutput - The return type for the airBridgeTroubleshooter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AirBridgeTroubleshooterInputSchema = z.object({
  issueDescription: z
    .string()
    .describe('A detailed description of the issue encountered during Clover AirBridge setup.'),
});
export type AirBridgeTroubleshooterInput = z.infer<typeof AirBridgeTroubleshooterInputSchema>;

const AirBridgeTroubleshooterOutputSchema = z.object({
  potentialSolutions: z
    .string()
    .describe('Potential solutions to the described issue, based on the Clover AirBridge documentation.'),
});
export type AirBridgeTroubleshooterOutput = z.infer<typeof AirBridgeTroubleshooterOutputSchema>;

export async function airBridgeTroubleshooter(
  input: AirBridgeTroubleshooterInput
): Promise<AirBridgeTroubleshooterOutput> {
  return airBridgeTroubleshooterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'airBridgeTroubleshooterPrompt',
  input: {schema: AirBridgeTroubleshooterInputSchema},
  output: {schema: AirBridgeTroubleshooterOutputSchema},
  prompt: `You are an AI troubleshooter specializing in resolving issues during the Clover AirBridge setup process.

  Based on the provided issue description and your knowledge of the Clover AirBridge documentation, provide potential solutions to the user.

  Issue Description: {{{issueDescription}}}
  \n  Potential Solutions:`, // Ensure that LLM returns the "Potential Solutions" without additional text. IMPORTANT.
});

const airBridgeTroubleshooterFlow = ai.defineFlow(
  {
    name: 'airBridgeTroubleshooterFlow',
    inputSchema: AirBridgeTroubleshooterInputSchema,
    outputSchema: AirBridgeTroubleshooterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
