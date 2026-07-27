// services/notificationService.js

import { pool } from "../../db.js";
import { createAppError } from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";

export async function notifyRoles({
  client,
  churchId,
  roles,
  type,
  title,
  message,
  relatedId = null,
  relatedType = null,
}) {
  if (!churchId) {
    throw createAppError("churchId is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!roles?.length) {
    throw createAppError("At least one role is required.", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
  }
const db = client ?? pool
  await db.query(
  `
  INSERT INTO notifications (
    user_id,
    church_id,
    type,
    title,
    message,
    related_id,
    related_type,
    is_read,
    created_at
  )
  SELECT DISTINCT
    m.profile_id,
    $1::uuid,
    $2::text,
    $3::text,
    $4::text,
    $5::uuid,
    $6::text,
    false,
    NOW()
  FROM members m
  JOIN member_roles mr
    ON mr.member_id = m.id
  JOIN roles r
    ON r.id = mr.role_id
  WHERE m.church_id = $1::uuid
    AND LOWER(r.name) = ANY($7::text[])
    AND m.status = 'active';
  `,
  [
    churchId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    roles.map((role) => role.toLowerCase()),
  ]
);
}