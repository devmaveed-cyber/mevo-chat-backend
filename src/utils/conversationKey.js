const buildParticipantKey = (userIdA, userIdB) => {
  const ids = [userIdA.toString(), userIdB.toString()].sort();
  return `${ids[0]}:${ids[1]}`;
};

module.exports = { buildParticipantKey };
