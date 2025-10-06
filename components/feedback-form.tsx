"use client"

import React, { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Star, CheckCircle, AlertCircle, Info, Clock, UserCheck } from "lucide-react"

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

interface FeedbackFormProps {
  memberId: string | undefined
  todaySessions: Session[]
}

export function FeedbackForm({ memberId, todaySessions }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info" | "warning"; text: string } | null>(null)
  const [alreadySubmittedSessions, setAlreadySubmittedSessions] = useState<string[]>([])
  const [isHandler, setIsHandler] = useState(false)
  const [handledSessions, setHandledSessions] = useState<Session[]>([])
  const [isFeedbackTimeValid, setIsFeedbackTimeValid] = useState(false)
  const [currentTimeStatus, setCurrentTimeStatus] = useState<"before" | "during" | "after">("before")
  
  const supabase = createClientComponentClient()

  // Get current IST time
  const getISTTime = () => {
    const now = new Date()
    const utcHours = now.getUTCHours()
    const utcMinutes = now.getUTCMinutes()
    
    // Convert to IST (UTC+5:30)
    let istHours = utcHours + 5
    let istMinutes = utcMinutes + 30
    
    // Handle minute overflow
    if (istMinutes >= 60) {
      istHours += 1
      istMinutes -= 60
    }
    
    // Handle hour overflow
    istHours = istHours % 24
    
    return { hours: istHours, minutes: istMinutes }
  }

  // Check if current time is in feedback window (1:30 PM - 11:59 PM IST)
  const checkFeedbackTimeWindow = () => {
    const { hours, minutes } = getISTTime()
    const currentTimeInMinutes = hours * 60 + minutes
    const startTime = 13 * 60 + 30 // 1:30 PM
    const endTime = 23 * 60 + 59 // 11:59 PM
    
    if (currentTimeInMinutes < startTime) {
      setCurrentTimeStatus("before")
      return false
    } else if (currentTimeInMinutes <= endTime) {
      setCurrentTimeStatus("during")
      return true
    } else {
      setCurrentTimeStatus("after")
      return false
    }
  }

  // Get today's date in YYYY-MM-DD format (IST)
  const getTodayIST = () => {
    const now = new Date()
    // Create IST date by adding 5 hours 30 minutes to UTC
    const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    return istDate.toISOString().split("T")[0]
  }

  // Check if member is handling any of today's sessions
  useEffect(() => {
    if (memberId && todaySessions.length > 0) {
      const memberIdNum = parseInt(memberId)
      const sessionsHandledByMember = todaySessions.filter(
        session => session.handler_id === memberIdNum
      )
      
      if (sessionsHandledByMember.length > 0) {
        setIsHandler(true)
        setHandledSessions(sessionsHandledByMember)
      }
    }
  }, [memberId, todaySessions])

  // Check feedback time window
  useEffect(() => {
    const checkTime = () => {
      const isValid = checkFeedbackTimeWindow()
      setIsFeedbackTimeValid(isValid)
    }
    
    checkTime()
    const interval = setInterval(checkTime, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [])

  // Check for existing feedback
  useEffect(() => {
    if (memberId && todaySessions.length > 0 && isFeedbackTimeValid) {
      checkExistingFeedback()
    }
  }, [memberId, todaySessions, isFeedbackTimeValid])

  const checkExistingFeedback = async () => {
    if (!memberId) return

    try {
      const today = getTodayIST()
      const sessionIds = todaySessions.map(s => s.id)

      const { data, error } = await supabase
        .from("session_feedback")
        .select("session_id")
        .eq("member_id", memberId)
        .eq("date", today)
        .in("session_id", sessionIds)

      if (error) throw error

      if (data && data.length > 0) {
        const submittedSessionIds = data.map((item) => item.session_id)
        setAlreadySubmittedSessions(submittedSessionIds)
      }
    } catch (error) {
      console.error("Error checking existing feedback:", error)
    }
  }

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setRating(0)
    setComment("")
    setStatusMessage(null)

    if (alreadySubmittedSessions.includes(sessionId)) {
      setStatusMessage({
        type: "info",
        text: "You have already submitted feedback for this session.",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!memberId) {
      setStatusMessage({
        type: "error",
        text: "Member ID is missing. Please log in again.",
      })
      return
    }

    if (!selectedSessionId) {
      setStatusMessage({
        type: "error",
        text: "Please select a session",
      })
      return
    }

    if (rating === 0) {
      setStatusMessage({
        type: "error",
        text: "Please provide a rating",
      })
      return
    }

    if (alreadySubmittedSessions.includes(selectedSessionId)) {
      setStatusMessage({
        type: "info",
        text: "You have already submitted feedback for this session.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const today = getTodayIST()

      const { error: insertError } = await supabase.from("session_feedback").insert({
        session_id: selectedSessionId,
        member_id: memberId,
        date: today,
        rating: rating,
        comments: comment || null,
      })

      if (insertError) throw insertError

      setStatusMessage({
        type: "success",
        text: "Your feedback has been submitted successfully. Thank you!",
      })

      setAlreadySubmittedSessions([...alreadySubmittedSessions, selectedSessionId])
      setIsSubmitted(true)

      // Reset form
      setRating(0)
      setComment("")
      setSelectedSessionId("")

      // Re-check for remaining sessions after a short delay
      setTimeout(() => {
        checkExistingFeedback()
      }, 1000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      setStatusMessage({
        type: "error",
        text: "Failed to submit feedback. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter sessions: exclude those handled by the member AND those with submitted feedback
  const availableSessions = todaySessions.filter(
    session => 
      !alreadySubmittedSessions.includes(session.id) && 
      session.handler_id !== parseInt(memberId || "0")
  )

  // If member is handling all of today's sessions
  if (isHandler && handledSessions.length === todaySessions.length) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-purple-500 bg-purple-50">
            <UserCheck className="h-4 w-4 text-purple-600" />
            <AlertTitle>You're Today's Session Handler!</AlertTitle>
            <AlertDescription>
              You are handling today's session{handledSessions.length > 1 ? "s" : ""}: 
              <strong> {handledSessions.map(s => s.title).join(", ")}</strong>.
              As a session handler, you don't need to submit feedback. 
              You can check feedback from participants in the Session History page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // If member is handling some sessions but not all
  if (isHandler && handledSessions.length > 0 && availableSessions.length === 0 && todaySessions.length > handledSessions.length) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-blue-500 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>All Feedback Submitted!</AlertTitle>
            <AlertDescription>
              You have submitted feedback for all sessions you attended today. 
              (You are handling: <strong>{handledSessions.map(s => s.title).join(", ")}</strong>)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Time window checks
  if (!isFeedbackTimeValid) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-orange-500 bg-orange-50">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertTitle>
              {currentTimeStatus === "before" ? "Feedback Opens Soon" : "Feedback Window Closed"}
            </AlertTitle>
            <AlertDescription>
              {currentTimeStatus === "before" 
                ? "Feedback submission will open at 1:30 PM IST today. Please check back after 1:30 PM to share your thoughts about today's sessions."
                : "The feedback window (1:30 PM - 11:59 PM IST) has closed for today. Feedback can only be submitted during the designated time period."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // No sessions available for feedback
  if (todaySessions.length === 0) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-gray-500 bg-gray-50">
            <Info className="h-4 w-4 text-gray-600" />
            <AlertTitle>No Sessions Today</AlertTitle>
            <AlertDescription>
              There are no sessions scheduled for today. Check back tomorrow!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // All available sessions have feedback submitted
  if (availableSessions.length === 0 && todaySessions.length > 0) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>All Done!</AlertTitle>
            <AlertDescription>
              You have submitted feedback for all sessions you attended today. Thank you for your valuable input!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Render feedback form
  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle>Session Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        {statusMessage && (
          <Alert
            className={`mb-4 border-2 ${
              statusMessage.type === "success"
                ? "border-green-500 bg-green-50"
                : statusMessage.type === "error"
                  ? "border-red-500 bg-red-50"
                  : statusMessage.type === "warning"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-blue-500 bg-blue-50"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : statusMessage.type === "warning" ? (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            ) : (
              <Info className="h-4 w-4 text-blue-600" />
            )}
            <AlertTitle>
              {statusMessage.type === "success" 
                ? "Success" 
                : statusMessage.type === "error" 
                  ? "Error" 
                  : statusMessage.type === "warning"
                    ? "Warning"
                    : "Information"}
            </AlertTitle>
            <AlertDescription>{statusMessage.text}</AlertDescription>
          </Alert>
        )}

        {isHandler && handledSessions.length > 0 && (
          <Alert className="mb-4 border-2 border-purple-500 bg-purple-50">
            <Info className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              Note: You are handling <strong>{handledSessions.map(s => s.title).join(", ")}</strong> today, 
              so it won't appear in the feedback form.
            </AlertDescription>
          </Alert>
        )}

        {isSubmitted ? (
          <div className="text-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-4">Your feedback has been submitted successfully.</p>
            {availableSessions.length > 0 && (
              <Button
                onClick={() => {
                  setIsSubmitted(false)
                  setStatusMessage(null)
                }}
                className="bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
              >
                Submit Feedback for Another Session
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="session" className="block text-sm font-medium mb-2">
                Select Session <span className="text-red-500">*</span>
              </label>
              <Select value={selectedSessionId} onValueChange={handleSessionChange}>
                <SelectTrigger id="session" className="border-2 border-black">
                  <SelectValue placeholder="Choose a session to provide feedback" />
                </SelectTrigger>
                <SelectContent>
                  {todaySessions.map((session) => {
                    const isHandled = session.handler_id === parseInt(memberId || "0")
                    const isSubmitted = alreadySubmittedSessions.includes(session.id)
                    const isDisabled = isHandled || isSubmitted
                    
                    return (
                      <SelectItem
                        key={session.id}
                        value={session.id}
                        disabled={isDisabled}
                      >
                        {session.title} - {session.handler} ({session.time})
                        {isHandled && " (You're handling this)"}
                        {isSubmitted && " (Feedback submitted)"}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Rate this session <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                    disabled={!selectedSessionId || alreadySubmittedSessions.includes(selectedSessionId)}
                  >
                    <Star
                      size={36}
                      className={`${
                        star <= (hoveredRating || rating) 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-gray-300"
                      } transition-colors ${
                        !selectedSessionId || alreadySubmittedSessions.includes(selectedSessionId) 
                          ? "opacity-50 cursor-not-allowed" 
                          : "cursor-pointer"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {rating > 0 && `You rated: ${rating} star${rating > 1 ? "s" : ""}`}
              </p>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium mb-2">
                Comments (Optional)
              </label>
              <Textarea
                id="comment"
                placeholder="Share your thoughts about the session... What did you like? What could be improved?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border-2 border-black min-h-[120px]"
                disabled={!selectedSessionId || alreadySubmittedSessions.includes(selectedSessionId)}
              />
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                rating === 0 ||
                !selectedSessionId ||
                alreadySubmittedSessions.includes(selectedSessionId)
              }
              className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
