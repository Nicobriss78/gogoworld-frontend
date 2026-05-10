import { fetchDashboardData } from "./organizer-dashboard-api.js?v=3";
import { renderDashboard } from "./organizer-dashboard-renderer.js?v=12";
import { dashboardState } from "./organizer-dashboard-state.js?v=3";
import { buildDashboardStats } from "./organizer-dashboard-widgets.js?v=12";

export async function initDashboard() {
  dashboardState.loading = true;
  dashboardState.error = null;

  renderDashboard(dashboardState);

  try {
    const data = await fetchDashboardData();

    dashboardState.events = data.events;
    dashboardState.promos = data.promos;
    dashboardState.trills = data.trills;
    dashboardState.stats = buildDashboardStats(data);
  } catch (error) {
    console.error("[OrganizerDashboard] init failed", error);
    dashboardState.error = error.message || "Errore sconosciuto";
  } finally {
    dashboardState.loading = false;
    renderDashboard(dashboardState);
  }
}
