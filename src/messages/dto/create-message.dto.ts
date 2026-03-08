export class CreateMessageDto {
  conversation_id?: string; // Optional if starting new convo
  recipient_id?: string; // Required if starting new convo
  content: string;
  attachments?: any[];
  type?: 'text' | 'quote_request' | 'quote_offer' | 'attachment';
  metadata?: any;
}
