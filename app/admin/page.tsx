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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Plus, Calendar } from "lucide-react"
import type { MemberData, SessionInterest, Feedback, SessionWithFeedback } from "@/lib/session-types"

interface Member {
  id: string
  name: string
  email: string
}

interface ConflictingSession {
  topic: string
  member_name: string
  date: string
}

export default function AdminPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [sessionInterests, setSessionInterests] = useState<SessionInterest[]>([])
  const [sessionsWithFeedback, setSessionsWithFeedback] = useState<SessionWithFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedSession, setSelectedSession] = useState<SessionWithFeedback | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false)
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [conflictingSession, setConflictingSession] = useState<ConflictingSession | null>(null)
  const [pendingApproval, setPendingApproval] = useState<SessionInterest | null>(null)
  const [rescheduleSession, setRescheduleSession] = useState<SessionInterest | null>(null)
  const [newDate, setNewDate] = useState("")

  // Manual session form states
  const [manualMemberId, setManualMemberId] = useState("")
  const [manualTopic, setManualTopic] = useState("")
  const [manualType, setManualType] = useState("")
  const [manualDate, setManualDate] = useState("")
  const [manualDescription, setManualDescription] = useState("")
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)

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
      fetchMembers()
    }

    checkSession()
  }, [router, supabase])

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [statusMessage])

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

      if (memberData.role !== "Vice President" && memberData.role !== "President" && memberData.role !== "Administrator" && memberData.role !== "Session Incharge") {
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

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, name, email")
        .order("name", { ascending: true })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error("Failed to fetch members:", error)
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

          const average_rating =
            feedback.length > 0 ? feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length : 0

          sessionsWithFeedback.push({
            ...session,
            feedback,
            average_rating: Number(average_rating.toFixed(1)),
          })
        } else {
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

  const checkDateConflict = async (date: string): Promise<ConflictingSession | null> => {
    try {
      const { data, error } = await supabase
        .from("session_interests")
        .select("topic, member_name, preferred_date")
        .eq("is_approved", true)
        .eq("preferred_date", date)
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error
      
      if (data) {
        return {
          topic: data.topic,
          member_name: data.member_name,
          date: data.preferred_date
        }
      }
      
      return null
    } catch (error) {
      console.error("Error checking date conflict:", error)
      return null
    }
  }

  const handleApprove = async (interest: SessionInterest) => {
    setProcessingId(interest.id)

    // Check for date conflicts
    const conflict = await checkDateConflict(interest.preferred_date)
    
    if (conflict) {
      setConflictingSession(conflict)
      setPendingApproval(interest)
      setConflictDialogOpen(true)
      setProcessingId(null)
      return
    }

    // Proceed with approval
    await approveSession(interest)
  }

  const approveSession = async (interest: SessionInterest) => {
    try {
      const { error: updateError } = await supabase
        .from("session_interests")
        .update({ is_approved: true })
        .eq("id", interest.id)

      if (updateError) throw updateError

      const { error: createError } = await supabase.from("sessions").insert({
        title: interest.topic,
        date: interest.preferred_date,
        time: "01:00 PM",
        type: interest.type,
        handler: interest.member_name,
        handler_id: interest.member_id,
        description: interest.description,
        is_approved: true,
      })

      if (createError) throw createError

      setStatusMessage({
        type: "success",
        text: "Session approved! The session has been added to the schedule.",
      })

      fetchSessionInterests()
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to approve session" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReschedule = (interest: SessionInterest) => {
    setRescheduleSession(interest)
    setNewDate(interest.preferred_date)
    setRescheduleDialogOpen(true)
  }

  const submitReschedule = async () => {
    if (!rescheduleSession || !newDate) return

    setProcessingId(rescheduleSession.id)

    try {
      const { error } = await supabase
        .from("session_interests")
        .update({ preferred_date: newDate })
        .eq("id", rescheduleSession.id)

      if (error) throw error

      setStatusMessage({
        type: "success",
        text: "Session date updated successfully!",
      })

      fetchSessionInterests()
      setRescheduleDialogOpen(false)
      setRescheduleSession(null)
      setNewDate("")
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to update session date" })
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
      const { data: sessionInterest, error: fetchError } = await supabase
        .from("session_interests")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError) throw fetchError

      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id")
        .eq("title", sessionInterest.topic)
        .eq("handler", sessionInterest.member_name)
        .single()

      if (sessionData) {
        const { error: deleteFeedbackError } = await supabase
          .from("session_feedback")
          .delete()
          .eq("session_id", sessionData.id)

        if (deleteFeedbackError) throw deleteFeedbackError

        const { error: deleteSessionError } = await supabase.from("sessions").delete().eq("id", sessionData.id)

        if (deleteSessionError) throw deleteSessionError
      }

      const { error: deleteInterestError } = await supabase.from("session_interests").delete().eq("id", id)

      if (deleteInterestError) throw deleteInterestError

      setStatusMessage({
        type: "success",
        text: "Session deleted! The session has been removed from the schedule.",
      })

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

  const handleManualSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!manualMemberId || !manualTopic || !manualType || !manualDate) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required fields.",
      })
      return
    }

    setIsSubmittingManual(true)

    try {
      const selectedMember = members.find(m => m.id === manualMemberId)
      if (!selectedMember) throw new Error("Member not found")

      // Check for conflicts
      const conflict = await checkDateConflict(manualDate)
      if (conflict) {
        setStatusMessage({
          type: "error",
          text: `A session is already scheduled on ${manualDate} (${conflict.topic} by ${conflict.member_name})`,
        })
        setIsSubmittingManual(false)
        return
      }

      // Insert into session_interests
      const { data: interestData, error: interestError } = await supabase
        .from("session_interests")
        .insert({
          member_id: manualMemberId,
          member_name: selectedMember.name,
          topic: manualTopic,
          type: manualType,
          preferred_date: manualDate,
          description: manualDescription,
          is_approved: true,
        })
        .select()
        .single()

      if (interestError) throw interestError

      // Insert into sessions
      const { error: sessionError } = await supabase.from("sessions").insert({
        title: manualTopic,
        date: manualDate,
        time: "01:00 PM",
        type: manualType,
        handler: selectedMember.name,
        handler_id: parseInt(manualMemberId),
        description: manualDescription,
        is_approved: true,
      })

      if (sessionError) throw sessionError

      setStatusMessage({
        type: "success",
        text: "Session added successfully!",
      })

      // Reset form
      setManualMemberId("")
      setManualTopic("")
      setManualType("")
      setManualDate("")
      setManualDescription("")
      setAddSessionDialogOpen(false)
      fetchSessionInterests()
    } catch (error) {
      console.error("Error adding manual session:", error)
      setStatusMessage({
        type: "error",
        text: "Failed to add session. Please try again.",
      })
    } finally {
      setIsSubmittingManual(false)
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black">Admin Dashboard</h1>
          <Button
            onClick={() => setAddSessionDialogOpen(true)}
            className="bg-black hover:bg-gray-800 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Session Manually
          </Button>
        </div>

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
                          <div key={interest.id} className="border-2 border-black rounded-lg p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="space-y-3">
                              <div>
                                <h3 className="font-bold text-lg">{interest.topic}</h3>
                                <p className="text-sm text-gray-600">By {interest.member_name}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="font-semibold">Type:</span> {interest.type}
                                </div>
                                <div>
                                  <span className="font-semibold">Date:</span> {interest.preferred_date}
                                </div>
                              </div>
                              {interest.description && (
                                <p className="text-sm text-gray-700">{interest.description}</p>
                              )}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  onClick={() => handleApprove(interest)}
                                  disabled={processingId === interest.id}
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                                >
                                  {processingId === interest.id ? "Processing..." : "Approve"}
                                </Button>
                                <Button
                                  onClick={() => handleReschedule(interest)}
                                  disabled={processingId === interest.id}
                                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                                >
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Reschedule
                                </Button>
                                <Button
                                  onClick={() => handleReject(interest.id)}
                                  disabled={processingId === interest.id}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
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

        {/* Conflict Dialog */}
        <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Date Conflict Detected</DialogTitle>
            </DialogHeader>
            {conflictingSession && pendingApproval && (
              <div className="space-y-4">
                <Alert className="border-2 border-yellow-500 bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle>Session Already Scheduled</AlertTitle>
                  <AlertDescription>
                    A session is already scheduled on {conflictingSession.date}:
                    <div className="mt-2 font-semibold">
                      "{conflictingSession.topic}" by {conflictingSession.member_name}
                    </div>
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setConflictDialogOpen(false)
                      handleReschedule(pendingApproval)
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Reschedule This Session
                  </Button>
                  <Button
                    onClick={() => {
                      setConflictDialogOpen(false)
                      setPendingApproval(null)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reschedule Dialog */}
        <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Session</DialogTitle>
            </DialogHeader>
            {rescheduleSession && (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{rescheduleSession.topic}</p>
                  <p className="text-sm text-gray-600">By {rescheduleSession.member_name}</p>
                </div>
                <div>
                  <label htmlFor="newDate" className="block text-sm font-medium mb-1">
                    New Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="newDate"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="border-2 border-black"
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={submitReschedule}
                    disabled={!newDate || processingId === rescheduleSession.id}
                    className="flex-1 bg-black hover:bg-gray-800 text-white"
                  >
                    {processingId === rescheduleSession.id ? "Updating..." : "Update Date"}
                  </Button>
                  <Button
                    onClick={() => {
                      setRescheduleDialogOpen(false)
                      setRescheduleSession(null)
                      setNewDate("")
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Session Manually Dialog */}
        <Dialog open={addSessionDialogOpen} onOpenChange={setAddSessionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Session Manually</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label htmlFor="manualMember" className="block text-sm font-medium mb-1">
                  Handler <span className="text-red-500">*</span>
                </label>
                <Select value={manualMemberId} onValueChange={setManualMemberId}>
                  <SelectTrigger id="manualMember" className="border-2 border-black">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="manualTopic" className="block text-sm font-medium mb-1">
                  Topic <span className="text-red-500">*</span>
                </label>
                <Input
                  id="manualTopic"
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="border-2 border-black"
                />
              </div>

              <div>
                <label htmlFor="manualType" className="block text-sm font-medium mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <Select value={manualType} onValueChange={setManualType}>
                  <SelectTrigger id="manualType" className="border-2 border-black">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Soft Skills">Soft Skills</SelectItem>
                    <SelectItem value="Career">Career</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="manualDate" className="block text-sm font-medium mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  id="manualDate"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="border-2 border-black"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label htmlFor="manualDescription" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <Textarea
                  id="manualDescription"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="border-2 border-black min-h-[100px]"
                  placeholder="Provide details about the session..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleManualSessionSubmit}
                  disabled={isSubmittingManual}
                  className="flex-1 bg-black hover:bg-gray-800 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {isSubmittingManual ? "Adding..." : "Add Session"}
                </Button>
                <Button
                  onClick={() => {
                    setAddSessionDialogOpen(false)
                    setManualMemberId("")
                    setManualTopic("")
                    setManualType("")
                    setManualDate("")
                    setManualDescription("")
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
        <div className="mt-12 text-center text-gray-500 text-xs hidden md:block">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </main>
    </div>
  )
}
