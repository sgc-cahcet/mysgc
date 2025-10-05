"use client"

interface StatusMessageProps {
  message: { type: "success" | "error"; text: string } | null
}

export function StatusMessage({ message }: StatusMessageProps) {
  if (!message) return null

  return (
    <div
      className={`mb-4 p-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
        message.type === "success" ? "bg-green-100" : "bg-red-100"
      }`}
    >
      <p className={`font-bold ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>{message.text}</p>
    </div>
  )
}
