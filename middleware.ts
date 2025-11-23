import { NextResponse } from 'next/server';
import { withAuth } from "next-auth/middleware";

function sanitize(url: URL) {
  const path = url.pathname;
  
  // block CRLF poisoning
  if (path.includes("%0d") || path.includes("%0a")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // block double slashes
  if (path.includes("//")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  return null;
}

export default withAuth(
  function middleware(req) {
    const bad = sanitize(req.nextUrl);
    if (bad) return bad;
  },
  {
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/users/create-admin|_next|favicon.ico).*)"
  ],
};
