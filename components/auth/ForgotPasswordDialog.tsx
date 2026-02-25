"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, Mail, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { useIsMobile } from "@/hooks/use-mobile"

type Step = "request" | "verify" | "success"

export function ForgotPasswordDialog() {
    const [step, setStep] = useState<Step>("request")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const isMobile = useIsMobile()
    const supabase = createClientComponentClient()
    const { toast } = useToast()
    const router = useRouter()

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            // Reset state when closing
            setTimeout(() => {
                setStep("request")
                setEmail("")
                setOtp("")
                setNewPassword("")
                setConfirmPassword("")
                setLoading(false)
            }, 300)
        }
    }

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: memberData, error: memberError } = await supabase
                .from("members")
                .select("email")
                .eq("email", email)
                .single()

            if (memberError || !memberData) {
                toast({
                    title: "Access Denied",
                    description: "This email is not registered in our members list.",
                    variant: "destructive",
                })
                setLoading(false)
                return
            }

            const { error } = await supabase.auth.resetPasswordForEmail(email)

            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Code Sent",
                    description: "A 6-digit reset code has been sent to your email.",
                })
                setStep("verify")
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast({
                title: "Passwords don't match",
                description: "Please ensure both passwords are the same.",
                variant: "destructive",
            })
            return
        }

        if (newPassword.length < 6) {
            toast({
                title: "Password too short",
                description: "Password must be at least 6 characters.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: "recovery",
            })

            if (verifyError) {
                toast({
                    title: "Verification Failed",
                    description: verifyError.message,
                    variant: "destructive",
                })
                setLoading(false)
                return
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (updateError) {
                toast({
                    title: "Update Failed",
                    description: updateError.message,
                    variant: "destructive",
                })
            } else {
                setStep("success")
                toast({
                    title: "Success",
                    description: "Your password has been reset successfully.",
                })

                setTimeout(() => {
                    setOpen(false)
                    router.push("/dashboard")
                }, 2000)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const DialogContentWrapper = ({ isMobile = false }) => (
        <>
            {step === "request" && (
                <div className="p-6">
                    {isMobile ? (
                        <DrawerHeader className="px-0 pb-6 text-left">
                            <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Mail size={24} />
                            </div>
                            <DrawerTitle className="text-2xl font-black">Forgot Password?</DrawerTitle>
                            <DrawerDescription className="font-medium text-gray-600">
                                No worries! Enter your email and we'll send you a 6-digit code to reset your password.
                            </DrawerDescription>
                        </DrawerHeader>
                    ) : (
                        <DialogHeader className="mb-6">
                            <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Mail size={24} />
                            </div>
                            <DialogTitle className="text-2xl font-black">Forgot Password?</DialogTitle>
                            <DialogDescription className="font-medium text-gray-600">
                                No worries! Enter your email and we'll send you a 6-digit code to reset your password.
                            </DialogDescription>
                        </DialogHeader>
                    )}
                    <form onSubmit={handleSendOTP} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="reset-email" className="font-bold text-black border-none bg-transparent shadow-none">
                                Email Address
                            </Label>
                            <Input
                                id="reset-email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0 focus:border-black"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-6 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 text-lg font-bold"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                "Send Reset Code"
                            )}
                        </Button>
                    </form>
                </div>
            )}

            {step === "verify" && (
                <div className="p-6">
                    {isMobile ? (
                        <DrawerHeader className="px-0 pb-6 text-left">
                            <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <KeyRound size={24} />
                            </div>
                            <DrawerTitle className="text-2xl font-black">Reset Password</DrawerTitle>
                            <DrawerDescription className="font-medium text-gray-600">
                                We've sent a code to <span className="text-black font-bold">{email}</span>. Enter it below along with your new password.
                            </DrawerDescription>
                        </DrawerHeader>
                    ) : (
                        <DialogHeader className="mb-6">
                            <div className="w-12 h-12 bg-black text-white rounded-lg flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <KeyRound size={24} />
                            </div>
                            <DialogTitle className="text-2xl font-black">Reset Password</DialogTitle>
                            <DialogDescription className="font-medium text-gray-600">
                                We've sent a code to <span className="text-black font-bold">{email}</span>. Enter it below along with your new password.
                            </DialogDescription>
                        </DialogHeader>
                    )}
                    <form onSubmit={handleVerifyAndReset} className="space-y-6 pb-4">
                        <div className="space-y-3 flex flex-col items-center">
                            <Label className="font-bold text-black self-start">Verification Code</Label>
                            <InputOTP
                                maxLength={6}
                                value={otp}
                                onChange={setOtp}
                            >
                                <InputOTPGroup className="gap-2">
                                    <InputOTPSlot index={0} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                    <InputOTPSlot index={1} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                    <InputOTPSlot index={2} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                    <InputOTPSlot index={3} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                    <InputOTPSlot index={4} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                    <InputOTPSlot index={5} className="w-10 h-12 text-xl sm:w-12 sm:h-14 sm:text-2xl font-black border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password-dialog" className="font-bold text-black">New Password</Label>
                                <Input
                                    id="new-password-dialog"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0 focus:border-black"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password-dialog" className="font-bold text-black">Confirm Password</Label>
                                <Input
                                    id="confirm-password-dialog"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="py-2 px-4 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0 focus:border-black"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                type="submit"
                                disabled={loading || otp.length !== 6}
                                className="w-full py-6 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 text-lg font-bold"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    "Reset Password"
                                )}
                            </Button>
                            <button
                                type="button"
                                onClick={() => setStep("request")}
                                className="text-sm font-bold text-gray-500 hover:text-black transition-colors underline"
                            >
                                Request a new code
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {step === "success" && (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                        <CheckCircle2 size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black">All Set!</h2>
                        <p className="font-medium text-gray-600">
                            Your password has been reset successfully. Redirecting you to the dashboard...
                        </p>
                    </div>
                    <Loader2 className="h-8 w-8 animate-spin text-black pb-8" />
                </div>
            )}
        </>
    )

    const Trigger = (
        <button className="text-sm font-bold text-gray-600 hover:text-black transition-colors underline decoration-2 underline-offset-4">
            Forgot Password?
        </button>
    )

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={handleOpenChange}>
                <DrawerTrigger asChild>
                    {Trigger}
                </DrawerTrigger>
                <DrawerContent className="border-t-2 border-black bg-white rounded-t-[20px]">
                    <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-black/10" />
                    <div className="max-h-[90vh] overflow-y-auto">
                        <DialogContentWrapper isMobile />
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {Trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white rounded-lg p-0 overflow-hidden">
                <DialogContentWrapper />
            </DialogContent>
        </Dialog>
    )
}
