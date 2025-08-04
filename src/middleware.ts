import { NextRequest, NextResponse } from 'next/server';

// Liste des routes qui nécessitent Firebase Admin
const FIREBASE_ROUTES = [
  '/api/notifications',
  '/api/push'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Vérifier si c'est une route qui nécessite Firebase
  const requiresFirebase = FIREBASE_ROUTES.some(route => pathname.startsWith(route));
  
  if (requiresFirebase) {
    // En phase de build, on passe sans vérification
    if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV) {
      return NextResponse.next();
    }
    
    // Vérifier que les variables Firebase sont présentes
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      return NextResponse.json(
        { error: 'Firebase not configured' },
        { status: 503 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
};
