import { Terminal } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-5 flex items-center gap-4">
        <div className="p-2 bg-accent/20 text-accent rounded-lg">
          <Terminal className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AirBridge Assistant</h1>
          <p className="text-muted-foreground">Your complete guide to Clover AirBridge setup and troubleshooting.</p>
        </div>
      </div>
    </header>
  );
}
