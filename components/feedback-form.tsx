"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Star } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Info } from "lucide-react"

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
  // Add these functions at the beginning of the component
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

  const isBefore11_59PMIST = () => {
    const now = new Date()
    // Convert to IST (UTC+5:30)
    const istHours = now.getUTCHours() + 5
    const istMinutes = now.getUTCMinutes() + 30

    // Adjust for overflow
    const adjustedHours = (istHours + Math.floor(istMinutes / 60)) % 24

    // Check if time is before 11:59 PM (23:59)
    return adjustedHours < 23 || (adjustedHours === 23 && istMinutes % 60 < 59)
  }

  const isFeedbackTimeValid = () => {
    return isAfter1PMIST() && isBefore11_59PMIST()
  }

  // Add a state to track if feedback is allowed based on time
  const [isFeedbackAllowed, setIsFeedbackAllowed] = useState(false)
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [alreadySubmittedSessions, setAlreadySubmittedSessions] = useState<string[]>([])
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Check if current time is between 1 PM and 11:59 PM IST
    setIsFeedbackAllowed(isFeedbackTimeValid())

    // Set up an interval to check every minute
    const interval = setInterval(() => {
      setIsFeedbackAllowed(isFeedbackTimeValid())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (memberId && todaySessions.length > 0) {
      checkExistingFeedback()
    }
  }, [memberId, todaySessions])

  const checkExistingFeedback = async () => {
    if (!memberId) return

    try {
      const today = new Date().toISOString().split("T")[0]

      // Check if user has already submitted feedback for any of today's sessions
      const { data, error } = await supabase
        .from("session_feedback")
        .select("session_id")
        .eq("member_id", memberId)
        .eq("date", today)

      if (error) throw error

      if (data && data.length > 0) {
        const submittedSessionIds = data.map((item) => item.session_id)
        setAlreadySubmittedSessions(submittedSessionIds)

        // If all sessions have feedback, show info message
        if (submittedSessionIds.length === todaySessions.length) {
          setStatusMessage({
            type: "info",
            text: "You have already submitted feedback for all of today's sessions. Thank you!",
          })
        }
      }
    } catch (error) {
      console.error("Error checking existing feedback:", error)
    }
  }

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId)

    // Check if feedback already submitted for this session
    if (alreadySubmittedSessions.includes(sessionId)) {
      setStatusMessage({
        type: "info",
        text: "You have already submitted feedback for this session.",
      })
    } else {
      setStatusMessage(null)
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
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0]

      // Insert feedback
      const { error: insertError } = await supabase.from("session_feedback").insert({
        session_id: selectedSessionId,
        member_id: memberId,
        date: today,
        rating: rating,
        comments: comment,
      })

      if (insertError) {
        throw insertError
      }

      setStatusMessage({
        type: "success",
        text: "Your feedback has been submitted. Thank you!",
      })

      // Add to already submitted sessions
      setAlreadySubmittedSessions([...alreadySubmittedSessions, selectedSessionId])
      setIsSubmitted(true)

      // Reset form
      setRating(0)
      setComment("")
      setSelectedSessionId("")
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

  // Filter out sessions that already have feedback
  const availableSessions = todaySessions.filter((session) => !alreadySubmittedSessions.includes(session.id))

  // Update the conditional rendering at the beginning of the return statement
  if (!isFeedbackAllowed) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-blue-500 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>Feedback Unavailable</AlertTitle>
            <AlertDescription>
              Feedback submission is only available between 1:30 PM and 11:59 PM IST for today's sessions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (todaySessions.length > 0 && availableSessions.length === 0) {
    return (
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader>
          <CardTitle>Session Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-2 border-blue-500 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle>All Done!</AlertTitle>
            <AlertDescription>
              You have already submitted feedback for all of today's sessions. Thank you for your input!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

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
                  : "border-blue-500 bg-blue-50"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : statusMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Info className="h-4 w-4 text-blue-600" />
            )}
            <AlertTitle>
              {statusMessage.type === "success" ? "Success" : statusMessage.type === "error" ? "Error" : "Information"}
            </AlertTitle>
            <AlertDescription>{statusMessage.text}</AlertDescription>
          </Alert>
        )}

        {isSubmitted ? (
          <div className="text-center py-6">
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p className="text-gray-600">Your feedback has been submitted successfully.</p>
            {availableSessions.length > 0 && (
              <Button
                onClick={() => setIsSubmitted(false)}
                className="mt-4 bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
              >
                Submit Feedback for Another Session
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="session" className="block text-sm font-medium mb-1">
                Select Session <span className="text-red-500">*</span>
              </label>
              <Select value={selectedSessionId} onValueChange={handleSessionChange}>
                <SelectTrigger id="session" className="border-2 border-black">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {todaySessions.map((session) => (
                    <SelectItem
                      key={session.id}
                      value={session.id}
                      disabled={alreadySubmittedSessions.includes(session.id)}
                    >
                      {session.title} - {session.handler}
                      {alreadySubmittedSessions.includes(session.id) ? " (Feedback submitted)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
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
                    className="focus:outline-none"
                    disabled={alreadySubmittedSessions.includes(selectedSessionId)}
                  >
                    <Star
                      size={32}
                      className={`${
                        star <= (hoveredRating || rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                      } transition-colors ${alreadySubmittedSessions.includes(selectedSessionId) ? "opacity-50" : ""}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="comment" className="block text-sm font-medium mb-1">
                Comments (Optional)
              </label>
              <Textarea
                id="comment"
                placeholder="Share your thoughts about the session..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="border-2 border-black min-h-[100px]"
                disabled={alreadySubmittedSessions.includes(selectedSessionId)}
              />
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting ||
                rating === 0 ||
                !selectedSessionId ||
                alreadySubmittedSessions.includes(selectedSessionId)
              }
              className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
