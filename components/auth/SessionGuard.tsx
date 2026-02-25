"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export function SessionGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClientComponentClient()

    useEffect(() => {
        // Set up a listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth event:", event, !!session)

            if (event === "SIGNED_OUT") {
                // Explicitly clear any local state if needed
                if (pathname !== "/login" && pathname !== "/" && !pathname.startsWith("/login")) {
                    router.push("/login")
                    router.refresh()
                }
            } else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
                // Session is healthy, do nothing
            } else if (event === "SIGNED_IN" && (pathname === "/login" || pathname === "/")) {
                // Redirect to dashboard if they are on login/home but signed in
                router.push("/dashboard")
                router.refresh()
            }
        })

        // Periodic session validation to catch expired tokens or external signouts
        const validateSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession()

                if (error) {
                    console.error("Session validation error:", error)
                    await supabase.auth.signOut()
                    router.push("/login")
                    return
                }

                // If no session on a protected route, redirect
                if (!data.session && pathname !== "/login" && pathname !== "/" && !pathname.startsWith("/login")) {
                    router.push("/login")
                }
            } catch (err) {
                console.error("Unexpected error during session validation:", err)
            }
        }

        validateSession()
        const interval = setInterval(validateSession, 5 * 60 * 1000) // Check every 5 mins

        return () => {
            subscription.unsubscribe()
            clearInterval(interval)
        }
    }, [router, pathname, supabase])

    return <>{children}</>
}
