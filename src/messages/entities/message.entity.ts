export class Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'quote_request' | 'quote_offer' | 'attachment';
  metadata?: Record<string, unknown>; // JSONB for extra data (e.g. quote_id, file_url)
  read_at?: Date;
  created_at: Date;
}
