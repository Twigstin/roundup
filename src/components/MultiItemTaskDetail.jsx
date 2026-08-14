import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faArrowDown, faSearch, faXmark, faPenToSquare, faDownload, faPlus, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import Spinner from './Spinner'
import { supabase } from '../api/supabase'
import {
  getTaskItems, touchTask, createTaskItems, getCourses, syncTaskRoster, populateTaskEntries,
  getItemEntries, addItemEntry, updateItemEntry, removeItemEntry,
  updateTask, getStudentsByClassList, getRosterMeta, deleteTaskItem, updateTaskItem, getEntriesByTask
} from '../api/index'
import Tour from './Tour'

const MAX_DOTS = 5

function MultiItemTaskDetail({ task, onTitleUpdate, onRosterSync }) {
  const navigate = useNavigate()
  const [taskItems, setTaskItems] = useState([])
  const [itemEntries, setItemEntries] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [noCourses, setNoCourses] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentReg, setNewStudentReg] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)
  const [addStudentError, setAddStudentError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [pendingStudent, setPendingStudent] = useState(null)
  const [savingStudentName, setSavingStudentName] = useState(null)
  const [showRosterUpdate, setShowRosterUpdate] = useState(false)
  const [rosterDiff, setRosterDiff] = useState({ added: 0, removed: 0 })
  const [syncingRoster, setSyncingRoster] = useState(false)
  const [classListHasStudents, setClassListHasStudents] = useState(false)
  const [populatingRoster, setPopulatingRoster] = useState(false)

  // Scroll + dots
  const scrollRef = useRef(null)
  const [activeDotIndex, setActiveDotIndex] = useState(0)
  const [isCentered, setIsCentered] = useState(false)

  // Modal
  const [activeModal, setActiveModal] = useState(null)
  const [modalSelections, setModalSelections] = useState({})
  const [modalSaving, setModalSaving] = useState(false)
  const [savingStudentId, setSavingStudentId] = useState(null)

  // Long press
  const longPressTimer = useRef(null)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)

  // Title
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)

  // Export
  const [isExporting, setIsExporting] = useState(false)

  const channelId = useRef(`multi-${Date.now()}-${Math.random()}`)

  const multiTaskTourSteps = [
  { selector: '.edit-title-btn', title: 'Rename this task', text: 'Tap here anytime to change the task name.' },
  { selector: '.task-details-export-btn', title: 'Export your data', text: 'Download your records as an Excel file anytime.' },
  { selector: '.multi-item-stats-scroller', title: 'Per-course stats', text: 'Tap any course stats card to see who\'s paid for, or collected that item specifically.' },
  { selector: '.multi-item-view-all', title: 'View all courses', text: 'See stats for every course in one place, not just what fits on screen.' },
  { selector: '.input-wrapper', title: 'Search students', text: 'Quickly find any student by name or reg number.' },
  { selector: '.multi-add-student-wrapper', title: 'Add a student', text: 'Add someone who isn\'t on your class list.' },
  { selector: '.multi-item-add-btn', title: 'Add items for a student', text: 'Tap here on any student\'s entry to mark which items they\'ve paid for.' }
]

/*
  const multiTaskTourSteps = [
  { selector: '.multi-item-stats-section', title: 'Per-course stats', text: 'Tap any course card to see who\'s paid for that item specifically.' },
  { selector: '.multi-item-add-btn', title: 'Add items for a student', text: 'Tap here on any student to mark which items they\'ve paid for.' }
]
*/

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
  setLoading(true)

  const [entriesData, existingItems, courses, rosterMeta] = await Promise.all([
  getEntriesByTask(task.id),
  getTaskItems(task.id),
  getCourses(),
  getRosterMeta()
])

if (task.class_list_id) {
  const classListStudents = await getStudentsByClassList(task.class_list_id)
  setClassListHasStudents(classListStudents.length > 0)
}

// Build student list from entries — class list independent, exactly like single tasks
const resolvedStudents = entriesData.map(e => ({
  id: e.student_id,
  name: e.student_name,
  reg_number: e.student_reg_number,
  serial_number: e.serial_number || null
}))

