import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTasks, getEntries, getStudents } from '../api/index'

function TaskDetail() {
  const { id } = useParams()
  const [task, setTask] = useState(null)
  const [entries, setEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const allTasks = await getTasks()
      const foundTask = allTasks.find(t => t.id === id)

      const allEntries = await getEntries(id)
      const allStudents = await getStudents()

      setTask(foundTask)
      setEntries(allEntries)
      setStudents(allStudents)
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return <p className="loading-text">Loading task...</p>
  }

  if (!task) {
    return <p className="loading-text">Task not found.</p>
  }

  return (
    <div>
      <div className="page-header">
        <Link to="/" className="back-link">← Back</Link>
      </div>

      <div className="task-detail-header">
        <h1 className="page-title">{task.title}</h1>
        <span className={`type-badge type-${task.type}`}>{task.type}</span>
      </div>
    </div>
  )
}

export default TaskDetail