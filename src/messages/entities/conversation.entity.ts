export class Conversation {
  id: string;
  participant_ids: string[]; // Array of UUIDs (Client + Provider)
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;

  // Optional: Join constraints for fetching profiles if needed
  // participants?: UserProfile[];
}