setStudents(resolvedStudents)

// Detect roster changes

if (
  task.class_list_id &&
  rosterMeta?.updated_at &&
  rosterMeta.change_type === 'added' &&
  rosterMeta.class_list_id === task.class_list_id &&
  (!task.roster_synced_at || new Date(rosterMeta.updated_at) > new Date(task.roster_synced_at))
) {
  const freshClassListStudents = await getStudentsByClassList(task.class_list_id)
  const existingRegNumbers = resolvedStudents.map(s => s.reg_number)
  const newOnes = freshClassListStudents.filter(s => !existingRegNumbers.includes(s.reg_number))

  if (newOnes.length > 0 && resolvedStudents.length > 0) {
    setRosterDiff({ added: newOnes.length, removed: 0 })
    setShowRosterUpdate(true)
  }
}

  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  const courseNormalized = courses.map(c => normalize(c.name))

  let items = existingItems

  if (existingItems.length === 0) {
    // First visit — create from outline with course IDs
    if (courses.length === 0) {
      setNoCourses(true)
      setLoading(false)
      return
    }
    const created = await createTaskItems(
      task.id,
      courses.map(c => ({ name: c.name, courseId: c.id }))
    )
    items = created

    const entries = await getItemEntries(task.id)
    setTaskItems(items)
    setItemEntries(entries)
    setLoading(false)
    return
  }

  // ── Existing task path ─────────────────────────────────────────────────────
  const allEntries = await getItemEntries(task.id)

  // Step 1 — Backfill missing class_list_course_ids by matching name
  const itemsNeedingBackfill = items.filter(i => !i.class_list_course_id)
  if (itemsNeedingBackfill.length > 0) {
    const backfillUpdates = []
    for (const item of itemsNeedingBackfill) {
      const matchingCourse = courses.find(c => normalize(c.name) === normalize(item.name))
      if (matchingCourse) {
        backfillUpdates.push({ taskItemId: item.id, courseId: matchingCourse.id })
      }
    }
    if (backfillUpdates.length > 0) {
      await Promise.all(backfillUpdates.map(({ taskItemId, courseId }) =>
        supabase
          .from('task_items')
          .update({ class_list_course_id: courseId })
          .eq('id', taskItemId)
      ))
      // Update local items to reflect backfill before any further checks
      items = items.map(item => {
        const backfill = backfillUpdates.find(b => b.taskItemId === item.id)
        return backfill ? { ...item, class_list_course_id: backfill.courseId } : item
      })
    }
  }

  // Step 2 — Detect and apply renames using class_list_course_id
  const renames = []
  for (const item of items) {
    if (!item.class_list_course_id) continue
    const matchingCourse = courses.find(c => c.id === item.class_list_course_id)
    if (matchingCourse && normalize(matchingCourse.name) !== normalize(item.name)) {
      renames.push({ taskItemId: item.id, newName: matchingCourse.name })
    }
  }

  if (renames.length > 0) {
  await Promise.allSettled(renames.map(r => updateTaskItem(r.taskItemId, r.newName)))
  items = items.map(item => {
    const rename = renames.find(r => r.taskItemId === item.id)
    return rename ? { ...item, name: rename.newName } : item
  })
}

  // Step 3 — Append genuinely new courses
  // Built from post-backfill items so IDs and names are accurate
  const existingCourseIds = new Set(items.map(i => i.class_list_course_id).filter(Boolean))
  const existingNormalizedNames = new Set(items.map(i => normalize(i.name)))

  const trulyNewCourses = courses.filter(c =>
    !existingCourseIds.has(c.id) &&
    !existingNormalizedNames.has(normalize(c.name))
  )

  if (trulyNewCourses.length > 0) {
    const created = await createTaskItems(
      task.id,
      trulyNewCourses.map(c => ({ name: c.name, courseId: c.id }))
    )
    items = [...items, ...created]
  }

  // Step 4 — Remove virgin items no longer in outline
  const itemsToRemove = items.filter(item => {
    const inOutline = item.class_list_course_id
      ? courses.some(c => c.id === item.class_list_course_id)
      : courseNormalized.includes(normalize(item.name))
    const hasEntries = allEntries.some(e => e.task_item_id === item.id)
    return !inOutline && !hasEntries
  })

  if (itemsToRemove.length > 0) {
    await Promise.all(itemsToRemove.map(item => deleteTaskItem(item.id)))
    items = items.filter(i => !itemsToRemove.some(r => r.id === i.id))
  }

  // Step 5 — Handle empty state after cleanup
  if (items.length === 0 && courses.length === 0) {
    setNoCourses(true)
    setLoading(false)
    return
  }

  setTaskItems(items)
  setItemEntries(allEntries.filter(e => items.some(i => i.id === e.task_item_id)))
  setLoading(false)
}
    init()

    const sub = supabase
      .channel(`item-entries-${channelId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_entries', filter: `task_id=eq.${task.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') setItemEntries(p => p.some(e => e.id === payload.new.id) ? p : [...p, payload.new])
        if (payload.eventType === 'UPDATE') setItemEntries(p => p.map(e => e.id === payload.new.id ? payload.new : e))
        if (payload.eventType === 'DELETE') setItemEntries(p => p.filter(e => e.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [task.id, task.class_list_id])


  useEffect(() => {
  if (activeModal || showAddStudent) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [activeModal, showAddStudent])



  useEffect(() => {
  if (activeModal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [activeModal])



  // ─── Scroll centering check ────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current
    if (!el || taskItems.length === 0) return
    const checkCentered = () => {
      setIsCentered(el.scrollWidth <= el.clientWidth)
    }
    checkCentered()
    window.addEventListener('resize', checkCentered)
    return () => window.removeEventListener('resize', checkCentered)
  }, [taskItems])

  // ─── Scroll dot tracking ───────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || taskItems.length <= 1) return
    const scrollLeft = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll <= 0) return
    const progress = scrollLeft / maxScroll
    const index = Math.round(progress * (taskItems.length - 1))
    setActiveDotIndex(Math.max(0, Math.min(index, taskItems.length - 1)))
  }, [taskItems.length])

  // ─── Dot display logic (TikTok-style sliding window) ──────────────────────
  const getDotDisplay = () => {
    const total = taskItems.length
    if (total <= MAX_DOTS) {
      return taskItems.map((_, i) => ({ index: i, size: i === activeDotIndex ? 'lg' : 'sm' }))
    }
    // Sliding window: active dot stays at center (index 2)
    let windowStart = activeDotIndex - 2
    windowStart = Math.max(0, Math.min(windowStart, total - MAX_DOTS))
    return Array.from({ length: MAX_DOTS }, (_, i) => {
      const realIndex = windowStart + i
      const distFromActive = Math.abs(realIndex - activeDotIndex)
      const size = distFromActive === 0 ? 'lg' : distFromActive === 1 ? 'md' : 'sm'
      return { index: realIndex, size }
    })
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const getItemStats = (taskItemId) => {
    const entries = itemEntries.filter(e => e.task_item_id === taskItemId)
    const paid = entries.length
    const collected = entries.filter(e => e.collected).length
    const notCollected = entries.filter(e => !e.collected).length
    return { paid, collected, notPaid: students.length - paid, notCollected }
  }

  //const getStudentItems = (studentId) => itemEntries.filter(e => e.student_id === studentId)

  const getStudentItems = (studentId, studentName) =>
  itemEntries.filter(e =>
    (e.student_id && e.student_id === studentId) ||
    (!e.student_id && e.student_name === studentName)
  )

  //─── adding students ─────────────────────────────────────────────────────────────────
  const handleAddStudent = async (force = false) => {
  setAddStudentError('')

  if (!newStudentName.trim()) {
    setAddStudentError('Please enter a name')
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

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session.user.id

    // Create entry directly — no student record, no class list involvement
    const entryId = crypto.randomUUID()
    const studentId = crypto.randomUUID()

    const { error: entryError } = await supabase
      .from('entries')
      .insert([{
        id: entryId,
        task_id: task.id,
        student_name: newStudentName.trim(),
        student_reg_number: newStudentReg.trim(),
        status: 'not_paid',
        collected: false,
        note: '',
        user_id: userId,
        updated_at: new Date().toISOString()
      }])

    if (entryError) throw entryError

    // Add to local students state only
    const newStudent = {
  id: studentId,
  name: newStudentName.trim(),
  reg_number: newStudentReg.trim(),
  _isManual: true // flag this as manually added
}
setStudents(prev => [...prev, newStudent])
    setNewStudentName('')
    setNewStudentReg('')
    setShowAddStudent(false)
  } catch (e) {
    setAddStudentError('Failed to add student. Please try again.')
    console.error(e)
  }

  setAddingStudent(false)
}

  // ─── Modal ─────────────────────────────────────────────────────────────────
  const openModal = (student) => {
    const existing = getStudentItems(student.id, student.name)
    const selections = {}
    taskItems.forEach(item => { selections[item.id] = existing.some(e => e.task_item_id === item.id) })
    setModalSelections(selections)
    setActiveModal(student)
  }

  const handleModalConfirm = async () => {
  const student = activeModal
  setSavingStudentId(student.id)
  setSavingStudentName(student.name)
  setActiveModal(null)

  try {
    const existing = getStudentItems(student.id, student.name)
    const existingItemIds = existing.map(e => e.task_item_id)

    const toAdd = taskItems.filter(item =>
      modalSelections[item.id] && !existingItemIds.includes(item.id)
    )
    const toRemove = existing.filter(e => !modalSelections[e.task_item_id])

    // Add new entries
    for (const item of toAdd) {
  const newEntry = {
    id: crypto.randomUUID(),
    task_id: task.id,
    task_item_id: item.id,
    student_id: (task.class_list_id && !student._isManual) ? student.id : null,
    student_name: student.name,
    student_reg_number: student.reg_number,
    collected: false,
    updated_at: new Date().toISOString()
  }
  let saved
  try {
    saved = await addItemEntry(newEntry)
  } catch (e) {
    // student_id likely stale (source student row no longer exists) — retry without it
    saved = await addItemEntry({ ...newEntry, student_id: null })
    console.error(e)
  }
  setItemEntries(prev => [...prev, saved])
}

    // Remove entries — use entry.id directly, not student.id
    for (const entry of toRemove) {
      await supabase
        .from('item_entries')
        .delete()
        .eq('id', entry.id)
      setItemEntries(prev => prev.filter(e => e.id !== entry.id))
    }

    if (toAdd.length > 0 || toRemove.length > 0) touchTask(task.id)

    // Refresh to get accurate state
    const freshEntries = await getItemEntries(task.id)
    setItemEntries(freshEntries)

  } catch (e) {
    console.error('Modal confirm error:', e)
  } finally {
    setSavingStudentId(null)
    setSavingStudentName(null)
    setModalSaving(false)
  }
}



const handleLoadRoster = async () => {
  setPopulatingRoster(true)
  try {
    const classListStudents = await getStudentsByClassList(task.class_list_id)
    await populateTaskEntries(task.id, task.type, classListStudents)
    const freshEntries = await getEntriesByTask(task.id)
    setStudents(freshEntries.map(e => ({
      id: e.student_id,
      name: e.student_name,
      reg_number: e.student_reg_number
    })))
    onRosterSync?.()
  } catch (e) {
    console.error('Failed to load roster:', e)
  }
  setPopulatingRoster(false)
}



  const handleChipTap = async (entry) => {
    const newCollected = !entry.collected
    setItemEntries(prev => prev.map(e => e.id === entry.id ? { ...e, collected: newCollected } : e))
    try {
      await updateItemEntry(entry.id, { collected: newCollected })
      touchTask(task.id)
    }
    catch { setItemEntries(prev => prev.map(e => e.id === entry.id ? { ...e, collected: entry.collected } : e)) }
  }

  const handleChipLongPressStart = (entry) => { longPressTimer.current = setTimeout(() => setShowRemoveConfirm(entry), 600) }
  const handleChipLongPressEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }

  const handleConfirmRemoveChip = async () => {
  const entry = showRemoveConfirm
  setShowRemoveConfirm(null)
  setItemEntries(prev => prev.filter(e => e.id !== entry.id))
  await removeItemEntry(entry.task_item_id, entry.student_id)
  touchTask(task.id)
}

  const handleSaveTitle = async () => {
    if (!titleText.trim()) return
    setSavingTitle(true)
    await updateTask(task.id, { title: titleText.trim() })
    onTitleUpdate(titleText.trim())
    setSavingTitle(false)
    setEditingTitle(false)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx-js-style')
      const colHeaders = ['S/N', 'Name', 'Reg Number', ...taskItems.map(i => i.name)]
      const rows = students.map((student, idx) => {
        const studentEntries = getStudentItems(student.id, student.name)
        const row = [idx + 1, student.name, student.reg_number]
        taskItems.forEach(item => {
          const entry = studentEntries.find(e => e.task_item_id === item.id)
          row.push(!entry ? '—' : entry.collected ? 'Collected' : 'Paid')
        })
        return row
      })
      const worksheet = XLSX.utils.aoa_to_sheet([colHeaders, ...rows])
      for (let c = 0; c < colHeaders.length; c++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c })
        if (!worksheet[ref]) worksheet[ref] = { v: colHeaders[c], t: 's' }
        worksheet[ref].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '111111' } }, alignment: { horizontal: 'center' } }
      }
      worksheet['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 20 }, ...taskItems.map(() => ({ wch: 14 }))]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, worksheet, 'Payments')
      XLSX.writeFile(wb, `${task.title.replace(/\s+/g, '-')}-export.xlsx`)
    } catch (e) { console.error('Export failed:', e) }
    setIsExporting(false)
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.reg_number || '').toLowerCase().includes(search.toLowerCase())
  )


  const detectDuplicate = (name, reg) => {
  const normalizeStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const tokenize = (s) => (s || '').toLowerCase().split(/[\s\-_.,]+/).filter(Boolean)

  const normName = normalizeStr(name)
  const normReg = normalizeStr(reg)
  const nameTokens = tokenize(name)

  for (const student of students) {
    // Level 1 — reg number exact match
    if (reg && student.reg_number) {
      if (normalizeStr(student.reg_number) === normReg) {
        return { student, reason: 'reg number' }
      }
    }

    // Level 2 — full normalized name match
    if (normalizeStr(student.name) === normName) {
      return { student, reason: 'name' }
    }

    // Level 3 — token subset match
    const existingTokens = tokenize(student.name)
    const matchingTokens = nameTokens.filter(t => existingTokens.includes(t))
    if (nameTokens.length >= 2 && matchingTokens.length >= 2) {
      return { student, reason: 'name' }
    }
  }

  return null
}

