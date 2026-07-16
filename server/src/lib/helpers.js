/**
 * Standard success response
 */
export const sendSuccess = (
  res,
  data = {},
  message = "Success",
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
  });
};

/**
 * Standard error response
 */
export const sendError = (
  res,
  message = "Something went wrong",
  statusCode = 500,
  errors = null,
) => {
  const payload = { status: "error", message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

/**
 * Async wrapper to avoid try/catch boilerplate in controllers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Paginate a mongoose query result
 */
export const paginate = async (model, query, options = {}) => {
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.min(parseInt(options.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  const [total, data] = await Promise.all([
    model.countDocuments(query),
    model.find(query).sort(sort).skip(skip).limit(limit),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get start of day in UTC
 */
export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day in UTC
 */
export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of current week (Monday)
 */
export const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Clamp a number between min and max
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
