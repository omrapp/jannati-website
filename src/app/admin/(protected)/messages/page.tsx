import { Button } from '@/components/ui/button';
import { listContactMessages } from '@/lib/admin/contact-messages';
import { createClient } from '@/lib/supabase/server';
import { deleteMessageAction, markMessageReadAction } from './actions';

export default async function AdminMessagesPage() {
  const client = await createClient();
  const messages = await listContactMessages(client);
  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">
        Contact messages{' '}
        {unreadCount > 0 && <span className="text-muted-foreground">({unreadCount} unread)</span>}
      </h1>

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-2 rounded-md border p-3 ${m.is_read ? '' : 'border-primary bg-primary/5'}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {m.name} — <span className="text-muted-foreground font-normal">{m.email}</span>
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(m.created_at).toLocaleString()}
              </span>
            </div>
            {m.phone && <p className="text-muted-foreground text-xs">Phone: {m.phone}</p>}
            {m.service && <p className="text-muted-foreground text-xs">Topic: {m.service}</p>}
            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
            <div className="flex gap-2">
              <form action={markMessageReadAction.bind(null, m.id, !m.is_read)}>
                <Button type="submit" variant="outline" size="sm">
                  {m.is_read ? 'Mark unread' : 'Mark read'}
                </Button>
              </form>
              <form action={deleteMessageAction.bind(null, m.id)}>
                <Button type="submit" variant="destructive" size="sm">
                  Delete
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {messages.length === 0 && <p className="text-muted-foreground text-sm">No messages yet.</p>}
    </div>
  );
}
