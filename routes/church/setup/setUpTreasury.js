import { FundsService } from "../../treasury/services/FundService.js";
import { FundGroupsService } from "../../treasury/services/FundGroupsService.js";
export async function setupChurchTreasury(
  client,
  churchId
) {

  const trustGroup = await FundGroupsService.createFundGroup(client, {
    churchId,
    name: "Trust Funds",
    description:
      "Funds with conference or external obligations",
    groupType: "trust",
  });


  const localGroup = await FundGroupsService.createFundGroup(client, {
    churchId,
    name: "Local Church Funds",
    description:
      "Funds controlled by the local church",
    groupType: "local",
  });


  const trustFunds = await FundsService.createFunds(client, {
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



  const localFunds = await FundsService.createFunds(client, {
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
        code: "THANKSGIVING_SHARE",
        name: "Thanksgiving Offering Share",
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



  const findFund = (list, code) =>
    list.find(f => f.fund_code === code);



  const allocations = [
    {
      source: findFund(trustFunds, "COMBINED"),
      target: findFund(localFunds, "COMBINED_SHARE"),
      percentage: 50,
    },
    {
      source: findFund(trustFunds, "THANKSGIVING"),
      target: findFund(localFunds, "THANKSGIVING_SHARE"),
      percentage: 50,
    },
  ];



  for (const item of allocations) {

    await client.query(
      `
      INSERT INTO treasury_fund_allocations (
        source_fund_id,
        target_fund_id,
        percentage,
        created_at
      )
      VALUES ($1,$2,$3,NOW())
      `,
      [
        item.source.id,
        item.target.id,
        item.percentage,
      ]
    );

  }

}