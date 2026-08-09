import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export function validateSendMessageInput({
  churchId,
  content,
  recipientProfileId,
  threadId,
}) {
  if (!churchId) {
    throw createAppError(
      "No active church selected.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  if (!content?.trim()) {
    throw createAppError(
      "Message cannot be empty.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  if (!recipientProfileId && !threadId) {
    throw createAppError(
      "Recipient is required.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }
}