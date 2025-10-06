"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Calendar, ChevronLeft, ChevronRight } from "lucide-react"

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
  const [bookedDates, setBookedDates] = useState<Set<string>>(new Set())
  const [isLoadingDates, setIsLoadingDates] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBookedDates()
  }, [])

  const fetchBookedDates = async () => {
    setIsLoadingDates(true)
    try {
      const { data, error } = await supabase
        .from("session_interests")
        .select("preferred_date")
        .eq("is_approved", true)

      if (error) throw error

      const dates = new Set(data?.map((item) => item.preferred_date) || [])
      setBookedDates(dates)
    } catch (error) {
      console.error("Error fetching booked dates:", error)
    } finally {
      setIsLoadingDates(false)
    }
  }

  const isAfter1PMIST = () => {
    const now = new Date()
    const istHours = now.getUTCHours() + 5
    const istMinutes = now.getUTCMinutes() + 30

    const adjustedHours = istHours + Math.floor(istMinutes / 60)
    const adjustedMinutes = istMinutes % 60

    return adjustedHours > 12 || (adjustedHours === 12 && adjustedMinutes >= 30)
  }

  const isDateAvailable = (date: Date) => {
    const dateString = formatDate(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if date is in the past
    if (date < today) return false

    // Check if it's Sunday (0 = Sunday)
    if (date.getDay() === 0) return false

    // Check if it's today and after 12:30 PM IST
    if (dateString === formatDate(today) && isAfter1PMIST()) return false

    // Check if date is booked
    return !bookedDates.has(dateString)
  }

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty slots for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateSelect = (date: Date) => {
    if (isDateAvailable(date)) {
      setPreferredDate(formatDate(date))
      setShowCalendar(false)
      setStatusMessage(null)
    } else {
      setStatusMessage({
        type: "error",
        text: bookedDates.has(formatDate(date))
          ? "This date is already booked. Please select another date."
          : "This date is not available for booking.",
      })
    }
  }

  const handleSubmit = async () => {
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

    setIsSubmitting(true)

    try {
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("name")
        .eq("id", memberId)
        .single()

      if (memberError) {
        throw memberError
      }

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

      setTopic("")
      setType("")
      setPreferredDate("")
      setDescription("")
      
      fetchBookedDates()
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

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const days = getDaysInMonth(currentMonth)
  const today = new Date()
  const currentMonthIndex = today.getMonth()
  const currentYear = today.getFullYear()
  const isPastMonth = currentMonth.getFullYear() < currentYear || 
    (currentMonth.getFullYear() === currentYear && currentMonth.getMonth() < currentMonthIndex)

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

        <div className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium mb-1">
              Topic <span className="text-red-500">*</span>
            </label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border-2 border-black"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <Select value={type} onValueChange={setType}>
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
            <label className="block text-sm font-medium mb-2">
              Select Available Date <span className="text-red-500">*</span>
            </label>
            
            <Button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              variant="outline"
              className="w-full justify-start text-left font-normal border-2 border-black text-sm h-10"
              disabled={isLoadingDates}
            >
              <Calendar className="mr-2 h-4 w-4" />
              {preferredDate ? (() => {
                const [year, month, day] = preferredDate.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              })() : <span className="text-gray-500">Choose a date</span>}
            </Button>

            {showCalendar && (
              <div className="border-2 border-black rounded-lg p-3 bg-white shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    type="button"
                    onClick={handlePreviousMonth}
                    variant="outline"
                    size="sm"
                    disabled={isPastMonth}
                    className="border border-black h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <h3 className="font-bold text-sm">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <Button
                    type="button"
                    onClick={handleNextMonth}
                    variant="outline"
                    size="sm"
                    className="border border-black h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center text-[10px] font-semibold text-gray-600 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {isLoadingDates ? (
                  <div className="text-center py-6 text-gray-500 text-xs">Loading...</div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="aspect-square" />
                      }

                      const isAvailable = isDateAvailable(day)
                      const isSelected = preferredDate === formatDate(day)
                      const isToday = formatDate(day) === formatDate(new Date())
                      const isSunday = day.getDay() === 0

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDateSelect(day)}
                          disabled={!isAvailable}
                          className={`
                            aspect-square text-xs rounded border transition-all
                            ${isSelected 
                              ? "bg-black text-white border-black font-bold" 
                              : isAvailable
                                ? "bg-green-50 border-green-400 hover:bg-green-100 active:scale-95"
                                : isSunday
                                  ? "bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                                  : "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                            }
                            ${isToday && isAvailable ? "ring-1 ring-blue-400" : ""}
                          `}
                        >
                          <div className="flex items-center justify-center h-full">
                            {day.getDate()}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-50 border border-green-400 rounded"></div>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                      <span>Sunday</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                      <span>Booked</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-1">
              Sundays are not available. Same-day bookings allowed before 12:30 PM IST.
            </p>
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
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingDates || !preferredDate}
            className="w-full bg-black hover:bg-gray-800 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
