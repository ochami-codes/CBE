export async function generateNumber({
  client,
}) {
  const now = new Date();

  const prefix =
    `REM-${
      now.getFullYear()
    }${
      String(
        now.getMonth() + 1
      ).padStart(2, "0")
    }`;

  const result =
    await client.query(
      `
      SELECT COUNT(*) AS count

      FROM treasury_remittances

      WHERE remittance_number
        LIKE $1
      `,
      [`${prefix}%`]
    );

  const next =
    Number(
      result.rows[0].count
    ) + 1;

  return `${prefix}-${String(next)
    .padStart(4, "0")}`;
}