type SupabaseLikeError = {
  code?: string
  message?: string
  status?: number
}

export function getAuthErrorMessage(
  error: SupabaseLikeError | null | undefined,
  fallback = "An error occurred. Please try again later."
) {
  const code = error?.code?.toLowerCase()
  const message = error?.message || ""

  if (
    code === "over_request_rate_limit" ||
    message.toLowerCase().includes("rate limit")
  ) {
    return "Too many requests. Please wait a few minutes before trying again."
  }

  return message || fallback
}
