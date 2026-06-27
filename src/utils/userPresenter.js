const sanitizeUser = (user) => ({
  id: user._id?.toString?.() ?? String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  avatarUrl: user.avatarUrl || '',
  isOnline: user.isOnline,
  lastSeenAt: user.lastSeenAt,
  createdAt: user.createdAt,
});

module.exports = { sanitizeUser };
