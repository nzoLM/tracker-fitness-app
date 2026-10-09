import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_ROUTES = ["/connexion", "/inscription"];

// Vérification optimiste : présence du cookie uniquement, sans requête en base.
// La vraie vérification se fait dans le layout des pages privées (requireSession).
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const isAuthRoute = AUTH_ROUTES.includes(request.nextUrl.pathname);

  if (!hasSession && !isAuthRoute) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf l'API, les fichiers internes de Next et les fichiers statiques
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
