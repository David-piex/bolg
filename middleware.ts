import { NextResponse, type NextRequest } from "next/server";

const localePattern = /^\/(zh|en)(\/|$)/;
const passthroughPrefixPattern = /^\/(?:api|_next|favicon\.ico|robots\.txt|sitemap\.xml)(\/|$)/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (localePattern.test(pathname) || passthroughPrefixPattern.test(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/zh${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
