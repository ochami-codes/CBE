import { buildPeriodLabel } from "./buildPeriodLabel.js";
export function buildSummaryReportHTML(data, meta) {
  const periodLabel = buildPeriodLabel(meta);

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
          <img class="logo" src="https://your-adventist-logo-url.png" />
          <div class="title">Church Summary Report</div>
          <div class="subtitle">${periodLabel}</div>
        </div>

        <!-- OVERVIEW -->
        <div class="section">
          <h3>Overview</h3>
          <div class="grid">
            <div class="item"><span class="label">Total Members:</span> ${data.total_members ?? 0}</div>
            <div class="item"><span class="label">Active Members:</span> ${data.active_members ?? 0}</div>
            <div class="item"><span class="label">Missing Members:</span> ${data.missing_members ?? 0}</div>
            <div class="item"><span class="label">Children:</span> ${data.total_children ?? 0}</div>
          </div>
        </div>

        <!-- TRANSFERS -->
        <div class="section">
          <h3>Transfers</h3>
          <div class="grid">
            <div class="item"><span class="label">Pending:</span> ${data.transfers?.pending ?? 0}</div>
            <div class="item"><span class="label">Approved:</span> ${data.transfers?.approved ?? 0}</div>
            <div class="item"><span class="label">Rejected:</span> ${data.transfers?.rejected ?? 0}</div>
            <div class="item"><span class="label">Completed:</span> ${data.transfers?.completed ?? 0}</div>
          </div>
        </div>

        <!-- MEMBERS BREAKDOWN -->
        <div class="section">
          <h3>Member Breakdown</h3>
          <div class="grid">
            <div class="item"><span class="label">Baptized:</span> ${data.baptized_members ?? 0}</div>
            <div class="item"><span class="label">Unbaptized:</span> ${data.unbaptized_members ?? 0}</div>
            <div class="item"><span class="label">Male:</span> ${data.male_members ?? 0}</div>
            <div class="item"><span class="label">Female:</span> ${data.female_members ?? 0}</div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          Generated automatically by Church Management System
        </div>

      </body>
    </html>
  `;
}