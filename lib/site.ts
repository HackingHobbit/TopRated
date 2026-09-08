export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://topratedcc.netlify.app';

export function absoluteUrl(pathname = ''): string {
  return new URL(pathname, SITE_URL).toString();
}
