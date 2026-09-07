import { useState } from 'react';
import { useAdminAnnouncements, useCreateAnnouncement } from '@/features/admin/admin.hooks';
import PageHeader from '@/components/common/PageHeader';
import BackButton from '@/components/common/BackButton';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Send } from 'lucide-react';
import { toast } from '@/components/ui/toast';

const AdminAnnouncementsPage = () => {
  const { data: announcements, isLoading } = useAdminAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    createAnnouncement.mutate(
      { title: title.trim(), message: message.trim() },
      {
        onSuccess: () => {
          setTitle('');
          setMessage('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" description="Send platform-wide announcements to all users." backButton={<BackButton to="/admin" />} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Announcement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <textarea
              placeholder="Write your announcement message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={createAnnouncement.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {createAnnouncement.isPending ? 'Sending...' : 'Send Announcement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Previous Announcements</h3>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && (!announcements || announcements.length === 0) && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="p-10">
              <EmptyState
                icon={Megaphone}
                title="No announcements yet"
                description="Send your first announcement to all platform users."
              />
            </div>
          </div>
        )}

        {!isLoading && announcements && announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{a.title}</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {a.author.firstName} {a.author.lastName}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;