const handleRosterSync = async () => {
  setSyncingRoster(true)
  try {
    const freshStudents = await getStudentsByClassList(task.class_list_id)
    const existingEntries = await getEntriesByTask(task.id)
    const existingRegNumbers = existingEntries.map(e => e.student_reg_number)

    const newStudents = freshStudents.filter(s => !existingRegNumbers.includes(s.reg_number))

    if (newStudents.length > 0) {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session.user.id

      const newEntries = newStudents.map(s => ({
        id: crypto.randomUUID(),
        task_id: task.id,
        student_id: s.id,
        student_name: s.name,
        student_reg_number: s.reg_number,
        status: 'not_paid',
        collected: false,
        note: '',
        user_id: userId,
        updated_at: new Date().toISOString()
      }))
      await supabase.from('entries').insert(newEntries)
    }

    await syncTaskRoster(task.id) // persist roster_synced_at
    onRosterSync?.()              // tell parent to update local task state

    const updatedEntries = await getEntriesByTask(task.id)
    setStudents(updatedEntries.map(e => ({
      id: e.student_id,
      name: e.student_name,
      reg_number: e.student_reg_number
    })))
    setShowRosterUpdate(false)
  } catch (e) {
    console.error('Roster sync failed:', e)
  }
  setSyncingRoster(false)
}

