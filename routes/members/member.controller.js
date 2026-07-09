import { MemberService } from "./member.service.js";

export const MemberController = {
  async getMembers(req, res, next) {
    try {
      console.log("query:", req.query);
      const members =
        await MemberService.getMembers({
          churchId:
            req.user.active_church_id,

          search:
            req.query.search,

          departmentId:
            req.query.department,
        });

      res.json({
        members,
      });
    } catch (error) {
      next(error);
    }
  },

  async addMember(req, res, next) {
  try {
    const {
      memberId,
      departmentId,
    } = req.body;

    const assignment =
      await MemberService.addMember({
        churchId:
          req.user.active_church_id,
        memberId,
        departmentId,
      });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
},
  async deleteMember(req, res, next) {
    try {
        const { memberId, departmentId } = req.body;
      await MemberService.deleteMember({
        churchId:
          req.user.active_church_id,
        memberId,
        departmentId
      });

      res.json({
        message: "Member removed",
      });
    } catch (error) {
      next(error);
    }
  },
};