import { buildPeriodLabel } from "./buildPeriodLabel.js";
import { getLogoBase64 } from "../../../../utils/getLogoBased64.js";

export function buildSummaryReportHTML(data, meta) {
  const periodLabel = buildPeriodLabel(meta);
  const logoBase64 = getLogoBase64();

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 30px;
            color: #222;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 25px;
          }

          .logo {
            width: 80px;
            margin-bottom: 10px;
          }

          .title {
            font-size: 20px;
            font-weight: bold;
          }

          .subtitle {
            font-size: 13px;
            color: #666;
            margin-top: 4px;
          }

          .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #eee;
            border-radius: 8px;
          }

          .section h3 {
            margin: 0 0 10px 0;
            font-size: 15px;
            border-bottom: 1px solid #f0f0f0;
            padding-bottom: 5px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            font-size: 13px;
          }

          .item {
            padding: 5px 0;
          }

          .label {
            font-weight: bold;
            color: #444;
          }

          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #888;
          }
        </style>
      </head>

      <body>

        <!-- HEADER -->
        <div class="header">
          <img class="logo" src="data:image/png;base64,${logoBase64}" />
          <div class="title">Church Summary Report</div>
          <div class="subtitle">${periodLabel}</div>
        </div>

        <!-- CHURCH INFO -->
        <div class="section">
          <h3>Church Information</h3>
          <div class="grid">
            <div class="item"><span class="label">Church Name:</span> ${data.church?.name ?? "N/A"}</div>
            <div class="item"><span class="label">Conference:</span> ${data.church?.conference_name ?? "N/A"}</div>
          </div>
        </div>

        <!-- MEMBERSHIP -->
        <div class="section">
          <h3>Membership Overview</h3>
          <div class="grid">
            <div class="item"><span class="label">Opening Balance:</span> ${data.membership?.opening_balance ?? 0}</div>
            <div class="item"><span class="label">Closing Balance:</span> ${data.membership?.closing_balance ?? 0}</div>
            <div class="item"><span class="label">Total Members:</span> ${data.membership?.total_members ?? 0}</div>
            <div class="item"><span class="label">Active Members:</span> ${data.membership?.active_members ?? 0}</div>
            <div class="item"><span class="label">Missing Members:</span> ${data.membership?.missing_members ?? 0}</div>
            <div class="item"><span class="label">New Members:</span> ${data.membership?.new_members ?? 0}</div>
            <div class="item"><span class="label">Transfers In:</span> ${data.membership?.transfers_in ?? 0}</div>
            <div class="item"><span class="label">Transfers Out:</span> ${data.membership?.transfers_out ?? 0}</div>
            <div class="item"><span class="label">Net Growth:</span> ${data.membership?.net_growth ?? 0}</div>
          </div>
        </div>

        <!-- CHILDREN -->
        <div class="section">
          <h3>Children</h3>
          <div class="grid">
            <div class="item"><span class="label">Total Children:</span> ${data.children?.total_children ?? 0}</div>
            <div class="item"><span class="label">New Children:</span> ${data.children?.new_children ?? 0}</div>
            <div class="item"><span class="label">Dedicated:</span> ${data.children?.dedicated ?? 0}</div>
            <div class="item"><span class="label">Not Dedicated:</span> ${data.children?.not_dedicated ?? 0}</div>
            <div class="item"><span class="label">Unknown:</span> ${data.children?.unknown ?? 0}</div>
          </div>
        </div>

        <!-- TRANSFERS -->
        <div class="section">
          <h3>Transfers</h3>
          <div class="grid">
            <div class="item"><span class="label">Pending:</span> ${data.transfers?.pending ?? 0}</div>
            <div class="item"><span class="label">Pending Destination:</span> ${data.transfers?.pending_destination ?? 0}</div>
            <div class="item"><span class="label">Rejected:</span> ${data.transfers?.rejected ?? 0}</div>
            <div class="item"><span class="label">Completed:</span> ${data.transfers?.completed ?? 0}</div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          Generated automatically by Church Management System • ${new Date(data.generated_at).toLocaleString()}
        </div>

      </body>
    </html>
  `;
}