// utils/controller.js

export const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (err) {
    next(err);
  }
};

export const respond =
  ({ status = 200, transform = (result) => result } = {}) =>
  (service) =>
    asyncHandler(async (req, res) => {
      const result = await service(req);

      res.status(status).json(transform(result));
    });

export const getHandler = respond();

export const createHandler = respond({
  status: 201,
});

export const updateHandler = respond();

export const deleteHandler = (message = "Deleted successfully.") =>
  respond({
    transform: () => ({ message }),
  });