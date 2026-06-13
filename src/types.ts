export interface UserTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  dueDate?: string; // ISO or YYYY-MM-DD
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSchedule {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdviceLog {
  id: string;
  prompt: string;
  response: string;
  type: 'voice' | 'text' | 'snapshot';
  ownerId: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export interface ShadowQueryRequest {
  prompt: string;
  chatHistory: ChatMessage[];
  accessToken?: string;
}

export interface ShadowQueryResponse {
  text: string;
  toolCallsMade?: string[];
  requiresConfirmation?: {
    type: 'send_email' | 'create_calendar_event' | 'append_sheet';
    args: any;
    confirmToken: string;
  };
}
