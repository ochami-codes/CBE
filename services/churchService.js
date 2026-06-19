
import {
  sanitizeChurchBaseName,
  buildFullChurchName,
  generateChurchCode,
} from "../utils/church.js";

import { setupChurchDepartments } from "../routes/church/setup/setUpDepartments.js";
import { setupChurchTreasury } from "../routes/church/setup/setUpTreasury.js";

export async function getOrCreateChurch({
  client,
  church_name,
  conference_id,
}) {
  const baseName = sanitizeChurchBaseName(church_name);
  const finalName = buildFullChurchName(baseName);
  const churchCode = generateChurchCode(baseName);

  const { rows } = await client.query(
    `
    SELECT *
    FROM churches
    WHERE church_code = $1
      AND conference_id = $2
    LIMIT 1
    `,
    [churchCode, conference_id]
  );

  if (rows[0]) {
    return rows[0];
  }

  const insertRes = await client.query(
    `
    INSERT INTO churches (
      name,
      church_code,
      conference_id
    )
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [finalName, churchCode, conference_id]
  );

  const church = insertRes.rows[0];

  await setupChurchDepartments(client, church.id);

  await setupChurchTreasury(client, church.id);

  return church;
}