import { MemberService } from "./member.service.js";

export const MemberController = {
  async getMembers(req, res, next) {
    try {
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

    const assignment =
      await MemberService.addMember({
        churchId:
          req.user.active_church_id,
        memberId: req.body.memberId,
        departmentId: req.body.departmentId
      });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
},
  async deleteMember(req, res, next) {
    try {
      await MemberService.deleteMember({
        churchId:
          req.user.active_church_id,
        memberId: req.body.memberId,
        departmentId: req.body.departmentId
      });

      res.json({
        message: "Member removed",
      });
    } catch (error) {
      next(error);
    }
  },
};