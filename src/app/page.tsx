import Header from '@/components/header';
import Topology from '@/components/topology';
import Checklist from '@/components/checklist';
import SetupGuide from '@/components/setup-guide';
import Troubleshooter from '@/components/troubleshooter';
import Resources from '@/components/resources';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-grow">
        <div className="grid gap-12">
          <section id="topology">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Physical & Network Topology</h2>
            <Topology />
          </section>

          <Separator />

          <section id="checklist" className="grid md:grid-cols-3 gap-8 items-start">
            <div className="md:col-span-1 md:sticky top-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">Configuration Checklist</h2>
              <p className="text-muted-foreground">
                An interactive checklist to track your setup progress for each device.
              </p>
            </div>
            <div className="md:col-span-2">
              <Checklist />
            </div>
          </section>
          
          <Separator />

          <section id="guide">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Comprehensive Guide</h2>
            <SetupGuide />
          </section>

          <Separator />

          <section id="troubleshooter" className="grid md:grid-cols-3 gap-8 items-start">
             <div className="md:col-span-1 md:sticky top-8">
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">AI Troubleshooter</h2>
                <p className="text-muted-foreground">
                  Stuck? Describe your issue and get instant, documentation-based solutions from our AI assistant.
                </p>
             </div>
             <div className="md:col-span-2">
                <Troubleshooter />
             </div>
          </section>

          <Separator />
          
          <section id="resources">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-6">Resources & Downloads</h2>
            <Resources />
          </section>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm">
        Built for Clover Developers.
      </footer>
    </div>
  );
}
