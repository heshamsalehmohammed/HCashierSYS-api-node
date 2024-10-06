const { v4: uuidv4 } = require('uuid');

module.exports = function (app) {
  app.get('/create-session', (req, res) => {
    try {
      if (!req.session) {
        throw new Error('Session middleware not configured correctly');
      }

      if (!req.session.tabSessionId) {
        req.session.tabSessionId = require('uuid').v4();
      }

      res.json({
        message: 'Session created',
        tabSessionId: req.session.tabSessionId,
      });
    } catch (err) {
      res.status(500).send('Something failed.');
    }
  });
};