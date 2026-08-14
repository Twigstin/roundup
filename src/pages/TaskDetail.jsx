import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { getTasks, getEntries, getStudents, getStudentsByClassList, createEntry, updateEntry, populateTaskEntries, updateTask, getRosterMeta, syncTaskRoster } from '../api/index'
import Spinner from '../components/Spinner'
import MultiItemTaskDetail from '../components/MultiItemTaskDetail'
import { TaskDetailSkeleton } from '../components/Skeleton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faArrowRight, faXmark, faSearch, faPenToSquare, faDownload, faUserCheck, faFileCircleCheck, faCreditCard, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../api/supabase'
import posthog from 'posthog-js'
import Tour from '../components/Tour'

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
  const [isLoadingInDetectedStudents, setIsLoadingInDetectedStudents] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportTitle, setExportTitle] = useState('')
  const [exportDate, setExportDate] = useState(true)
  const [exportSummary, setExportSummary] = useState(true)
  //const [exportBasic, setExportBasic] = useState(true)
  const [regNumberFixes, setRegNumberFixes] = useState({})
  const [exportBlockedMsg, setExportBlockedMsg] = useState('')
  const [exportType, setExportType] = useState('basic') // 'basic' | 'full' | 'custom'
  const [customStatusCols, setCustomStatusCols] = useState([])
  const [exportSortBy, setExportSortBy] = useState('default') // 'default' | 'az' | 'recent'
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [pendingStudent, setPendingStudent] = useState(null)

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
  if (showExportModal || showAddStudent) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }

  return () => {
    document.body.style.overflow = ''
  }
}, [showExportModal, showAddStudent])

useEffect(() => {
  if (showExportModal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }

  // Cleanup in case component unmounts while modal is open
  return () => {
    document.body.style.overflow = ''
  }
}, [showExportModal])

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
if (hasNewStudents && allEntries.length > 0) setShowRosterUpdate(true)
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

  if (task.payment_mode === 'multi') {
  return (
    <MultiItemTaskDetail
      task={task}
      onTitleUpdate={(newTitle) => setTask(prev => ({ ...prev, title: newTitle }))}
      onRosterSync={() => setTask(prev => ({ ...prev, roster_synced_at: new Date().toISOString() }))}
    />
  )
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
  setIsLoadingInDetectedStudents(true)
  await populateTaskEntries(task.id, task.type, students)
  setTask(prev => ({ ...prev, roster_synced_at: new Date().toISOString() }))
  setIsLoadingInDetectedStudents(false)
  setShowRosterUpdate(false)
}


const handleDismissRosterUpdate = async () => {
  await syncTaskRoster(task.id)
  setTask(prev => ({ ...prev, roster_synced_at: new Date().toISOString() }))
  setShowRosterUpdate(false)
}



