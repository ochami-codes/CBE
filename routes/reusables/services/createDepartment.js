// services/department.service.js

import { pool } from "../../../db.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";

/* -----------------------------------------
   Generate department code
----------------------------------------- */

function generateDepartmentCode(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* -----------------------------------------
   Create Department
----------------------------------------- */

export async function createDepartment({
  churchId,
  name,
  type = "ministry",
}) {
  if (!churchId) {
    throw createAppError(
      "Failed to resolve active church.",
      500,
      ERROR_CODES.INTERNAL_SERVER_ERROR
    );
  }

  if (!name?.trim()) {
    throw createAppError(
      "Department name is required.",
      400,
      ERROR_CODES.MISSING_REQUIRED_FIELD
    );
  }

  const departmentName = name.trim();
  const code = generateDepartmentCode(
    departmentName
  );

  if (!code) {
    throw createAppError(
      "Invalid department name.",
      400,
      ERROR_CODES.INVALID_INPUT
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -----------------------------------------
       Check duplicate department name
    ----------------------------------------- */

    const existing = await client.query(
      `
      SELECT id
      FROM departments
      WHERE church_id = $1
        AND LOWER(name) = LOWER($2)
      LIMIT 1;
      `,
      [churchId, departmentName]
    );

    if (existing.rowCount) {
      throw createAppError(
        "A department with this name already exists.",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    /* -----------------------------------------
       Check generated code
    ----------------------------------------- */

    const existingCode = await client.query(
      `
      SELECT id
      FROM departments
      WHERE church_id = $1
        AND code = $2
      LIMIT 1;
      `,
      [churchId, code]
    );

    if (existingCode.rowCount) {
      throw createAppError(
        "A department with this code already exists.",
        409,
        ERROR_CODES.ALREADY_EXISTS
      );
    }

    /* -----------------------------------------
       Create custom department
    ----------------------------------------- */

    const { rows } = await client.query(
      `
      INSERT INTO departments (
        name,
        code,
        type,
        church_id,
        is_system,
        is_active
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        false,
        true
      )
      RETURNING
        id,
        name,
        code,
        type,
        church_id,
        is_system,
        is_active;
      `,
      [
        departmentName,
        code,
        type,
        churchId,
      ]
    );

    await client.query("COMMIT");

    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}