'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from './auth-guard';
import { deleteEventRecord, type EventInput, upsertEvent } from './events';

export async function saveEventAction(input: EventInput) {
  await assertAdmin();
  const event = await upsertEvent(input);
  revalidatePath('/admin/events');
  revalidatePath('/');
  return { ok: true, event };
}

export async function deleteEventAction(id: string) {
  await assertAdmin();
  await deleteEventRecord(id);
  revalidatePath('/admin/events');
  revalidatePath('/');
  return { ok: true };
}
