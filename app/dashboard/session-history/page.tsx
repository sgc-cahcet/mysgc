"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Star, ArrowLeft, Calendar, MessageSquare, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  description: string | null
  is_approved: boolean
  created_at: string
  feedback?: Feedback[]
  average_rating?: number
}

interface Feedback {
  id: string
  session_id: string
  member_id: number
  date: string
  rating: number
  comments: string | null
  created_at: string
}

export default function SessionHistoryPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
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
      fetchSessions(memberData.id)
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const fetchSessions = async (memberId: number) => {
    try {
      // Fetch all sessions where this member is the handler
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .eq("handler_id", memberId)
        .order("date", { ascending: false })

      if (sessionsError) {
        throw sessionsError
      }

      if (!sessionsData) {
        setSessions([])
        setLoading(false)
        return
      }

      // Fetch feedback for each session
      const sessionsWithFeedback: Session[] = []

      for (const session of sessionsData) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("session_feedback")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })

        if (feedbackError) {
          console.error("Error fetching feedback:", feedbackError)
        }

        // Calculate average rating
        let averageRating = 0
        if (feedbackData && feedbackData.length > 0) {
          const sum = feedbackData.reduce((acc, item) => acc + item.rating, 0)
          averageRating = sum / feedbackData.length
        }

        sessionsWithFeedback.push({
          ...session,
          feedback: feedbackData || [],
          average_rating: feedbackData && feedbackData.length > 0 ? Number(averageRating.toFixed(1)) : undefined,
        })
      }

      setSessions(sessionsWithFeedback)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching sessions:", error)
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
          <div>
            <h1 className="text-3xl font-black">My Sessions</h1>
            <p className="text-gray-600 mt-1">Sessions you've handled</p>
          </div>
          <Link href="/dashboard" passHref>
            <Button className="mt-2 sm:mt-0 flex items-center gap-2 bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {sessions.length > 0 ? (
            sessions.map((session) => (
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
                      {session.time}
                    </Badge>
                    <Badge variant="outline" className="border-2 border-black">
                      {session.type}
                    </Badge>
                    {session.feedback && session.feedback.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1 border-2 border-green-600 text-green-700 bg-green-50">
                        <Users size={14} />
                        {session.feedback.length} Feedback{session.feedback.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {session.description && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-1">Description:</h4>
                      <p className="text-sm text-gray-600">{session.description}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 border-2 border-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <MessageSquare size={16} />
                          View Feedback ({session.feedback?.length || 0})
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-2 border-black">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold">{session.title}</DialogTitle>
                          <DialogDescription>
                            Feedback received for this session
                          </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4">
                          {session.feedback && session.feedback.length > 0 ? (
                            <div className="space-y-4">
                              {session.feedback.map((feedback) => (
                                <div
                                  key={feedback.id}
                                  className="p-4 bg-gray-50 rounded-lg border-2 border-gray-300"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>{renderStars(feedback.rating)}</div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(feedback.date).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  {feedback.comments && feedback.comments.trim() !== "" && (
                                    <div className="mt-2">
                                      <h5 className="font-medium text-sm mb-1">Comments:</h5>
                                      <p className="text-sm text-gray-700">{feedback.comments}</p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-gray-200">
                              <MessageSquare size={48} className="mx-auto mb-2 text-gray-400" />
                              <p className="text-gray-600">No feedback received yet</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Feedback will appear here once participants submit their reviews
                              </p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-bold text-gray-800 mb-2">No Sessions Found</p>
              <p className="text-gray-600">You haven't handled any sessions yet.</p>
            </div>
          )}
        </div>

        <div className="mt-12 text-center text-gray-500 text-xs">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </main>
    </div>
  )
}
