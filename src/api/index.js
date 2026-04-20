import { delay, readDB, writeDB } from './db.js';

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
    tasks.push(task)
    writeDB(TASKS_KEY, tasks)
    return task;
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
    writeDB(STUDENTS_KEY, students);
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
    const students = readDB(STUDENTS_KEY).filter(student => student.id === studentId)
    writeDB(STUDENTS_KEY, students)
}

//create function to manage bulk imports
export const bulkCreateStudents = async (newStudents) => {
  await delay(100)
  const existing = readDB(STUDENTS_KEY)
  const merged = [...existing, ...newStudents]
  writeDB(STUDENTS_KEY, merged)
  return newStudents
}