const handleAddStudentToTask = async (force = false) => {
  if (!newStudentName.trim()) {
    setAddStudentError('Please enter the student name')
    return
  }

  if (!force) {
    const duplicate = detectDuplicate(newStudentName.trim(), newStudentReg.trim())
    if (duplicate) {
      setDuplicateWarning(duplicate)
      setPendingStudent({ name: newStudentName.trim(), reg: newStudentReg.trim() })
      return
    }
  }

  setAddingStudent(true)
  setDuplicateWarning(null)
  setPendingStudent(null)

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


const isValidRegNumber = (reg) => {
  if (!reg || reg.toString().trim() === '' || reg === '-') return false
  const val = reg.toString().trim()
  const futoPattern = /^\d{10,12}$/
  const otherUniPattern = /^(?:PG\/)?[A-Z0-9]{2,4}[\/\-\.]?[A-Z0-9]{2,4}[\/\-\.]?[A-Z0-9]{2,4}[\/\-\.]?\d{3,6}$/i
  const unnSerialPattern = /^\d{2}\/\d{3,6}$/  // e.g. 23/4530 — YY/serial style
  return futoPattern.test(val) || otherUniPattern.test(val) || unnSerialPattern.test(val)
}



const getAvailableStatuses = () => {
  if (isPayment) return [
    { key: 'paid', label: 'Paid' },
    { key: 'part_paid', label: 'Part paid' },
    { key: 'not_paid', label: 'Not paid' },
    { key: 'collected', label: 'Collected' }
  ]
  if (isAttendance) return [
    { key: 'present', label: 'Present' },
    { key: 'absent', label: 'Absent' }
  ]
  return [
    { key: 'submitted', label: 'Submitted' },
    { key: 'pending', label: 'Pending' }
  ]
}

const getSortedEntries = (entries) => {
  if (exportSortBy === 'az') {
    return [...entries].sort((a, b) => a.student_name.localeCompare(b.student_name))
  }
  if (exportSortBy === 'recent') {
    return [...entries].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }
  return entries
}

const openExportModal = () => {
  if (filteredEntries.length === 0) {
    setExportBlockedMsg('⚠️ Nothing to export — your current filter has no students.')
    setTimeout(() => setExportBlockedMsg(''), 3000)
    return
  }

  setExportTitle(task.title)
  setExportDate(false)
  setExportSummary(false)
  setExportType('basic')
  setExportSortBy('default')

  // Auto-set custom cols based on active filter
  if (filter !== 'total') {
    setCustomStatusCols([filter])
  } else {
    setCustomStatusCols([])
  }

  const fixes = {}
  filteredEntries.forEach(entry => {
    if (!isValidRegNumber(entry.student_reg_number)) {
      fixes[entry.id] = entry.student_reg_number || ''
    }
  })
  setRegNumberFixes(fixes)
  setShowExportModal(true)
}

const handleExport = async () => {
  setShowExportModal(false)
  setIsExportingData(true)

  try {
    const XLSX = await import('xlsx-js-style')

    const isBasic = exportType === 'basic'
    const isFull = exportType === 'full'
    const isCustom = exportType === 'custom'

    const sortedEntries = getSortedEntries(filteredEntries)

    const hasNotes = isFull && sortedEntries.some(e => e.note && e.note.trim() !== '')
    const hasCollected = isFull && isPayment

    // For custom — determine which status columns to include
    const activeStatuses = isCustom
      ? (filter !== 'total' ? [filter] : customStatusCols)
      : []

    const totalCols = isBasic
      ? 3
      : isFull
      ? (3 + 1 + (hasCollected ? 1 : 0) + (hasNotes ? 1 : 0))
      : (3 + activeStatuses.length)

    // Build header rows
    const headerRows = []
    if (exportTitle.trim()) headerRows.push([exportTitle.trim()])
    if (exportDate) {
      const dateStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
      headerRows.push([`Date: ${dateStr}`])
    }
    if (exportSummary) {
      if (isPayment) {
        headerRows.push([`Total: ${sortedEntries.length} | Paid: ${sortedEntries.filter(e => e.status === 'paid').length} | Part paid: ${sortedEntries.filter(e => e.status === 'part_paid').length} | Not paid: ${sortedEntries.filter(e => e.status === 'not_paid').length}`])
      } else if (isAttendance) {
        headerRows.push([`Total: ${sortedEntries.length} | Present: ${sortedEntries.filter(e => e.status === 'present').length} | Absent: ${sortedEntries.filter(e => e.status === 'absent').length}`])
      } else {
        headerRows.push([`Total: ${sortedEntries.length} | Submitted: ${sortedEntries.filter(e => e.status === 'submitted').length} | Pending: ${sortedEntries.filter(e => e.status === 'pending').length}`])
      }
    }

    // Column headers
    const colHeaders = ['S/N', 'Name', 'Reg Number']
    if (isFull) {
      colHeaders.push('Status')
      if (hasCollected) colHeaders.push('Collected')
      if (hasNotes) colHeaders.push('Note')
    }
    if (isCustom) {
      const statusLabels = {
        paid: 'Paid', part_paid: 'Part Paid', not_paid: 'Not Paid',
        collected: 'Collected', submitted: 'Submitted', pending: 'Pending',
        present: 'Present', absent: 'Absent'
      }
      activeStatuses.forEach(s => colHeaders.push(statusLabels[s] || s))
    }

    // Data rows
    const dataRows = sortedEntries.map((entry, index) => {
      const regNumber = regNumberFixes.hasOwnProperty(entry.id)
        ? regNumberFixes[entry.id]
        : entry.student_reg_number
      const isInvalid = !isValidRegNumber(regNumber)
      const row = [index + 1, entry.student_name, regNumber || '']

      if (isFull) {
        row.push(entry.status.replace(/_/g, ' '))
        if (hasCollected) row.push(entry.collected ? 'Yes' : 'No')
        if (hasNotes) row.push(entry.note || '')
      }

      if (isCustom) {
        activeStatuses.forEach(s => {
          if (s === 'collected') {
            row.push(entry.collected ? '✓' : '')
          } else {
            row.push(entry.status === s ? '✓' : '')
          }
        })
      }

      return { row, isInvalid }
    })

    const colHeaderRowIndex = headerRows.length + (headerRows.length > 0 ? 1 : 0)
    const dataStartRowIndex = colHeaderRowIndex + 1

    const allRows = [
      ...headerRows,
      ...(headerRows.length > 0 ? [['']] : []),
      colHeaders,
      ...dataRows.map(d => d.row)
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(allRows)

    // Style all header rows in one loop
    for (let r = 0; r < headerRows.length; r++) {
      const cellRef = XLSX.utils.encode_cell({ r, c: 0 })
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = {
          font: { bold: true, sz: r === 0 && exportTitle.trim() ? 18 : 13 },
          alignment: {
            horizontal: r === 0 && exportTitle.trim() ? 'center' : 'left',
            vertical: 'center'
          }
        }
      }
      if (!worksheet['!merges']) worksheet['!merges'] = []
      worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } })
    }

    // Style column header row
    for (let c = 0; c < totalCols; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: colHeaderRowIndex, c })
      if (!worksheet[cellRef]) worksheet[cellRef] = { v: colHeaders[c], t: 's' }
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '111111' } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }

    // Style data rows
    dataRows.forEach((dataRow, rowOffset) => {
      const r = dataStartRowIndex + rowOffset
      for (let c = 0; c < totalCols; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c })
        if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' }
        worksheet[cellRef].s = {
          fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          },
          alignment: { horizontal: c === 0 ? 'center' : 'left', vertical: 'center' }
        }
      }
    })

    // Column widths
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 20 },
      ...(isFull ? [{ wch: 14 }] : []),
      ...(hasCollected ? [{ wch: 12 }] : []),
      ...(hasNotes ? [{ wch: 30 }] : []),
      ...(isCustom ? activeStatuses.map(() => ({ wch: 12 })) : [])
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')

    const fileName = `${task.title.replace(/\s+/g, '-')}-export.xlsx`
    XLSX.writeFile(workbook, fileName)

  } catch (error) {
    console.error('Export failed:', error)
  }

  posthog.capture('excel_exported', { task_type: task.type, student_count: filteredEntries.length })
  setIsExportingData(false)
}

