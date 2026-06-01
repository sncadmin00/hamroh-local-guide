import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/messages/")({
  component: () => (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
      <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
      <p className="text-sm">Select a conversation to start chatting.</p>
    </div>
  ),
});
