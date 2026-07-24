import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faSearch, faPenToSquare, faDownload, faPlus, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import Spinner from './Spinner'
import { supabase } from '../api/supabase'
import {
  getTaskItems, createTaskItems, getCourses,
  getItemEntries, addItemEntry, updateItemEntry, removeItemEntry,
  updateTask, getStudentsByClassList, deleteTaskItem, updateTaskItem
} from '../api/index'

const MAX_DOTS = 5

function MultiItemTaskDetail({ task, onTitleUpdate }) {
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

  // ─── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
  setLoading(true)

  const [studentData, existingItems, courses] = await Promise.all([
    getStudentsByClassList(task.class_list_id),
    getTaskItems(task.id),
    getCourses()
  ])

  setStudents(studentData)

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

  const getStudentItems = (studentId) => itemEntries.filter(e => e.student_id === studentId)


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
    const { data: newStudent, error } = await supabase
      .from('students')
      .insert([{
        name: newStudentName.trim(),
        reg_number: newStudentReg.trim(),
        class_list_id: task.class_list_id,
        user_id: (await supabase.auth.getSession()).data.session.user.id
      }])
      .select()
      .single()

    if (error) throw error

    // Create regular entry for roster sync
    const { createEntry } = await import('../api/index')
    await createEntry({
      id: crypto.randomUUID(),
      task_id: task.id,
      student_id: newStudent.id,
      student_name: newStudent.name,
      student_reg_number: newStudent.reg_number,
      status: 'not_paid',
      collected: false,
      note: '',
      updated_at: new Date().toISOString()
    })

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
    const existing = getStudentItems(student.id)
    const selections = {}
    taskItems.forEach(item => { selections[item.id] = existing.some(e => e.task_item_id === item.id) })
    setModalSelections(selections)
    setActiveModal(student)
  }

  const handleModalConfirm = async () => {
    const student = activeModal
    setModalSaving(true)
    const existing = getStudentItems(student.id)
    const existingItemIds = existing.map(e => e.task_item_id)
    const toAdd = taskItems.filter(item => modalSelections[item.id] && !existingItemIds.includes(item.id))
    const toRemove = existing.filter(e => !modalSelections[e.task_item_id])
    setSavingStudentId(student.id)
    setActiveModal(null)
    for (const item of toAdd) {
      const newEntry = { id: crypto.randomUUID(), task_id: task.id, task_item_id: item.id, student_id: student.id, student_name: student.name, student_reg_number: student.reg_number, collected: false, updated_at: new Date().toISOString() }
      const saved = await addItemEntry(newEntry)
      setItemEntries(prev => [...prev, saved])
    }
    for (const entry of toRemove) {
      await removeItemEntry(entry.task_item_id, student.id)
      setItemEntries(prev => prev.filter(e => e.id !== entry.id))
    }
    setSavingStudentId(null)
    setModalSaving(false)
  }

  const handleChipTap = async (entry) => {
    const newCollected = !entry.collected
    setItemEntries(prev => prev.map(e => e.id === entry.id ? { ...e, collected: newCollected } : e))
    try { await updateItemEntry(entry.id, { collected: newCollected }) }
    catch { setItemEntries(prev => prev.map(e => e.id === entry.id ? { ...e, collected: entry.collected } : e)) }
  }

  const handleChipLongPressStart = (entry) => { longPressTimer.current = setTimeout(() => setShowRemoveConfirm(entry), 600) }
  const handleChipLongPressEnd = () => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null } }

  const handleConfirmRemoveChip = async () => {
    const entry = showRemoveConfirm
    setShowRemoveConfirm(null)
    setItemEntries(prev => prev.filter(e => e.id !== entry.id))
    await removeItemEntry(entry.task_item_id, entry.student_id)
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
        const studentEntries = getStudentItems(student.id)
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
      return { student, reason: 'similar name' }
    }
  }

  return null
}

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
          <div className="task-details-header-action-btns">
            <button className="edit-title-btn" onClick={() => { setTitleText(task.title); setEditingTitle(true) }}>
              <FontAwesomeIcon icon={faPenToSquare} /> Edit Name
            </button>
            <button className="task-details-export-btn" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <><Spinner size={14} /><span style={{ marginLeft: '6px' }}>Exporting...</span></> : <><FontAwesomeIcon icon={faDownload} /> Export Data</>}
            </button>
          </div>
        </div>
      )}

      {/* Stats scroll */}
      <div className="multi-item-stats-section">
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

        {/* View all courses — always visible */}
        <button className="multi-item-view-all" onClick={() => navigate(`/tasks/${task.id}/courses`)}>
          View all {taskItems.length} course{taskItems.length !== 1 ? 's' : ''} <span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
        </button>
      </div>

      {/* Search */}
      <div className="input-wrapper" style={{ marginBottom: '12px' }}>
        <FontAwesomeIcon icon={faSearch} className="input-icon" />
        <input className="form-input search-icon" type="text" placeholder="Search by name or reg number…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
  <button
    className="btn-secondary"
    style={{ whiteSpace: 'nowrap', fontSize: '13px', padding: '8px 14px' }}
    onClick={() => setShowAddStudent(true)}
  >
    + Add student
  </button>
</div>

      {/* Student list */}
      <div className="form-card">
        {filteredStudents.length === 0 ? (
          <div className="empty-state" style={{ border: 'none', padding: '24px' }}>
            <p className="empty-title">No students found</p>
            <p className="empty-subtitle">Try a different search</p>
          </div>
        ) : (
          <div className="entry-list">
            {filteredStudents.map(student => {
              const studentItems = getStudentItems(student.id)
              const isSaving = savingStudentId === student.id
              return (
                <div key={student.id} className="multi-entry-row-wrapper">
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
      </div>

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
              <button className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={handleModalConfirm} disabled={modalSaving}>
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
          Student will be added to this task and the class list
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