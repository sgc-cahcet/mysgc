"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface Session {
  id: string
  title: string
  date: string
  time: string
  type: string
  handler: string
  description: string
}

export function SessionsCard() {
  const [todaySessions, setTodaySessions] = useState<Session[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState("")
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Function to get current date in IST and format as YYYY-MM-DD
  const getTodayDateIST = () => {
    // Create date object for current time
    const now = new Date()
    
    // Convert to IST (UTC+5:30)
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    
    // Format as YYYY-MM-DD
    return istTime.toISOString().split("T")[0]
  }

  useEffect(() => {
    // Set initial date
    const todayIST = getTodayDateIST()
    setCurrentDate(todayIST)
    
    // Fetch sessions initially
    fetchSessions(todayIST)
    
    // Set up timer to check for date changes
    const timer = setInterval(() => {
      const newDate = getTodayDateIST()
      
      // If date has changed, update and refetch
      if (newDate !== currentDate) {
        setCurrentDate(newDate)
        fetchSessions(newDate)
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(timer)
  }, [currentDate])

  const fetchSessions = async (todayStr: string) => {
    try {
      setLoading(true)
      
      // Fetch today's sessions
      const { data: todayData, error: todayError } = await supabase
        .from("sessions")
        .select("*")
        .eq("date", todayStr)
        .eq("is_approved", true)
        .order("time")

      if (todayError) throw todayError

      // Fetch upcoming sessions
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("sessions")
        .select("*")
        .gt("date", todayStr)
        .eq("is_approved", true)
        .order("date")
        .order("time")
        .limit(5)

      if (upcomingError) throw upcomingError

      setTodaySessions(todayData || [])
      setUpcomingSessions(upcomingData || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch sessions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  // Function to format time for display
  const formatTime = (timeStr: string) => {
    try {
      // If it's already in a nice format, just return it
      if (/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/i.test(timeStr)) {
        return timeStr
      }
      
      // If it's in 24-hour format (HH:MM), convert to 12-hour
      const [hours, minutes] = timeStr.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const hours12 = hours % 12 || 12
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
    } catch (e) {
      // If any error in parsing, return original
      return timeStr
    }
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <CardHeader className="pb-2">
        <CardTitle>Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="today">Today's Session</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="h-80">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : todaySessions.length > 0 ? (
              <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
                {todaySessions.map((session) => (
                  <div
                    key={session.id}
                    className="border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">{session.title}</h3>
                      <span className="px-2 py-1 bg-black text-white text-xs rounded-md">{session.type}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div>Time: {formatTime(session.time)}</div>
                      <div>Handler: {session.handler}</div>
                    </div>
                    {session.description && <p className="mt-2 text-sm">{session.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No sessions scheduled for today</div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="h-80">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-4 overflow-y-auto max-h-80 pr-2">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold">{session.title}</h3>
                        <p className="text-sm text-gray-600">{formatDate(session.date)}</p>
                      </div>
                      <span className="px-2 py-1 bg-black text-white text-xs rounded-md">{session.type}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div>Time: {formatTime(session.time)}</div>
                      <div>Handler: {session.handler}</div>
                    </div>
                    {session.description && <p className="mt-2 text-sm">{session.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No upcoming sessions scheduled</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}