"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { AttendanceCard } from "@/components/attendance-card"
import { SessionsCard } from "@/components/sessions-card"
import { FeedbackForm } from "@/components/feedback-form"
import { SessionInterestForm } from "@/components/session-interest-form"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { History } from "lucide-react"

interface MemberData {
  id: string
  name: string
  email: string
  department: string
  role: string
}

interface Session {
  id: string
  title: string
  date: string
  time: string
  type: string
  handler: string
  handler_id: number
  description: string
}

export default function DashboardPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const initDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        fetchMemberData(session.user.email!)
        fetchTodaySessions()
        checkFeedbackTime()
      }
    }

    initDashboard()
  }, [supabase])

  const fetchMemberData = async (email: string) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("email", email)
        .single()

      if (memberError || !memberData) {
        toast({
          title: "Error",
          description: "Could not fetch member data",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      setMemberData(memberData)
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTodaySessions = async () => {
    try {
      // Format today's date as YYYY-MM-DD for database query
      const today = new Date()
      const formattedDate = today.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("date", formattedDate)
        .eq("is_approved", true)

      if (error) {
        console.error("Error fetching today's sessions:", error)
        return
      }

      setTodaySessions(data || [])
    } catch (error) {
      console.error("Error in fetchTodaySessions:", error)
    }
  }

  const isAfter1PMIST = () => {
    const now = new Date()
    // Convert to IST (UTC+5:30)
    const istHours = now.getUTCHours() + 5
    const istMinutes = now.getUTCMinutes() + 30

    // Adjust for overflow
    const adjustedHours = istHours + Math.floor(istMinutes / 60)
    const adjustedMinutes = istMinutes % 60

    // Check if time is after 1:30 PM (13:30)
    return adjustedHours > 13 || (adjustedHours === 13 && adjustedMinutes >= 30)
  }

  const checkFeedbackTime = () => {
    // Only show feedback form if it's after 1 PM IST
    setShowFeedbackForm(isAfter1PMIST())

    // Set up an interval to check every minute
    const interval = setInterval(() => {
      setShowFeedbackForm(isAfter1PMIST())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="text-2xl font-bold">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <DashboardHeader memberData={memberData} />

      <main className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-black">Dashboard</h1>
          <Link href="/dashboard/session-history" passHref>
            <Button className="mt-2 sm:mt-0 flex items-center gap-2 bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
              <History size={16} />
              <span>View Session History</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pass only the member ID - the component will handle all data fetching */}
          {memberData && <AttendanceCard memberId={memberData.id} />}
          <SessionsCard />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6">
          {todaySessions.length > 0 ? (
            showFeedbackForm ? (
              <FeedbackForm memberId={memberData?.id} todaySessions={todaySessions} />
            ) : (
              <div className="border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                <h2 className="text-xl font-bold mb-4">Session Feedback</h2>
                <p className="text-center py-6 text-gray-600">
                  Don't forget to add your feedback about today's session! The feedback form will be available from 1:30
                  PM to 11:59 PM IST.
                </p>
              </div>
            )
          ) : (
            <div className="border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-xl font-bold mb-4">Session Feedback</h2>
              <p className="text-center py-6 text-gray-600">No sessions scheduled for today.</p>
            </div>
          )}
          <SessionInterestForm memberId={memberData?.id} />
        </div>
        <div className="mt-12 text-center text-gray-500 text-xs hidden md:block">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </main>
    </div>
  )
}
