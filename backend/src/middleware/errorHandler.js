const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err);

  // Validation errors
  if (err.validation) {
    return res.status(400).json({
      ok: false,
      error: 'Validation error',
      details: err.details,
    });
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      ok: false,
      error: 'Unique constraint violation',
      field: err.meta?.target?.[0],
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      ok: false,
      error: 'Record not found',
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
