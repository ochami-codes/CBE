import { pool } from "../../db.js";
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
    ORDER BY m.created_at DESC
    `,
    [churchId]
  );

  return result.rows;
}

export async function addMemberService({
  churchId,
  payload
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { profile, member_record } =
      payload;

    /* =========================
       1. CHECK EXISTING PROFILE
    ========================== */

    const existingProfileResult =
      await client.query(
        `
        SELECT *
        FROM profiles
        WHERE phone = $1
        LIMIT 1
        `,
        [profile.phone]
      );

    let profileId;
    let resolvedProfile;

    if (existingProfileResult.rows.length > 0) {
      // REUSE EXISTING PROFILE
      resolvedProfile =
        existingProfileResult.rows[0];
      profileId = resolvedProfile.id;
    } else {
      // CREATE NEW PROFILE
      const newProfileResult =
        await client.query(
          `
          INSERT INTO profiles (
            full_name,
            phone,
            date_of_birth,
            gender,
            is_system_user
          )
          VALUES ($1, $2, $3, $4, false)
          RETURNING *
          `,
          [
            profile.full_name,
            profile.phone,
            profile.date_of_birth,
            profile.gender,
          ]
        );

      resolvedProfile =
        newProfileResult.rows[0];
      profileId = resolvedProfile.id;
    }

    /* =========================
       2. CHECK IF MEMBER EXISTS IN CHURCH
    ========================== */

    const existingMember =
      await client.query(
        `
        SELECT *
        FROM members
        WHERE church_id = $1
        AND profile_id = $2
        LIMIT 1
        `,
        [churchId, profileId]
      );

    if (existingMember.rows.length > 0) {
      throw new Error(
        "This person is already a member of this church"
      );
    }

    /* =========================
       3. CREATE MEMBER
    ========================== */

    const memberResult =
      await client.query(
        `
        INSERT INTO members (
          church_id,
          profile_id,
          status
        )
        VALUES ($1, $2, 'active')
        RETURNING *
        `,
        [
          churchId,
          profileId,
        ]
      );

    const newMember = memberResult.rows[0];

    /* =========================
       4. CREATE MEMBER RECORD
    ========================== */

    const recordResult =
      await client.query(
        `
        INSERT INTO member_records (
          member_id,
          baptized,
          baptismal_date,
          marital_status,
          membership_type,
          emergency_contact_name,
          emergency_contact_relationship,
          emergency_contact_phone
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *
        `,
        [
          newMember.id,
          member_record.baptized ?? "unknown",
          member_record.baptismal_date || null,
          member_record.marital_status || null,
          member_record.membership_type,
          member_record.emergency_contact_name || null,
          member_record.emergency_contact_relationship || null,
          member_record.emergency_contact_phone || null,
        ]
      );

    const newRecord = recordResult.rows[0];

    /* =========================
       COMMIT
    ========================== */

    await client.query("COMMIT");

    return {
      profile: resolvedProfile,
      member: newMember,
      member_record: newRecord,
      reused_profile: existingProfileResult.rows.length > 0,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function fetchChildren(churchId) {
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.full_name,
      c.date_of_birth,
      c.gender,
      c.department,

      c.dedication,
      c.dedication_date,
      c.notes,

      c.created_at,
      c.updated_at,

      m.id AS parent_member_id,

      p.full_name AS parent_name,
      p.phone AS parent_phone,
      p.email AS parent_email,

      COALESCE(status_log.new_status, 'active') AS status

    FROM children c

    LEFT JOIN members m
      ON m.id = c.parent_id

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    LEFT JOIN LATERAL (
      SELECT
        l.new_status
      FROM child_status_logs l
      WHERE l.child_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 1
    ) status_log ON TRUE

    WHERE c.church_id = $1

    ORDER BY c.full_name ASC
    `,
    [churchId]
  );

  return result.rows;
}


