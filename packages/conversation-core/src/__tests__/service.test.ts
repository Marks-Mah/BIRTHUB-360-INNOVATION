import test from "node:test";
import assert from "node:assert/strict";
import { ConversationService } from "../../src/service.js";

test("conversation service lifecycle", () => {
  const events: any[] = [];
  const svc = new ConversationService({ conversations: [], messages: [] }, (event) => events.push(event));

  const conv = svc.createConversation("org-1", "web");
  svc.addMessage(conv.id, "user", "olá");
  svc.transferChannel(conv.id, "whatsapp");

  const history = svc.getHistory(conv.id);
  assert.equal(history.length, 1);
  assert.equal(events.length, 3);
});
