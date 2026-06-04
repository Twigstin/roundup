import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { getTasks, getEntries, getStudents, getStudentsByClassList, createEntry, updateEntry, populateTaskEntries, updateTask, getRosterMeta, syncTaskRoster } from '../api/index'
import Spinner from '../components/Spinner'
import { TaskDetailSkeleton } from '../components/Skeleton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faSearch, faPenToSquare, faDownload } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../api/supabase'
import posthog from 'posthog-js'

function TaskDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const [task, setTask] = useState(null)
  const [entries, setEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('total')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [populating, setPopulating] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [showRosterUpdate, setShowRosterUpdate] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentReg, setNewStudentReg] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [addStudentError, setAddStudentError] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)
  const [isOnTotalFilter, setIsOnTotalFilter] = useState(true)
  const [isSavingNote, setIsSavingNote] = useState(false)

  const channelId = useRef(`${Date.now()}-${Math.random()}`)

  useEffect(() => {
  if (!addStudentError) return
  const timer = setTimeout(() => setAddStudentError(''), 4000)
  return () => clearTimeout(timer)
}, [addStudentError])

useEffect(() => {
  setIsOnTotalFilter(filter === 'total' && search === '')
}, [filter, search])

  useEffect(() => {
    const fetchData = async () => {

      // Use state instantly if available, fall back to fetch
const stateTask = state?.task ?? null
if (stateTask) setTask(stateTask)

// Always verify in background
const [allTasks, allEntries, allStudents, meta] = await Promise.all([
  getTasks(),
  getEntries(id),
  stateTask?.class_list_id
    ? getStudentsByClassList(stateTask.class_list_id)
    : getStudents(),
  getRosterMeta()
])

const foundTask = allTasks.find(t => t.id === id)
setTask(foundTask)
setEntries(allEntries)
setStudents(allStudents)

      if (
  foundTask &&
  foundTask.class_list_id &&
  meta.updated_at &&
  meta.change_type === 'added' &&
  meta.class_list_id === foundTask.class_list_id &&
  (!foundTask.roster_synced_at ||
    new Date(meta.updated_at) > new Date(foundTask.roster_synced_at))
) {
  const existingRegNumbers = allEntries.map(e => e.student_reg_number)
const hasNewStudents = allStudents.some(s => !existingRegNumbers.includes(s.reg_number))
if (hasNewStudents) setShowRosterUpdate(true)
}

      setLoading(false)
    }
    fetchData()

    const entriesSub = supabase
      .channel(`entries-changes-${channelId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `task_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
  setEntries(prev => {
    const alreadyExists = prev.some(e => e.id === payload.new.id)
    if (alreadyExists) return prev
    return [...prev, payload.new]
  })
}
        if (payload.eventType === 'UPDATE') {
          setEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new : e))
        }
        if (payload.eventType === 'DELETE') {
          setEntries(prev => prev.filter(e => e.id !== payload.old.id))
        }
      })
      .subscribe()

    const taskSub = supabase
      .channel(`task-changes-${channelId.current}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, (payload) => {
        setTask(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(entriesSub)
      supabase.removeChannel(taskSub)
    }
  }, [id])

  if (loading) return <TaskDetailSkeleton />

  const isPayment = task?.type === 'payment'
  const isAttendance = task?.type === 'attendance'

const total = entries.length

const submittedCount = isPayment
  ? entries.filter(e => e.status === 'paid').length
  : isAttendance
  ? entries.filter(e => e.status === 'present').length
  : entries.filter(e => e.status === 'submitted').length

const pendingCount = isPayment
  ? entries.filter(e => e.status === 'not_paid').length
  : isAttendance
  ? entries.filter(e => e.status === 'absent').length
  : entries.filter(e => e.status === 'pending').length

const partPaidCount = isPayment
  ? entries.filter(e => e.status === 'part_paid').length
  : 0

  const collectedCount = isPayment
  ? entries.filter(e => e.collected === true).length
  : 0
  
  const notCollectedCount = isPayment
  ? entries.filter(e => ((e.collected === false) && (e.status !== 'not_paid'))).length
  : 0

  const enrichedEntries = entries.map(entry => ({
  ...entry,
  student: {
    name: entry.student_name,
    regNumber: entry.student_reg_number
  }
}))

const filteredEntries = enrichedEntries.filter(entry => {
  const name = entry.student.name || ''
  const regNumber = entry.student_reg_number || ''

  const matchesSearch =
    name.toLowerCase().includes(search.toLowerCase()) ||
    regNumber.toLowerCase().includes(search.toLowerCase())

  const matchesFilter =
    filter === 'total' ||
    (filter === 'submitted' && entry.status === 'submitted') ||
    (filter === 'pending' && entry.status === 'pending') ||
    (filter === 'present' && entry.status === 'present') ||
    (filter === 'absent' && entry.status === 'absent') ||
    (filter === 'paid' && entry.status === 'paid') ||
    (filter === 'part_paid' && entry.status === 'part_paid') ||
    (filter === 'not_paid' && entry.status === 'not_paid') ||
    (filter === 'collected' && entry.collected === true) ||
    (filter === 'not_collected' && (entry.collected === false && entry.status !== 'not_paid'))

  return matchesSearch && matchesFilter
})

  if (!task) {
    return <p className="loading-text">Task not found.</p>
  }

const handleStatusUpdate = async (entryId, currentStatus) => {
  let newStatus

  if (isPayment) {
    if (currentStatus === 'not_paid') newStatus = 'paid'
    else if (currentStatus === 'paid') newStatus = 'part_paid'
    else newStatus = 'not_paid'
  } else if (isAttendance) {
    newStatus = currentStatus === 'absent' ? 'present' : 'absent'
  } else {
    newStatus = currentStatus === 'pending' ? 'submitted' : 'pending'
  }

  // Update state immediately for instant feedback
  setEntries(prev =>
    prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e)
  )

  try {
    await updateEntry(entryId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    posthog.capture('status_updated', { new_status: newStatus, task_type: task.type })
  } catch (error) {
    // Roll back state if database call fails
    setEntries(prev =>
      prev.map(e => e.id === entryId ? { ...e, status: currentStatus } : e)
    )
    console.error('Failed to update status:', error)
  }
}

const handleSaveNote = async (entryId) => {
  setIsSavingNote(true)
  await updateEntry(entryId, {
    note: noteText,
    updated_at: new Date().toISOString()
  })

  setEntries(prev =>
    prev.map(e => e.id === entryId ? { ...e, note: noteText } : e)
  )

  setEditingNoteId(null)
  setNoteText('')
  setIsSavingNote(false)
}

const handleCollectedToggle = async (entryId, currentCollected) => {
  const newCollected = !currentCollected

  // Update state immediately
  setEntries(prev =>
    prev.map(e => e.id === entryId ? { ...e, collected: newCollected } : e)
  )

  try {
    await updateEntry(entryId, {
      collected: newCollected,
      updated_at: new Date().toISOString()
    })
    posthog.capture('collected_toggled', { new_value: newCollected })
  } catch (error) {
    // Roll back on failure
    setEntries(prev =>
      prev.map(e => e.id === entryId ? { ...e, collected: currentCollected } : e)
    )
    console.error('Failed to update collected status:', error)
  }
}

const handlePopulateFromRoster = async () => {
  setPopulating(true)
  await populateTaskEntries(task.id, task.type, students)
  setPopulating(false)
}

const handleSaveTitle = async () => {
  if (!titleText.trim()) return
  setIsEditingTitle(true)
  await updateTask(task.id, { title: titleText.trim() })
  setTask(prev => ({ ...prev, title: titleText.trim() }))
  setIsEditingTitle(false)
  setEditingTitle(false)
}

const handleRosterSync = async () => {
  setShowRosterUpdate(false)
  setPopulating(true)
  await populateTaskEntries(task.id, task.type, students)
  setTask(prev => ({ ...prev, roster_synced_at: new Date().toISOString() }))
  setPopulating(false)
}


const handleDismissRosterUpdate = async () => {
  await syncTaskRoster(task.id)
  setTask(prev => ({ ...prev, roster_synced_at: new Date().toISOString() }))
  setShowRosterUpdate(false)
}



const handleAddStudentToTask = async () => {
   if (!newStudentName.trim() && !newStudentReg.trim()) {
    setAddStudentError('Please enter both a name and reg number')
    return
  }
  if (!newStudentName.trim()) {
    setAddStudentError('Please enter the student name')
    return
  }
  if (!newStudentReg.trim()) {
    setAddStudentError('Please enter the reg number')
    return
  }

  setAddingStudent(true)

  const newEntry = {
    id: crypto.randomUUID(),
    task_id: task.id,
    student_id: crypto.randomUUID(),
    student_name: newStudentName.trim(),
    student_reg_number: newStudentReg.trim(),
    status: isPayment ? 'not_paid' : isAttendance ? 'absent' : 'pending',
    collected: false,
    note: '',
    updated_at: new Date().toISOString()
  }

  const saved = await createEntry(newEntry)
  setEntries(prev => [...prev, saved])
  setNewStudentName('')
  setNewStudentReg('')
  setShowAddStudent(false)
  setAddingStudent(false)
}

const handleExport = async () => {
  setIsExportingData(true)

  try {
    const XLSX = await import('xlsx')

    const hasNotes = entries.some(e => e.note && e.note.trim() !== '')
    const hasCollected = isPayment

    const rows = entries.map((entry, index) => {
      const row = {
        'S/N': index + 1,
        'Name': entry.student_name,
        'Reg Number': entry.student_reg_number,
        'Status': entry.status.replace(/_/g, ' ')
      }

      if (hasCollected) {
        row['Collected'] = entry.collected ? 'Yes' : 'No'
      }

      if (hasNotes) {
        row['Note'] = entry.note || ''
      }

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')

    const fileName = `${task.title.replace(/\s+/g, '-')}-export.xlsx`
    XLSX.writeFile(workbook, fileName)

  } catch (error) {
    console.error('Export failed:', error)
  }

  posthog.capture('excel_exported', { task_type: task.type, student_count: entries.length })

  setIsExportingData(false)
}



  return (
  <div>
    <div className="page-header">
      <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft}/> Back</Link>
    </div>

    <div className="task-detail-header">
  {editingTitle ? (
    <div className="title-edit-row">
      <input
        className="form-input title-edit-input"
        type="text"
        value={titleText}
        onChange={(e) => setTitleText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSaveTitle()
          if (e.key === 'Escape') setEditingTitle(false)
        }}
        autoFocus
      />
      <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={handleSaveTitle}>
        <span>
          {isEditingTitle
          ? (
            <>
              <Spinner size={14} /> <span style={{ marginLeft: '5px' }}>Saving...</span>
            </>
          )
          : (
              <>
                <span>Save</span>
              </>
            )
          }
        </span>
      </button>
      <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setEditingTitle(false)}>
        Cancel
      </button>
    </div>
  ) : (
    <div className='task-details-header'>
    <div className="title-display-row">
      <h1 className="page-title bold">{task.title}</h1>
      <span className={`type-badge type-${task.type}`}>{task.type}</span>      
    </div>
    <div className='task-details-header-action-btns'>
      <button
        className="edit-title-btn"
        onClick={() => {
          setTitleText(task.title)
          setEditingTitle(true)
        }}
      >
        <FontAwesomeIcon icon={faPenToSquare} /> Edit Name
      </button>

      <button
        className={`task-details-export-btn${isOnTotalFilter ? "" : " hidden"}`}
        onClick={handleExport}
        disabled={isExportingData}
      >
        <span>
          {isExportingData
          ? (
            <>
              <Spinner size={14} /> <span style={{ marginLeft: '5px' }}>Exporting...</span>
            </>
          )
          : (
              <>
                <span><FontAwesomeIcon icon={faDownload} /> {`Export All (${total})`}</span>
              </>
            )
          }
        </span>        
      </button>
    </div>
    </div>
  )}
</div>

    <div className={`summary-grid ${isPayment ? 'summary-grid-4' : 'summary-grid-3'}`}>
  <div
    className={`summary-card ${filter === 'total' ? 'summary-card-active' : ''}`}
    onClick={() => setFilter('total')}
  >
    <p className="summary-label light-bold">Total</p>
    <p className="summary-number bold">{total}</p>
  </div>

  {isPayment ? (
    <>
      <div
        className={`summary-card ${filter === 'paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('paid')}
      >
        <p className="summary-label light-bold">Paid</p>
        <p className="summary-number success bold">{submittedCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'part_paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('part_paid')}
      >
        <p className="summary-label light-bold">Part paid</p>
        <p className="summary-number warning bold">{partPaidCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'not_paid' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('not_paid')}
      >
        <p className="summary-label light-bold">Not paid</p>
        <p className="summary-number danger bold">{pendingCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'collected' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('collected')}
      >
        <p className="summary-label">Collected</p>
        <p className="summary-number success bold" style={{ color: '#27500A' }}>{collectedCount}</p>
      </div>
      <div
        className={`summary-card ${filter === 'not_collected' ? 'summary-card-active' : ''}`}
        onClick={() => setFilter('not_collected')}
      >
        <p className="summary-label light-bold">Not collected</p>
        <p className="summary-number danger bold">{notCollectedCount}</p>
      </div>
    </>
  ) : (
    <>
      <div
  className={`summary-card ${filter === (isAttendance ? 'present' : 'submitted') ? 'summary-card-active' : ''}`}
  onClick={() => setFilter(isAttendance ? 'present' : 'submitted')}
>
  <p className="summary-label">{isAttendance ? 'Present' : 'Submitted'}</p>
  <p className="summary-number success bold">{submittedCount}</p>
</div>
<div
  className={`summary-card ${filter === (isAttendance ? 'absent' : 'pending') ? 'summary-card-active' : ''}`}
  onClick={() => setFilter(isAttendance ? 'absent' : 'pending')}
>
  <p className="summary-label">{isAttendance ? 'Absent' : 'Pending'}</p>
  <p className="summary-number warning bold">{pendingCount}</p>
</div>
    </>
  )}
</div>
    {showRosterUpdate && (
  <div className="roster-update-banner">
    <div className="roster-update-text">
      <p className="roster-update-title">Class list updated</p>
      <p className="roster-update-subtitle">
        New students were added to your roster since this task was created.
        Would you like to load them into this task?
      </p>
    </div>
    <div className="roster-update-actions">
      <button
        className="btn-primary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={handleRosterSync}
        disabled={populating}
      >
        {populating ? 'Loading...' : 'Load new students'}
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={handleDismissRosterUpdate}
      >
        Dismiss
      </button>
    </div>
  </div>
)}
    <div className="toolbar">

      {/*
      <div className="input-wrapper">
                   <FontAwesomeIcon icon={faSearch} className="input-icon" />
                   <input
                     className="form-input search-icon"
            type="text"
    placeholder="Search by name or reg number…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
                   />
                 </div>
      */}
  <div className="input-wrapper">
                   <FontAwesomeIcon icon={faSearch} className="input-icon" />
                   <input
                     className="form-input search-icon"
            type="text"
    placeholder="Search by name or reg number…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
                   />
                 </div>
  <button
    className="btn-secondary"
    style={{ alignSelf: 'flex-start', fontSize: '13px', padding: '8px 14px' }}
    onClick={() => setShowAddStudent(prev => !prev)}
  >
    {showAddStudent ? 'Cancel' : '+ Add student'}
  </button>
</div>

{showAddStudent && (
  
  <div className="form-card" style={{ marginBottom: '12px' }}>
    {addStudentError && <p className="form-error">{addStudentError}</p>}
    
    <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
      Add student to this task only
    </p>
    <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
      This student will only appear in this task, not in your general roster.
    </p>
    <div id='form-input-ctn-two' className="form-input-ctn">
      <input
        className="form-input"
        type="text"
        placeholder="Full name"
        value={newStudentName}
        onChange={(e) => setNewStudentName(e.target.value)}
      />
      <input
        className="form-input"
        type="text"
        placeholder="Reg number"
        value={newStudentReg}
        onChange={(e) => setNewStudentReg(e.target.value)}
      />
    </div>
    <button
      className="btn-primary"
      onClick={handleAddStudentToTask}
      disabled={addingStudent}
      style={{
        opacity: addingStudent ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {addingStudent ? (
        <>
          <Spinner size={14} />
          Adding...
        </>
      ) : '+ Add to this task'}
    </button>
  </div>
)}

    <div className="form-card">
  {filteredEntries.length === 0 ? (
  <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
    {enrichedEntries.length === 0 ? (
      students.length === 0 ? (
        <>
          <p className="empty-title">No class list added yet</p>
          <p className="empty-subtitle">
            You need to add your class list to the roster before tracking can begin.
            Once added, your full list will appear here automatically.
          </p>
          <Link to="/roster" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
            Go to roster →
          </Link>
        </>
      ) : (
        <>
          <p className="empty-title">Your class list isn't loaded into this task yet</p>
          <p className="empty-subtitle">
            You added your roster after creating this task.
            Click below to load your full class list into this task instantly.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={handlePopulateFromRoster}
            disabled={populating}
          >
            {populating ? 'Loading...' : 'Load class list into this task →'}
          </button>
        </>
      )
    ) : (
      <>
        <p className="empty-title">No results found</p>
        <p className="empty-subtitle">Try a different search or filter</p>
      </>
    )}
  </div>
) : (
    <div className="entry-list">
      
      {filteredEntries.map(entry => (
        <div key={entry.id} className="entry-row-wrapper">
  <div className="entry-row">
    <div className="entry-student">
      <p className="entry-name">{entry.student.name}</p>
      <p className="entry-reg">{entry.student.regNumber}</p>
    </div>
    <div className="entry-right">
      <span className={`status-badge status-${entry.status}`}>
        {entry.status.replace('_', ' ')}
      </span>
      <button
        className="toggle-btn"
        onClick={() => handleStatusUpdate(entry.id, entry.status)}
      >
        
        {isPayment
          ? entry.status === 'not_paid' ? 'Mark paid'
            : entry.status === 'paid' ? 'Mark part paid'
            : 'Mark not paid'
          : isAttendance
  ? entry.status === 'absent' ? 'Mark present' : 'Mark absent'
  : entry.status === 'pending' ? 'Mark submitted' : 'Mark pending'
        }
      </button>
      {((isPayment && entry.status === "paid") || (isPayment && entry.status === "part_paid")) && (
  <button
    className={`collected-btn ${entry.collected ? 'collected-active' : ''}`}
    onClick={() => handleCollectedToggle(entry.id, entry.collected)}
  >
    {entry.collected ? '✓ Collected' : 'Not collected'}
  </button>
)}
    </div>
  </div>

  {entry.note && editingNoteId !== entry.id && (
    <p className="entry-note">{entry.note}</p>
  )}

  {editingNoteId === entry.id ? (
    <div className="note-editor">
      <input
        className="form-input"
        type="text"
        placeholder="Add a note…"
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
          onClick={() => handleSaveNote(entry.id)}
        >
          <span>
          {isSavingNote
          ? (
            <>
              <Spinner size={14} /> <span style={{ marginLeft: '5px' }}>Saving...</span>
            </>
          )
          : (
              <>
                <span>Save</span>
              </>
            )
          }
        </span>
        </button>
        <button
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
          onClick={() => {
            setEditingNoteId(null)
            setNoteText('')
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <button
      className="note-btn"
      onClick={() => {
        setEditingNoteId(entry.id)
        setNoteText(entry.note || '')
      }}
    >
      {entry.note ? 'Edit note' : 'Add note'}
    </button>
  )}
</div>
      ))}
    </div>
  )}

</div>
  </div>
)
}

export default TaskDetail