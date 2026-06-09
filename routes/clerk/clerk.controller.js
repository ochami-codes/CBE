import {
  fetchMembers,
  fetchChildren,
  fetchTransfers,
  createTransferRequest,
  fetchClerkOverview,
  addMemberService,
  updateMemberService,
  addChildService,
  updateChildService,
  searchParentMembers,
  getSummaryReportService,
} from "./clerk.service.js";
import { approveTransfer } from "./services/approveTransfer.js";
import { rejectTransfer } from "./services/rejectTransfer.js";
import { generateReportPDF } from "./services/reports/generateReportPDF.js";
import { buildSummaryReportHTML } from "./services/reports/buildSummaryReportHTML.js";

/* -------------------------
   MEMBERS
-------------------------- */
export async function getMembers(req, res) {
  try {
    console.log("➡️ getMembers HIT");
    console.log("USER:", req.user);
    console.log("CHURCH:", req.user?.active_church_id);

    const data = await fetchMembers(req.user.active_church_id);

    res.json(data);
  } catch (err) {
    console.error("❌ getMembers error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({ message: "Failed to fetch members" });
  }
}
export async function addMember(req, res) {
  try {
    console.log("➡️ addMember HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const churchId = req.user.active_church_id;

    const data = await addMemberService({
      churchId,
      payload: req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error("❌ addMember error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: "Failed to add member",
    });
  }
}

export async function updateMember(req, res) {
  try {
    console.log("➡️ updateMember HIT");
    console.log("PARAMS:", req.params);
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { memberId } = req.params;
    const churchId = req.user.active_church_id;

    const {
      profile,
      member,
      member_record,
    } = req.body;

    const data = await updateMemberService({
      memberId,
      churchId,
      payload: {
        profile,
        member,
        member_record,
      },
      updatedBy: req.user.id,
    });

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ updateMember error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: err.message || "Failed to update member",
    });
  }
}
/* -------------------------
   CHILDREN
-------------------------- */
export async function getChildren(req, res) {
  try {
    console.log("➡️ getChildren HIT");
    console.log("USER:", req.user);

    const data = await fetchChildren(req.user.active_church_id);

    res.json(data);
  } catch (err) {
    console.error("❌ getChildren error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({ message: "Failed to fetch children" });
  }
}

export async function addChild(req, res) {
  try {
    console.log("➡️ addChild HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const churchId = req.user.active_church_id;

    const data = await addChildService({
      churchId,
      payload: req.body,
      createdBy: req.user.id,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error("❌ addChild error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: "Failed to add child",
    });
  }
}
export async function updateChild(req, res) {
  try {
    console.log("➡️ updateChild HIT");
    console.log("PARAMS:", req.params);
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { childId } = req.params;
    const churchId = req.user.active_church_id;

    const { parent_member_id, child } = req.body;

    const data = await updateChildService({
      childId,
      churchId,
      payload: {
        parent_member_id,
        child,
      },
      updatedBy: req.user.id,
    });

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ updateChild error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: err.message || "Failed to update child",
    });
  }
}
export async function searchParents(req, res) {
  try {
    const churchId = req.user.active_church_id;
    const query =
  req.query.q ||
  req.query.query ||
  req.query.search;

    const data = await searchParentMembers({
      churchId,
      query,
    });

    res.json(data);
  } catch (err) {
    console.error("❌ searchParents error:", err.message);

    res.status(500).json({
      message: "Failed to search parents",
    });
  }
}
/* -------------------------
   TRANSFERS (LIST)
-------------------------- */
export async function getTransfers(req, res) {
  try {
    console.log("➡️ getTransfers HIT");
    console.log("USER:", req.user);

    const data = await fetchTransfers(req.user.active_church_id);

    res.json(data);
  } catch (err) {
    console.error("❌ getTransfers error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({ message: "Failed to fetch transfers" });
  }
}

export async function createTransfer(req, res) {
  try {
    console.log("➡️ createTransfer HIT");
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const user = req.user;

    const {
      destination_church_id,
      external_church_name,
      conference_id,
      reason,
    } = req.body;

    /* =========================
       1. DETERMINE DESTINATION TYPE
    ========================== */

    const hasInternal = !!destination_church_id;
    const hasExternal = !!external_church_name;

    if (hasInternal && hasExternal) {
      throw new Error(
        "Cannot specify both internal and external destination"
      );
    }

    if (!hasInternal && !hasExternal) {
      throw new Error("Destination is required");
    }

    const destinationType = hasInternal
      ? "internal"
      : "external";

    /* =========================
       2. VALIDATE EXTERNAL CONFERENCE
    ========================== */

    let externalConferenceId = null;

    if (destinationType === "external") {
      if (!conference_id) {
        throw new Error(
          "conference_id is required for external church transfers"
        );
      }

      externalConferenceId = conference_id;
    }

    /* =========================
       3. CALL SERVICE
    ========================== */

    const data = await createTransferRequest({
      memberId: user.active_membership?.id,
      profileId: user.id,
      sourceChurchId: user.active_church_id,
      destinationChurchId: destination_church_id,
      externalChurchName: external_church_name,
      conferenceId: externalConferenceId,
      destinationType,
      reason,
      requestedBy: user.id,
    });

    res.status(201).json(data);
  } catch (err) {
    console.error("❌ createTransfer error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: "Failed to create transfer",
    });
  }
}


export async function getClerkOverview(req, res) {
  try {
    console.log("➡️ getClerkOverview HIT");
    console.log("USER:", req.user);

    const churchId = req.user.active_church_id;

    const data = await fetchClerkOverview(churchId);

    res.json(data);
  } catch (err) {
    console.error("❌ getClerkOverview error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: "Failed to fetch clerk overview",
    });
  }
}
export async function approveTransferController(
  req,
  res
) {
  try {
    const transfer =
      await approveTransfer({
        transferId: req.params.id,
        processedBy:
          req.user.profileId,
        notes: req.body.notes,
      });

    return res.status(200).json({
      success: true,
      transfer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
export async function rejectTransferController(
  req,
  res
) {
  try {
    const transfer =
      await rejectTransfer({
        transferId: req.params.id,
        processedBy: req.user.id,
        notes: req.body.notes,
      });

    return res.status(200).json({
      success: true,
      transfer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
export async function getSummaryReport(req, res) {
  try {
    console.log("➡️ getSummaryReport HIT");
    console.log("USER:", req.user);
    console.log("QUERY:", req.query);

    const churchId = req.user.active_church_id;

    const {
      period = "monthly",
      year,
      month,
      quarter,
      format = "json", // 👈 NEW
    } = req.query;

    const data = await getSummaryReportService({
      churchId,
      period,
      year: Number(year),
      month: month !== undefined ? Number(month) : undefined,
      quarter: quarter !== undefined ? Number(quarter) : undefined,
    });

    /* =========================
       RETURN JSON (default)
    ========================== */
    if (format === "json") {
      return res.json(data);
    }

    /* =========================
       RETURN PDF
    ========================== */
    if (format === "pdf") {
      const html = buildSummaryReportHTML(data, {
        period,
        year,
        month,
        quarter,
      });

      const pdfBuffer = await generateReportPDF(html);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=church-report-${period}-${year}.pdf`
      );

      return res.send(pdfBuffer);
    }

    return res.status(400).json({
      message: "Invalid format. Use json or pdf.",
    });
  } catch (err) {
    console.error("❌ getSummaryReport error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: "Failed to generate summary report",
    });
  }
}