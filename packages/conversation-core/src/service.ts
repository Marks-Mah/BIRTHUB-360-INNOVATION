export type Conversation = {
  id: string;
  organizationId: string;
  channel: string;
  status: string;
  createdAt: Date;
  endedAt?: Date | undefined;
};

export type Message = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  metadata?: Record<string, unknown> | undefined;
  createdAt: Date;
};

export type ConversationEvent = {
  type: "conversation.created" | "message.received" | "call.started" | "call.ended" | "channel.transferred";
  payload: Record<string, unknown>;
};

export class ConversationService {
  private readonly store: { conversations: Conversation[]; messages: Message[] };
  private readonly emit: (event: ConversationEvent) => void;

  constructor(
    store: { conversations: Conversation[]; messages: Message[] },
    emit: (event: ConversationEvent) => void,
  ) {
    this.store = store;
    this.emit = emit;
  }

  createConversation(orgId: string, channel: string): Conversation {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      organizationId: orgId,
      channel,
      status: "active",
      createdAt: new Date(),
    };
    this.store.conversations.push(conversation);
    this.emit({ type: "conversation.created", payload: conversation });
    return conversation;
  }

  addMessage(conversationId: string, role: string, content: string, metadata?: Record<string, unknown>): Message {
    const conversation = this.store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("conversation_not_found");
    const message: Message = {
      id: crypto.randomUUID(),
      conversationId,
      role,
      content,
      ...(metadata !== undefined ? { metadata } : {}),
      createdAt: new Date(),
    };
    this.store.messages.push(message);
    this.emit({ type: "message.received", payload: { conversationId, role } });
    return message;
  }

  getHistory(conversationId: string, limit = 50): Message[] {
    return this.store.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit);
  }

  transferChannel(conversationId: string, newChannel: string): Conversation {
    const conversation = this.store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("conversation_not_found");
    conversation.channel = newChannel;
    this.emit({ type: "channel.transferred", payload: { conversationId, newChannel } });
    return conversation;
  }
}
