import {
  fetchMembers,
  fetchChildren,
  fetchTransfers,
  createTransferRequest,
  updateTransfer,
  fetchClerkOverview,
  addMemberService,
  addChildService,
  searchParentMembers,
} from "./clerk.service.js";
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
export async function updateTransferStatus(req, res) {
  try {
    console.log("➡️ updateTransferStatus HIT");
    console.log("PARAMS:", req.params);
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const transferId = req.params.id;
    const user = req.user;

    const data = await updateTransfer({
      transferId,
      status: req.body.status,
      reason: req.body.reason,
      churchId: user.active_church_id,
      changedBy: user.id,
    });

    res.json(data);
  } catch (err) {
    console.error("❌ updateTransferStatus error:");
    console.error("MESSAGE:", err.message);
    console.error("STACK:", err.stack);

    res.status(500).json({ message: "Failed to update transfer" });
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