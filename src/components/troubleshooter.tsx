"use client";

import { useFormStatus } from 'react-dom';
import { getTroubleshootingSuggestion, type TroubleshooterState } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useActionState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Bot } from 'lucide-react';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Thinking...' : 'Get Suggestion'}
        </Button>
    )
}

export default function Troubleshooter() {
    const initialState: TroubleshooterState = {};
    const [state, formAction] = useActionState(getTroubleshootingSuggestion, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state?.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: state.error,
            });
        }
        if (state?.data) {
           formRef.current?.reset();
        }
    }, [state, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Troubleshooter</CardTitle>
                <CardDescription>Describe your setup problem below.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} ref={formRef} className="space-y-4">
                    <Textarea
                        name="issueDescription"
                        placeholder="e.g., 'My Flex device is not showing up on the network after I restarted the router...'"
                        rows={5}
                        required
                        className="bg-background"
                        aria-label="Issue Description"
                    />
                    <SubmitButton />
                </form>

                {state?.data && (
                    <div className="mt-6 p-4 bg-accent/20 border-l-4 border-accent rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <Bot className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
                            <div>
                                <h4 className="font-semibold text-accent-foreground">AI Suggestion</h4>
                                <p className="mt-2 text-foreground whitespace-pre-wrap">{state.data.potentialSolutions}</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
