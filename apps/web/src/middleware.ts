import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/forgot-password', '/'];

const rolePaths: Record<string, string[]> = {
  STUDENT: ['/student'],
  FACULTY: ['/faculty'],
  PLACEMENT_OFFICER: ['/placement'],
  PLACEMENT_HEAD: ['/placement'],
  RECRUITER: ['/recruiter'],
  ADMIN: ['/admin'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public paths are always accessible
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Exclude api, _next/static, _next/image, favicon.ico
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookies (assuming it's stored in a cookie named 'token' or similar)
  // For now, since auth uses localStorage in our setup, we can't fully protect 
  // via middleware without moving token to cookies. 
  // We'll rely on the client-side DashboardShell for now, but this middleware
  // sets up the structure for future cookie-based auth.

  const token = request.cookies.get('token')?.value;

  if (!token) {
    // If we want to strictly enforce it, we'd uncomment this, but we use localStorage
    // return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.next();
  }

  // If token exists, we would verify role and check `rolePaths`
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
