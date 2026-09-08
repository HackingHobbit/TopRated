import { getEvents, getVisibleEvents } from '@/lib/events';
import EventsClient from './EventsClient';
import adminStyles from '../page.module.css';

export default async function AdminEventsPage() {
  const [events, visibleEvents] = await Promise.all([
    getEvents(),
    getVisibleEvents(),
  ]);

  return (
    <>
      <div className={adminStyles.header}>
        <div>
          <h1>Events</h1>
        </div>
      </div>

      <EventsClient
        initialEvents={events}
        activeEventIds={visibleEvents.map((event) => event.id)}
      />
    </>
  );
}
