export interface MemberData {
    id: string
    name: string
    email: string
    department: string
    role: string
  }
  
  export interface SessionInterest {
    id: string
    member_id: string
    member_name: string
    handler_count?: number
    co_handler_id?: string | number | null
    co_handler_name?: string | null
    topic: string
    type: string
    preferred_date: string
    description: string
    is_approved: boolean
    created_at: string
  }
  
  export interface Feedback {
    id: string
    session_id: string
    member_id?: string
    member_name: string
    rating: number
    comment: string
    date?: string
    created_at: string
  }
  
  export interface SessionWithFeedback extends SessionInterest {
    feedback: Feedback[]
    average_rating: number
  }
  
