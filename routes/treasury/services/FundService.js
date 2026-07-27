import { pool } from "../../../db.js";
import { getFunds } from "./fundsSummary/getFunds.js";
import { getUnremittedFunds } from "./fundsSummary/getUnremittedFunds.js";
import { buildFundsSummary } from "./fundsSummary/buildFundsSummary.js";
import { createAppError } from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
export const FundsService = {
  async create({
  churchId,
  name,
  departmentId = null,
  category = null,
}) {
  /* Check for duplicate fund name */
  const duplicateResult = await pool.query(
    `
    SELECT id
    FROM treasury_funds
    WHERE church_id = $1
      AND LOWER(TRIM(name)) = LOWER(TRIM($2))
    LIMIT 1
    `,
    [churchId, name]
  );

  if (duplicateResult.rowCount > 0) {
    throw createAppError(
      "A fund with this name already exists.",
      400,
      ERROR_CODES.CONFLICT
    );
  }

  /* Local Church Funds group */
  const groupResult = await pool.query(
    `
    SELECT id
    FROM treasury_fund_groups
    WHERE church_id = $1
      AND group_type = 'local'
    LIMIT 1
    `,
    [churchId]
  );

  if (groupResult.rowCount === 0) {
    throw createAppError(
      "Local Church Funds group not found.",
      404,
      ERROR_CODES.NOT_FOUND
    );
  }

  const groupId = groupResult.rows[0].id;

  /* Generate a simple fund code */
  const fundCode = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  const result = await pool.query(
    `
    INSERT INTO treasury_funds (
      church_id,
      group_id,
      department_id,
      fund_category,
      fund_code,
      name,
      requires_allocation,
      is_system,
      is_active,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      false, false, true, NOW()
    )
    RETURNING *
    `,
    [
      churchId,
      groupId,
      departmentId,
      category,
      fundCode,
      name.trim(),
    ]
  );

  return result.rows[0];
},
async createFunds(client, {
  churchId,
  groupId,
  funds,
}) {
  const createdFunds = [];

  for (const fund of funds) {
    const result = await client.query(
      `
      INSERT INTO treasury_funds (
        church_id,
        group_id,
        fund_category,
        fund_code,
        name,
        is_system,
        is_active,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,true,true,NOW()
      )
      RETURNING id, fund_code
      `,
      [
        churchId,
        groupId,
        fund.category ?? null,
        fund.code,
        fund.name,
      ]
    );

    createdFunds.push(result.rows[0]);
  }

  return createdFunds;
},

  /**
   * Fetch treasury funds
   *
   * Filters:
   * group_id
   * group_type (local/trust)
   * department_id
   * active
   */
  async getFunds({
    churchId,
    groupId = null,
    groupType,
    departmentId,
    active = true,
  }) {


    const conditions = [
      "f.church_id = $1"
    ];


    const params = [
      churchId
    ];



    if (groupId) {

      params.push(groupId);

      conditions.push(
        `f.group_id = $${params.length}`
      );

    }

    if (groupType) {

      params.push(groupType);

      conditions.push(
        `g.group_type = $${params.length}`
      );

    }



    if (departmentId) {

      params.push(departmentId);

      conditions.push(
        `f.department_id = $${params.length}`
      );

    }

    if (active !== undefined) {

      params.push(active);

      conditions.push(
        `f.is_active = $${params.length}`
      );

    }
    const result =
      await pool.query(
        `
        SELECT
          f.id,
          f.name,
          f.group_id,
          f.department_id,
          f.fund_category,
          f.is_active,

          g.name AS group_name,
          g.group_type

        FROM treasury_funds f

        LEFT JOIN treasury_fund_groups g
          ON g.id = f.group_id

        WHERE ${conditions.join(" AND ")}

        ORDER BY f.name ASC
        `,
        params
      );


    return result.rows;

  },

async getSummary({
  churchId,
  departmentId,
}) {
  if (departmentId) {
    const departmentFunds =
      await getFunds({
        churchId,
        departmentId,
      });

    return {
      summary: {
        departmentBalance:
          departmentFunds.reduce(
            (total, fund) =>
              total + fund.balance,
            0
          ),
      },

      departmentFunds,
    };
  }

  const [
    funds,
    unremittedRows,
  ] = await Promise.all([
    getFunds({ churchId }),
    getUnremittedFunds(churchId),
  ]);

  return buildFundsSummary({
    funds,
    unremittedRows,
  });
}
}