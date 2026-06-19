async function createFundGroup(client, {
  churchId,
  name,
  description,
  groupType,
}) {
  const result = await client.query(
    `
    INSERT INTO treasury_fund_groups (
      church_id,
      name,
      description,
      group_type,
      created_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, name
    `,
    [
      churchId,
      name,
      description,
      groupType,
    ]
  );

  return result.rows[0];
}


async function createFunds(client, {
  churchId,
  groupId,
  funds,
}) {
  for (const fund of funds) {
    await client.query(
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
      `,
      [
        churchId,
        groupId,
        fund.category ?? null, // only local funds have category
        fund.code,
        fund.name,
      ]
    );
  }
}


export async function setupChurchTreasury(
  client,
  churchId
) {

  /* =========================
     FUND GROUPS
  ========================= */

  const trustGroup = await createFundGroup(client, {
    churchId,
    name: "Trust Funds",
    description:
      "Funds with conference or external obligations",
    groupType: "trust",
  });


  const localGroup = await createFundGroup(client, {
    churchId,
    name: "Local Church Funds",
    description:
      "Funds controlled by the local church",
    groupType: "local",
  });



  /* =========================
     TRUST FUNDS
  ========================= */

  await createFunds(client, {
    churchId,
    groupId: trustGroup.id,

    funds: [
      {
        code: "TITHE",
        name: "Tithe",
      },
      {
        code: "COMBINED",
        name: "Combined Offering",
      },
      {
        code: "CAMP",
        name: "Camp Meeting Offering",
      },
      {
        code: "CONF_EVANGELISM",
        name: "Conference Evangelism",
      },
      {
        code: "STATION_DEV",
        name: "Station Development Fund",
      },
      {
        code: "THANKSGIVING",
        name: "Thanksgiving",
      },
    ],
  });



  /* =========================
     LOCAL FUNDS
  ========================= */

  await createFunds(client, {
    churchId,
    groupId: localGroup.id,

    funds: [
      {
        code: "BUILDING",
        name: "Church Building",
        category: "restricted",
      },
      {
        code: "COMBINED_SHARE",
        name: "Combined Offering Share",
        category: "general",
      },
      {
        code: "LOCAL_EVANGELISM",
        name: "Local Evangelism Fund",
        category: "restricted",
      },
      {
        code: "CAMP_EXPENSES",
        name: "Camp Expenses",
        category: "restricted",
      },
    ],
  });

}