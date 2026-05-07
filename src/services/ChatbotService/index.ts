import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

export type ChatMessage = {
    role: 'user' | 'model'
    parts: [{ text: string }]
}

export type ChatbotResponse = {
    reply: string
    usage?: {
        prompt_tokens: number | null
        completion_tokens: number | null
        total_tokens: number | null
    }
}

class ChatbotService {
    private api = axiosInstance

    sendMessage = async (
        message: string,
        history: ChatMessage[] = []
    ): Promise<ApiResponse<ChatbotResponse>> => {
        const response = await this.api.post('/chatbot/message', { message, history })
        return response.data
    }
}

export const chatbotService = new ChatbotService()
