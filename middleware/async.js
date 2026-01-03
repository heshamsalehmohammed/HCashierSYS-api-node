module.exports = function (handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    }
    catch(ex) {
      next(ex);
    }
  };  
}

// not used anymore
// Using 'express-async-errors' in startup/logging.js to handle async errors globally