import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

export async function getChurches({
  search = "",
  conferenceId,
  churchCode,
  page = 1,
  limit = 20,
} = {}) {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (pageNumber - 1) * pageSize;

  const conditions = [];
  const values = [];

  if (conferenceId) {
    values.push(conferenceId);
    conditions.push(`conference_id = $${values.length}`);
  }

  if (churchCode) {
    values.push(churchCode);
    conditions.push(`church_code = $${values.length}`);
  }

  if (search.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(
      `(name ILIKE $${values.length} OR church_code ILIKE $${values.length})`
    );
  }

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM churches
    ${where};
  `;

  values.push(pageSize);
  values.push(offset);

  const dataQuery = `
    SELECT
      id,
      name,
      church_code,
      logo,
      conference_id
    FROM churches
    ${where}
    ORDER BY name
    LIMIT $${values.length - 1}
    OFFSET $${values.length};
  `;

  const [
    { rows: churches },
    { rows: [{ total }] },
  ] = await Promise.all([
    pool.query(dataQuery, values),
    pool.query(countQuery, values.slice(0, -2)),
  ]);

  return {
    churches,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  };
}

export async function getChurch(churchId) {
  if (!churchId) {
    throw createAppError("Church is required.", 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const { rows } = await pool.query(
    `
    SELECT *
    FROM churches
    WHERE id = $1
    LIMIT 1;
    `,
    [churchId]
  );

  if (!rows.length) {
    throw createAppError("Church not found.", 404, ERROR_CODES.CHURCH_NOT_FOUND);
  }

  return rows[0];
}