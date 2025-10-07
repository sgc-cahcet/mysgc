import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

interface MemberData {
  id: string
  name: string
  email: string
  department: string
  role: string
}

interface DashboardHeaderProps {
  memberData: MemberData | null
}

export function DashboardHeader({ memberData }: DashboardHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  
  // Check if user has admin access
  const isAdmin = memberData?.role === "Administrator" || memberData?.role === "Session Incharge" || memberData?.role === "Vice President" || memberData?.role === "President"

  const handleSignOut = async () => {
    setIsSigningOut(true)

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear service worker caches if they exist (PWA specific)
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          )
        }
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      })

      // Add a small delay to ensure auth state is cleared
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Use router.replace instead of router.push to prevent back navigation
      router.replace("/login")
      
      // Force a hard refresh after redirect to clear any remaining state
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = "/login"
        }
      }, 100)
      
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
      setIsSigningOut(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <header className="bg-white border-b-2 border-black">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <Image
              src="/logo.png"
              alt="SGC Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-black text-lg md:text-xl">SGC Portal</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right mr-2">
            <div className="font-bold">{memberData?.name}</div>
            <div className="text-sm text-gray-600">{memberData?.department}</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-black">
                  <AvatarFallback className="bg-black text-white">
                    {memberData ? getInitials(memberData.name) : "??"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              align="end"
              forceMount
            >
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{memberData?.name}</p>
                <p className="text-xs leading-none text-gray-500">{memberData?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/change-password">Change Password</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isSigningOut} onClick={handleSignOut} className="text-red-600 cursor-pointer">
                {isSigningOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
