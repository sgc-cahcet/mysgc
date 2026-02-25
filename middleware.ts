import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const url = req.nextUrl.clone()

    // If user is logged in and trying to access login/home page, redirect to dashboard
    if (session) {
        if (url.pathname === '/' || url.pathname === '/login') {
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    // If user is NOT logged in and trying to access dashboard, redirect to login
    if (!session) {
        if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin')) {
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }
    }

    return res
}

export const config = {
    matcher: ['/', '/login', '/dashboard/:path*', '/admin/:path*'],
}
