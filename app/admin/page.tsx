"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionInterestCard } from "@/components/admin/session-interest-card"
import { FeedbackDisplay } from "@/components/admin/feedback-display"
import { StatusMessage } from "@/components/admin/status-message"
import type { MemberData, SessionInterest, Feedback, SessionWithFeedback } from "@/lib/session-types"

export default function AdminPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [sessionInterests, setSessionInterests] = useState<SessionInterest[]>([])
  const [sessionsWithFeedback, setSessionsWithFeedback] = useState<SessionWithFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionWithFeedback | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

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
      fetchSessionInterests()
    }

    checkSession()
  }, [router, supabase])

  // Auto-hide status messages after 3 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  // Fetch feedback when sessionInterests change
  useEffect(() => {
    if (sessionInterests.filter((s) => s.is_approved).length > 0) {
      fetchFeedbackForSessions()
    }
  }, [sessionInterests])

  const fetchMemberData = async (email: string) => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("email", email)
        .single()

      if (memberError || !memberData) {
        setStatusMessage({ type: "error", text: "Could not fetch member data" })
        router.push("/login")
        return
      }

      // Check if user is admin
      if (memberData.role !== "Vice President" && memberData.role !== "President" && memberData.role !== "Admininistrator") {
        setStatusMessage({ type: "error", text: "You do not have admin privileges" })
        router.push("/dashboard")
        return
      }

      setMemberData(memberData)
    } catch (error) {
      setStatusMessage({ type: "error", text: "An unexpected error occurred" })
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionInterests = async () => {
    try {
      const { data, error } = await supabase
        .from("session_interests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setSessionInterests(data || [])
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to fetch session interests" })
    }
  }

  const fetchFeedbackForSessions = async () => {
    const approvedSessions = sessionInterests.filter((s) => s.is_approved)
    const sessionsWithFeedback: SessionWithFeedback[] = []

    for (const session of approvedSessions) {
      try {
        // First find the session ID from the sessions table
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("id")
          .eq("title", session.topic)
          .eq("handler", session.member_name)
          .single()

        if (sessionError) {
          console.error("Error finding session:", sessionError)
          sessionsWithFeedback.push({
            ...session,
            feedback: [],
            average_rating: 0,
          })
          continue
        }

        if (sessionData) {
          // Fetch feedback for this session using session_id
          const { data: feedbackData, error: feedbackError } = await supabase
            .from("session_feedback")
            .select(`
              id,
              session_id,
              member_id,
              rating,
              comments,
              date,
              created_at
            `)
            .eq("session_id", sessionData.id)
            .order("created_at", { ascending: false })

          if (feedbackError) {
            console.error("Error fetching feedback:", feedbackError)
            throw feedbackError
          }

          // Get member names for each feedback
          const feedback: Feedback[] = []

          if (feedbackData && feedbackData.length > 0) {
            for (const item of feedbackData) {
              let memberName = "Anonymous"

              if (item.member_id) {
                const { data: memberData } = await supabase
                  .from("members")
                  .select("name")
                  .eq("id", item.member_id)
                  .single()

                if (memberData) {
                  memberName = memberData.name
                }
              }

              feedback.push({
                id: item.id,
                session_id: item.session_id,
                member_id: item.member_id,
                member_name: memberName,
                rating: item.rating,
                comment: item.comments || "",
                date: item.date,
                created_at: item.created_at,
              })
            }
          }

          // Calculate average rating
          const average_rating =
            feedback.length > 0 ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0

          sessionsWithFeedback.push({
            ...session,
            feedback,
            average_rating: Number(average_rating.toFixed(1)),
          })
        } else {
          // If no session found, add empty feedback
          sessionsWithFeedback.push({
            ...session,
            feedback: [],
            average_rating: 0,
          })
        }
      } catch (error) {
        console.error("Error processing session feedback:", error)
        sessionsWithFeedback.push({
          ...session,
          feedback: [],
          average_rating: 0,
        })
      }
    }

    setSessionsWithFeedback(sessionsWithFeedback)
  }

  const handleApprove = async (interest: SessionInterest) => {
    setProcessingId(interest.id)

    try {
      // First update the interest to approved
      const { error: updateError } = await supabase
        .from("session_interests")
        .update({ is_approved: true })
        .eq("id", interest.id)

      if (updateError) throw updateError

      // Then create a session from the interest
      const { error: createError } = await supabase.from("sessions").insert({
        title: interest.topic,
        date: interest.preferred_date,
        time: "01:00 PM", // Default time
        type: interest.type,
        handler: interest.member_name,
        description: interest.description,
        is_approved: true,
      })

      if (createError) throw createError

      setStatusMessage({
        type: "success",
        text: "Session approved! The session has been added to the schedule.",
      })

      // Refresh the list
      fetchSessionInterests()
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to approve session" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)

    try {
      const { error } = await supabase.from("session_interests").delete().eq("id", id)

      if (error) throw error

      setStatusMessage({
        type: "success",
        text: "Session rejected! The request has been removed.",
      })

      // Refresh the list
      fetchSessionInterests()
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to reject session" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setProcessingId(id)

    try {
      // First get the session interest details
      const { data: sessionInterest, error: fetchError } = await supabase
        .from("session_interests")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      // Find the corresponding session in the sessions table
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id")
        .eq("title", sessionInterest.topic)
        .eq("handler", sessionInterest.member_name)
        .single()

      if (sessionData) {
        // Delete any feedback for this session
        const { error: deleteFeedbackError } = await supabase
          .from("session_feedback")
          .delete()
          .eq("session_id", sessionData.id)

        if (deleteFeedbackError) throw deleteFeedbackError

        // Delete the session
        const { error: deleteSessionError } = await supabase.from("sessions").delete().eq("id", sessionData.id)

        if (deleteSessionError) throw deleteSessionError
      }

      // Delete the session interest
      const { error: deleteInterestError } = await supabase.from("session_interests").delete().eq("id", id)

      if (deleteInterestError) throw deleteInterestError

      setStatusMessage({
        type: "success",
        text: "Session deleted! The session has been removed from the schedule.",
      })

      // Refresh the list
      fetchSessionInterests()
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to delete session" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewFeedback = (interest: SessionInterest) => {
    const sessionWithFeedback = sessionsWithFeedback.find((s) => s.id === interest.id)
    if (sessionWithFeedback) {
      setSelectedSession(sessionWithFeedback)
      setFeedbackDialogOpen(true)
    }
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
        <h1 className="text-3xl font-black mb-6">Admin Dashboard</h1>

        <StatusMessage message={statusMessage} />

        <Tabs defaultValue="pending">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
            <TabsTrigger value="approved">Approved Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Session Approval Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  {sessionInterests.filter((interest) => !interest.is_approved).length > 0 ? (
                    <div className="space-y-4">
                      {sessionInterests
                        .filter((interest) => !interest.is_approved)
                        .map((interest) => (
                          <SessionInterestCard
                            key={interest.id}
                            interest={interest}
                            processingId={processingId}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelete={handleDelete}
                            onViewFeedback={handleViewFeedback}
                            feedbackCount={0}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No pending session requests</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader>
                <CardTitle>Approved Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionInterests.filter((interest) => interest.is_approved).length > 0 ? (
                  <div className="space-y-4">
                    {sessionInterests
                      .filter((interest) => interest.is_approved)
                      .map((interest) => {
                        const sessionWithFeedback = sessionsWithFeedback.find((s) => s.id === interest.id)
                        const feedbackCount = sessionWithFeedback?.feedback.length || 0

                        return (
                          <SessionInterestCard
                            key={interest.id}
                            interest={interest}
                            processingId={processingId}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onDelete={handleDelete}
                            onViewFeedback={handleViewFeedback}
                            feedbackCount={feedbackCount}
                          />
                        )
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No approved sessions</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Session Feedback - {selectedSession?.topic}</DialogTitle>
            </DialogHeader>

            {selectedSession && (
              <FeedbackDisplay feedback={selectedSession.feedback} averageRating={selectedSession.average_rating} />
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-12 text-center text-gray-500 text-xs">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </main>
    </div>
  )
}
