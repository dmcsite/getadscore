import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/r/(.*)',
  '/admin/pipeline',
  '/admin/leads',
  '/api/leads',
  '/api/leads/(.*)',
  '/api/prospect/(.*)',
  '/api/webhook/stripe',
  '/api/sample-report',
  '/api/score',
  '/api/free-check',
  '/api/save-report',
  '/api/foreplay/(.*)',
  '/api/analyze-external',
  '/api/pipeline/(.*)',
  '/api/hunter/(.*)',
  '/api/report/(.*)',
  '/api/admin/(.*)',
  '/api/analytics/(.*)',
  '/privacy',
  '/terms',
  '/success',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
