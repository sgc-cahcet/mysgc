"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft, Loader2 } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface MemberData {
  id: string
  name: string
  email: string
  department: string
  role: string
}

export default function ChangePasswordPage() {
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const loadMember = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user.email) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("email", session.user.email)
        .single()

      if (error || !data) {
        toast({
          title: "Error",
          description: "Could not fetch member data.",
          variant: "destructive",
        })
        router.push("/dashboard")
        return
      }

      setMemberData(data)
      setLoading(false)
    }

    loadMember()
  }, [router, supabase, toast])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please enter the same password twice.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const email = user?.email || memberData?.email

    if (!email) {
      setSaving(false)
      toast({
        title: "Session expired",
        description: "Please log in again before changing your password.",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    })

    if (signInError) {
      setSaving(false)
      toast({
        title: "Current password is incorrect",
        description: "Please enter your existing password and try again.",
        variant: "destructive",
      })
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSaving(false)

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    })
    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
    router.replace("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <DashboardHeader memberData={memberData} />

      <main className="container mx-auto max-w-xl p-4 md:p-6">
        <div className="mb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mb-4 -ml-2 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-black">Change Password</h1>
          <p className="mt-2 text-gray-600">Use a strong password that you do not use anywhere else.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 border-2 border-black bg-white p-6 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="space-y-2">
            <Label htmlFor="oldPassword" className="font-bold">
              Current Password
            </Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="border-2 border-black"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="font-bold">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="border-2 border-black"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-bold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="border-2 border-black"
              minLength={6}
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              {saving ? "Updating..." : "Update Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="flex-1 border-2 border-black rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
