export const eventsState = {
  loading: false,
  error: null,
  actionError: null,
  actionMessage: null,
  confirmDeleteId: null,
  deletingId: null,
  events: [],
  filters: {
    query: "",
    approvalStatus: "all",
    visibility: "all",
    privacy: "all",
  },
};
