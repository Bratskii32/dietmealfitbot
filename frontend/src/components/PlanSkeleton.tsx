export function PlanSkeleton() {
  return (
    <div className="screen-content">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
      <div className="skeleton skeleton-button" />
      <div className="skeleton skeleton-chart" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}