const detectDuplicate = (name, reg) => {
  const normalizeStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const tokenize = (s) => (s || '').toLowerCase().split(/[\s\-_.,]+/).filter(Boolean)

  const normName = normalizeStr(name)
  const normReg = normalizeStr(reg)
  const nameTokens = tokenize(name)

  for (const entry of entries) {
    if (reg && entry.student_reg_number) {
      if (normalizeStr(entry.student_reg_number) === normReg) {
        return { entry, reason: 'reg number' }
      }
    }

    if (normalizeStr(entry.student_name) === normName) {
      return { entry, reason: 'name' }
    }

    const existingTokens = tokenize(entry.student_name)
    const matchingTokens = nameTokens.filter(t => existingTokens.includes(t))
    if (nameTokens.length >= 2 && matchingTokens.length >= 2) {
      return { entry, reason: 'name' }
    }
  }

  return null
}


  const taskDetailTourSteps = [
  { selector: '.edit-title-btn', title: 'Rename this task', text: 'Tap here anytime to change the task name.' },
  { selector: '.task-details-export-btn', title: 'Export your data', text: 'Download your records as an Excel file anytime.' },
  { selector: '.summary-grid', title: 'Track progress at a glance', text: 'Tap any card to filter your list by that status.' },
  { selector: '.input-wrapper', title: 'Search students', text: 'Quickly find any student by name or reg number.' },
  { selector: '.task-add-student-btn', title: 'Add a student', text: 'Add someone who isn\'t on your class list.' },
  { selector: '.toggle-btn', title: 'Update a student\'s status', text: 'Tap here to mark or unmark a student as paid, submitted, or present.' },
  ...(isPayment ? [{ selector: '.note-btn', title: 'Add a note', text: 'Leave a note on any student\'s payment — useful for partial payments or special cases.' }] : [])
]

