// utils/controller.js

/**
 * Wraps async route handlers and forwards errors
 * to Express's global error handler.
 */
export const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Generic response handler.
 *
 * Executes a service function and sends its result
 * as a JSON response.
 */
export const respond =
  ({ status = 200, transform = (result) => result } = {}) =>
  (service) =>
    asyncHandler(async (req, res) => {
      const result = await service(req);

      return res
        .status(status)
        .json(transform(result));
    });

/**
 * GET / generic successful response.
 */
export const getHandler = respond();

/**
 * POST / generic successful response.
 */
export const createHandler = respond({
  status: 201,
});

/**
 * PUT / PATCH generic successful response.
 */
export const updateHandler = respond();

/**
 * DELETE response.
 */
export const deleteHandler = (
  message = "Deleted successfully."
) =>
  respond({
    transform: () => ({
      success: true,
      message,
    }),
  });