import {
  sanitizeChurchBaseName,
  buildFullChurchName,
  generateChurchCode,
} from "../utils/church.js";

/**
 * Creates or returns existing church
 */
export async function getOrCreateChurch({
  client,
  church_name,
  conference_id,
}) {
  const baseName = sanitizeChurchBaseName(church_name);
  const finalName = buildFullChurchName(baseName);
  const churchCode = generateChurchCode(baseName);

  // 1. Check existing church
  const { rows } = await client.query(
    `SELECT * FROM churches 
     WHERE church_code = $1 AND conference_id = $2
     LIMIT 1`,
    [churchCode, conference_id]
  );

  if (rows[0]) {
    return rows[0];
  }

  // 2. Create church
  const insertRes = await client.query(
    `INSERT INTO churches (name, church_code, conference_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [finalName, churchCode, conference_id]
  );

  const church = insertRes.rows[0];

  // 3. Default departments
  await client.query(
    `INSERT INTO departments (name, code, church_id)
     VALUES 
      ('Children','children',$1),
      ('Youth','youth',$1),
      ('Choir','choir',$1),
      ('Treasury','treasury',$1)`,
    [church.id]
  );

  return church;
}
