import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getTasks, deleteTask, getClassLists, getCourses } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faArrowUp, faArrowDown, faBook, faSearch, faClipboardList, faTrashCan, faArrowRight, faCreditCard, faFileCircleCheck, faUserCheck, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import Spinner from '../components/Spinner'
import { DashboardSkeleton } from '../components/Skeleton'
import { supabase } from '../api/supabase'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [deletingTask, setDeletingTask] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [hasClassList, setHasClassList] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [userFirstName, setUserFirstName] = useState('')
  const [showProfileBanner, setShowProfileBanner] = useState(false)
  const [showTutorialBanner, setShowTutorialBanner] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivingTaskId, setArchivingTaskId] = useState(null)
  const [hasCourses, setHasCourses] = useState(false)

  const channelId = useRef(`${Date.now()}-${Math.random()}`)

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])
  

  const handleDeleteClick = (e, taskId) => {
    e.stopPropagation()
    setTaskToDelete(taskId)
    setModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    setDeletingTask(true)
    await deleteTask(taskToDelete)
    setTasks(prev => prev.filter(t => t.id !== taskToDelete))
    setAllEntries(prev => prev.filter(e => e.task_id !== taskToDelete))
    setModalOpen(false)
    setTaskToDelete(null)
    setDeletingTask(false)
  }

  const handleCancelDelete = () => {
    setDeletingTask(false)
    setModalOpen(false)
    setTaskToDelete(null)
  }

  const handleArchiveTask = async (e, taskId, currentArchived) => {
  e.stopPropagation()
  setArchivingTaskId(taskId)
  await supabase
    .from('tasks')
    .update({ is_archived: !currentArchived })
    .eq('id', taskId)
  setTasks(prev => prev.map(t =>
    t.id === taskId ? { ...t, is_archived: !currentArchived } : t
  ))
  setArchivingTaskId(null)
  setOpenMenuId(null)
}

  const fetchAllEntries = async (userId) => {
    const countResult = await supabase
      .from('entries')
      .select('task_id, status, collected', { count: 'exact', head: true })
      .eq('user_id', userId)

    const total = countResult.count
    const pageSize = 1000
    const pages = Math.ceil(total / pageSize)

    const requests = Array.from({ length: pages }, (_, i) =>
      supabase
        .from('entries')
        .select('task_id, status, collected')
        .eq('user_id', userId)
        .range(i * pageSize, (i + 1) * pageSize - 1)
    )

    const results = await Promise.all(requests)
    return results.flatMap(r => r.data || [])
  }

  const fetchData = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  const meta = session?.user?.user_metadata || {}
  setUserFirstName(meta.first_name || '')

  const { data: studentCountData } = await supabase
  .from('students')
  .select('class_list_id')

let classListStudentCounts = {}
if (studentCountData) {
  studentCountData.forEach(row => {
    classListStudentCounts[row.class_list_id] = (classListStudentCounts[row.class_list_id] || 0) + 1
  })
}

  const hasCompletedOnboarding = meta.onboarding_complete || false

  const onboardingChoice = localStorage.getItem('roundup_onboarding')
  if (!onboardingChoice) setShowTutorialBanner(true)
  if (!meta.first_name) {
    const dismissed = localStorage.getItem('roundup_profile_banner_dismissed')
    if (!dismissed) setShowProfileBanner(true)
  }

  // Fetch everything in parallel
  const [tasks, entriesData, lists, courses] = await Promise.all([
    getTasks(),
    fetchAllEntries(userId),
    getClassLists(),
    getCourses()
  ])

  setHasCourses(courses.length > 0)
  setHasClassList(lists.length > 0)
  setAllEntries(entriesData)

  // Fetch course counts for multi-item tasks
  const multiItemTaskIds = tasks
    .filter(t => t.payment_mode === 'multi')
    .map(t => t.id)

  let courseCounts = {}
let taskPaidCounts = {}
let taskCollectedCounts = {}

