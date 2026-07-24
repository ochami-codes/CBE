// middleware/loadMemberships.js

import { supabaseAdmin } from "../supabaseClient.js";
import { getUserPermissions } from "../config/roles.js";

export async function loadMemberships(req, res, next) {
  try {
    const profileId = req.profile.id;
    const activeChurchId = req.profile.active_church_id;

    // -----------------------------------------
    // Load all churches the user belongs to
    // -----------------------------------------

    const { data: memberships, error: membershipsError } =
      await supabaseAdmin
        .from("members")
        .select(`
          id,
          church_id,
          status,
          churches (
            id,
            name
          )
        `)
        .eq("profile_id", profileId);

    if (membershipsError) {
      throw membershipsError;
    }

    // -----------------------------------------
    // Simple church list
    // -----------------------------------------

    const churches = (memberships || [])
      .map((membership) => ({
        id: membership.churches?.id,
        name: membership.churches?.name,
        status: membership.status,
      }))
      .filter((church) => church.id);

    // -----------------------------------------
    // Find active church membership
    // -----------------------------------------

    const activeMembership = (memberships || []).find(
      (membership) =>
        membership.church_id === activeChurchId
    );

    let activeChurch = null;

    if (activeMembership) {
      // -----------------------------------------
      // Load roles
      // -----------------------------------------

      const { data: memberRoles, error: rolesError } =
        await supabaseAdmin
          .from("member_roles")
          .select(`
            roles (
              name
            )
          `)
          .eq("member_id", activeMembership.id);

      if (rolesError) {
        throw rolesError;
      }

      // -----------------------------------------
      // Load departments
      // -----------------------------------------

      const {
        data: memberDepartments,
        error: departmentsError,
      } = await supabaseAdmin
        .from("member_departments")
        .select(`
          departments (
            id,
            name
          )
        `)
        .eq("member_id", activeMembership.id);

      if (departmentsError) {
        throw departmentsError;
      }

      // -----------------------------------------
      // Normalize roles
      // -----------------------------------------

      const roles = [
        ...new Set(
          (memberRoles || [])
            .map((item) => item.roles?.name)
            .filter(Boolean)
        ),
      ];

      // -----------------------------------------
      // Resolve permissions from roles
      // -----------------------------------------

      const permissions =
        getUserPermissions(roles);

      // -----------------------------------------
      // Normalize departments
      // -----------------------------------------

      const departments = (memberDepartments || [])
        .map((item) => item.departments)
        .filter(Boolean);

      // -----------------------------------------
      // Build active church context
      // -----------------------------------------

      activeChurch = {
        id: activeMembership.church_id,

        name:
          activeMembership.churches?.name ?? null,

        membershipId:
          activeMembership.id,

        status:
          activeMembership.status,

        roles,

        permissions,

        departments,
      };
    }

    // -----------------------------------------
    // Attach normalized context
    // -----------------------------------------

    req.churchContext = {
      activeChurch,
      churches,
    };

    next();
  } catch (err) {
    console.error(
      "Membership load error:",
      err
    );

    return res.status(500).json({
      message: "Membership error",
    });
  }
}
