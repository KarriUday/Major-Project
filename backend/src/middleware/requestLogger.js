const requestLogger = (req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(
      `[${level}] ${timestamp} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

module.exports = requestLogger;
