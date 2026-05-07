export const organizerEventAccessState = {
  loading: false,
  saving: false,
  error: null,
  success: null,
  eventId: null,
  event: null,
  access: {
    allowedUsers: [],
    bannedUsers: [],
    invitedUsers: [],
    revokedUsers: [],
  },
  confirmRotateCode: false,
  rotatingCode: false,
  confirmBanUserId: null,
  banningUserId: null,
  unbanningUserId: null,
};
