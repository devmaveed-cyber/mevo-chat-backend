const userService = require('../services/userService');

const searchUsers = async (req, res) => {
  const users = await userService.searchUsers(req.user._id, req.query.q || '');
  res.status(200).json({ success: true, data: users });
};

const getUserById = async (req, res) => {
  const user = await userService.getUserById(req.user._id, req.params.id);
  res.status(200).json({ success: true, data: user });
};

const updateProfile = async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.status(200).json({ success: true, data: user });
};

module.exports = {
  searchUsers,
  getUserById,
  updateProfile,
};
