const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sanitizeUser } = require('../utils/userPresenter');

const searchUsers = async (currentUserId, query = '') => {
  const filter = {
    _id: { $ne: currentUserId },
    isActive: true,
  };

  if (query.trim()) {
    const regex = new RegExp(query.trim(), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const users = await User.find(filter)
    .sort({ name: 1 })
    .limit(50);

  return users.map(sanitizeUser);
};

const getUserById = async (currentUserId, userId) => {
  if (currentUserId.toString() === userId.toString()) {
    throw new ApiError(400, 'Cannot fetch your own profile through this endpoint');
  }

  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeUser(user);
};

const updateProfile = async (userId, payload) => {
  const allowed = ['name', 'phone', 'avatarUrl', 'deviceToken'];
  const updates = {};

  allowed.forEach((key) => {
    if (payload[key] !== undefined) {
      updates[key] = payload[key];
    }
  });

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeUser(user);
};

module.exports = {
  searchUsers,
  getUserById,
  updateProfile,
};
