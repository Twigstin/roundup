import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks, deleteTask } from '../api/index'
import { readDB } from '../api/db'
import ConfirmModal from '../components/ConfirmModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Spinner from '../components/Spinner'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState(null)

  const handleDeleteClick = (e, taskId) => {
  e.stopPropagation()
  setTaskToDelete(taskId)
  setModalOpen(true)
}

const handleConfirmDelete = async () => {
  await deleteTask(taskToDelete)
  setTasks(prev => prev.filter(t => t.id !== taskToDelete))
  setAllEntries(prev => prev.filter(e => e.taskId !== taskToDelete))
  setModalOpen(false)
  setTaskToDelete(null)
}

const handleCancelDelete = () => {
  setModalOpen(false)
  setTaskToDelete(null)
}




  useEffect(() => {
    const fetchData = async () => {
      const data = await getTasks()
      //const students = await getStudents()
      const entries = readDB('roundup_entries')
      setTasks(data)
      setAllEntries(entries)
      setLoading(false)
    }
    fetchData()
  }, [])

  const getTaskStats = (taskId, taskType) => {
    const taskEntries = allEntries.filter(e => e.taskId === taskId)
    const total = taskEntries.length
    const isPayment = taskType === 'payment'

    const doneCount = isPayment
      ? taskEntries.filter(e => e.status === 'paid').length
      : taskEntries.filter(e => e.status === 'submitted').length

    const pendingCount = isPayment
      ? taskEntries.filter(e => e.status === 'not_paid').length
      : taskEntries.filter(e => e.status === 'pending').length

    const partPaidCount = isPayment
      ? taskEntries.filter(e => e.status === 'part_paid').length
      : 0

    return { total, doneCount, pendingCount, partPaidCount, isPayment }
  }

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

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No tasks yet</p>
          <p className="empty-subtitle">Create your first task to start tracking</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => {
            const { total, doneCount, pendingCount, partPaidCount, isPayment } = getTaskStats(task.id, task.type)

            return (
              <div
                key={task.id}
                className="task-card"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="task-card-left">
                  <div className="task-card-top">
                    <span className="task-card-title">{task.title}</span>
                    <span className={`type-badge type-${task.type}`}>{task.type}</span>
                  </div>
                  <p className="task-card-meta">{total} students</p>
                </div>

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
                          <span className="task-stat-num danger">{pendingCount}</span>
                          <span className="task-stat-label">not paid</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="task-stat">
                          <span className="task-stat-num success">{doneCount}</span>
                          <span className="task-stat-label">submitted</span>
                        </div>
                        <div className="task-stat-divider" />
                        <div className="task-stat">
                          <span className="task-stat-num warning">{pendingCount}</span>
                          <span className="task-stat-label">pending</span>
                        </div>
                      </>
                    )}
                    <button
  className="btn-danger"
  onClick={(e) => handleDeleteClick(e, task.id)}
>
  Delete
</button>
<span className="task-card-chevron">›</span>
                  </div>
                )}

                {total === 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <button
      className="btn-danger"
      onClick={(e) => handleDeleteClick(e, task.id)}
    >
      Delete
    </button>
    <span className="task-card-chevron">›</span>
  </div>
)}
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