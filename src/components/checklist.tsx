"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const stationTasks = [
  "Install USB Pay Display (from Clover App Market).",
  "Leave Register in Demo mode (sale requests are still emitted)."
];

const miniTasks = [
  "Enable Developer Mode & Allow Unknown APKs.",
  "Install clover-relay-mini.apk.",
  "On first launch, enter Flex IP and tap 'Start relay'.",
  "Grant the runtime permission prompt for USB accessory."
];

const flexTasks = [
  "Open Secure Network Pay Display app.",
  "Tap 'Start' and note the IP address displayed.",
  "If on a private LAN, toggle 'Enable Development Certificate'."
];

const TaskItem = ({ id, label, onCheckedChange, checked }: { id: string, label: string, onCheckedChange: () => void, checked: boolean }) => (
  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary transition-colors">
    <Checkbox id={id} onCheckedChange={onCheckedChange} checked={checked} aria-label={label} />
    <Label htmlFor={id} className={`flex-1 cursor-pointer ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{label}</Label>
  </div>
);

export default function Checklist() {
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  const handleCheckedChange = (id: string) => {
    setCheckedState(prevState => ({ ...prevState, [id]: !prevState[id] }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Station Solo</CardTitle>
          <CardDescription>Setup tasks for the main point-of-sale device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stationTasks.map((task, index) => (
            <TaskItem
              key={`station-${index}`}
              id={`station-${index}`}
              label={task}
              checked={!!checkedState[`station-${index}`]}
              onCheckedChange={() => handleCheckedChange(`station-${index}`)}
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mini Dev Kit (Relay)</CardTitle>
          <CardDescription>Setup tasks for the AirBridge relay device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {miniTasks.map((task, index) => (
            <TaskItem
              key={`mini-${index}`}
              id={`mini-${index}`}
              label={task}
              checked={!!checkedState[`mini-${index}`]}
              onCheckedChange={() => handleCheckedChange(`mini-${index}`)}
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Flex 4 (Payment Terminal)</CardTitle>
          <CardDescription>Setup tasks for the customer-facing payment device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {flexTasks.map((task, index) => (
            <TaskItem
              key={`flex-${index}`}
              id={`flex-${index}`}
              label={task}
              checked={!!checkedState[`flex-${index}`]}
              onCheckedChange={() => handleCheckedChange(`flex-${index}`)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
