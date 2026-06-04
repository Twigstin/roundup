import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks, deleteTask, getClassLists } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faBook, faSearch, faClipboardList, faTrashCan, faCreditCard, faFileCircleCheck, faUserCheck, faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      const meta = session?.user?.user_metadata || {}
      setUserFirstName(meta.first_name || '')
      const onboardingChoice = localStorage.getItem('roundup_onboarding')
      if (!onboardingChoice) setShowTutorialBanner(true)
      if (!meta.first_name) {
        const dismissed = localStorage.getItem('roundup_profile_banner_dismissed')
        if (!dismissed) setShowProfileBanner(true)
      }

      const [tasks, entriesData, lists] = await Promise.all([
  getTasks(),
  fetchAllEntries(userId),
  getClassLists()
])

setTasks(tasks)
setAllEntries(entriesData)

if (tasks.length === 0) {
  setIsNewUser(true)
  setHasClassList(lists.length > 0)
}
setLoading(false)
    }
    fetchData()

    const tasksSub = supabase
      .channel(`tasks-changes-${channelId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new, ...prev])
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

    return () => {
      supabase.removeChannel(tasksSub)
      supabase.removeChannel(entriesSub)
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || task.type === typeFilter
    return matchesSearch && matchesType
  })

  if (loading) return <DashboardSkeleton />

  return (
    
    <div>
      {showTutorialBanner && (
      <div className="tutorial-banner">
        <div className="tutorial-banner-text">
          <p className="tutorial-banner-title light-bold">New to Roundup? 👋</p>
          <p className="tutorial-banner-sub">
            Watch a quick tutorial to get up and running in minutes. You can revisit it anytime under Menu → How to Use Roundup.
          </p>
        </div>
        <div className="tutorial-banner-actions">
          <button
            className="btn-primary"
            style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
            onClick={() => {
              localStorage.setItem('roundup_onboarding', 'tutorial')
              setShowTutorialBanner(false)
              navigate('/how-to-use')
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
          <div className="onboarding-steps">
            <div className="onboarding-header">
              <h2 className="onboarding-title bold">Welcome to Roundup 👋</h2>
              <p className="onboarding-subtitle">
                Get started in two steps. It takes less than 2 minutes.
              </p>
            </div>

            <div className="onboarding-step">
              <div className={`onboarding-step-number ${hasClassList ? 'onboarding-step-done' : ''}`}>
                {hasClassList ? '✓' : '1'}
              </div>
              <div className="onboarding-step-content">
                <p className="onboarding-step-title light-bold" style={{ color: hasClassList ? '#999' : '#111' }}>
                  Add your class list
                </p>
                <p className="onboarding-step-desc">
                  Import your student roster so Roundup can track them automatically.
                </p>
                {!hasClassList && (
                  <Link to="/roster" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', textAlign: 'center', fontSize: '13px', padding: '8px 14px' }}>
                    Go to Roster →
                  </Link>
                )}
              </div>
            </div>

            <div className="onboarding-step">
              <div className={`onboarding-step-number ${!hasClassList ? 'onboarding-step-number-muted' : ''}`}>2</div>
              <div className="onboarding-step-content">
                <p className="onboarding-step-title light-bold" style={{ color: hasClassList ? '#111' : '#999' }}>
                  Create your first task
                </p>
                <p className="onboarding-step-desc">
                  Track payments, submissions or attendance for your class.
                </p>
                {hasClassList && (
                  <Link to="/tasks/new" className="btn-primary" style={{ display: 'inline-block', marginTop: '10px', textAlign: 'center', fontSize: '13px', padding: '8px 14px' }}>
                    Create task →
                  </Link>
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
        onClick={() => navigate('/account/profile')}
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
          <div className="filter-tabs">
            <button className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>All</button>
            <button className={`filter-tab ${typeFilter === 'submission' ? 'active' : ''}`} onClick={() => setTypeFilter('submission')}>Submission</button>
            <button className={`filter-tab ${typeFilter === 'payment' ? 'active' : ''}`} onClick={() => setTypeFilter('payment')}>Payment</button>
            <button className={`filter-tab ${typeFilter === 'attendance' ? 'active' : ''}`} onClick={() => setTypeFilter('attendance')}>Attendance</button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No tasks yet</p>
          <p className="empty-subtitle">Create your first task to start tracking</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No tasks found</p>
          <p className="empty-subtitle">Try a different search or filter</p>
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
                      {isPayment ? (
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