const exportModalTourSteps = [
  { selector: '.export-title-field', title: 'Name your export', text: 'Give the file a title — it appears as a header in the exported sheet.' },
  { selector: '.export-type-field', title: 'Choose export type', text: 'Basic for just names and reg numbers, Full for status and notes too, or Custom to pick exactly what you need.' },
  { selector: '.export-sort-field', title: 'Sort order', text: 'Export in default order, alphabetically, or by most recently updated.' },
  { selector: '.export-header-info-field', title: 'Extra header info', text: 'Optionally include the date and a summary of totals at the top of the file.' }
]



  return (
  <div>
    <div className="page-header">
      <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft}/> Back</Link>
    </div>

    <Tour steps={taskDetailTourSteps} storageKey="roundup_tour_task_detail_single" onComplete={() => {}} />

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
      <span className={`type-badge type-${task.type}`}>
        {task.type === "payment" ? (
                                  <FontAwesomeIcon icon={faCreditCard} className="dashboard-icons" />
                                ) : task.type === "submission" ? (
                                  <FontAwesomeIcon icon={faFileCircleCheck} className="dashboard-icons" />
                                ) : (
                                  <FontAwesomeIcon icon={faUserCheck} className="dashboard-icons" />
                                )} {task.type}</span>      
    </div>
    {exportBlockedMsg && (
  <p id="export-no-data-msg-ctn">
      <span className='export-no-data-msg'>{exportBlockedMsg}</span>
  </p>
)}
    {total > 0 && (<div className='task-details-header-action-btns'>
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
        className="task-details-export-btn"
        onClick={openExportModal}
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
                <span><FontAwesomeIcon icon={faDownload} /> {filter === 'total' ? `Export All (${total})` : `Export ${filter.replace('_', ' ')} (${filteredEntries.length})`}</span>
              </>
            )
          }
        </span>        
      </button>
    
    </div>)}
    </div>
  )}