const collectedHintStep = [
  { selector: '.multi-item-chip', title: 'Mark as collected', text: 'Tap a student\'s chip to strike it through and mark that item as collected or press and hold to remove item from student entry.' }
]

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <div className="page-header">
          <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft} /> Back</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          <div className="skeleton-block" style={{ height: '28px', width: '200px', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '10px', overflow: 'hidden' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton-block" style={{ minWidth: '140px', height: '100px', borderRadius: '10px', flexShrink: 0 }} />)}
          </div>
          <div className="skeleton-block" style={{ height: '42px', borderRadius: '8px' }} />
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div className="skeleton-block" style={{ height: '14px', width: '60%', borderRadius: '4px', marginBottom: '6px' }} />
              <div className="skeleton-block" style={{ height: '11px', width: '35%', borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '6px' }}>
                <div className="skeleton-block" style={{ height: '26px', width: '80px', borderRadius: '20px' }} />
                <div className="skeleton-block" style={{ height: '26px', width: '60px', borderRadius: '20px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (noCourses) {
    return (
      <div>
        <div className="page-header"><Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft} /> Back</Link></div>
        <h1 className="page-title bold" style={{ marginBottom: '20px' }}>{task.title}</h1>
        <div className="empty-state">
          <p className="empty-title">No courses added yet</p>
          <p className="empty-subtitle">Go to Roster → My courses and add your courses for this semester. Roundup will load them automatically when you come back.</p>
          <Link to="/roster?tab=courses" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px' }}>
            Go to My courses →
          </Link>
        </div>
      </div>
    )
  }

  const dotDisplay = getDotDisplay()

  return (
    <div>
      <div className="page-header">
        <Link to="/" className="back-link"><FontAwesomeIcon icon={faChevronLeft} /> Back</Link>
      </div>
      
      {students.length > 0 && (
  <Tour
    steps={multiTaskTourSteps}
    storageKey="roundup_tour_task_detail_multi"
    onComplete={() => {}}
  />
)}

{itemEntries.length > 0 && localStorage.getItem('roundup_tour_task_detail_multi') && (
  <Tour steps={collectedHintStep} storageKey="roundup_tour_multi_collected_hint" onComplete={() => {}} />
)}

      {/* Title */}
      {editingTitle ? (
        <div className="title-edit-row" style={{ marginBottom: '20px' }}>
          <input className="form-input title-edit-input" type="text" value={titleText} onChange={(e) => setTitleText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }} autoFocus />
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={handleSaveTitle}>
            {savingTitle ? <><Spinner size={12} /><span style={{ marginLeft: '6px' }}>Saving...</span></> : 'Save'}
          </button>
          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={() => setEditingTitle(false)}>Cancel</button>
        </div>
      ) : (
        <div className="task-details-header" style={{ marginBottom: '20px' }}>
          <div className="title-display-row">
            <h1 className="page-title bold">{task.title}</h1>
            <span className="type-badge type-payment">multi-item</span>
          </div>
          {students.length > 0 && (<div className="task-details-header-action-btns">
            <button className="edit-title-btn" onClick={() => { setTitleText(task.title); setEditingTitle(true) }}>
              <FontAwesomeIcon icon={faPenToSquare} /> Edit Name
            </button>
            <button className="task-details-export-btn" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <><Spinner size={14} /><span style={{ marginLeft: '6px' }}>Exporting...</span></> : <><FontAwesomeIcon icon={faDownload} /> Export Data</>}
            </button>
          </div>)}
        </div>
      )}

      {/* Stats scroll */}
      {students.length > 0 && (
        <>
        <div className="multi-item-stats-section">
          <div className='multi-item-stats-scroller'>
        <div
          ref={scrollRef}
          className={`multi-item-stats-scroll ${isCentered ? 'multi-item-stats-centered' : ''}`}
          onScroll={handleScroll}
        >
          {taskItems.map(item => {
            const { paid, collected, notPaid, notCollected } = getItemStats(item.id)
            return (
              <button
                key={item.id}
                className="multi-item-stat-card"
                onClick={() => navigate(`/tasks/${task.id}/courses/${item.id}`, { state: { from: `/tasks/${task.id}` } })}
              >
                <p className="multi-item-stat-name light-bold">{item.name}</p>
                <div className="multi-item-stat-rows">
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

        {/* Dot indicator */}
        {taskItems.length > 1 && (
          <div className="multi-item-dots">
            {dotDisplay.map((dot, i) => (
              <span key={i} className={`multi-item-dot multi-item-dot-${dot.size} ${dot.index === activeDotIndex ? 'multi-item-dot-active' : ''}`} />
            ))}
          </div>
        )}
        </div>

        {/* View all courses — always visible */}
        <div className='multi-item-view-ctn'>
          <button className="edit-title-btn multi-item-view-all" onClick={() => navigate(`/tasks/${task.id}/courses`)}>
            View all {taskItems.length} course{taskItems.length !== 1 ? 's' : ''} <span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
          </button>
        </div>
      </div>
      </>
      )}

      {/* Search */}
      {students.length > 0 && (<div className="input-wrapper" style={{ marginBottom: '12px' }}>
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
      onClick={() => setSearch('')}
      aria-label="Clear search"
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
  )}
      </div>)}
      
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }} className="multi-add-student-wrapper">
  <button className="btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '13px', padding: '8px 14px' }} onClick={() => setShowAddStudent(true)}>
    + Add student
  </button>
</div>
      )}

