"use client"

import type React from "react"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

interface SessionInterestFormProps {
  memberId: string | undefined
}

export function SessionInterestForm({ memberId }: SessionInterestFormProps) {
  const [topic, setTopic] = useState("")
  const [type, setType] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Change the isAfter1PMIST function to check for 12:30 PM instead of 1 PM
  const isAfter1PMIST = () => {
    const now = new Date()
    // Convert to IST (UTC+5:30)
    const istHours = now.getUTCHours() + 5
    const istMinutes = now.getUTCMinutes() + 30

    // Adjust for overflow
    const adjustedHours = istHours + Math.floor(istMinutes / 60)
    const adjustedMinutes = istMinutes % 60

    // Check if time is after 12:30 PM (12:30)
    return adjustedHours > 12 || (adjustedHours === 12 && adjustedMinutes >= 30)
  }

  // Update the handleSubmit function to include the time validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!memberId) {
      setStatusMessage({
        type: "error",
        text: "Member ID is missing. Please log in again.",
      })
      return
    }

    if (!topic || !type || !preferredDate) {
      setStatusMessage({
        type: "error",
        text: "Please fill in all required fields.",
      })
      return
    }

    // Check if selected date is today
    const today = new Date().toISOString().split("T")[0]
    const isToday = preferredDate === today

    // Update the error message in handleSubmit function
    if (isToday && isAfter1PMIST()) {
      setStatusMessage({
        type: "error",
        text: "Cannot book a session for today after 12:30 PM IST. Please select a future date.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Get member name
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("name")
        .eq("id", memberId)
        .single()

      if (memberError) {
        throw memberError
      }

      // Insert session interest
      const { error: insertError } = await supabase.from("session_interests").insert({
        member_id: memberId,
        member_name: memberData.name,
        topic,
        type,
        preferred_date: preferredDate,
        description,
      })

      if (insertError) {
        throw insertError
      }

      setStatusMessage({
        type: "success",
        text: "Your session interest has been submitted successfully! We'll review it and get back to you.",
      })

      // Reset form
      setTopic("")
      setType("")
      setPreferredDate("")
      setDescription("")
    } catch (error) {
      console.error("Error submitting session interest:", error)
      setStatusMessage({
        type: "error",
        text: "Failed to submit session interest. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader>
        <CardTitle>Request a Session</CardTitle>
      </CardHeader>
      <CardContent>
        {statusMessage && (
          <Alert
            className={`mb-4 border-2 ${
              statusMessage.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>{statusMessage.type === "success" ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{statusMessage.text}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium mb-1">
              Topic <span className="text-red-500">*</span>
            </label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-2 border-black"
              required
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger id="type" className="border-2 border-black">
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
            <label htmlFor="preferredDate" className="block text-sm font-medium mb-1">
              Preferred Date <span className="text-red-500">*</span>
            </label>
            <Input
              id="preferredDate"
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="border-2 border-black"
              min={new Date().toISOString().split("T")[0]}
              required
            />
            {/* Update the note text below the date input */}
            <p className="text-xs text-gray-500 mt-1">Note: Same-day bookings are only allowed before 12:30 PM IST.</p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-2 border-black min-h-[100px]"
              placeholder="Provide more details about the session you're requesting..."
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
