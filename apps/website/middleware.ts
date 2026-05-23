import { NextResponse, type NextRequest } from 'next/server';

/**
 * Catch-all redirect for share slugs like `ohlify.com/jocelyn-aminoff`.
 *
 * Customer-web (`ohlify-web.netlify.app`) owns the share-page logic. The
 * marketing site keeps `/` plus a known set of marketing routes; any
 * other path is treated as a professional handle and 308'd to the app.
 *
 * Using a permanent redirect (308) preserves the HTTP method and tells
 * crawlers the canonical URL has moved — important for SEO of share
 * links that were indexed at the old root.
 */
const MARKETING_ROUTES = new Set<string>([
  '/',
  '/privacy',
  '/terms',
  '/eula',
]);

/** Paths the framework / hosting platform handles natively. */
const PASSTHROUGH_PREFIXES = ['/_next', '/api', '/favicon', '/images', '/static'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (MARKETING_ROUTES.has(pathname)) return NextResponse.next();
  if (pathname.includes('.')) return NextResponse.next(); // assets
  if (PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  // Defensive: don't redirect anchor-style hash navigation (Next never
  // sends these here, but middleware should be robust).
  if (pathname.startsWith('/#')) return NextResponse.next();

  const target = new URL(`https://ohlify-web.netlify.app${pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(target, 308);
}

export const config = {
  // Match everything except Next internals / asset prefixes. The function
  // above further filters; matcher is purely for performance.
  matcher: ['/((?!_next/|favicon.svg|images/|static/).*)'],
};
