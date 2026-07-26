/**
 * Tracks which chat thread (if any) is currently on screen so the
 * foreground push handler can suppress the notification for messages the
 * user is already looking at — WhatsApp behavior. ChatThreadScreen sets
 * this on focus and clears it on blur/unmount.
 */
let focusedConversationId: string | null = null;

export const setFocusedConversation = (conversationId: string | null): void => {
  focusedConversationId = conversationId;
};

export const isConversationFocused = (conversationId: string): boolean =>
  focusedConversationId === conversationId;
