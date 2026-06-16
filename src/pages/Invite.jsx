import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { getReferralStats } from '../api/index'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { InviteSkeleton } from '../components/Skeleton'

function Invite() {
  const [userId, setUserId] = useState('')
  const [stats, setStats] = useState({ total: 0, signedUp: 0, activated: 0, referrals: [] })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return
      setUserId(uid)
      const data = await getReferralStats(uid)
      setStats(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const inviteLink = `https://getroundup.app?ref=${userId}`

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const message = `Hey! I use Roundup to manage my class — tracking dues, submissions and attendance without the WhatsApp chaos. It's free, give it a try: ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) return <InviteSkeleton />

  return (
    <div className="invite-page">
      <div className="page-header">
        <Link to="/menu" className="back-link">
          <FontAwesomeIcon icon={faChevronLeft} /> Back
        </Link>
      </div>

      <h1 className="page-title bold invite-title">Invite a user</h1>
      <p className="invite-subtitle">
        Share Roundup with other class reps. Help them make class management simpler and faster.
      </p>

      

      <div className="invite-stats">
        {[
          { label: 'Invited', value: stats.signedUp },
          { label: 'Signed up', value: stats.signedUp },
          { label: 'Active', value: stats.activated }
        ].map((stat, i) => (
          <div key={i} className="invite-stat-card">
            <p className="invite-stat-label light-bold">{stat.label}</p>
            <p className="invite-stat-value bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="invite-link-card">
        <p className="invite-link-label light-bold">Your invite link</p>
        <div className="invite-link-display">{inviteLink}</div>
        <div className="invite-actions">
          <button className="invite-btn-primary" onClick={handleCopy}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button className="invite-btn-primary" onClick={handleWhatsApp}>
            <FontAwesomeIcon icon={faWhatsapp} className="invite-whatsapp-icon" />
            Share on WhatsApp
          </button>
        </div>
      </div>

      {stats.referrals.length > 0 ? (
        <div className="invite-referrals-card">
          <p className="invite-referrals-title light-bold">People you invited</p>
          {stats.referrals.map((r, i) => (
            <div key={i} className="invite-referral-row">
              <p className="invite-referral-name">Rep {i + 1}</p>
              <span className={`invite-referral-badge ${r.activated_at ? 'invite-referral-badge-active' : 'invite-referral-badge-pending'}`}>
                {r.activated_at ? 'Active' : 'Signed up'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: '20px' }}>
          <p className="empty-title">No invites yet</p>
          <p className="empty-subtitle">Share your link with other class reps to get started</p>
        </div>
      )}
    </div>
  )
}

export default Invite