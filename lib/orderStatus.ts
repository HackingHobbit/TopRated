// Shared order-status constant. Deliberately NOT in lib/orderActions.ts:
// that file has a 'use server' directive, which only supports exporting
// async functions — a plain array export from it gets stripped/replaced in
// the client bundle rather than passed through, which is exactly what broke
// the admin Orders page (OrdersTable.tsx imported ORDER_STATUSES from there
// and got something that wasn't a real array, so .map() threw at runtime).

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'canceled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
