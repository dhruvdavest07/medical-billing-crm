import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function EncountersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clinical Encounters</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Start Encounter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Encounters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-[5px] border">
            <div className="p-8 text-center text-sm text-muted-foreground">
              No encounters found.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
