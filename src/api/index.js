import { delay, readDB, writeDB, setRosterUpdatedAt, getRosterMeta } from './db.js';

const TASKS_KEY = "roundup_tasks";
const STUDENTS_KEY = "roundup_students";
const ENTRIES_KEY = "roundup_entries";

//create function to fetch tasks from database
export const getTasks = async () => {
    await delay(300)
    return readDB(TASKS_KEY)
}

//create function to create and add new task to database
export const createTask = async (task) => {
  await delay(300)
  const tasks = readDB(TASKS_KEY)
  const meta = getRosterMeta()
  const taskWithSync = {
    ...task,
    rosterSyncedAt: meta.updatedAt || new Date().toISOString()
  }
  tasks.push(taskWithSync)
  writeDB(TASKS_KEY, tasks)
  return taskWithSync
}

//create function to delete task
export const deleteTask = async (taskId) => {
    await delay(300)
    const tasks = readDB(TASKS_KEY).filter(task => task.id !== taskId);
    writeDB(TASKS_KEY, tasks)
}

//create function to fetch students from database
export const getStudents = async () => {
    await delay(300)
    return readDB(STUDENTS_KEY)
}

//create function add new student to task
export const createStudent = async (student) => {
  await delay(300)
  const students = readDB(STUDENTS_KEY)
  students.push(student)
  writeDB(STUDENTS_KEY, students)
  setRosterUpdatedAt()
  return student
}

//create function to fetch entries from database
export const getEntries = async (taskId) => {
    await delay(300)
    const entries = readDB(ENTRIES_KEY)
    return entries.filter(e => e.taskId === taskId)
}

//create function to update entries
export const updateEntry = async (entryId, updates) => {
    await delay(300)
    const entries = readDB(ENTRIES_KEY)
    const index = entries.findIndex(e => e.id === entryId)
    entries[index] = { ...entries[index], ...updates }
    writeDB(ENTRIES_KEY, entries)
    return entries[index]
}

//create function to create entry
export const createEntry = async (entry) => {
    await delay(300)
    const entries = readDB(ENTRIES_KEY)
    entries.push(entry)
    writeDB(ENTRIES_KEY, entries);
    return entry
}

//create function to delete student
export const deleteStudent = async (studentId) => {
  await delay(300)
  const students = readDB(STUDENTS_KEY).filter(s => s.id !== studentId)
  writeDB(STUDENTS_KEY, students)
  setRosterUpdatedAt()
}

//create function to manage bulk imports
export const bulkCreateStudents = async (newStudents) => {
  await delay(100)
  const existing = readDB(STUDENTS_KEY)
  const merged = [...existing, ...newStudents]
  writeDB(STUDENTS_KEY, merged)
  setRosterUpdatedAt()
  return newStudents
}


//create function to manage creation of task withbulk entries
export const bulkCreateEntries = async (newEntries) => {
  await delay(100)
  const existing = readDB(ENTRIES_KEY)
  const merged = [...existing, ...newEntries]
  writeDB(ENTRIES_KEY, merged)
  return newEntries
}

export const clearAllStudents = async () => {
  await delay(100)
  writeDB(STUDENTS_KEY, [])
  setRosterUpdatedAt()
}

export const populateTaskEntries = async (taskId, taskType, students) => {
  await delay(100)
  const existing = readDB(ENTRIES_KEY)
  const existingStudentIds = existing
    .filter(e => e.taskId === taskId)
    .map(e => e.studentId)

  const defaultStatus = taskType === 'payment' ? 'not_paid' : 'pending'

  const newEntries = students
  .filter(s => !existingStudentIds.includes(s.id))
  .map(s => ({
    id: crypto.randomUUID(),
    taskId,
    studentId: s.id,
    studentName: s.name,
    studentRegNumber: s.regNumber,
    status: defaultStatus,
    note: '',
    updatedAt: new Date().toISOString()
  }))

  if (newEntries.length > 0) {
    const merged = [...existing, ...newEntries]
    writeDB(ENTRIES_KEY, merged)
  }

  const meta = getRosterMeta()
  const tasks = readDB(TASKS_KEY)
  const index = tasks.findIndex(t => t.id === taskId)
  tasks[index] = {
    ...tasks[index],
    rosterSyncedAt: meta.updatedAt || new Date().toISOString()
  }
  writeDB(TASKS_KEY, tasks)

  return newEntries
}

export const updateTask = async (taskId, updates) => {
  await delay(100)
  const tasks = readDB(TASKS_KEY)
  const index = tasks.findIndex(t => t.id === taskId)
  tasks[index] = { ...tasks[index], ...updates }
  writeDB(TASKS_KEY, tasks)
  return tasks[index]
}

export const syncTaskRoster = async (taskId) => {
  await delay(100)
  const meta = getRosterMeta()
  const tasks = readDB(TASKS_KEY)
  const index = tasks.findIndex(t => t.id === taskId)
  tasks[index] = {
    ...tasks[index],
    rosterSyncedAt: meta.updatedAt || new Date().toISOString()
  }
  writeDB(TASKS_KEY, tasks)
}

export { getRosterMeta }