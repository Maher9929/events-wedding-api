import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_USER_MSG_LENGTH = 1000;
const MAX_CONVERSATION_TURNS = 10;

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly apiKey: string;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CHATBOT_API_KEY', '');
    this.modelName = this.configService.get<string>(
      'CHATBOT_MODEL',
      'gemini-2.5-flash',
    );
  }

  async ask(messages: ChatMessage[], language = 'fr'): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('CHATBOT_API_KEY is not set');
      return 'Le chatbot est temporairement indisponible. Veuillez réessayer plus tard.';
    }

    try {
      const chatMessages = messages
        .map((message) => ({
          ...message,
          content: this.sanitize(message.content),
        }))
        .filter((message) => message.content.length > 0)
        .slice(-MAX_CONVERSATION_TURNS);

      const lastUserMessage = chatMessages
        .filter((message) => message.role === 'user')
        .pop();

      if (!lastUserMessage) {
        return 'Veuillez saisir un message.';
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

      const body: Record<string, unknown> = {
        contents: chatMessages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        systemInstruction: {
          parts: [{ text: this.buildSystemInstruction(language) }],
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.4,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        this.logger.warn('Gemini rate limited (429)');
        return 'Je suis temporairement indisponible. Réessayez dans quelques secondes. En attendant, explorez les services sur /services ou les catégories sur /categories.';
      }

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Gemini API error: ${response.status} — ${errorBody}`,
        );
        return 'Désolé, je rencontre un problème technique. Vous pouvez naviguer directement sur la plateforme.';
      }

      const data = await response.json();

      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        return 'Je ne suis pas en mesure de répondre à cette question. Je suis ici pour vous aider avec la plateforme Doha Events.';
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return (
        content.trim() ||
        "Je n'ai pas pu générer de réponse. Veuillez reformuler votre question."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Chatbot request failed: ${message}`);
      return 'Désolé, une erreur de connexion est survenue. Veuillez réessayer.';
    }
  }

  private sanitize(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || code >= 32;
      })
      .join('')
      .trim()
      .slice(0, MAX_USER_MSG_LENGTH);
  }

  private buildSystemInstruction(language: string): string {
    const outOfScope: Record<string, string> = {
      fr: "Je peux seulement t'aider avec la plateforme, l'organisation d'événements, les prestataires, les devis, les réservations et les paiements. Dis-moi quel type d'événement tu veux organiser.",
      ar: 'يمكنني مساعدتك فقط في استخدام المنصة، تنظيم المناسبات، اختيار مزودي الخدمات، عروض الأسعار، الحجوزات والدفع. أخبرني ما نوع المناسبة التي تريد تنظيمها.',
      en: 'I can only help with the platform, event planning, providers, quotes, bookings, and payments. Tell me what type of event you want to organize.',
    };
    const lang = language.startsWith('ar')
      ? 'ar'
      : language.startsWith('en')
        ? 'en'
        : 'fr';

    return `
You are Doha Events Assistant, the official assistant for the Doha Events & Wedding Services Marketplace.

Scope:
- Help clients understand the platform.
- Help with event planning, service categories, provider selection, quote requests, bookings, payments, reviews, messages, notifications, budget, checklist, timeline, cancellations, and disputes.
- Answer in the user's language when possible. Preferred current language: ${lang}.

Strict rules:
- Never answer questions outside the platform and event-planning scope.
- If the user asks about unrelated topics such as politics, weather, coding, homework, news, sports, medical/legal/financial advice, answer exactly with this redirect: "${outOfScope[lang]}"
- Never invent provider names, prices, availability, payment status, booking status, ratings, or policies.
- Never ask for passwords, card numbers, CVV, or private credentials.
- Ask one short follow-up question when event details are missing.
- Keep answers concise, friendly, and practical.
`;
  }
}
