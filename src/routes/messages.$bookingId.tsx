import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMessageThread, sendMessage } from "@/lib/messages.functions";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/$bookingId")({
  component: ChatPage,
  errorComponent: ({ error }) => (
    <div className="flex-1 flex items-center justify-center p-6 text-sm text-destructive text-center">{error.message}</div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

function ChatPage() {
  const { bookingId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchThread = useServerFn(getMessageThread);
  const sendFn = useServerFn(sendMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const q = useQuery({
    queryKey: ["message-thread", bookingId],
    queryFn: () => fetchThread({ data: { booking_id: bookingId } }),
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`booking_messages:${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["message-thread", bookingId] });
          queryClient.invalidateQueries({ queryKey: ["message-threads"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [q.data?.messages.length]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendFn({ data: { booking_id: bookingId, body } });
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["message-thread", bookingId] });
      await queryClient.invalidateQueries({ queryKey: ["message-threads"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (q.isLoading || !q.data) {
    return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  const { booking, role, messages } = q.data;
  // Resolve current user id once for alignment
  const currentUserId = (messages.find((m) => m.sender_role === role)?.sender_id) ?? "";

  return (
    <div className="flex-1 flex flex-col h-[70vh] md:h-[75vh]">
      <header className="flex items-center gap-3 p-4 border-b border-border/60">
        {booking.counterpart_photo ? (
          <img src={booking.counterpart_photo} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-secondary" />
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{booking.counterpart_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {booking.experience} · {booking.date}{booking.start_time ? ` · ${String(booking.start_time).slice(0,5)}` : ""} · {booking.status}
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Say hello! {role === "client" ? "Ask the guide about meeting place, gear or timing." : "Greet your guest and confirm the meeting details."}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId || m.sender_role === role;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSend} className="border-t border-border/60 p-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 h-11 rounded-full border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
