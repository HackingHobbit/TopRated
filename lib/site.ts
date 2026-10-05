export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://topratedcc.netlify.app';

export function absoluteUrl(pathname = ''): string {
  return new URL(pathname, SITE_URL).toString();
}

/** Generic "Photo coming soon" image used for products without a real photo yet. */
export const PLACEHOLDER_IMAGE = '/assets/product-placeholder.png';

export function isPlaceholderImage(image: string | undefined | null): boolean {
  return image === PLACEHOLDER_IMAGE;
}
