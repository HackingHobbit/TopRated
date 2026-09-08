import { cache } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { getSupabaseServer } from './supabase/server';
import { supabaseConfigured } from './supabase/env';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  isVisible: boolean;
}

export interface EventInput {
  id?: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  isVisible: boolean;
}

export function isEventActive(event: EventItem, now: number): boolean {
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  const expiresAt = end + 24 * 60 * 60 * 1000;

  return (
    event.isVisible &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    now < expiresAt
  );
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface DBShape {
  products?: unknown[];
  events?: EventItem[];
}

function normalizeEvent(row: Record<string, unknown>): EventItem {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    image: String(row.image ?? ''),
    startDate: String(row.start_date ?? row.startDate ?? ''),
    endDate: String(row.end_date ?? row.endDate ?? ''),
    isVisible: Boolean(row.is_visible ?? row.isVisible ?? true),
  };
}

async function readJSON(): Promise<DBShape> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as DBShape;
  } catch {
    return { events: [] };
  }
}

async function writeJSON(next: DBShape): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(next, null, 2));
}

async function readEventsFromJson(): Promise<EventItem[]> {
  const db = await readJSON();
  return Array.isArray(db.events) ? db.events : [];
}

async function writeEventsToJson(events: EventItem[]): Promise<void> {
  const db = await readJSON();
  await writeJSON({ ...db, events });
}

export const getEvents = cache(async (): Promise<EventItem[]> => {
  if (supabaseConfigured()) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw new Error(`Could not load events: ${error.message}`);
      return (data ?? []).map((row) => normalizeEvent(row as Record<string, unknown>));
    }

    throw new Error('Supabase client unavailable.');
  }

  return readEventsFromJson();
});

export const getVisibleEvents = cache(async (): Promise<EventItem[]> => {
  const events = await getEvents();
  const now = Date.now();

  return events.filter((event) => isEventActive(event, now));
});

export async function upsertEvent(input: EventInput): Promise<EventItem> {
  const cleanInput: EventInput = {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    image: input.image.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    isVisible: input.isVisible,
  };

  if (supabaseConfigured()) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const payload = {
        id: cleanInput.id ?? crypto.randomUUID(),
        title: cleanInput.title,
        description: cleanInput.description,
        image: cleanInput.image,
        start_date: cleanInput.startDate,
        end_date: cleanInput.endDate,
        is_visible: cleanInput.isVisible,
      };

      const { data, error } = cleanInput.id
        ? await supabase.from('events').update(payload).eq('id', cleanInput.id).select().single()
        : await supabase.from('events').insert(payload).select().single();

      if (error) throw new Error(`Could not save event: ${error.message}`);
      if (!data) throw new Error('Could not save event.');
      return normalizeEvent(data as Record<string, unknown>);
    }

    throw new Error('Supabase client unavailable.');
  }

  const list = await readEventsFromJson();
  const id = cleanInput.id ?? crypto.randomUUID();
  const resolved: EventItem = {
    id,
    title: cleanInput.title,
    description: cleanInput.description,
    image: cleanInput.image,
    startDate: cleanInput.startDate,
    endDate: cleanInput.endDate,
    isVisible: cleanInput.isVisible,
  };

  const next = list.some((event) => event.id === id)
    ? list.map((event) => (event.id === id ? resolved : event))
    : [...list, resolved];

  await writeEventsToJson(next);
  return resolved;
}

export async function deleteEventRecord(id: string): Promise<void> {
  if (supabaseConfigured()) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw new Error(`Could not delete event: ${error.message}`);
      return;
    }

    throw new Error('Supabase client unavailable.');
  }

  const list = await readEventsFromJson();
  await writeEventsToJson(list.filter((event) => event.id !== id));
}
