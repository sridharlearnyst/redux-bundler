import { IS_BROWSER, debounce, ric, raf } from '../utils'

const defaults = {
  idleTimeout: 30000,
  idleAction: 'APP_IDLE',
  doneCallback: null,
  stopWhenTabInactive: true,
  cancelIdleWhenDone: true
}

const ricOptions = { timeout: 500 }
export const getIdleDispatcher = (stopWhenInactive, timeout, fn) =>
  debounce(() => {
    // the requestAnimationFrame ensures it doesn't run when tab isn't active
    stopWhenInactive ? raf(() => ric(fn, ricOptions)) : ric(fn, ricOptions)
  }, timeout)

export default spec => ({
  name: 'reactors',
  init: store => {
    const {
      idleAction,
      idleTimeout,
      cancelIdleWhenDone,
      doneCallback,
      stopWhenTabInactive
    } = Object.assign({}, defaults, spec)
    let idleDispatcher
    if (idleTimeout) {
      idleDispatcher = getIdleDispatcher(stopWhenTabInactive, idleTimeout, () =>
        store.dispatch({ type: idleAction })
      )
    }

    if (process.env.NODE_ENV !== 'production') {
      store.meta.reactorNames.forEach(name => {
        if (!store[name]) {
          throw Error(
            `Reactor '${name}' not found on the store. Make sure you're defining as selector by that name.`
          )
        }
      })
    }

    const cancelIfDone = () => {
      if (
        !IS_BROWSER &&
        !store.nextReaction &&
        (!store.selectAsyncActive || !store.selectAsyncActive())
      ) {
        idleDispatcher && idleDispatcher.cancel()
        doneCallback && doneCallback()
      }
    }

    const dispatchNext = () => {
      // one at a time
      if (store.nextReaction) {
        return
      }
      // look for the next one
      store.meta.reactorNames.some(name => {
        const result = store[name]()
        if (result) {
          store.activeReactor = name
          store.nextReaction = result
        }
        return result
      })
      if (store.nextReaction) {
        // let browser chill
        // Sridhar: Background downloader need to execute even when the app is minimized.
        //ric is not triggered when app is minimized. So changed to timeout
        // ric(() => {
        //   const { nextReaction } = store
        //   store.activeReactor = null
        //   store.nextReaction = null
        //   store.dispatch(nextReaction)
        // }, ricOptions)
        setTimeout(() => {
          const { nextReaction } = store
          store.activeReactor = null
          store.nextReaction = null
          store.dispatch(nextReaction)
        }, 0)
      }
    }

    const callback = () => {
      dispatchNext()
      if (idleDispatcher) {
        idleDispatcher()
        cancelIdleWhenDone && cancelIfDone()
      }
    }

    store.subscribe(callback)
    callback()
  }
})
