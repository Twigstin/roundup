let onSuccess = () => {}
let onFailure = () => {}

export const setNetworkReporters = (successFn, failureFn) => {
  onSuccess = successFn
  onFailure = failureFn
}

export const reportSuccess = () => onSuccess()
export const reportFailure = () => onFailure()