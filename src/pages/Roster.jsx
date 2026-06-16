import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClassLists, createClassList, deleteClassList, updateClassList } from '../api/index'
import ConfirmModal from '../components/ConfirmModal'
import Spinner from '../components/Spinner'
import { RosterSkeleton } from '../components/Skeleton'
import { supabase } from '../api/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faSearch, faPenToSquare, faEllipsisVertical, faArrowRight } from '@fortawesome/free-solid-svg-icons'


function Roster() {
  const [classLists, setClassLists] = useState([])
  const [loading, setLoading] = useState(true)
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
  const [search, setSearch] = useState('')

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
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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

    return () => {
      supabase.removeChannel(classListsSub)
    }
  }, [])

  const handleCreateList = async () => {
  if (!newListName.trim()) {
    setError('Please enter a list name')
    return
  }
  setCreating(true)
  const saved = await createClassList(newListName.trim())
  setClassLists(prev => sortByUpdated([...prev, { ...saved, studentCount: 0 }]))
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
      l.id === listId
        ? { ...updated, studentCount: l.studentCount }
        : l
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

  const filteredClassLists = classLists.filter(list =>
  list.name.toLowerCase().includes(search.toLowerCase())
)

  if (loading) return <RosterSkeleton />

  return (
  <div>
    <div className="page-header">
      <h1 className="page-title bold">Class lists</h1>
      <span className="roster-count">{classLists.length} list{classLists.length !== 1 ? 's' : ''}</span>
    </div>

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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
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
                      {renamingId === list.id ? (
                        <><Spinner size={14} /><span style={{ marginLeft: '10px' }}>Saving...</span></>
                      ) : 'Save'}
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

    {/* Create list modal */}
    {showCreateModal && (
      <div className="modal-overlay-new-list" onClick={() => {
        setShowCreateModal(false)
        setNewListName('')
        setError('')
      }}>
        <div className="modal-card-new-list" id="modal-card-new-list" onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '24px' }}>
            <h2 className="page-title bold" style={{ fontSize: '16px', marginBottom: '8px' }}>
              Name your class list
            </h2>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
              e.g. Main Class List, French 102 Class List…
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
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e5e5',
            display: 'flex',
            gap: '8px',
            background: '#fff'
          }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={handleCreateList}
              disabled={creating}
            >
              {creating 
              ? <><Spinner size={14} />Creating...</>
              : <span>Create list <FontAwesomeIcon style={{ fontSize: "10px" }} icon={faArrowRight} /></span>}
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
  </div>
)
}

export default Roster