// services/setup/setUpDepartments.js
export async function setupChurchDepartments(client, churchId) {
  await client.query(
    `
    INSERT INTO departments (
      name,
      code,
      type,
      church_id,
      is_system,
      is_active
    )
    VALUES
      ('Treasury', 'treasury','core', $1, true, true),
      ('Sabbath School', 'sabbath-school','core', $1, true, true),
      ('Personal Ministries', 'personal-ministries','ministry', $1, true, true),
      ('Stewardship', 'stewardship', 'ministry', $1, true, true),

      ('Children', 'children', 'ministry', $1, true, true),
      ('Youth', 'youth', 'ministry', $1, true, true),
      ('Pathfinders', 'pathfinders', 'ministry', $1, true, true),
      ('Adventurers', 'adventurers','ministry',  $1, true, true),

      ('Women Ministries', 'women-ministries','ministry', $1, true, true),
      ('AMO', 'amo', 'ministry', $1, true, true),
      ('Family Ministries', 'family-ministries', 'ministry', $1, true, true),

      ('Communication', 'communication', 'core', $1, true, true),
      ('Music', 'music', 'ministry', $1, true, true),

      ('Health Ministries', 'health-ministries','ministry', $1, true, true),
      ('Deaconry', 'deaconry', 'core', $1, true, true)
    `,
    [churchId]
  );
}