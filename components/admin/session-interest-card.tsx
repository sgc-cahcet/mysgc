"use client"
import { Button } from "@/components/ui/button"
import type { SessionInterest } from "@/lib/session-types"

interface SessionInterestCardProps {
  interest: SessionInterest
  processingId: string | null
  onApprove: (interest: SessionInterest) => Promise<void>
  onReject: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onViewFeedback: (interest: SessionInterest) => void
  feedbackCount: number
}

export function SessionInterestCard({
  interest,
  processingId,
  onApprove,
  onReject,
  onDelete,
  onViewFeedback,
  feedbackCount,
}: SessionInterestCardProps) {
  return (
    <div className="border-2 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{interest.topic}</h3>
          <p className="text-sm text-gray-600">By: {interest.member_name}</p>
        </div>
        <span
          className={`px-2 py-1 ${interest.is_approved ? "bg-green-600" : "bg-black"} text-white text-xs rounded-md`}
        >
          {interest.is_approved ? "Approved" : interest.type}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-600">
        <div>
          {interest.is_approved ? "Date: " : "Preferred Date: "}
          {new Date(interest.preferred_date).toLocaleDateString()}
        </div>
        {!interest.is_approved && <div>Requested: {new Date(interest.created_at).toLocaleDateString()}</div>}
        {interest.is_approved && <div>Type: {interest.type}</div>}
      </div>
      <p className="mt-2 text-sm">{interest.description}</p>

      <div className="mt-4 flex gap-2">
        {!interest.is_approved ? (
          <>
            <Button
              onClick={() => onApprove(interest)}
              disabled={processingId === interest.id}
              className="w-1/2 bg-green-600 hover:bg-green-700 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              {processingId === interest.id ? "Processing..." : "Approve"}
            </Button>
            <Button
              onClick={() => onReject(interest.id)}
              disabled={processingId === interest.id}
              variant="outline"
              className="w-1/2 bg-white hover:bg-red-100 text-red-600 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              {processingId === interest.id ? "Processing..." : "Reject"}
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => onViewFeedback(interest)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              View Feedback ({feedbackCount})
            </Button>
            <Button
              onClick={() => onDelete(interest.id)}
              disabled={processingId === interest.id}
              variant="outline"
              className="w-full bg-white hover:bg-red-100 text-red-600 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              {processingId === interest.id ? "Processing..." : "Delete Session"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
