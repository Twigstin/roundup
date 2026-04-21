const TASKS_KEY = 'roundup_tasks';
const STUDENTS_KEY = 'roundup_students';
const ENTRIES_KEY = 'roundup_entries';
const ROSTER_META_KEY = 'roundup_roster_meta'

//create function for latency delay simulator
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

//create function to convert json string to javascript code and fetch data from database
export const readDB = (key) => {
    return JSON.parse(localStorage.getItem(key) || '[]')
}

//create function to convert javascript code back to json string and write data to databse
export const writeDB = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data))
};

export const getRosterMeta = () => {
  const meta = localStorage.getItem(ROSTER_META_KEY)
  return meta ? JSON.parse(meta) : { updatedAt: null }
}

export const setRosterUpdatedAt = () => {
  localStorage.setItem(ROSTER_META_KEY, JSON.stringify({
    updatedAt: new Date().toISOString()
  }))
}