import { getEvents } from '@/lib/events';
import EventsClient from './EventsClient';
import adminStyles from '../page.module.css';

export default async function AdminEventsPage() {
  const events = await getEvents();

  return (
    <>
      <div className={adminStyles.header}>
        <div>
          <h1>Events</h1>
        </div>
      </div>

      <EventsClient initialEvents={events} />
    </>
  );
}
