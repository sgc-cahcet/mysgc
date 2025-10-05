"use client"

import { Star } from "lucide-react"
import type { Feedback } from "@/lib/session-types"

interface FeedbackDisplayProps {
  feedback: Feedback[]
  averageRating: number
}

export function FeedbackDisplay({ feedback, averageRating }: FeedbackDisplayProps) {
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

  if (feedback.length === 0) {
    return <div className="text-center py-8 text-gray-500">No feedback received yet</div>
  }

  return (
    <div className="space-y-6">
      <div className="text-center p-4 border-2 border-black rounded-lg">
        <div className="text-lg font-bold mb-2">Average Rating</div>
        {renderStars(averageRating)}
      </div>

      <div className="space-y-4">
        {feedback.map((item) => (
          <div key={item.id} className="p-4 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{item.member_name}</span>
              {renderStars(item.rating)}
            </div>
            <p className="text-sm text-gray-600">{item.comment || "No comment provided"}</p>
            <div className="text-xs text-gray-400 mt-2">{new Date(item.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
