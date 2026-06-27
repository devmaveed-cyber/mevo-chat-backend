const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signToken = (userId) =>
  jwt.sign({ sub: userId }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = { signToken, verifyToken };
