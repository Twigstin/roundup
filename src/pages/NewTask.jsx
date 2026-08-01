import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createTask, createTaskItems, markReferralActivated, getCourses, getTasks, getStudents, getStudentsByClassList, bulkCreateEntries, getClassLists } from '../api/index'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import Spinner from '../components/Spinner'
import { NewTaskSkeleton } from '../components/Skeleton'
import posthog from 'posthog-js'
import { supabase } from '../api/supabase'

function NewTask() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [rosterEmpty, setRosterEmpty] = useState(false)
  const [taskLimitReached, setTaskLimitReached] = useState(false);
  const [classLists, setClassLists] = useState([])
  const [selectedClassListId, setSelectedClassListId] = useState('')
  const [checkingLimits, setCheckingLimits] = useState(true)
  const [paymentMode, setPaymentMode] = useState('')
  const [itemNames, setItemNames] = useState([''])
  const [availableCourses, setAvailableCourses] = useState([])
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [hasCourses, setHasCourses] = useState(true)

  useEffect(() => {
  if (!error) return
  const timer = setTimeout(() => setError(''), 4000)
  return () => clearTimeout(timer)
}, [error])

useEffect(() => {
  if (type !== 'payment' || paymentMode !== 'multi' || !selectedClassListId) return

  getCourses().then(data => {
    setHasCourses(data.length > 0)
  }).catch(() => setHasCourses(false))
}, [type, paymentMode, selectedClassListId])


useEffect(() => {
  if (type !== 'payment' || paymentMode !== 'multi' || !selectedClassListId) return

  const fetchAvailableCourses = async () => {
    setCoursesLoading(true)
    try {
      const data = await getCourses(selectedClassListId)
      setAvailableCourses(data)
    } catch (e) {
      console.error('Failed to fetch courses:', e)
    }
    setCoursesLoading(false)
  }

  fetchAvailableCourses()
}, [type, paymentMode, selectedClassListId])

 useEffect(() => {
  const checkLimits = async () => {
  const [students, tasks, lists] = await Promise.all([
    getStudents(),
    getTasks(),
    getClassLists()
  ])
  if (students.length === 0) setRosterEmpty(true)
  if (tasks.length >= 15) setTaskLimitReached(true)
  setClassLists(lists)
  if (lists.length === 1) {
    setSelectedClassListId(lists[0].id)
  }
  setCheckingLimits(false)
}
  checkLimits()
}, [])

  const handleSubmit = async () => {
  if ((!title.trim()) && (type === '')) {
    setError('Please enter a task name and select a task type')
    return
  }

  if (!title.trim()) {
    setError('Please enter a task name')
    return
  }

  if (type === '') {
    setError('Please select task type')
    return
  }

  if (type === 'payment' && !paymentMode) {
    setError('Please select a payment mode to continue.')
    return
  }

  if (!selectedClassListId) {
    setError('Please select a class list')
    return
  }

  setLoading(true)

  const newTask = {
    id: crypto.randomUUID(),
    title: title.trim(),
    type,
    payment_mode: type === 'payment' ? paymentMode : 'single',
    class_list_id: selectedClassListId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }


  await createTask(newTask)
posthog.capture('task_created', { type: newTask.type })

const { data: { session } } = await supabase.auth.getSession()
if (session?.user?.id) {
  await markReferralActivated(session.user.id)
}

const students = await getStudentsByClassList(selectedClassListId)
const defaultStatus = type === 'payment' ? 'not_paid' : type === 'attendance' ? 'absent' : 'pending'

const newEntries = students.map(student => ({
  id: crypto.randomUUID(),
  task_id: newTask.id,
  student_id: student.id,
  student_name: student.name,
  student_reg_number: student.reg_number,
  status: defaultStatus,
  collected: false,
  note: '',
  updated_at: new Date().toISOString()
}))

if (newEntries.length > 0) {
  await bulkCreateEntries(newEntries)
}

if (type === 'payment' && paymentMode === 'multi') {
  const courses = await getCourses()
  if (courses.length > 0) {
    await createTaskItems(newTask.id, courses.map(c => ({ name: c.name, courseId: c.id })))
  }
}

navigate(`/tasks/${newTask.id}`, { state: { task: newTask } })
}

if (checkingLimits) return <NewTaskSkeleton />

  return (
    <div>
      {classLists.length === 0 ? (
  <div className="task-limit-banner">
    <p className="task-limit-title">No class list yet</p>
    <p className="task-limit-subtitle">
      You need a class list before creating a task, so Roundup can automatically track your students.
      Head over to Roster to create one — it only takes a few seconds.
    </p>
    <Link to="/roster" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
      Go to Roster →
    </Link>
  </div>
) : taskLimitReached ? (
  <div className="task-limit-banner">
    <p className="task-limit-title">Task limit reached</p>
    <p className="task-limit-subtitle">
      You've reached the 15 task limit. To create a new task, 
      go back and delete tasks you no longer need.
    </p>
    <Link to="/" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
      ← Back to tasks
    </Link>
  </div>
) : (
  <div className="form-card">
        <h1 className="page-title bold" style={{ marginBottom: '24px' }}>New task</h1>

        {error && <p className="form-error">{error}</p>}

        <div className="form-field">
          <label className="form-label">Task name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. All Textbook Payments, MTH 102 Manuals…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Task type</label>
          <select
            className="form-input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Select task type</option>
            <option value="submission">Submission</option>
            <option value="payment">Payment</option>
            <option value="attendance">Attendance</option>
          </select>
          <span className="form-hint">This helps categorize and color-code the task</span>
        </div>

        {type === 'payment' && (
  <div className="form-field">
    <label className="form-label">Payment mode</label>
    <select
  className="form-input"
  value={paymentMode}
  onChange={(e) => setPaymentMode(e.target.value)}
>
  <option value="">Select payment mode...</option>
  <option value="single">Single item</option>
  <option value="multi">Multi item</option>
</select>
    <span className="form-hint">
  {paymentMode === '' && 'Choose how you want to track payments for this task.'}
  {paymentMode === 'single' && 'Single-item lets you track only one textbook or item per student in one task'}
  {paymentMode === 'multi' && 'Multi-item lets you track multiple textbooks or items per student in one task'}
</span>
  </div>
)}

        <div className="form-field">
  <label className="form-label">Class list</label>
  {classLists.length === 1 ? (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      background: '#f5f5f5',
      border: '1px solid #e5e5e5',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#111'
    }}>
      <span>{classLists[0].name}</span>
      <span className="classlist-auto-select-msg">Auto-selected ✓</span>
      <span className="my-auto-select-msg">✓</span>
    </div>
  ) : (
    <select
      className="form-input"
      value={selectedClassListId}
      onChange={(e) => setSelectedClassListId(e.target.value)}
    >
      <option value="">Select a class list</option>
      {classLists.map(list => (
        <option key={list.id} value={list.id}>{list.name}</option>
      ))}
    </select>
  )}
  <span className="form-hint">{classLists.length > 1 ? "Choose which class list to track for this task" : "Your class list will be used automatically"}</span>
</div>

        <button
          className="btn-primary"
          style={{ width: '100%', padding: '12px' }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
                  <>
                    <Spinner size={14} /><span style={{ marginLeft: '10px' }}>Creating...</span>
                  </>
                ) : 'Create task'}
        </button>
      </div>
)}
    </div>
  )

}

export default NewTask