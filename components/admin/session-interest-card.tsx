"use client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { useState } from "react"
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
  const isProcessing = processingId === interest.id
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleDelete = async () => {
    await onDelete(interest.id)
    setDeleteDialogOpen(false)
  }

  return (
    <div className="border-2 border-black rounded-lg p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white relative">


      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg leading-tight break-words">
            {interest.topic}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            By: {interest.member_name}
          </p>
        </div>
        <span
          className={`px-2 py-1 ${
            interest.is_approved ? "bg-green-600" : "bg-black"
          } text-white text-xs font-medium rounded-md whitespace-nowrap self-start sm:self-auto`}
        >
          {interest.is_approved ? "Approved" : interest.type}
        </span>
      </div>

      {/* Date Information */}
      <div className="mt-3 space-y-1 text-xs sm:text-sm text-gray-600">
        <div className="flex flex-wrap gap-x-1">
          <span className="font-medium">
            {interest.is_approved ? "Date:" : "Preferred Date:"}
          </span>
          <span>{new Date(interest.preferred_date).toLocaleDateString()}</span>
        </div>
        {!interest.is_approved && (
          <div className="flex flex-wrap gap-x-1">
            <span className="font-medium">Requested:</span>
            <span>{new Date(interest.created_at).toLocaleDateString()}</span>
          </div>
        )}
        {interest.is_approved && (
          <div className="flex flex-wrap gap-x-1">
            <span className="font-medium">Type:</span>
            <span>{interest.type}</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="mt-3 text-xs sm:text-sm text-gray-700 leading-relaxed break-words">
        {interest.description}
      </p>

      {/* Action Buttons */}
      <div className="mt-4">
        {!interest.is_approved ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              onClick={() => onApprove(interest)}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-medium py-2"
            >
              {isProcessing ? "Processing..." : "Approve"}
            </Button>
            <Button
              onClick={() => onReject(interest.id)}
              disabled={isProcessing}
              variant="outline"
              className="w-full bg-white hover:bg-red-50 disabled:bg-gray-100 text-red-600 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-medium py-2"
            >
              {isProcessing ? "Processing..." : "Reject"}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={() => onViewFeedback(interest)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-medium py-2"
            >
              View Feedback ({feedbackCount})
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <button
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white"
                  aria-label="Delete session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold">
                    Delete Session?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-600">
                    Are you sure you want to delete "{interest.topic}"? This action cannot be undone and all feedback will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-2">
                  <AlertDialogCancel className="border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isProcessing}
                    className="bg-red-600 hover:bg-red-700 text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    {isProcessing ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  )
}
