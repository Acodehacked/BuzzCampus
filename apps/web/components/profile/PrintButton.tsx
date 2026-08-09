"use client";

import { Printer } from "lucide-react";
import { Button } from "@buzz/ui";

export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer className="h-3.5 w-3.5" />
      Save as PDF
    </Button>
  );
}
