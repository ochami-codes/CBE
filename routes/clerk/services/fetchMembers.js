import { pool } from "../../../db.js"

export async function fetchMembers(churchId) {
  const result = await pool.query(
    `
    SELECT 
      m.id,
      m.status,
      m.joined_at,
      m.created_at,

      p.full_name,
      p.gender,
      p.date_of_birth,
      p.phone,
      p.email,
      p.is_system_user,

      r.baptized,
      r.baptismal_date,
      r.marital_status,
      r.membership_type,

      r.emergency_contact_name,
      r.emergency_contact_relationship,
      r.emergency_contact_phone

    FROM members m

    /* PROFILE (system + non-system identity) */
    LEFT JOIN profiles p
      ON p.id = m.profile_id

    /* MEMBER REGISTRY DETAILS */
    LEFT JOIN member_records r
      ON r.member_id = m.id

    WHERE m.church_id = $1
    AND m.status = 'active'
    ORDER BY m.created_at DESC
    `,
    [churchId]
  );

  return result.rows;
}