{/* Empty students state */}
{students.length === 0 && !noCourses && task.class_list_id && (
  <div className="task-limit-banner" style={{ marginBottom: '16px' }}>
    {classListHasStudents ? (
      <>
        <p className="task-limit-title">Your class list isn't loaded into this task yet</p>
        <p className="task-limit-subtitle">
          Your students are ready but haven't been pulled into this task. Load them in now to start tracking.
        </p>
        <button
          className="btn-primary"
          style={{ marginTop: '16px' }}
          onClick={handleLoadRoster}
          disabled={populatingRoster}
        >
          {populatingRoster ? <><Spinner size={14} /><span style={{ marginLeft: '10px' }}>Loading...</span></> : <span>Load students <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowDown} /></span>}
        </button>
      </>
    ) : (
      <>
        <p className="task-limit-title">Your class list is empty</p>
        <p className="task-limit-subtitle">
          Upload your students' list to start tracking. Tap the button below to go there now — it only takes a few seconds.
        </p>
        <Link
  to={`/roster/${task.class_list_id}`}
  state={{ showEmptyPrompt: true, from: `/tasks/${task.id}`, fromLabel: task.title, fromState: { task } }}
  className="btn-primary"
  style={{ display: 'inline-block', marginTop: '16px', textDecoration: 'none' }}
>
  Upload class list <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} />
</Link>
      </>
    )}
  </div>
)}

