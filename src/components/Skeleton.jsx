//Skeleton base block
function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton-block"
      style={{ width, height, borderRadius, ...style }}
    />
  )
}

//Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <SkeletonBlock width="140px" height="28px" borderRadius="8px" />
        <SkeletonBlock width="100px" height="36px" borderRadius="15px" />
      </div>

      {/* Toolbar */}
      <div className="dashboard-toolbar">
        <SkeletonBlock width="100%" height="42px" borderRadius="8px" />
        <div className="filter-tabs">
          {[80, 90, 80, 100].map((w, i) => (
            <SkeletonBlock key={i} width={`${w}px`} height="32px" borderRadius="20px" />
          ))}
        </div>
      </div>

      {/* Task cards */}
      <div className="task-list">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="task-card" style={{ cursor: 'default' }}>
            <div className="task-card-left" style={{ width: '100%' }}>
              <div className="task-card-top" style={{ marginBottom: '10px' }}>
                <SkeletonBlock width="55%" height="16px" borderRadius="6px" />
                <SkeletonBlock width="80px" height="22px" borderRadius="20px" />
              </div>
              <SkeletonBlock width="80px" height="12px" borderRadius="4px" />
            </div>
            <div className="task-card-right">
              <div className="task-card-stats" style={{ gap: '16px' }}>
                {[1, 2, 3].map(j => (
                  <div key={j} className="task-stat">
                    <SkeletonBlock width="36px" height="24px" borderRadius="12px" />
                    <SkeletonBlock width="40px" height="10px" borderRadius="4px" style={{ marginTop: '4px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

//Roster Skeleton
export function RosterSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <SkeletonBlock width="120px" height="28px" borderRadius="8px" />
        <SkeletonBlock width="60px" height="16px" borderRadius="4px" />
      </div>

      {/* Create list form card */}
      <div className="form-card" style={{ marginBottom: '16px' }}>
        <SkeletonBlock width="110px" height="14px" borderRadius="4px" style={{ marginBottom: '12px' }} />
        <div className="roster-align">
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="120px" height="40px" borderRadius="15px" style={{ flexShrink: 0 }} />
        </div>
      </div>

      {/* Class list cards */}
      <div className="task-list">
        {[1, 2, 3].map(i => (
          <div key={i} className="task-card" style={{ cursor: 'default' }}>
            <div className="task-card-left" style={{ width: '100%' }}>
              <div className="task-card-top" style={{ marginBottom: '10px' }}>
                <SkeletonBlock width="45%" height="16px" borderRadius="6px" />
                <SkeletonBlock width="32px" height="28px" borderRadius="6px" />
              </div>
              <SkeletonBlock width="90px" height="12px" borderRadius="4px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

//Roser Details Skeleton
export function RosterDetailSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <SkeletonBlock width="100px" height="16px" borderRadius="4px" />
        <SkeletonBlock width="70px" height="16px" borderRadius="4px" />
      </div>

      {/* Page title */}
      <SkeletonBlock width="200px" height="28px" borderRadius="8px" style={{ marginBottom: '20px' }} />

      {/* Add student form card */}
      <div className="form-card" style={{ marginBottom: '16px' }}>
        <SkeletonBlock width="150px" height="14px" borderRadius="4px" style={{ marginBottom: '12px' }} />
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
        </div>
        <div className="roster-action-btns">
          <SkeletonBlock width="130px" height="38px" borderRadius="15px" />
          <SkeletonBlock width="130px" height="38px" borderRadius="15px" />
        </div>
      </div>

      {/* Student list card */}
      <div className="form-card">
        <SkeletonBlock width="90px" height="14px" borderRadius="4px" style={{ marginBottom: '16px' }} />

        {/* Search + sort row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', justifyContent: 'space-between' }}>
          <SkeletonBlock width="75%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="100px" height="40px" borderRadius="10px" />
        </div>

        {/* Student rows */}
        <div className="student-list">
          <div className="student-list-header" style={{ marginBottom: '8px' }}>
            {[40, 120, 100, 60].map((w, i) => (
              <SkeletonBlock key={i} width={`${w}px`} height="10px" borderRadius="4px" />
            ))}
          </div>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="student-row">
              <SkeletonBlock width="24px" height="14px" borderRadius="4px" />
              <div className="student-info">
                <SkeletonBlock width="60%" height="14px" borderRadius="4px" />
                <SkeletonBlock width="40%" height="11px" borderRadius="4px" style={{ marginTop: '4px' }} />
              </div>
              <SkeletonBlock width="80px" height="14px" borderRadius="4px" />
              <SkeletonBlock width="76px" height="28px" borderRadius="6px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

//Task Details Skeleton
export function TaskDetailSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <SkeletonBlock width="80px" height="16px" borderRadius="4px" />
      </div>

      {/* Title + badge + action buttons */}
      <div className="task-details-header" style={{ marginBottom: '20px' }}>
        <div className="title-display-row" style={{ marginBottom: '8px' }}>
          <SkeletonBlock width="220px" height="28px" borderRadius="8px" />
          <SkeletonBlock width="80px" height="22px" borderRadius="20px" />
        </div>
        <div className="task-details-header-action-btns">
          <SkeletonBlock width="100px" height="32px" borderRadius="12px" />
          <SkeletonBlock width="130px" height="32px" borderRadius="12px" />
        </div>
      </div>

      {/* Summary grid — 3 cards */}
      <div className="summary-grid summary-grid-3" style={{ marginBottom: '20px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="summary-card" style={{ cursor: 'default' }}>
            <SkeletonBlock width="50px" height="11px" borderRadius="4px" style={{ marginBottom: '10px' }} />
            <SkeletonBlock width="48px" height="28px" borderRadius="6px" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <SkeletonBlock width="100%" height="42px" borderRadius="8px" />
        <SkeletonBlock width="120px" height="36px" borderRadius="8px" />
      </div>

      {/* Entry list card */}
      <div className="form-card">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="entry-row-wrapper">
            <div className="entry-row">
              <div className="entry-student">
                <SkeletonBlock width="140px" height="14px" borderRadius="4px" />
                <SkeletonBlock width="90px" height="11px" borderRadius="4px" style={{ marginTop: '5px' }} />
              </div>
              <div className="entry-right">
                <SkeletonBlock width="70px" height="22px" borderRadius="20px" />
                <SkeletonBlock width="96px" height="30px" borderRadius="6px" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

//New Task Skeleton
export function NewTaskSkeleton() {
  return (
    <div>
      <div className="page-header">
        <SkeletonBlock width="60px" height="16px" borderRadius="4px" />
      </div>

      <div className="form-card">
        <SkeletonBlock width="100px" height="26px" borderRadius="8px" style={{ marginBottom: '24px' }} />

        {/* Task name field */}
        <div className="form-field">
          <SkeletonBlock width="80px" height="13px" borderRadius="4px" />
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
        </div>

        {/* Task type field */}
        <div className="form-field">
          <SkeletonBlock width="70px" height="13px" borderRadius="4px" />
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="200px" height="11px" borderRadius="4px" />
        </div>

        {/* Class list field */}
        <div className="form-field">
          <SkeletonBlock width="70px" height="13px" borderRadius="4px" />
          <SkeletonBlock width="100%" height="40px" borderRadius="8px" />
          <SkeletonBlock width="220px" height="11px" borderRadius="4px" />
        </div>

        <SkeletonBlock width="100%" height="44px" borderRadius="15px" />
      </div>
    </div>
  )
}