// services/notification.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getNotifications({
  profileId,
  churchId,
  page = 1,
  limit = 10,
}) {
  if (!profileId) {
    throw createAppError("User is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.INVALID_CREDENTIALS);
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(
    Math.max(Number(limit) || 10, 1),
    100
  );

  const offset =
    (pageNumber - 1) * pageSize;

  const countResult = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM notifications
    WHERE
      user_id = $1
      AND church_id = $2
    `,
    [profileId, churchId]
  );

  const { rows } = await pool.query(
    `
    SELECT
      id,
      type,
      title,
      message,
      related_id,
      related_type,
      is_read,
      created_at
    FROM notifications
    WHERE
      user_id = $1
      AND church_id = $2
    ORDER BY
      created_at DESC
    LIMIT $3
    OFFSET $4
    `,
    [
      profileId,
      churchId,
      pageSize,
      offset,
    ]
  );

  const total =
    countResult.rows[0].total;

  return {
    notifications: rows,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      pages: Math.ceil(
        total / pageSize
      ),
    },
  };
}