{/* Roster update banner */}
{showRosterUpdate && task.class_list_id && (
  <div className="roster-update-banner" style={{ marginBottom: '16px' }}>
    <div className="roster-update-text">
      <p className="roster-update-title">
        Class list updated
      </p>
      <p className="roster-update-subtitle">
        {rosterDiff.added > 0 && `${rosterDiff.added} new student${rosterDiff.added !== 1 ? 's were' : ' was'} added to your classlist since this task was created.
        Would you like to load them into this task?`}
      </p>
    </div>
    <div className="roster-update-actions">
      <button
        className="btn-primary"
        style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
        onClick={handleRosterSync}
        disabled={syncingRoster}
      >
        {syncingRoster
          ? <><Spinner size={12} /> Syncing...</>
          : 'Yes'
        }
      </button>
      <button
        className="btn-secondary"
        style={{ fontSize: '13px', padding: '8px 14px' }}
        onClick={() => setShowRosterUpdate(false)}
      >
        No
      </button>
    </div>
  </div>
)}

      {/* Student list */}
      {students.length !== 0 && (<div className="form-card">
        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">No students found</p>
            <p className="empty-subtitle">Try a different search</p>
          </div>
        ) : (
          <div className="entry-list">
            {filteredStudents.map(student => {
  const studentKey = student.id || student.name
              const studentItems = getStudentItems(student.id, student.name)
              const isSaving = student.id
  ? savingStudentId === student.id
  : savingStudentName === student.name
              return (
                <div key={student.id || student.name} className="multi-entry-row-wrapper">
                  <div className="multi-entry-student">
                    <p className="entry-name">{student.name}</p>
                    <p className="entry-reg">{student.reg_number}</p>
                  </div>
                  <div className="multi-entry-chips">
                    {studentItems.map(entry => {
                      const item = taskItems.find(i => i.id === entry.task_item_id)
                      if (!item) return null
                      return (
                        <button
                          key={entry.id}
                          className={`multi-item-chip ${entry.collected ? 'multi-item-chip-collected' : 'multi-item-chip-paid'}`}
                          onClick={() => handleChipTap(entry)}
                          onMouseDown={() => handleChipLongPressStart(entry)}
                          onMouseUp={handleChipLongPressEnd}
                          onMouseLeave={handleChipLongPressEnd}
                          onTouchStart={() => handleChipLongPressStart(entry)}
                          onTouchEnd={handleChipLongPressEnd}
                        >
                          <span className={entry.collected ? 'multi-item-chip-text-collected' : ''}>{item.name}</span>
                        </button>
                      )
                    })}
                    {isSaving ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                        <Spinner size={12} />
                        <span style={{ fontSize: '11px', color: '#888' }}>Saving...</span>
                      </span>
                    ) : (
                      <button className="multi-item-add-btn" onClick={() => openModal(student)}>
                        <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} />
                        {studentItems.length === 0 ? ' Add items' : ''}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>)}

      {/* Add items modal */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" id="modal-card" onClick={(e) => e.stopPropagation()}>
  <div style={{ padding: '24px 24px 0 24px', overflowY: 'auto', flex: 1 }}>
    <p className="page-title bold" style={{ fontSize: '15px', marginBottom: '4px' }}>
      What did {activeModal.name.split(' ')[0]} pay for?
    </p>
    <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
      Select all items this student paid for
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px' }}>
      {taskItems.map(item => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: `1px solid ${modalSelections[item.id] ? '#111' : '#e5e5e5'}`, borderRadius: '8px', cursor: 'pointer', background: modalSelections[item.id] ? '#f5f5f5' : '#fff', fontSize: '14px', color: '#111', transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={modalSelections[item.id] || false} onChange={() => setModalSelections(prev => ({ ...prev, [item.id]: !prev[item.id] }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    {item.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '8px', background: '#fff', flexShrink: 0 }}>
              <button className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => {
  
  handleModalConfirm()
}} disabled={modalSaving}>
                {modalSaving ? <><Spinner size={14} /> Saving...</> : 'Confirm'}
              </button>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setActiveModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Long press remove */}
      {showRemoveConfirm && (
        <div className="confirm-modal-overlay" onClick={() => setShowRemoveConfirm(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <p className="modal-message">Do you want to remove <strong>{taskItems.find(i => i.id === showRemoveConfirm.task_item_id)?.name}</strong> from this student's record?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRemoveConfirm(null)}>Cancel</button>
              <button className="btn-danger-solid" onClick={handleConfirmRemoveChip}>Remove</button>
            </div>
          </div>
        </div>
      )}
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

        {addStudentError && (
          <p className="form-error">{addStudentError}</p>
        )}

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
            ⚠️ A student with a similar {duplicateWarning.reason} already exists:
            <strong> "{duplicateWarning.student.name}"</strong>.
            Are you sure you want to add this student?
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                className="btn-danger-solid"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => handleAddStudent(true)}
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
          onClick={() => handleAddStudent(false)}
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
    </div>
  )
}

export default MultiItemTaskDetail