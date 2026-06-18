export const eventsState = {
  loading: false,
  error: null,
  actionError: null,
  actionMessage: null,
  sourceLabel: "",
  confirmDeleteId: null,
  deletingId: null,
  events: [],
  filters: {
    query: "",
    approvalStatus: "all",
    privacy: "all",
    temporal: "all",
    special: "all",
    sort: "default",
  },
};
