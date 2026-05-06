import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks, deleteTask } from '../api/index'
import { readDB } from '../api/db'
import ConfirmModal from '../components/ConfirmModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Spinner from '../components/Spinner'
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

  const handleDeleteClick = (e, taskId) => {
  e.stopPropagation()
  setTaskToDelete(taskId)
  setModalOpen(true)
}

const handleConfirmDelete = async () => {
  await deleteTask(taskToDelete)
  setTasks(prev => prev.filter(t => t.id !== taskToDelete))
  setAllEntries(prev => prev.filter(e => e.task_id !== taskToDelete))
  setModalOpen(false)
  setTaskToDelete(null)
}

const handleCancelDelete = () => {
  setModalOpen(false)
  setTaskToDelete(null)
}


  const fetchAllEntries = async (userId) => {
  let allEntries = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allEntries = [...allEntries, ...data]
    if (data.length < pageSize) break
    page++
  }

  return allEntries
}


  useEffect(() => {
    const fetchData = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id

  const data = await getTasks()
  const entriesData = await fetchAllEntries(userId)

setTasks(data)
setAllEntries(entriesData)
  setLoading(false)
}
    fetchData()
  }, [])



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
      

    return { total, doneCount, pendingCount, partPaidCount, collectedCount, isPayment }
  }

  const filteredTasks = tasks.filter(task => {
  const matchesSearch = task.title
    .toLowerCase()
    .includes(search.toLowerCase())

  const matchesType =
    typeFilter === 'all' || task.type === typeFilter

  return matchesSearch && matchesType
})


  if (loading) {
    return (
    <div className="loading-container">
      <Spinner size={24} />
    </div>
  )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title bold">Your tasks</h1>
        <Link to="/tasks/new" className="btn-primary">+ New task</Link>
      </div>

      {tasks.length > 0 && (
  <div className="dashboard-toolbar">
    <input
      className="form-input"
      type="text"
      placeholder="Search tasks…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
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
            const { total, doneCount, pendingCount, partPaidCount, collectedCount, isPayment } = getTaskStats(task.id, task.type)

            return (
              <div
                key={task.id}
                className="task-card"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="task-card-left">
                  <div className="task-card-top">
                    <span className="task-card-title light-bold">{task.title}</span>
                    <span className={`type-badge type-${task.type}`}>{task.type}</span>
                  </div>
                  <p className="task-card-meta">{total} students</p>
                </div>

                <div className='task-card-right'>
                {total > 0 && (
                  <div className="task-card-stats">
                    {isPayment ? (
                      <>
                        <div className="task-stat">
  <span className="task-stat-num success">{doneCount}</span>
  <span className="task-stat-label">paid</span>
</div>
<div className="task-stat-divider" />

<div className="task-stat">
  <span className="task-stat-num warning">{partPaidCount}</span>
  <span className="task-stat-label">part paid</span>
</div>

<div className="task-stat-divider" />
<div className="task-stat">
  <span className="task-stat-num warning">{pendingCount}</span>
  <span className="task-stat-label">not paid</span>
</div>

<div className="task-stat-divider" />
<div className="task-stat">
  <span className="task-stat-num" style={{ color: '#27500A' }}>{collectedCount}</span>
  <span className="task-stat-label">collected</span>
</div>
                      </>
                    ) : (
                      <>
                        <div className="task-stat">
                          <span className="task-stat-num success">{doneCount}</span>
                          <span className="task-stat-label">{task.type === 'attendance' ? 'present' : 'submitted'}</span>
                        </div>
                        <div className="task-stat-divider" />
                        <div className="task-stat">
                          <span className="task-stat-num warning">{pendingCount}</span>
                          <span className="task-stat-label">{task.type === 'attendance' ? 'absent' : 'pending'}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                </div>

                <div className="task-card-actions">
    <button
      className="btn-danger delete-btn"
      onClick={(e) => handleDeleteClick(e, task.id)}
    >
      Delete
    </button>
    <span className="task-card-chevron">›</span>
  </div>

                {/*total === 0 && (
  <div className="task-card-actions">
    <button
      className="btn-danger delete-btn"
      onClick={(e) => handleDeleteClick(e, task.id)}
    >
      Delete
    </button>
    <span className="task-card-chevron">›</span>
  </div>
)*/}
              </div>
            )
          })}
        </div>
      )}{modalOpen && (
  <ConfirmModal
    message="Are you sure you want to delete this task? This action cannot be undone."
    onConfirm={handleConfirmDelete}
    onCancel={handleCancelDelete}
  />
)}
    </div>
  )
}

export default Dashboard