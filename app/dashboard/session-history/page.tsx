"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Star, ArrowLeft, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

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
  average_rating?: number
  feedback?: {
    id: string
    rating: number
    comments: string
    created_at: string
  }[]
  user_feedback?: {
    id: string
    rating: number
    comments: string
  } | null
}

export default function SessionHistoryPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      fetchMemberData(session.user.email!)
    }

    checkSession()
  }, [router, supabase])

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
      fetchSessionHistory(memberData.id)
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const fetchSessionHistory = async (memberId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]

      // First, get all sessions the user has provided feedback for
      const { data: userFeedback, error: userFeedbackError } = await supabase
        .from("session_feedback")
        .select("session_id, rating, comments")
        .eq("member_id", memberId)

      if (userFeedbackError) {
        console.error("Error fetching user feedback:", userFeedbackError)
      }

      // Create a map of session IDs the user has provided feedback for
      const userFeedbackMap = new Map()
      if (userFeedback) {
        userFeedback.forEach((feedback) => {
          userFeedbackMap.set(feedback.session_id, {
            rating: feedback.rating,
            comments: feedback.comments,
          })
        })
      }

      // Fetch all sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("is_approved", true)
        .order("date", { ascending: false })

      if (sessionsError) {
        throw sessionsError
      }

      if (!sessions) {
        setPastSessions([])
        setUpcomingSessions([])
        setLoading(false)
        return
      }

      // Split sessions into past and upcoming
      const past: Session[] = []
      const upcoming: Session[] = []

      for (const session of sessions) {
        // Determine if session is past or upcoming
        const isPast = session.date < today

        // For each session, fetch feedback
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("session_feedback")
          .select("id, rating, comments, created_at")
          .eq("session_id", session.id)

        if (feedbackError) {
          console.error("Error fetching feedback:", feedbackError)
          continue
        }

        // Calculate average rating
        let averageRating = 0
        if (feedbackData && feedbackData.length > 0) {
          const sum = feedbackData.reduce((acc, item) => acc + item.rating, 0)
          averageRating = sum / feedbackData.length
        }

        // Get user's own feedback for this session
        const userFeedback = userFeedbackMap.get(session.id) || null

        // Format feedback without member names
        const formattedFeedback =
          feedbackData?.map((item) => ({
            id: item.id,
            rating: item.rating,
            comments: item.comments,
            created_at: item.created_at,
          })) || []

        const sessionWithFeedback = {
          ...session,
          average_rating: Number(averageRating.toFixed(1)),
          feedback: formattedFeedback,
          user_feedback: userFeedback
            ? {
                id: session.id, // Using session id as a placeholder
                rating: userFeedback.rating,
                comments: userFeedback.comments,
              }
            : null,
        }

        // Only include sessions that are either:
        // 1. Handled by the current user (they presented it)
        // 2. The user has provided feedback for (they attended it)
        const isUserSession =
          session.handler_id === memberId ||
          userFeedbackMap.has(session.id) ||
          session.handler.includes(memberData?.name || "")

        if (isUserSession) {
          if (isPast) {
            past.push(sessionWithFeedback)
          } else {
            upcoming.push(sessionWithFeedback)
          }
        }
      }

      setPastSessions(past)
      setUpcomingSessions(upcoming)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching session history:", error)
      toast({
        title: "Error",
        description: "Failed to fetch session history",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // Helper to render stars for rating
  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating * 10) / 10
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= roundedRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{roundedRating.toFixed(1)}</span>
      </div>
    )
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
          <h1 className="text-3xl font-black">Session History</h1>
          <Link href="/dashboard" passHref>
            <Button className="mt-2 sm:mt-0 flex items-center gap-2 bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="past" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="past">Past Sessions</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="past">
            <div className="space-y-4">
              {pastSessions.length > 0 ? (
                pastSessions.map((session) => (
                  <Card key={session.id} className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <CardTitle className="text-xl">{session.title}</CardTitle>
                        {session.average_rating !== undefined && session.average_rating > 0 && (
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-2">Average Rating:</span>
                            {renderStars(session.average_rating)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1 border-2 border-black">
                          <Calendar size={14} />
                          {new Date(session.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Badge>
                        <Badge variant="outline" className="border-2 border-black">
                          {session.type}
                        </Badge>
                        <Badge variant="outline" className="border-2 border-black">
                          {session.handler}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {session.description && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-1">Description:</h4>
                          <p className="text-sm text-gray-600">{session.description}</p>
                        </div>
                      )}

                      {session.user_feedback && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border-2 border-black">
                          <h4 className="font-medium mb-1">Your Feedback:</h4>
                          <div className="mb-1">{renderStars(session.user_feedback.rating)}</div>
                          {session.user_feedback.comments && (
                            <p className="text-sm text-gray-600">{session.user_feedback.comments}</p>
                          )}
                        </div>
                      )}

                      {session.feedback && session.feedback.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">All Feedback:</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {session.feedback
                              .filter((item) => item.comments && item.comments.trim() !== "")
                              .map((item) => (
                                <div key={item.id} className="p-2 bg-gray-50 rounded-lg text-sm border border-gray-200">
                                  <div className="mb-1">{renderStars(item.rating)}</div>
                                  <p className="text-gray-600">{item.comments}</p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-gray-600">No past sessions found.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            <div className="space-y-4">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => (
                  <Card key={session.id} className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <CardTitle className="text-xl">{session.title}</CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1 border-2 border-black">
                          <Calendar size={14} />
                          {new Date(session.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </Badge>
                        <Badge variant="outline" className="border-2 border-black">
                          {session.type}
                        </Badge>
                        <Badge variant="outline" className="border-2 border-black">
                          {session.handler}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {session.description && (
                        <div>
                          <h4 className="font-medium mb-1">Description:</h4>
                          <p className="text-sm text-gray-600">{session.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-gray-600">No upcoming sessions found.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12 text-center text-gray-500 text-xs">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </main>
    </div>
  )
}
