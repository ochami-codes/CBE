export async function setupChurchDepartments(client, churchId) {
  await client.query(
    `
    INSERT INTO departments (
      name,
      code,
      type,
      church_id,
      manager_role_id,
      is_system,
      is_active
    )
    SELECT
      d.name,
      d.code,
      d.type,
      $1,
      r.id,
      true,
      true
    FROM (
      VALUES
        ('Treasury', 'treasury', 'core', NULL),
        ('Sabbath School', 'sabbath-school', 'core', 's_school_leader'),
        ('Personal Ministries', 'personal-ministries', 'ministry', NULL),
        ('Stewardship', 'stewardship', 'ministry', NULL),

        ('Children', 'children', 'ministry', 'children_leader'),
        ('Youth', 'youth', 'ministry', 'youth_leader'),
        ('Pathfinders', 'pathfinders', 'ministry', NULL),
        ('Adventurers', 'adventurers', 'ministry', NULL),

        ('Women Ministries', 'women-ministries', 'ministry', 'alo_leader'),
        ('AMO', 'amo', 'ministry', 'amo_leader'),
        ('Family Ministries', 'family-ministries', 'ministry', NULL),

        ('Communication', 'communication', 'core', 'communication_leader'),
        ('Music', 'music', 'ministry', 'music_leader'),

        ('Health Ministries', 'health-ministries', 'ministry', NULL),
        ('Deaconry', 'deaconry', 'core', 'deaconry_leader')
    ) AS d(name, code, type, role_name)
    LEFT JOIN roles r
      ON r.name = d.role_name
    `,
    [churchId]
  );
}