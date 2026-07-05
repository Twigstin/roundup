import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClassLists, createClassList, deleteClassList, updateClassList, getCourses, createCourse, updateCourse, deleteCourse } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { RosterSkeleton } from '../components/Skeleton'
import { supabase } from '../api/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faPenToSquare, faEllipsisVertical, faSearch, faArrowRight } from '@fortawesome/free-solid-svg-icons'

function Roster() {
  const [activeTab, setActiveTab] = useState(() => {
  const saved = sessionStorage.getItem('roster_tab')
  if (saved) {
    sessionStorage.removeItem('roster_tab')
    return saved
  }
  return 'lists'
})

  // ─── Class lists state ────────────────────────────────────────────────────
  const [classLists, setClassLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [listToDelete, setListToDelete] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [deletingList, setDeletingList] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ─── Courses state ────────────────────────────────────────────────────────
  const [courses, setCourses] = useState([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [primaryClassListId, setPrimaryClassListId] = useState(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [courseError, setCourseError] = useState('')
  const [editingCourseId, setEditingCourseId] = useState(null)
  const [editingCourseName, setEditingCourseName] = useState('')
  const [savingCourse, setSavingCourse] = useState(false)
  const [openCourseMenuId, setOpenCourseMenuId] = useState(null)
  const [showDeleteCourseWarning, setShowDeleteCourseWarning] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState(null)
  const [deletingCourse, setDeletingCourse] = useState(false)

  const navigate = useNavigate()
  const channelId = useRef(`${Date.now()}-${Math.random()}`)

  const sortByUpdated = (lists) =>
    [...lists].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 4000)
    return () => clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!courseError) return
    const timer = setTimeout(() => setCourseError(''), 4000)
    return () => clearTimeout(timer)
  }, [courseError])

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuId(null)
      setOpenCourseMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // ─── Fetch class lists ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClassLists = async () => {
      const lists = await getClassLists()
      const listsWithCounts = await Promise.all(
        lists.map(async (list) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_list_id', list.id)
          return { ...list, studentCount: count || 0 }
        })
      )
      setClassLists(listsWithCounts)

      // Set primary class list — most recently updated
      if (lists.length > 0) {
        setPrimaryClassListId(lists[0].id)
      }

      setLoading(false)
    }

    fetchClassLists()

    const classListsSub = supabase
      .channel(`class-lists-changes-${channelId.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_lists' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setClassLists(prev => {
            const alreadyExists = prev.some(l => l.id === payload.new.id)
            if (alreadyExists) return prev
            return [...prev, payload.new]
          })
        }
        if (payload.eventType === 'UPDATE') {
          setClassLists(prev => sortByUpdated(
            prev.map(l => l.id === payload.new.id
              ? { ...payload.new, studentCount: l.studentCount }
              : l
            )
          ))
        }
        if (payload.eventType === 'DELETE') {
          setClassLists(prev => prev.filter(l => l.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(classListsSub)
  }, [])

  // ─── Fetch courses when tab switches ─────────────────────────────────────
  useEffect(() => {
  if (activeTab !== 'courses') return
  if (!primaryClassListId) {
    setCoursesLoading(false)
    return
  }

  const fetchCourses = async () => {
    setCoursesLoading(true)
    try {
      const data = await getCourses()
      setCourses(data)
    } catch (e) {
      console.error('Failed to fetch courses:', e)
    }
    setCoursesLoading(false)
  }

  fetchCourses()
}, [activeTab, primaryClassListId])

  // ─── Class list handlers ──────────────────────────────────────────────────
  const handleCreateList = async () => {
    if (!newListName.trim()) {
      setError('Please enter a list name')
      return
    }
    setCreating(true)
    const saved = await createClassList(newListName.trim())
    setClassLists(prev => sortByUpdated([...prev, { ...saved, studentCount: 0 }]))
    if (!primaryClassListId) setPrimaryClassListId(saved.id)
    setNewListName('')
    setError('')
    setCreating(false)
    setShowCreateModal(false)
    navigate(`/roster/${saved.id}`, { state: { showEmptyPrompt: true } })
  }

  const handleRenameList = async (listId) => {
    if (!editingName.trim()) return
    setRenamingId(listId)
    const updated = await updateClassList(listId, editingName.trim())
    setClassLists(prev => sortByUpdated(prev.map(l =>
      l.id === listId ? { ...updated, studentCount: l.studentCount } : l
    )))
    setEditingId(null)
    setEditingName('')
    setRenamingId(null)
  }

  const handleDeleteClick = (listId) => {
    setListToDelete(listId)
    setShowDeleteWarning(true)
  }

  const handleConfirmDelete = async () => {
    setDeletingList(true)
    await deleteClassList(listToDelete)
    setClassLists(prev => prev.filter(l => l.id !== listToDelete))
    setShowDeleteWarning(false)
    setListToDelete(null)
    setDeletingList(false)
  }

  // ─── Course handlers ──────────────────────────────────────────────────────
  const handleAddCourse = async () => {
    if (!newCourseName.trim()) {
      setCourseError('Please enter a course name')
      return
    }
    if (!primaryClassListId) {
      setCourseError('Create a class list first before adding courses')
      return
    }
    setAddingCourse(true)
    const position = courses.length
    const saved = await createCourse(newCourseName.trim(), position)
    setCourses(prev => [...prev, saved])
    setNewCourseName('')
    setAddingCourse(false)
  }

  const handleSaveCourse = async (courseId) => {
    if (!editingCourseName.trim()) return
    setSavingCourse(true)
    const updated = await updateCourse(courseId, editingCourseName.trim())
    setCourses(prev => prev.map(c => c.id === courseId ? updated : c))
    setEditingCourseId(null)
    setEditingCourseName('')
    setSavingCourse(false)
  }

  const handleDeleteCourse = async () => {
    setDeletingCourse(true)
    await deleteCourse(courseToDelete)
    setCourses(prev => prev.filter(c => c.id !== courseToDelete))
    setShowDeleteCourseWarning(false)
    setCourseToDelete(null)
    setDeletingCourse(false)
  }

  const filteredClassLists = classLists.filter(list =>
    list.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <RosterSkeleton />

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title bold">Roster</h1>
        {activeTab === 'lists' && (
          <span className="roster-count">
            {classLists.length} list{classLists.length !== 1 ? 's' : ''}
          </span>
        )}
        {activeTab === 'courses' && (
          <span className="roster-count">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="roster-tabs">
        <button
          className={`roster-tab ${activeTab === 'lists' ? 'roster-tab-active' : ''}`}
          onClick={() => setActiveTab('lists')}
        >
          Class lists
        </button>
        <button
          className={`roster-tab ${activeTab === 'courses' ? 'roster-tab-active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          My courses
        </button>
      </div>

      {/* ─── CLASS LISTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'lists' && (
        <>
          {classLists.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No class lists yet</p>
              <p className="empty-subtitle">Create your first class list to start managing students</p>
              <button
                className="btn-primary"
                style={{ display: 'inline-block', marginTop: '16px' }}
                onClick={() => setShowCreateModal(true)}
              >
                + Create class list
              </button>
            </div>
          ) : (
            <>
            <div className="page-header">
                  <div>                    
                    <h1 className="page-title bold">Your lists</h1>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + Create list
                  </button>
                </div>
              
        <div className="input-wrapper" style={{ marginBottom: "20px" }}>
    <FontAwesomeIcon icon={faSearch} className="input-icon" />
    <input
      className="form-input search-icon"
      type="text"
      placeholder="Search class lists…"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

              {filteredClassLists.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">No results found</p>
                  <p className="empty-subtitle">Try a different search</p>
                </div>
              ) : (
                <div className="task-list">
                  {filteredClassLists.map(list => (
                    <div key={list.id} className="task-card" onClick={() => navigate(`/roster/${list.id}`)}>
                      <div className="task-card-left">
                        {editingId === list.id ? (
                          <div className="title-edit-row" onClick={(e) => e.stopPropagation()}>
                            <input
                              className="form-input title-edit-input"
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameList(list.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              autoFocus
                            />
                            <button
                              className="btn-primary"
                              style={{ padding: '8px 14px', fontSize: '13px' }}
                              onClick={() => handleRenameList(list.id)}
                            >
                              {renamingId === list.id
                                ? <><Spinner size={14} /><span style={{ marginLeft: '10px' }}>Saving...</span></>
                                : 'Save'}
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '8px 14px', fontSize: '13px' }}
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="task-card-top">
                            <span className="task-card-title light-bold">{list.name}</span>
                            <div className="task-card-top-right" onClick={(e) => e.stopPropagation()}>
                              <div className="kebab-wrapper">
                                <button
                                  className="kebab-btn"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenMenuId(openMenuId === list.id ? null : list.id)
                                  }}
                                >
                                  <FontAwesomeIcon icon={faEllipsisVertical} />
                                </button>
                                {openMenuId === list.id && (
                                  <div className="kebab-menu">
                                    <button
                                      className="kebab-menu-item"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenMenuId(null)
                                        setEditingId(list.id)
                                        setEditingName(list.name)
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faPenToSquare} /> Rename
                                    </button>
                                    <button
                                      className="kebab-menu-item kebab-menu-item-danger"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenMenuId(null)
                                        handleDeleteClick(list.id)
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTrashCan} /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        <p className="task-card-meta">
                          {list.studentCount} student{list.studentCount <= 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── COURSES TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'courses' && (
        <>
          {!primaryClassListId ? (
            <div className="empty-state">
              <p className="empty-title">No class list yet</p>
              <p className="empty-subtitle">
                Create a class list first before adding courses
              </p>
              <button
                className="btn-primary"
                style={{ display: 'inline-block', marginTop: '16px' }}
                onClick={() => setActiveTab('lists')}
              >
                Go to Class lists<span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span>
              </button>
            </div>
          ) : coursesLoading ? (
            <div className="loading-container" style={{ position: 'relative', height: '200px' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <>
              {/* Add course input */}
              <div className="form-card" style={{ marginBottom: '16px' }}>
                <p className="form-label" style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                  Add a course
                </p>
                {courseError && <p className="form-error">{courseError}</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. Organic Chemistry, Engineering Maths…"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddCourse() }}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn-primary"
                    onClick={handleAddCourse}
                    disabled={addingCourse}
                    style={{ whiteSpace: 'nowrap', opacity: addingCourse ? 0.6 : 1 }}
                  >
                    {addingCourse
                      ? <><Spinner size={14} /></>
                      : '+ Add'}
                  </button>
                </div>
                <span className="form-hint" style={{ marginTop: '6px', display: 'block' }}>
                  These courses will be available when creating multi-item payment tasks
                </span>
              </div>

              {/* Course list */}
              
              {courses.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">No courses yet</p>
                  <p className="empty-subtitle">
                    Add the courses your class is offering this semester
                  </p>
                </div>
              ) : (
                <div className="form-card">
                  <div className="class-list-title">
          <p>Course list</p>
        </div>
                  <div className="student-list">
                    <div className="course-list-header">
                      <span>S/N</span>
                      <span>Course name</span>
                      <span></span>
                    </div>
                    {courses.map((course, index) => (
                      <div key={course.id} className="course-row">
                        <span className="student-serial">{index + 1}</span>
                        {editingCourseId === course.id ? (
                          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                            <input
                              className="form-input"
                              type="text"
                              value={editingCourseName}
                              onChange={(e) => setEditingCourseName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCourse(course.id)
                                if (e.key === 'Escape') setEditingCourseId(null)
                              }}
                              autoFocus
                            />
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}
                              onClick={() => handleSaveCourse(course.id)}
                              disabled={savingCourse}
                            >
                              {savingCourse ? <Spinner size={12} /> : 'Save'}
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '13px' }}
                              onClick={() => setEditingCourseId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="course-name">{course.name}</span>
                            <div
                              className="kebab-wrapper"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="kebab-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenCourseMenuId(openCourseMenuId === course.id ? null : course.id)
                                }}
                              >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                              </button>
                              {openCourseMenuId === course.id && (
                                <div className="kebab-menu">
                                  <button
                                    className="kebab-menu-item"
                                    onClick={() => {
                                      setOpenCourseMenuId(null)
                                      setEditingCourseId(course.id)
                                      setEditingCourseName(course.name)
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faPenToSquare} /> Edit
                                  </button>
                                  <button
                                    className="kebab-menu-item kebab-menu-item-danger"
                                    onClick={() => {
                                      setOpenCourseMenuId(null)
                                      setCourseToDelete(course.id)
                                      setShowDeleteCourseWarning(true)
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faTrashCan} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Create list modal */}
      {showCreateModal && (
        <div className="modal-overlay-new-list" onClick={() => {
          setShowCreateModal(false)
          setNewListName('')
          setError('')
        }}>
          <div className="modal-card-new-list" id="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '24px' }}>
              <h2 className="page-title bold" style={{ fontSize: '16px', marginBottom: '8px' }}>
                Name your class list
              </h2>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
                e.g. Main Class List, FRN 102 Class List…
              </p>
              {error && <p className="form-error">{error}</p>}
              <input
                className="form-input"
                type="text"
                placeholder="Enter list name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList() }}
                autoFocus
              />
            </div>
            <div className="create-classlist-modal">
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={handleCreateList}
                disabled={creating}
              >
                {creating ? <><Spinner size={14} />Creating...</> : (<span>Create list<span style={{ fontSize: '10px', paddingTop: '2px' , marginLeft: '3px'}}><FontAwesomeIcon icon={faArrowRight} /></span></span>)}
              </button>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => {
                  setShowCreateModal(false)
                  setNewListName('')
                  setError('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteWarning && (
        <ConfirmModal
          message="This will permanently delete this class list and all students in it. Tasks that used this list will not be affected. This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteWarning(false)
            setListToDelete(null)
          }}
          loading={deletingList}
        />
      )}

      {showDeleteCourseWarning && (
        <ConfirmModal
          message="Are you sure you want to delete this course? This action cannot be undone."
          onConfirm={handleDeleteCourse}
          onCancel={() => {
            setShowDeleteCourseWarning(false)
            setCourseToDelete(null)
          }}
          loading={deletingCourse}
        />
      )}
    </div>
  )
}

export default Roster