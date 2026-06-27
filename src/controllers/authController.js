const authService = require('../services/authService');

const register = async (req, res) => {
  const payload = await authService.register(req.body);
  res.status(201).json({ success: true, data: payload });
};

const login = async (req, res) => {
  const payload = await authService.login(req.body);
  res.status(200).json({ success: true, data: payload });
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user._id);
  res.status(200).json({ success: true, data: user });
};

const logout = async (req, res) => {
  await authService.logout(req.user._id);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
