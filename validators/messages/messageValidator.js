export function validateSendMessageInput({
  churchId,
  content,
  recipientProfileId,
  threadId,
}) {
  if (!churchId) {
    throw new Error(
      "No active church selected."
    );
  }

  if (!content?.trim()) {
    throw new Error(
      "Message cannot be empty."
    );
  }

  if (!recipientProfileId && !threadId) {
    throw new Error(
      "Recipient is required."
    );
  }
}