export async function addChildService({
  churchId,
  payload,
  createdBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      parent_member_id,
      child,
    } = payload;

    const {
      full_name,
      date_of_birth,
      gender,
      dedication,
      dedication_date,
      notes,
    } = child;

    if (!full_name) {
      throw new Error("Child full name is required");
    }

    /* =========================
       1. VALIDATE PARENT
    ========================== */

    const parentCheck = await client.query(
      `
      SELECT id
      FROM members
      WHERE id = $1
        AND church_id = $2
      LIMIT 1
      `,
      [parent_member_id, churchId]
    );

    if (parentCheck.rows.length === 0) {
      throw new Error("Parent member not found in this church");
    }

    /* =========================
       2. DUPLICATE CHECK
    ========================== */

    const duplicateCheck = await client.query(
      `
      SELECT id
      FROM children
      WHERE church_id = $1
        AND LOWER(full_name) = LOWER($2)
        AND date_of_birth = $3
      LIMIT 1
      `,
      [churchId, full_name, date_of_birth]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error("Child already exists in this church");
    }

    /* =========================
       3. INSERT CHILD
    ========================== */

    const result = await client.query(
      `
      INSERT INTO children (
        full_name,
        parent_id,
        date_of_birth,
        gender,
        dedication,
        dedication_date,
        notes,
        church_id,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        full_name,
        parent_member_id,
        date_of_birth,
        gender,
        dedication ?? "unknown",
        dedication_date || null,
        notes || null,
        churchId,
        createdBy,
      ]
    );

    await client.query("COMMIT");

    return { child: result.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
export async function searchParentMembers({
  churchId,
  query,
}) {
  const searchTerm = query?.trim();

  if (!searchTerm || searchTerm.length < 2) {
    return [];
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        m.id,
        p.full_name,
        p.phone
      FROM members m
      INNER JOIN profiles p
        ON p.id = m.profile_id
      WHERE m.church_id = $1
        AND m.status = 'active'
        AND (
          p.full_name ILIKE $2
          OR p.phone ILIKE $2
        )
      ORDER BY
        CASE
          WHEN p.full_name ILIKE $2 THEN 0
          WHEN p.phone ILIKE $2 THEN 1
          ELSE 2
        END,
        p.full_name ASC
      LIMIT 10
      `,
      [churchId, `%${searchTerm}%`]
    );

    return result.rows;
  } finally {
    client.release();
  }
}
export async function fetchTransfers(churchId) {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t.member_id,
      t.transfer_type,
      t.status,
      t.reason,
      t.created_at,
      t.external_church_name,
      t.conference_id,

      /* member info */
      p.full_name AS member_name,
      p.phone,
      /* source church */
      sc.id AS source_church_id,
      sc.name AS source_church_name,
      sc.church_code AS source_church_code,

      /* destination church */
      dc.id AS destination_church_id,
      dc.name AS destination_church_name,
      dc.church_code AS destination_church_code

    FROM transfers t

    /* member */
    LEFT JOIN members m
      ON m.id = t.member_id

    LEFT JOIN profiles p
      ON p.id = m.profile_id

    /* source church */
    LEFT JOIN churches sc
      ON sc.id = t.source_church_id

    /* destination church */
    LEFT JOIN churches dc
      ON dc.id = t.destination_church_id

    WHERE t.source_church_id = $1
       OR t.destination_church_id = $1

    ORDER BY t.created_at DESC
    `,
    [churchId]
  );

  return result.rows;
}
export async function createTransferRequest({
  memberId,
  profileId,
  sourceChurchId,
  destinationChurchId,
  destinationType,
  externalChurchName,
  conferenceId, // only for external transfers
  reason,
  requestedBy,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =========================
       1. BASIC VALIDATION
    ========================== */

    if (!memberId) throw new Error("memberId is required");
    if (!profileId) throw new Error("profileId is required");
    if (!sourceChurchId) throw new Error("sourceChurchId is required");

    const hasInternal = !!destinationChurchId;
    const hasExternal = !!externalChurchName;

    if (hasInternal && hasExternal) {
      throw new Error(
        "Cannot specify both internal and external destination"
      );
    }

    if (!hasInternal && !hasExternal) {
      throw new Error("Destination is required");
    }

    /* =========================
       2. INTERNAL TRANSFER FLOW
    ========================== */

    if (hasInternal) {
      if (destinationChurchId === sourceChurchId) {
        throw new Error(
          "Destination church must be different from source church"
        );
      }

      const churchCheck = await client.query(
        `
        SELECT conference_id
        FROM churches
        WHERE id = $1
        `,
        [destinationChurchId]
      );

      if (!churchCheck.rows.length) {
        throw new Error("Destination church not found");
      }

      conferenceId = churchCheck.rows[0].conference_id;
    }

    /* =========================
       3. EXTERNAL TRANSFER FLOW
    ========================== */

    let normalizedExternalChurch = null;

    if (hasExternal) {
      if (!externalChurchName) {
        throw new Error(
          "externalChurchName is required"
        );
      }

      if (!conferenceId) {
        throw new Error(
          "conferenceId is required for external transfers"
        );
      }

      const confCheck = await client.query(
        `
        SELECT id
        FROM conferences
        WHERE id = $1
        `,
        [conferenceId]
      );

      if (!confCheck.rows.length) {
        throw new Error("Invalid conference");
      }

      const baseName =
        sanitizeChurchBaseName(
          externalChurchName
        );

      normalizedExternalChurch =
        buildFullChurchName(baseName);
    }

    /* =========================
       4. PREVENT DUPLICATE TRANSFERS
    ========================== */

    const existingTransfer = await client.query(
      `
      SELECT id
      FROM transfers
      WHERE member_id = $1
        AND status = 'requested'
      LIMIT 1
      `,
      [memberId]
    );

    if (existingTransfer.rows.length > 0) {
      throw new Error(
        "Member already has a pending transfer request"
      );
    }

    /* =========================
       5. INSERT TRANSFER
    ========================== */

    const result = await client.query(
      `
      INSERT INTO transfers (
        member_id,
        profile_id,
        transfer_type,
        source_church_id,
        destination_church_id,
        external_church_name,
        conference_id,
        status,
        reason,
        requested_by,
        destination_type
      )
      VALUES (
        $1,$2,'transfer_out',$3,$4,$5,$6,'requested',$7,$8,$9
      )
      RETURNING *
      `,
      [
        memberId,
        profileId,
        sourceChurchId,
        destinationChurchId || null,
        normalizedExternalChurch,
        conferenceId || null,
        reason,
        requestedBy,
        destinationType
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function fetchClerkOverview(churchId) {
  const result = await pool.query(
    `
    SELECT

      /* -------------------------
         MEMBERS STATS
      -------------------------- */
      COUNT(*) FILTER (WHERE church_id = $1) AS total_members,

      COUNT(*) FILTER (
        WHERE church_id = $1
        AND status = 'active'
      ) AS active_members,

      COUNT(*) FILTER (
        WHERE church_id = $1
        AND status IN ('inactive', 'removed', 'suspended')
      ) AS missing_members,

      /* -------------------------
         TRANSFER STATS
      -------------------------- */
      (
        SELECT COUNT(*)
        FROM transfers t
        WHERE t.source_church_id = $1
        AND t.status = 'requested'
      ) AS pending_transfers

    FROM members
    `,
    [churchId]
  );

  return result.rows[0];
}