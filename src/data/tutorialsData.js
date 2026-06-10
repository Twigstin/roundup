import {
  faUsers,
  faListCheck,
  faCreditCard,
  faFileCircleCheck,
  faUserCheck,
} from '@fortawesome/free-solid-svg-icons'

const tutorials = [
  {
    id: 'getting-started',
    title: 'Getting Started with Roundup',
    description: 'Learn the basics — setting up your class list and creating your first task.',
    youtubeId: 'YOUR_VIDEO_ID_HERE',
    duration: '16:15',
    steps: [
      {
        icon: faUsers,
        color: '#085041',
        bg: '#E1F5EE',
        title: 'Set up your class list',
        desc: 'Go to the Roster tab and create a class list. Add your students manually or import them from a CSV or Excel file. This is the foundation — every task you create will track from this list.'
      },
      {
        icon: faListCheck,
        color: '#3C3489',
        bg: '#EEEDFE',
        title: 'Create a task',
        desc: 'Head to Tasks and tap "+ New task". Give it a name, choose a type — Payment, Submission, or Attendance — and select your class list. Roundup automatically loads all your students into the task.'
      },
      {
        icon: faCreditCard,
        color: '#085041',
        bg: '#E1F5EE',
        title: 'Track payments',
        desc: "For payment tasks, tap a student's row to cycle through Not paid → Paid → Part paid. You can also mark whether you've collected the money using the Collected toggle."
      },
      {
        icon: faFileCircleCheck,
        color: '#3C3489',
        bg: '#EEEDFE',
        title: 'Track submissions',
        desc: "For submission tasks, toggle each student between Pending and Submitted. Add notes to any student's entry to record details like submission date or file name."
      },
      {
        icon: faUserCheck,
        color: '#633806',
        bg: '#FAEEDA',
        title: 'Take attendance',
        desc: 'For attendance tasks, mark each student as Present or Absent with a single tap. The summary cards at the top update in real time so you always know your count.'
      },
    ]
  },
  // To add a new video, just copy the object above and fill in the details.
  // Example Template:
  // {
  //   id: 'managing-payments',
  //   title: 'Managing Payments in Roundup',
  //   description: 'A deep dive into tracking payments, part payments and collections.',
  //   youtubeId: 'YOUR_VIDEO_ID_HERE',
  //   duration: '8:42',
  //   steps: [...]
  // },
]

export default tutorials