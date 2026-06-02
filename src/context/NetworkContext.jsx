import { createContext, useContext, useState, useCallback } from 'react'
import { setNetworkReporters } from './networkReporter'
import { useEffect } from 'react'

const NetworkContext = createContext(null)

export function NetworkProvider({ children }) {
  const [failureCount, setFailureCount] = useState(0)
  const [showFailureBanner, setShowFailureBanner] = useState(false)
  



  const reportSuccess = useCallback(() => {
    setFailureCount(0)
    setShowFailureBanner(false)
  }, [])

  const reportFailure = useCallback(() => {
    setFailureCount(prev => {
      const next = prev + 1
      if (next >= 2) setShowFailureBanner(true)
      return next
    })
  }, [])


  useEffect(() => {
  setNetworkReporters(reportSuccess, reportFailure)
}, [reportSuccess, reportFailure])

  return (
    <NetworkContext.Provider value={{ showFailureBanner, reportSuccess, reportFailure }}>
      {children}
    </NetworkContext.Provider>
  )
}

export const useNetwork = () => useContext(NetworkContext)