if (multiItemTaskIds.length > 0) {
  const [{ data: itemData }, { data: itemEntryData }] = await Promise.all([
    supabase.from('task_items').select('task_id').in('task_id', multiItemTaskIds),
    supabase.from('item_entries').select('task_id, collected').in('task_id', multiItemTaskIds)
  ])

  if (itemData) {
    itemData.forEach(row => {
      courseCounts[row.task_id] = (courseCounts[row.task_id] || 0) + 1
    })
  }

  if (itemEntryData) {
    itemEntryData.forEach(row => {
      taskPaidCounts[row.task_id] = (taskPaidCounts[row.task_id] || 0) + 1
      if (row.collected) {
        taskCollectedCounts[row.task_id] = (taskCollectedCounts[row.task_id] || 0) + 1
      }
    })
  }
}

  // Attach courseCount to each task
  const tasksWithMeta = tasks.map(t => ({
  ...t,
  courseCount: courseCounts[t.id] || 0,
  totalPaid: taskPaidCounts[t.id] || 0,
  totalCollected: taskCollectedCounts[t.id] || 0,
  studentCount: classListStudentCounts[t.class_list_id] || 0
}))

  setTasks(tasksWithMeta)
  setLoading(false)

  if (!hasCompletedOnboarding && tasks.length > 0) {
    await supabase.auth.updateUser({
      data: { onboarding_complete: true }
    })
    return
  }

  if (!hasCompletedOnboarding) {
    setIsNewUser(true)
  }
}

  useEffect(() => {
    fetchData()

  const tasksSub = supabase
    .channel(`tasks-changes-${channelId.current}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async (payload) => {
      if (payload.eventType === 'INSERT') {
        setTasks(prev => {
          const isFirst = prev.length === 0
          if (isFirst) {
            // First task ever created — complete onboarding
            supabase.auth.updateUser({
              data: { onboarding_complete: true }
            })
            setIsNewUser(false)
          }
          return [payload.new, ...prev]
        })
      }
      if (payload.eventType === 'DELETE') {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id))
      }
      if (payload.eventType === 'UPDATE') {
        setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t))
      }
    })
    .subscribe()

  const entriesSub = supabase
    .channel(`entries-changes-dashboard-${channelId.current}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        setAllEntries(prev => [...prev, payload.new])
      }
      if (payload.eventType === 'UPDATE') {
        setAllEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
      }
      if (payload.eventType === 'DELETE') {
        setAllEntries(prev => prev.filter(e => e.id !== payload.old.id))
      }
    })
    .subscribe()

    const rosterSub = supabase
  .channel(`roster-changes-${channelId.current}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'class_lists' }, (payload) => {
    if (payload.eventType === 'INSERT') {
      setHasClassList(true) // step 1 done, banner updates to step 2
    }
    if (payload.eventType === 'DELETE') {
      // optional: handle if they delete their only list
    }
  })
  .subscribe()

  return () => {
    supabase.removeChannel(tasksSub)
    supabase.removeChannel(entriesSub)
    supabase.removeChannel(rosterSub)
  }
}, [])

  const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

  const getTaskStats = (taskId, taskType) => {
    const taskEntries = allEntries.filter(e => e.task_id === taskId)
    const total = taskEntries.length
    const isPayment = taskType === 'payment'

    const doneCount = isPayment
      ? taskEntries.filter(e => e.status === 'paid').length
      : taskType === 'attendance'
      ? taskEntries.filter(e => e.status === 'present').length
      : taskEntries.filter(e => e.status === 'submitted').length

    const pendingCount = isPayment
      ? taskEntries.filter(e => e.status === 'not_paid').length
      : taskType === 'attendance'
      ? taskEntries.filter(e => e.status === 'absent').length
      : taskEntries.filter(e => e.status === 'pending').length

    const partPaidCount = isPayment
      ? taskEntries.filter(e => e.status === 'part_paid').length
      : 0

    const collectedCount = isPayment
      ? taskEntries.filter(e => e.collected === true).length
      : 0

    const notCollectedCount = isPayment
      ? taskEntries.filter(e => ((e.collected === false) && (e.status !== 'not_paid'))).length
      : 0

    return { total, doneCount, pendingCount, partPaidCount, collectedCount, notCollectedCount, isPayment }
  }






  const archivedCount = tasks.filter(t => t.is_archived).length

useEffect(() => {
  if (showArchived && archivedCount === 0) {
    setShowArchived(false)
  }
}, [tasks, showArchived, archivedCount])

const filteredTasks = tasks.filter(task => {
  if (task.is_archived !== showArchived) return false
  const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
  const matchesType = typeFilter === 'all' || task.type === typeFilter
  return matchesSearch && matchesType
})


  const location = useLocation()

useEffect(() => {
  if (location.state?.refetch) {
    fetchData()
    // Clear the state so it doesn't refetch on every render
    window.history.replaceState({}, document.title)
  }
}, [location.state])

  if (loading) return <DashboardSkeleton />

  return (
    
    <div>
      {showTutorialBanner && (
      <div className="tutorial-banner">
        <div className="tutorial-banner-text">
          <p className="tutorial-banner-title light-bold">New to Roundup? 👋</p>
          <p className="tutorial-banner-sub">
            Watch a quick tutorial to get up and running in minutes. You can revisit it anytime under Menu <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} /> How to Use Roundup.
          </p>
        </div>
        <div className="tutorial-banner-actions">
          <button
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
            onClick={() => {
              localStorage.setItem('roundup_onboarding', 'tutorial')
              setShowTutorialBanner(false)
              navigate('/tutorials/getting-started')
            }}
          >
            Watch tutorial
          </button>
          <button
            className="btn-secondary"
            style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
            onClick={() => {
              localStorage.setItem('roundup_onboarding', 'skipped')
              setShowTutorialBanner(false)
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    )}
       <div className="page-header">
      <div>
        {!isNewUser && userFirstName && (
          <p className="dashboard-greeting">
            {getGreeting()}, {userFirstName} 👋
          </p>
        )}
        <h1 className="page-title bold">Your tasks</h1>
      </div>
      <Link to="/tasks/new" className="btn-primary">+ New task</Link>
    </div>

      {isNewUser && (
  <div className="onboarding-banner">
    <div className="onboarding-header">
      <p className="onboarding-title bold">Welcome to Roundup 👋</p>
      <p className="onboarding-subtitle">Get started in three steps. It takes less than 5 minutes.</p>
    </div>
    <div className="onboarding-steps">

      {/* Step 1 — Class list */}
      <div className="onboarding-step">
        <div className={`onboarding-step-number ${hasClassList ? 'onboarding-step-done' : ''}`}>
          {hasClassList ? '✓' : '1'}
        </div>
        <div className="onboarding-step-content">
          <p className="onboarding-step-title light-bold">Add your class list</p>
          <p className="onboarding-step-desc">Import your student roster so Roundup can track entries for each student.</p>
          {!hasClassList && (
            <button className="btn-primary" style={{ marginTop: '10px', fontSize: '13px', padding: '8px 14px' }} onClick={() => navigate('/roster')}>
              Go to Roster<span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
            </button>
          )}
        </div>
      </div>

      {/* Step 2 — Courses */}
      <div className="onboarding-step">
        <div className={`onboarding-step-number ${hasCourses ? 'onboarding-step-done' : !hasClassList ? 'onboarding-step-number-muted' : ''}`}>
          {hasCourses ? '✓' : '2'}
        </div>
        <div className="onboarding-step-content">
          <p className="onboarding-step-title light-bold">Add your courses</p>
          <p className="onboarding-step-desc">Add the courses your class is offering this semester. Roundup uses these for multi-item payment tracking.</p>
          {hasClassList && !hasCourses && (
            <button
              className="btn-primary"
              style={{ marginTop: '10px', fontSize: '13px', padding: '8px 14px' }}
              onClick={() => navigate('/roster?tab=courses')}
            >
              Add courses<span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
            </button>
          )}
        </div>
      </div>

      {/* Step 3 — Create task */}
      <div className="onboarding-step">
        <div className={`onboarding-step-number ${tasks.filter(t => !t.is_archived).length > 0 ? 'onboarding-step-done' : !hasClassList ? 'onboarding-step-number-muted' : ''}`}>
          {tasks.filter(t => !t.is_archived).length > 0 ? '✓' : '3'}
        </div>
        <div className="onboarding-step-content">
          <p className="onboarding-step-title light-bold">Create your first task</p>
          <p className="onboarding-step-desc">Track payments, submissions or attendance for your class.</p>
          {hasClassList && tasks.filter(t => !t.is_archived).length === 0 && (
            <button className="btn-primary"
              style={{ marginTop: '10px', fontSize: '13px', padding: '8px 14px' }}
              onClick={() => navigate('/tasks/new')}
            >
              Create new task<span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
            </button>
          )}
        </div>
      </div>

    </div>
  </div>
)}

      {showProfileBanner && !isNewUser && (
  <div className="profile-setup-banner">
    <div className="profile-setup-banner-text">
      <p className="profile-setup-banner-title light-bold">Set up your profile</p>
      <p className="profile-setup-banner-sub">Add your name and level so Roundup feels more personal.</p>
    </div>
    <div className="profile-setup-banner-actions">
      <button
        className="btn-primary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={() => navigate('/account/profile', { state: { from: '/' } })}
      >
        Set up
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={() => {
          localStorage.setItem('roundup_profile_banner_dismissed', 'true')
          setShowProfileBanner(false)
        }}
      >
        Dismiss
      </button>
    </div>
  </div>
)}

      {tasks.length > 0 && (
  <div className="dashboard-toolbar">
    <div className="input-wrapper">
      <FontAwesomeIcon icon={faSearch} className="input-icon" />
      <input
        className="form-input search-icon"
        type="text"
        placeholder="Search tasks…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* Row 1 — Active / Archived toggle */}
    <div className="filter-tabs">
      <button
        className={`filter-tab ${!showArchived ? 'active' : ''}`}
        onClick={() => { setShowArchived(false); setTypeFilter('all') }}
      >
        Active tasks
      </button>
      {archivedCount > 0 && (
        <button
          className={`filter-tab ${showArchived ? 'active' : ''}`}
          onClick={() => { setShowArchived(true); setTypeFilter('all') }}
        >
          Archived ({archivedCount})
        </button>
      )}
    </div>

    {/* Row 2 — Type filter */}
    <div className="filter-tabs">
      <button
        className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
        onClick={() => setTypeFilter('all')}
      >
        All
      </button>
      <button
        className={`filter-tab ${typeFilter === 'submission' ? 'active' : ''}`}
        onClick={() => setTypeFilter('submission')}
      >
        Submission
      </button>
      <button
        className={`filter-tab ${typeFilter === 'payment' ? 'active' : ''}`}
        onClick={() => setTypeFilter('payment')}
      >
        Payment
      </button>
      <button
        className={`filter-tab ${typeFilter === 'attendance' ? 'active' : ''}`}
        onClick={() => setTypeFilter('attendance')}
      >
        Attendance
      </button>
    </div>
  </div>
)}

      {filteredTasks.length === 0 ? (
  <div className="empty-state">
    <p className="empty-title">
      {showArchived ? 'No archived tasks' : tasks.filter(t => !t.is_archived).length === 0 ? 'No tasks yet' : 'No tasks found'}
    </p>
    <p className="empty-subtitle">
      {showArchived
        ? 'Tasks you archive will appear here'
        : tasks.filter(t => !t.is_archived).length === 0
        ? 'Create your first task to start tracking'
        : 'Try a different search or filter'}
    </p>
  </div>
) : (
        <div className="task-list">
          {filteredTasks.map(task => {
            const { total, doneCount, pendingCount, partPaidCount, collectedCount, notCollectedCount, isPayment } = getTaskStats(task.id, task.type)

            return (
              <div
                key={task.id}
                className="task-card"
                onClick={() => navigate(`/tasks/${task.id}`, { state: { task } })}
              >
                <div className="task-card-left">
                  <div className="task-card-top">
                    <span className="task-card-title light-bold">
                      {task.type === "payment" ? (
                        <FontAwesomeIcon icon={faBook} style={{ color: "#085041" }} />
                      ) : task.type === "submission" ? (
                        <FontAwesomeIcon icon={faLayerGroup} style={{ color: "#3C3489" }} />
                      ) : (
                        <FontAwesomeIcon icon={faClipboardList} style={{ color: "#633806" }} />
                      )} {task.title}
                    </span>

                    <div className="task-card-top-right">
                      <span className={`type-badge type-${task.type}`}>
                        {task.type === "payment" ? (
                          <FontAwesomeIcon icon={faCreditCard} className="dashboard-icons" />
                        ) : task.type === "submission" ? (
                          <FontAwesomeIcon icon={faFileCircleCheck} className="dashboard-icons" />
                        ) : (
                          <FontAwesomeIcon icon={faUserCheck} className="dashboard-icons" />
                        )} {task.type}
                      </span>

                      <div
                        className="kebab-wrapper"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="kebab-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === task.id ? null : task.id)
                          }}
                        >
                          <FontAwesomeIcon icon={faEllipsisVertical} />
                        </button>
                        {openMenuId === task.id && (
                          <div className="kebab-menu">
                            <button
  className="kebab-menu-item"
  onClick={(e) => {
    e.stopPropagation()
    handleArchiveTask(e, task.id, task.is_archived || false)
  }}
>
  {archivingTaskId === task.id ? (
    <><Spinner size={12} /> {task.is_archived ? 'Unarchiving...' : 'Archiving...'}</>
  ) : (
    task.is_archived ? <span><FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowUp} /> Unarchive task</span> : <span><FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowDown} /> Archive task</span>
  )}
</button>

                            <button
                              className="kebab-menu-item kebab-menu-item-danger"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(null)
                                handleDeleteClick(e, task.id)
                              }}
                            >
                              <FontAwesomeIcon icon={faTrashCan} /> Delete task
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="task-card-meta">{total} students</p>
                </div>

                <div className='task-card-right'>
                  {total > 0 && (
                    <div className="task-card-stats">
                      {isPayment ? task.payment_mode === 'multi' ? (
  <div className="task-card-stats">
  
                          
  <div className="task-stat">
    <span className="task-stat-num success successy">{task.totalPaid || 0}</span>
    <span className="task-stat-label">paid</span>
  </div>
  <div className="task-stat-divider" />
  <div className="task-stat">
    <span className="task-stat-num warning warningy">{task.courseCount || 0}</span>
    <span className="task-stat-label">courses</span>
  </div>
  <div className="task-stat-divider" />
  <div className="task-stat">
    <span className="task-stat-num danger dangery">
      {((task.courseCount || 0) * (task.studentCount || 0)) - (task.totalPaid || 0)}
    </span>
    <span className="task-stat-label">not paid</span>
  </div>
  <div className="task-stat-divider" />
  <div className="task-stat">
    <span className="task-stat-num successy" style={{ color: '#27500A' }}>{task.totalCollected || 0}</span>
    <span className="task-stat-label">collected</span>
  </div>
  <div className="task-stat-divider not-collectedy" />
  <div className="task-stat" id="not-collected">
    <span className="task-stat-num danger dangery">{(task.totalPaid || 0) - (task.totalCollected || 0)}</span>
    <span className="task-stat-label">not collected</span>
  </div>
                        
  </div>
) : (
  
                        <>
                          <div className="task-stat">
                            <span className="task-stat-num success successy">{doneCount}</span>
                            <span className="task-stat-label">paid</span>
                          </div>
                          <div className="task-stat-divider" />
                          <div className="task-stat">
                            <span className="task-stat-num warning warningy">{partPaidCount}</span>
                            <span className="task-stat-label">part paid</span>
                          </div>
                          <div className="task-stat-divider" />
                          <div className="task-stat">
                            <span className="task-stat-num danger dangery">{pendingCount}</span>
                            <span className="task-stat-label">not paid</span>
                          </div>
                          <div className="task-stat-divider" />
                          <div className="task-stat">
                            <span className="task-stat-num successy" style={{ color: '#27500A' }}>{collectedCount}</span>
                            <span className="task-stat-label">collected</span>
                          </div>
                          <div className="task-stat-divider not-collectedy" />
                          <div className="task-stat" id="not-collected">
                            <span className="task-stat-num danger dangery">{notCollectedCount}</span>
                            <span className="task-stat-label">not collected</span>
                          </div>
                        </>
                      
) : (
                        <>
                          <div className="task-stat">
                            <span className="task-stat-num success successy">{doneCount}</span>
                            <span className="task-stat-label">{task.type === 'attendance' ? 'present' : 'submitted'}</span>
                          </div>
                          <div className="task-stat-divider" />
                          <div className="task-stat">
                            <span className="task-stat-num warning warningy">{pendingCount}</span>
                            <span className="task-stat-label">{task.type === 'attendance' ? 'absent' : 'pending'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ConfirmModal
          message="Are you sure you want to delete this task? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          loading={deletingTask}
        />
      )}
      
      
    </div>
  )
}

export default Dashboard