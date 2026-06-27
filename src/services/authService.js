const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');
const { sanitizeUser } = require('../utils/userPresenter');

const buildAuthPayload = (user) => ({
  user: sanitizeUser(user),
  token: signToken(user._id),
});

const register = async ({ name, email, password, phone }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
  });

  return buildAuthPayload(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is disabled');
  }

  user.isOnline = true;
  user.lastSeenAt = new Date();
  await user.save();

  return buildAuthPayload(user);
};

const getMe = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeUser(user);
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeenAt: new Date(),
  });
};

module.exports = {
  register,
  login,
  getMe,
  logout,
};
