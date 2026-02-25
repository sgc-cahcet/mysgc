"use client"

import type React from "react"
import { useEffect } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog"

export default function AuthPage() {
  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Signup state
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")

  // Status message states
  const [loginMessage, setLoginMessage] = useState({ text: "", type: "" })
  const [signupMessage, setSignupMessage] = useState({ text: "", type: "" })

  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoginMessage({ text: "", type: "" })

    try {
      // First check if user exists in members table
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("email", loginEmail)
        .single()

      if (memberError || !memberData) {
        setLoginMessage({
          text: "Access Denied: Your email is not registered in SGC's members list.",
          type: "error"
        })
        setLoading(false)
        return
      }

      // Proceed with authentication
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })

      if (error) {
        setLoginMessage({
          text: `Login Failed: ${error.message}`,
          type: "error"
        })
      } else {
        setLoginMessage({
          text: "Login Successful! Redirecting to dashboard...",
          type: "success"
        })

        setIsRedirecting(true)
        // Short delay before redirect
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      }
    } catch (error) {
      setLoginMessage({
        text: "An error occurred. Please try again later.",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSignupMessage({ text: "", type: "" })

    try {
      // Check if passwords match
      if (signupPassword !== confirmPassword) {
        setSignupMessage({
          text: "Passwords don't match. Please ensure both passwords are the same.",
          type: "error"
        })
        setLoading(false)
        return
      }

      // First check if user exists in members table
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("email", signupEmail)
        .single()

      if (memberError || !memberData) {
        setSignupMessage({
          text: "Access Denied: This email is not registered in SGC's members list.",
          type: "error"
        })
        setLoading(false)
        return
      }

      // Check if the user is already registered
      if (memberData.is_registered) {
        setSignupMessage({
          text: "An account with this email already exists. Please login instead.",
          type: "error"
        })
        setLoading(false)
        return
      }

      // Proceed with sign up
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: window.location.origin + "/dashboard",
        },
      })

      if (error) {
        setSignupMessage({
          text: `Signup Failed: ${error.message}`,
          type: "error"
        })
      } else {
        // Update the member record to mark as registered
        const { error: updateError } = await supabase
          .from("members")
          .update({ is_registered: true })
          .eq("email", signupEmail)

        if (updateError) {
          console.error("Failed to update member record:", updateError)
        }

        // Since we're not requiring email verification, we can automatically sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword,
        })

        if (signInError) {
          setSignupMessage({
            text: "Your account was created, but you need to login manually.",
            type: "success"
          })
        } else {
          setSignupMessage({
            text: "Signup Successful! Redirecting to dashboard...",
            type: "success"
          })

          setIsRedirecting(true)
          // Short delay before redirect
          setTimeout(() => {
            router.push("/dashboard")
          }, 1500)
        }
      }
    } catch (error) {
      setSignupMessage({
        text: "An error occurred. Please try again later.",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only set checkingSession to false as middleware handles the primary auth redirection
    setCheckingSession(false)
  }, [])

  // Show loader while checking session OR while redirecting
  if (checkingSession || isRedirecting) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-24 h-24 relative mb-4">
              <Image
                src="/logo.png"
                alt="SGC Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <Loader2 className="h-8 w-8 animate-spin text-black" />
            <p className="text-lg font-bold text-center">
              {isRedirecting ? "Redirecting to dashboard..." : "Checking authentication..."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 relative">
            <Image
              src="/logo.png"
              alt="SGC Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <Tabs defaultValue="login" className="mb-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login" className="text-lg font-bold">Login</TabsTrigger>
            <TabsTrigger value="signup" className="text-lg font-bold">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <h1 className="text-3xl font-black text-center mb-6 tracking-tight">Member Login</h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="font-bold">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="font-bold">
                    Password
                  </Label>
                  <ForgotPasswordDialog />
                </div>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  required
                />
              </div>

              {loginMessage.text && (
                <div className={`p-3 rounded border text-sm ${loginMessage.type === "error"
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-green-50 border-green-300 text-green-800"
                  }`}>
                  {loginMessage.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <h1 className="text-3xl font-black text-center mb-6 tracking-tight">Member Sign Up</h1>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="font-bold">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="font-bold">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  required
                />
                <p className="text-xs text-gray-500">Only registered members can sign up</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="font-bold">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="font-bold">
                  Confirm Password
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

              {signupMessage.text && (
                <div className={`p-3 rounded border text-sm ${signupMessage.type === "error"
                  ? "bg-red-50 border-red-300 text-red-800"
                  : "bg-green-50 border-green-300 text-green-800"
                  }`}>
                  {signupMessage.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        <div className="mt-12 text-center text-gray-500 text-xs hidden md:block">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </div>
    </div>
  )
}
