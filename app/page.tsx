import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-black rounded-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">SGC</span>
          </div>
        </div>

        <h1 className="text-3xl font-black text-center mb-6 tracking-tight">Community Member Portal</h1>

        <p className="text-center mb-8">Access your dashboard, track attendance, and manage sessions.</p>

        <div className="space-y-4">
          <Link href="/login" className="block w-full">
            <Button className="w-full py-6 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform text-lg font-bold">
              Let's Go
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center text-gray-500 text-xs">
          <p>This Site was Developed and Maintained by SGC</p>
          <p>&copy; {new Date().getFullYear()} Students Guidance Cell - CAHCET. All Rights Reserved</p>
        </div>
      </div>
    </div>
  )
}

