"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, Calendar, CheckCircle2, XCircle, TrendingUp, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface AttendanceCardProps {
  memberId: string
}

export function AttendanceCard({ memberId }: AttendanceCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [allAttendanceData, setAllAttendanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (memberId) {
      fetchAttendanceData()
    }
  }, [memberId])

  const fetchAttendanceData = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          members (name, department, role)
        `)

      if (error) {
        console.error("Error fetching attendance:", error)
        return
      }

      setAllAttendanceData(data || [])
    } catch (error) {
      console.error("Error in fetchAttendanceData:", error)
    } finally {
      setLoading(false)
    }
  }

  const monthlyData = useMemo(() => {
    if (allAttendanceData.length === 0 || !memberId) return []

    const monthsWithRecords = new Set<string>()
    
    allAttendanceData.forEach(record => {
      const date = new Date(record.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthsWithRecords.add(monthKey)
    })
    
    return Array.from(monthsWithRecords)
      .map(monthKey => {
        const [year, month] = monthKey.split('-').map(Number)
        
        const monthlyRecords = allAttendanceData.filter(record => {
          const recordDate = new Date(record.date)
          return recordDate.getFullYear() === year && 
                 recordDate.getMonth() === month - 1
        })
        
        const workingDaysInMonth = Array.from(new Set(monthlyRecords.map(record => record.date))).sort()
        const totalWorkingDays = workingDaysInMonth.length
        
        const presentDates = new Set(
          monthlyRecords
            .filter(record => record.member_id === memberId && record.is_present)
            .map(record => record.date)
        )
        
        const presentDays = presentDates.size
        const absentDates = workingDaysInMonth.filter(date => !presentDates.has(date))
        const percentage = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December']
        const displayMonth = `${monthNames[month - 1]} ${year}`
        
        return {
          monthKey,
          displayMonth,
          percentage,
          absentDates,
          totalWorkingDays,
          presentDays
        }
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [allAttendanceData, memberId])
  
  useMemo(() => {
    if (monthlyData.length > 0 && !selectedMonth) {
      setSelectedMonth(monthlyData[0].monthKey)
    }
  }, [monthlyData, selectedMonth])
  
  const currentMonthData = monthlyData.find(m => m.monthKey === selectedMonth) || 
    { displayMonth: "No Data", percentage: 0, absentDates: [], totalWorkingDays: 0, presentDays: 0 }
  
  const { percentage, absentDates, displayMonth, totalWorkingDays, presentDays } = currentMonthData
  
  const sortedDates = [...absentDates].sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  )
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  
  const recentAbsentDates = sortedDates.slice(0, 3)
  const additionalDates = absentDates.length - recentAbsentDates.length

  const handleMonthSelect = (monthKey: string) => {
    setSelectedMonth(monthKey)
    setIsDropdownOpen(false)
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex items-center justify-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-black"></div>
            <Clock className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-black" />
          </div>
        </div>
      </div>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <div className="bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <h2 className="text-2xl font-black mb-6">Attendance</h2>
        <div className="text-center py-16">
          <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center border-2 border-black">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-lg font-bold text-gray-600">No Records Found</p>
          <p className="text-sm text-gray-500 mt-2">Your attendance data will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
      {/* Header */}
      <div className="bg-black text-white p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black tracking-tight">Attendance</h2>
          
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg border-2 border-white hover:bg-gray-100 transition-all font-bold text-sm shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]"
            >
              <Calendar className="w-4 h-4" />
              <span>{displayMonth}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 max-h-64 overflow-y-auto">
                  {monthlyData.map((data) => (
                    <button
                      key={data.monthKey}
                      onClick={() => handleMonthSelect(data.monthKey)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition-colors text-sm font-bold border-b border-gray-200 last:border-b-0 ${
                        data.monthKey === selectedMonth ? 'bg-yellow-100 text-black' : 'text-gray-700'
                      }`}
                    >
                      {data.displayMonth}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white text-black rounded-lg p-3 border-2 border-white">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Days</span>
            </div>
            <div className="text-3xl font-black">{totalWorkingDays}</div>
          </div>
          
          <div className="bg-green-400 text-black rounded-lg p-3 border-2 border-green-500">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Present</span>
            </div>
            <div className="text-3xl font-black">{presentDays}</div>
          </div>
          
          <div className="bg-red-400 text-black rounded-lg p-3 border-2 border-red-500">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Absent</span>
            </div>
            <div className="text-3xl font-black">{absentDates.length}</div>
          </div>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-6">
        {/* Circular Progress */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative h-44 w-44">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={percentage >= 75 ? "#4ade80" : "#ef4444"}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * percentage) / 100}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <TrendingUp className={`w-7 h-7 mb-1 ${percentage >= 75 ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-4xl font-black text-gray-900">{percentage.toFixed(0)}%</span>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Attendance</span>
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="text-center mb-6">
          <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
            percentage < 75 
              ? 'bg-red-400 text-black border-black' 
              : 'bg-green-400 text-black border-black'
          }`}>
            {percentage >= 75 ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                GOOD STANDING
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                BELOW 75%
              </>
            )}
          </span>
        </div>

        {/* Absent Dates Section */}
        {absentDates.length > 0 ? (
          <div>
            <h4 className="text-lg font-black mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-red-500 rounded-full"></div>
              Recent Absences
            </h4>
            <div className="space-y-2">
              {recentAbsentDates.map((date, index) => (
                <div 
                  key={index} 
                  className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 text-center hover:border-black transition-all"
                >
                  <span className="text-sm font-bold text-gray-700">{formatDate(date)}</span>
                </div>
              ))}
              
              {additionalDates > 0 && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-lg p-3 text-center hover:border-blue-500 transition-all"
                >
                  <span className="text-sm font-black">+ {additionalDates} more absent</span>
                </button>
              )}
            </div>
            
            {percentage < 75 && (
              <div className="mt-4 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-sm text-red-900 mb-1">Attendance Alert</p>
                    <p className="text-xs font-medium text-red-700">Your attendance is below 75%. Please attend regularly to maintain good standing.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
            <p className="text-lg font-black text-green-900">Perfect Attendance!</p>
            <p className="text-xs font-medium text-green-700 mt-1">No missed days this month</p>
          </div>
        )}
      </div>
      
      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">All Absent Dates - {displayMonth}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 max-h-96 overflow-y-auto p-2">
            {sortedDates.map((date, index) => (
              <div 
                key={index} 
                className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 text-center hover:border-black transition-all"
              >
                <span className="text-sm font-bold text-gray-700">{formatDate(date)}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
