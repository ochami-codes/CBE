import { SabbathSchoolService } from "./sabbathSchool.service.js";

export async function getLessonGuides(
  req,
  res
) {
  try {

    const churchId= req.user.active_church_id;
    const data =
      await SabbathSchoolService.getLessonGuides({
        churchId,
      });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function createLessonGuide(
  req,
  res
) {
  try {
    const lessonGuide =
      await SabbathSchoolService.createLessonGuide({
        churchId:
          req.user.active_church_id,

        createdBy:
          req.user.id,
        memberId: req.body.memberId,
        nameOverride: req.body.nameOverride,
        phoneNumber: req.body.phoneNumber,
        lessonType: req.body.lessonType,
        year: req.body.year,
        quarter: req.body.quarter,
        remarks: req.body.remarks
      });

    return res.status(201).json({
      success: true,
      message:
        "Lesson guide subscription created successfully.",
      data: lessonGuide,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
export async function createMyLessonGuide(
  req,
  res
) {
  try {
    const lessonGuide =
      await SabbathSchoolService.createLessonGuide({
        churchId:
          req.user.active_church_id,

        createdBy:
          req.user.id,

        memberId: req.user.active_member_id,
        lessonType: req.body.lessonType,
        year: req.body.year,
        quarter: req.body.quarter,
        remarks: req.body.remarks,  
      });

    return res.status(201).json({
      success: true,
      message:
        "Lesson guide subscription created successfully.",
      data: lessonGuide,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function updateLessonGuide(
  req,
  res
) {
  try {
    const lessonGuide =
      await SabbathSchoolService.updateLessonGuide({
        id: req.params.id,
        ...req.body,
      });

    return res.status(200).json({
      success: true,
      message:
        "Lesson guide subscription updated successfully.",
      data: lessonGuide,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function deleteLessonGuide(
  req,
  res
) {
  try {
    await SabbathSchoolService.deleteLessonGuide(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        "Lesson guide subscription deleted successfully.",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function createAttendance(
  req,
  res
) {
  try {
    const data =
      await SabbathSchoolService.createAttendance({
        churchId:
          req.user.active_church_id,

        recordedBy: req.user.id,
        departmentId: req.params.departmentId,
        ...req.body
      });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
export async function getAttendance(
  req,
  res
) {
  try {
    const data =
      await SabbathSchoolService.getAttendance({
        churchId:
          req.user.active_church_id,

        departmentId: req.params.departmentId,
      });

    return res.status(200).json({
      success: true,
      data,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}
export async function createOfferings(
  req,
  res
) {
  try {
    const offerings =
      await SabbathSchoolService.createOfferings({
        churchId: req.user.active_church_id,
        recordedBy: req.user.id,
        ...req.body,
      });

    return res.status(201).json({
      success: true,
      data: offerings,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error.message ??
        "Failed to create offerings.",
    });
  }
}
export async function getOfferings(
  req,
  res
) {
  try {
    const offerings =
      await SabbathSchoolService.getOfferings({
        churchId: req.user.active_church_id,
        departmentId:
          req.params.departmentId,
      });

    return res.status(200).json({
      success: true,
      data: offerings,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error.message ??
        "Failed to load offerings.",
    });
  }
}