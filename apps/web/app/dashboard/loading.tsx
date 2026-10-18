export default function DashboardLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading your saved learning dashboard"
      className="dashboard-shell dashboard-loading"
    >
      <span className="sr-only">Loading your saved learning dashboard.</span>
      <div className="dashboard-skeleton dashboard-skeleton-nav" />
      <div className="dashboard-skeleton dashboard-skeleton-hero" />
      <div className="dashboard-loading-grid">
        <div className="dashboard-skeleton dashboard-skeleton-main" />
        <div className="dashboard-skeleton dashboard-skeleton-side" />
      </div>
    </main>
  );
}
