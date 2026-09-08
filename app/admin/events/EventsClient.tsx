'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, CalendarRange, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { deleteEventAction, saveEventAction } from '@/lib/eventActions';
import type { EventItem } from '@/lib/events';
import EventImageUploader from './EventImageUploader';
import styles from './page.module.css';

interface EventFormState {
  id?: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  isVisible: boolean;
}

const EMPTY_FORM: EventFormState = {
  title: '',
  description: '',
  image: '',
  startDate: '',
  endDate: '',
  isVisible: true,
};

function sortEvents(events: EventItem[]) {
  return [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
}

export default function EventsClient({
  initialEvents,
  activeEventIds,
}: {
  initialEvents: EventItem[];
  activeEventIds: string[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [events, setEvents] = useState<EventItem[]>(sortEvents(initialEvents));
  const activeIds = useMemo(() => new Set(activeEventIds), [activeEventIds]);

  const upcoming = useMemo(
    () => events.filter((event) => activeIds.has(event.id)),
    [activeIds, events]
  );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    const startDate = form.startDate;
    const endDate = form.endDate;

    if (!title || !startDate || !endDate) {
      addToast({
        title: 'Missing details',
        message: 'Title, start date, and end date are required.',
        type: 'error',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveEventAction({
          id: form.id,
          title,
          description,
          image: form.image.trim(),
          startDate,
          endDate,
          isVisible: form.isVisible,
        });

        if (!result.ok) {
          throw new Error('Unable to save event.');
        }

        setEvents((prev) => {
          const next = form.id
            ? prev.map((item) => (item.id === form.id ? result.event : item))
            : [...prev, result.event];
          return sortEvents(next);
        });

        setForm(EMPTY_FORM);
        router.refresh();
        addToast({
          title: 'Saved',
          message: 'Event updated successfully.',
          type: 'success',
        });
      } catch (error) {
        addToast({
          title: 'Save failed',
          message: error instanceof Error ? error.message : 'Something went wrong.',
          type: 'error',
        });
      }
    });
  };

  const remove = (id: string, title: string) => {
    if (!confirm(`Delete “${title}”?`)) return;

    startTransition(async () => {
      try {
        await deleteEventAction(id);
        setEvents((prev) => prev.filter((event) => event.id !== id));
        if (form.id === id) setForm(EMPTY_FORM);
        router.refresh();
        addToast({ title: 'Deleted', message: `${title} removed.`, type: 'info' });
      } catch (error) {
        addToast({
          title: 'Delete failed',
          message: error instanceof Error ? error.message : 'Something went wrong.',
          type: 'error',
        });
      }
    });
  };

  return (
    <div className={styles.layout}>
      <form className={`glass-panel ${styles.formCard}`} onSubmit={save}>
        <div className={styles.formHeader}>
          <h2>{form.id ? 'Edit Event' : 'Add Event'}</h2>
          {form.id && (
            <button type="button" className="btn-secondary" onClick={() => setForm(EMPTY_FORM)}>
              Cancel
            </button>
          )}
        </div>

        <label>
          Title
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Friday Night Magic"
          />
        </label>

        <label>
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tell shoppers what to expect."
            rows={4}
          />
        </label>

        <label>
          Event Image
          <EventImageUploader
            value={form.image}
            onChange={(image) => setForm((prev) => ({ ...prev, image }))}
          />
        </label>

        <div className={styles.dateRow}>
          <label>
            Start Date
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </label>
          <label>
            End Date
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </label>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
          />
          Display on storefront
        </label>

        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Saving…' : form.id ? 'Save Changes' : 'Create Event'}
        </button>
      </form>

      <div className={`glass-panel ${styles.listCard}`}>
        <div className={styles.listHeader}>
          <h2>Coming Events</h2>
          <span>{upcoming.length} active</span>
        </div>

        {events.length === 0 ? (
          <p className={styles.empty}>No events yet.</p>
        ) : (
          <div className={styles.eventList}>
            {events.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                {event.image ? (
                  <img src={event.image} alt={event.title} className={styles.thumb} />
                ) : (
                  <div className={styles.thumbPlaceholder}>
                    <CalendarRange size={18} />
                  </div>
                )}
                <div className={styles.eventInfo}>
                  <div className={styles.eventTitleRow}>
                    <h3>{event.title}</h3>
                    <span className={styles.visibilityTag}>
                      {event.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                      {event.isVisible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <p>{event.description || 'No description provided.'}</p>
                  <small>
                    {new Date(event.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {' '}–{' '}
                    {new Date(event.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </small>
                </div>
                <div className={styles.eventActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() =>
                      setForm({
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        image: event.image,
                        startDate: event.startDate,
                        endDate: event.endDate,
                        isVisible: event.isVisible,
                      })
                    }
                    title="Edit event"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.danger}`}
                    onClick={() => remove(event.id, event.title)}
                    title="Delete event"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
