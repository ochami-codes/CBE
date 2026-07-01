export async function handleRemittanceAction({
  req,
  res,
  action,
  successMessage,
  statusCode = 200,
}) {
  try {
    const churchId =
      req.user.active_church_id;

    const profileId =
      req.user.id;

    const result =
      await action({
        churchId,
        profileId,
      });

    return res.status(statusCode).json({
      success: true,
      message: successMessage,
      data: result,
    });

  } catch (error) {

    console.error(
      "Remittance error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
}