import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faSearch, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { getTaskItems, getItemEntries, getEntriesByTask, getStudentsByClassList, getTasks } from '../api/index'
import Spinner from '../components/Spinner'
import { CourseStatsListSkeleton } from '../components/Skeleton'
import Tour from '../components/Tour'

function CourseStatsList() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [taskItems, setTaskItems] = useState([])
  const [itemEntries, setItemEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const courseStatsListTourSteps = [
  { selector: '.input-wrapper', title: 'Search courses', text: 'Quickly find a course by name.' },
  { selector: '.course-stats-grid-card', title: 'View course details', text: 'Tap any course stats to see who\'s paid/collected and who hasn\'t.' }
]

  useEffect(() => {
  const init = async () => {
    const [allTasks, items, taskEntries] = await Promise.all([
      getTasks(),
      getTaskItems(id),
      getEntriesByTask(id)
    ])
    const foundTask = allTasks.find(t => t.id === id)
    if (!foundTask) { setLoading(false); return }

    setTask(foundTask)
    setTaskItems(items)

    const entries = await getItemEntries(id)
    const studentData = taskEntries.map(e => ({
      id: e.student_id,
      name: e.student_name,
      reg_number: e.student_reg_number
    }))

    setItemEntries(entries)
    setStudents(studentData)
    setLoading(false)
  }
  init()
}, [id])

  const getItemStats = (taskItemId) => {
    const entries = itemEntries.filter(e => e.task_item_id === taskItemId)
    const paid = entries.length
    const collected = entries.filter(e => e.collected).length
    const notPaid = students.length - paid
    const notCollected = entries.filter(e => !e.collected).length
    return { paid, collected, notPaid, notCollected }
  }

  const filteredItems = taskItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <CourseStatsListSkeleton />

  return (
    <div>
      <div className="page-header">
        <Link to={`/tasks/${id}`} className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> {task?.title || 'Back'}
        </Link>
      </div>

      {taskItems.length > 0 && (
        <Tour steps={courseStatsListTourSteps} storageKey="roundup_tour_course_stats_list" onComplete={() => {}} />
      )}

      <h1 className="page-title bold" style={{ marginBottom: '6px' }}>All courses</h1>
      <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
        {taskItems.length} course{taskItems.length !== 1 ? 's' : ''} · tap any course stats to view details
      </p>

      <div className="input-wrapper" style={{ marginBottom: '16px' }}>
        <FontAwesomeIcon icon={faSearch} className="input-icon" />
        <input
          className="form-input search-icon"
          type="text"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No results</p>
          <p className="empty-subtitle">Try a different search</p>
        </div>
      ) : (
        <div className="course-stats-grid">
          {filteredItems.map(item => {
            const { paid, collected, notPaid, notCollected } = getItemStats(item.id)
            return (
              <button
                key={item.id}
                className="course-stats-grid-card"
                onClick={() => navigate(
                  `/tasks/${id}/courses/${item.id}`,
                  { state: { from: `/tasks/${id}/courses` } }
                )}
              >
                <div className="course-stats-grid-card-top">
                  <p className="multi-item-stat-name light-bold">{item.name}</p>
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }} />
                </div>
                <div className="multi-item-stat-rows" style={{ marginTop: '8px' }}>
                  <div className="multi-item-stat-row">
                    <span className="multi-item-stat-label">Paid:</span>
                    <span className="multi-item-stat-num success">{paid}</span>
                  </div>
                  <div className="multi-item-stat-row">
                    <span className="multi-item-stat-label">Not paid:</span>
                    <span className="multi-item-stat-num danger">{notPaid}</span>
                  </div>
                  <div className="multi-item-stat-row">
                    <span className="multi-item-stat-label">Collected:</span>
                    <span className="multi-item-stat-num" style={{ color: '#27500A' }}>{collected}</span>
                  </div>
                  <div className="multi-item-stat-row">
                    <span className="multi-item-stat-label">Not collected:</span>
                    <span className="multi-item-stat-num danger">{notCollected}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CourseStatsList