import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks } from '../api/index'

function Dashboard() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTasks = async () => {
      const data = await getTasks()
      setTasks(data)
      setLoading(false)
    }
    fetchTasks()
  }, [])

  if (loading) {
    return <p className="loading-text">Loading tasks...</p>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your tasks</h1>
        <Link to="/tasks/new" className="btn-primary">+ New task</Link>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No tasks yet</p>
          <p className="empty-subtitle">Create your first task to start tracking</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
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
              </div>
              <span className="task-card-chevron">›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard