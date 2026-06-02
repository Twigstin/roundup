import { supabase } from './supabase'
import { reportSuccess, reportFailure } from '../context/networkReporter'

//const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id
}

//Tasks

export const getTasks = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}

export const createTask = async (task) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ ...task, user_id: userId }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateTask = async (taskId, updates) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteTask = async (taskId) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw error
}

export const getDashboardStats = async () => {
  const { data, error } = await supabase
    .from('entries')
    .select('task_id, status, collected')
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}


//Roster Meta

export const getRosterMeta = async () => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('roster_meta')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  return data || { updated_at: null, change_type: null }
}

export const setRosterUpdatedAt = async (changeType = 'added', classListId = null) => {
  const userId = await getUserId()
  const { error } = await supabase
    .from('roster_meta')
    .upsert({
      user_id: userId,
      updated_at: new Date().toISOString(),
      change_type: changeType,
      class_list_id: classListId
    }, { onConflict: 'user_id' })
    .select()
  if (error) throw error
}





//Students

export const getStudents = async () => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}

export const createStudent = async (student, classListId) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('students')
    .insert([{ ...student, user_id: userId, class_list_id: classListId }])
    .select()
    .single()
  if (error) throw error
  await setRosterUpdatedAt('added', classListId)
  return data
}

export const bulkCreateStudents = async (newStudents, classListId) => {
  const userId = await getUserId()
  const studentsWithUser = newStudents.map(s => ({
    ...s,
    user_id: userId,
    class_list_id: classListId
  }))
  const { data, error } = await supabase
    .from('students')
    .insert(studentsWithUser)
    .select()
  if (error) throw error
  await setRosterUpdatedAt('added', classListId)
  return data
}

export const deleteStudent = async (studentId, classListId = null) => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
  if (error) throw error
  await setRosterUpdatedAt('removed', classListId)
}

export const clearAllStudents = async () => {
  const userId = await getUserId()
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
  await setRosterUpdatedAt('removed')
}

//Entries

export const getEntries = async (taskId) => {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('task_id', taskId)
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}

export const createEntry = async (entry) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('entries')
    .insert([{ ...entry, user_id: userId }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const bulkCreateEntries = async (newEntries) => {
  const userId = await getUserId()
  const entriesWithUser = newEntries.map(e => ({ ...e, user_id: userId }))
  const { data, error } = await supabase
    .from('entries')
    .insert(entriesWithUser)
    .select()
  if (error) throw error
  return data
}

export const updateEntry = async (entryId, updates) => {
  const { data, error } = await supabase
    .from('entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', entryId)
    .select()
    .single()
  if (error) throw error

  if (data?.task_id) {
    await supabase
      .from('tasks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.task_id)
  }

  return data
}

export const populateTaskEntries = async (taskId, taskType, students) => {
  const existingEntries = await getEntries(taskId)
  const existingRegNumbers = existingEntries.map(e => e.student_reg_number)
  const newStudents = students.filter(s => !existingRegNumbers.includes(s.reg_number))

  const defaultStatus = taskType === 'payment' ? 'not_paid'
    : taskType === 'attendance' ? 'absent'
    : 'pending'

  if (newStudents.length === 0) return []

  const newEntries = newStudents.map(s => ({
    id: crypto.randomUUID(),
    task_id: taskId,
    student_id: s.id,
    student_name: s.name,
    student_reg_number: s.reg_number,
    status: defaultStatus,
    collected: false,
    note: '',
    updated_at: new Date().toISOString()
  }))

  const result = await bulkCreateEntries(newEntries)

  await supabase
    .from('tasks')
    .update({ roster_synced_at: new Date().toISOString() })
    .eq('id', taskId)

  return result
}

export const syncTaskRoster = async (taskId) => {
  const { error } = await supabase
    .from('tasks')
    .update({ roster_synced_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) throw error
}


//Class Lists

export const getClassLists = async () => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('class_lists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false, nullsFirst: false })
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}

export const createClassList = async (name) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('class_lists')
    .insert([{ user_id: userId, name }])
    .select()
    .single()
  if (error) throw error
  return data
}

export const updateClassList = async (classListId, name) => {
  const { data, error } = await supabase
    .from('class_lists')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', classListId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteClassList = async (classListId) => {
  const { error } = await supabase
    .from('class_lists')
    .delete()
    .eq('id', classListId)
  if (error) throw error
}

export const getStudentsByClassList = async (classListId) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_list_id', classListId)
    .order('name', { ascending: true })
  if (error) {
    reportFailure()
    throw error
  }
  reportSuccess()
  return data
}