</div>

    {total > 0 && (<div className={`summary-grid ${isPayment ? 'summary-grid-4' : 'summary-grid-3'}`}>
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
</div>)}
    {showRosterUpdate && (
  <div className="roster-update-banner">
    <div className="roster-update-text">
      <p className="roster-update-title">Class list updated</p>
      <p className="roster-update-subtitle">
        New students were added to your classlist since this task was created.
        Would you like to load them into this task?
      </p>
    </div>
    <div className="roster-update-actions">
      <button
  className="btn-primary"
  style={{ fontSize: '13px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}
  onClick={handleRosterSync}
  disabled={isLoadingInDetectedStudents}
>
  {isLoadingInDetectedStudents ? <><Spinner size={14} />Loading...</> : 'Load new students'}
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
    {total > 0 && (<div className="toolbar">

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
                   {search && (
    <button
      type="button"
      className="input-clear-btn"
      id="my-input-clear-btn"
      onClick={() => setSearch('')}
      aria-label="Clear search"
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
  )}
                 </div>
  <button
  className="btn-secondary task-add-student-btn"
  style={{ alignSelf: 'flex-start', fontSize: '13px', padding: '8px 14px' }}
  onClick={() => setShowAddStudent(true)}
>
  + Add student
</button>
</div>)}

{showAddStudent && (
  <div className="modal-overlay" onClick={() => {
    setShowAddStudent(false)
    setDuplicateWarning(null)
    setPendingStudent(null)
    setAddStudentError('')
  }}>
    <div className="modal-card" id="modal-card" onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: '24px 24px 0 24px' }}>
        <p className="page-title bold" style={{ fontSize: '15px', marginBottom: '4px' }}>
          Add student
        </p>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          This student will only appear in this task, not in your general roster.
        </p>

        {addStudentError && <p className="form-error">{addStudentError}</p>}

        {duplicateWarning && (
          <div style={{
            background: '#FAEEDA',
            border: '1px solid #EF9F27',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#633806',
            lineHeight: 1.5
          }}>
            ⚠️ A student with a similar {duplicateWarning.reason} already exists in this task:
            <strong> "{duplicateWarning.entry.student_name}"</strong>.
            Are you sure you want to add this student?
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                className="btn-danger-solid"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => handleAddStudentToTask(true)}
              >
                Add anyway
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => {
                  setDuplicateWarning(null)
                  setPendingStudent(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="form-field">
          <label className="form-label">Full name</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Austin Aniobi"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Reg number <span style={{ color: '#999', fontSize: '12px' }}>(optional)</span></label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 20251234567"
            value={newStudentReg}
            onChange={(e) => setNewStudentReg(e.target.value)}
          />
        </div>
      </div>

      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #e5e5e5',
        display: 'flex',
        gap: '8px',
        background: '#fff',
        flexShrink: 0
      }}>
        <button
          className="btn-primary"
          style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => handleAddStudentToTask(false)}
          disabled={addingStudent}
        >
          {addingStudent ? <><Spinner size={14} /> Adding...</> : 'Add student'}
        </button>
        <button
          className="btn-secondary"
          style={{ flex: 1, padding: '10px' }}
          onClick={() => {
            setShowAddStudent(false)
            setDuplicateWarning(null)
            setPendingStudent(null)
            setAddStudentError('')
            setNewStudentName('')
            setNewStudentReg('')
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

    <div className="form-card">
  {filteredEntries.length === 0 ? (
  <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
    {enrichedEntries.length === 0 ? (
      students.length === 0 ? (
        <>
          <p className="task-limit-title">Your class list is empty</p>
          <p className="task-limit-subtitle">
            Upload your students' list to start tracking. Tap the button below to go there now — it only takes a few seconds.
          </p>
          <Link 
  to={`/roster/${task.class_list_id}`}
  state={{ showEmptyPrompt: true, from: `/tasks/${task.id}`, fromLabel: task.title, fromState: { task } }}
  className="btn-primary" 
  style={{ display: 'inline-block', marginTop: '16px' }}
>
  Upload class list <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} />
</Link>
        </>
      ) : (
        <>
          <p className="task-limit-title">Your class list isn't loaded into this task yet</p>
          <p className="task-limit-subtitle">
            Your students are ready but haven't been pulled into this task. Load them in now to start tracking.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: '16px' }}
            onClick={handlePopulateFromRoster}
            disabled={populating}
          >
            {populating ? <><Spinner size={14} /><span style={{ marginLeft: "10px" }}>Loading...</span></> : <span>Load students <span><FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowDown} /></span></span>}
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

  {isPayment && (editingNoteId === entry.id ? (
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
  ))}
</div>
      ))}
    </div>
  )}

</div>


{showExportModal && (
  <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
    <div className="modal-card" id='modal-card' onClick={(e) => e.stopPropagation()}>
  <Tour steps={exportModalTourSteps} storageKey="roundup_tour_export_modal_single" onComplete={() => {}} />
  
  <div style={{ overflowY: 'auto', flex: 1, padding: '24px 24px 0 24px' }}>
  <h2 className="page-title bold" style={{ fontSize: '16px', marginBottom: '16px' }}>Export settings</h2>

  <div className="form-field export-title-field">
    <label className="form-label">List title</label>
    <input
      className="form-input"
      type="text"
      value={exportTitle}
      onChange={(e) => setExportTitle(e.target.value)}
      placeholder="e.g. CSC 301 Assignment 3"
    />
    <span className="form-hint">Appears as a header at the top of the exported file</span>
  </div>

  <div className="form-field export-type-field">
    <label className="form-label">Export type</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="exportType" checked={exportType === 'basic'} onChange={() => setExportType('basic')} />
        <div>
          <p style={{ margin: 0, fontWeight: '500' }}>Basic</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>S/N, Name, Reg Number only</p>
        </div>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="exportType" checked={exportType === 'full'} onChange={() => setExportType('full')} />
        <div>
          <p style={{ margin: 0, fontWeight: '500' }}>Full</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Includes status, collected and notes</p>
        </div>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="exportType" checked={exportType === 'custom'} onChange={() => setExportType('custom')} />
        <div>
          <p style={{ margin: 0, fontWeight: '500' }}>Custom</p>
          <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Choose which statuses to include as columns</p>
        </div>
      </label>
    </div>
  </div>

  {/* Custom status checkboxes — only show on total filter */}
  {exportType === 'custom' && filter === 'total' && (
    <div className="form-field">
      <label className="form-label">Select status columns</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
        {getAvailableStatuses().map(s => (
          <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={customStatusCols.includes(s.key)}
              onChange={(e) => {
                if (e.target.checked) {
                  setCustomStatusCols(prev => [...prev, s.key])
                } else {
                  setCustomStatusCols(prev => prev.filter(k => k !== s.key))
                }
              }}
            />
            {s.label}
          </label>
        ))}
      </div>
      {exportType === 'custom' && filter === 'total' && customStatusCols.length === 0 && (
        <p style={{ fontSize: '12px', color: '#b45309', marginTop: '6px' }}>Select at least one status to include</p>
      )}
    </div>
  )}

  {exportType === 'custom' && filter !== 'total' && (
    <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px', marginTop: '-8px' }}>
      Will export a ✓ column for <strong>{filter.replace('_', ' ')}</strong> based on your active filter.
    </p>
  )}

  <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }}/>

  <div className="form-field export-sort-field">
    <label className="form-label">Sort order</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="sortBy" checked={exportSortBy === 'default'} onChange={() => setExportSortBy('default')} />
        Default order
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="sortBy" checked={exportSortBy === 'az'} onChange={() => setExportSortBy('az')} />
        A–Z (alphabetical)
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="radio" name="sortBy" checked={exportSortBy === 'recent'} onChange={() => setExportSortBy('recent')} />
        Recently updated
      </label>
    </div>
  </div>

  <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }}/>

  <div className="form-field export-header-info-field">
    <label className="form-label">Additional header info</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="checkbox" checked={exportDate} onChange={(e) => setExportDate(e.target.checked)} />
        Date
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
        <input type="checkbox" checked={exportSummary} onChange={(e) => setExportSummary(e.target.checked)} />
        Summary stats
      </label>
    </div>
  </div>

  {Object.keys(regNumberFixes).length > 0 && (
    <div className="form-field">
      <hr style={{ height: '1px', border: 'none', backgroundColor: '#e5e5e5', marginTop: '10px', marginBottom: '10px' }}/>
      <label className="form-label" style={{ color: '#b45309' }}>
        ⚠️ {Object.keys(regNumberFixes).length} student{Object.keys(regNumberFixes).length > 1 ? 's have' : ' has'} a missing or invalid reg number
      </label>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>Fix them below or export anyway.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredEntries
          .filter(entry => regNumberFixes.hasOwnProperty(entry.id))
          .map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', flex: 1, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.student_name}
              </span>
              <input
                className="form-input"
                type="text"
                style={{ flex: 1, fontSize: '13px', padding: '6px 10px' }}
                placeholder="Enter reg number"
                value={regNumberFixes[entry.id]}
                onChange={(e) => setRegNumberFixes(prev => ({ ...prev, [entry.id]: e.target.value }))}
              />
            </div>
          ))
        }
      </div>
    </div>
  )}

  <div style={{ height: '16px' }} />
</div>

  {/* Sticky buttons — always visible at bottom */}
  <div style={{
    padding: '16px 24px',
    borderTop: '1px solid #e5e5e5',
    display: 'flex',
    gap: '8px',
    background: '#fff'
  }}>
    <button
  className="btn-primary"
  style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    opacity: exportType === 'custom' && filter === 'total' && customStatusCols.length === 0 ? 0.5 : 1
  }}
  onClick={() => {
    if (exportType === 'custom' && filter === 'total' && customStatusCols.length === 0) return
    handleExport()
  }}
>
  <FontAwesomeIcon icon={faDownload} /> Export
</button>
    <button
      className="btn-secondary"
      style={{ flex: 1, padding: '10px' }}
      onClick={() => setShowExportModal(false)}
    >
      Cancel
    </button>
  </div>

</div>
  </div>
)}
  </div>
)
}

export default TaskDetail