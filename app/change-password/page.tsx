"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // First verify current password by attempting to sign in
      const {
        data: { session },
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      })

      if (signInError) {
        toast({
          title: "Current password is incorrect",
          description: "Please enter your current password correctly",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        toast({
          title: "Password update failed",
          description: updateError.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully",
        })
        router.push("/dashboard")
      }
    } catch (error) {
      toast({
        title: "An error occurred",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <h1 className="text-3xl font-black text-center mb-6 tracking-tight">Change Password</h1>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="font-bold">
              Current Password
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="font-bold">
              New Password
            </Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="font-bold">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              required
            />
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-1/2 py-2 px-4 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="w-1/2 py-2 px-4 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>

        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </div>
    </div>
  )
}

