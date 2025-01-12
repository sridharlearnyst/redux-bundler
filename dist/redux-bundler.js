var appTime = {
  name: 'appTime',
  reducer: function () { return Date.now(); },
  selectAppTime: function (state) { return state.appTime; }
};

var changes = {
  STARTED: 1,
  FINISHED: -1,
  FAILED: -1
};
var re = /_(STARTED|FINISHED|FAILED)$/;
var asyncCount = {
  name: 'asyncCount',
  reducer: function (state, ref) {
    if ( state === void 0 ) state = 0;
    var type = ref.type;

    var result = re.exec(type);
    if (!result) { return state; }
    return state + changes[result[1]];
  },
  selectAsyncActive: function (state) { return state.asyncCount > 0; }
};

var namedActionMiddleware = (function (store) { return function (next) { return function (action) {
  var actionCreator = action.actionCreator;
  var args = action.args;

  if (actionCreator) {
    var found = store.meta.unboundActionCreators[actionCreator];

    if (!found) {
      throw Error(("NoSuchActionCreator: " + actionCreator));
    }

    return next(args ? found.apply(void 0, args) : found());
  }

  return next(action);
}; }; });

var thunkMiddleware = (function (extraArgCreators) { return function (store) {
  var extraArgs = extraArgCreators.reduce(function (result, fn) { return Object.assign(result, fn(store)); }, {});
  return function (next) { return function (action) {
    if (typeof action === 'function') {
      var getState = store.getState;
      var dispatch = store.dispatch;
      return action(Object.assign({}, {
        getState: getState,
        dispatch: dispatch,
        store: store
      }, extraArgs));
    }

    return next(action);
  }; };
}; });

function symbolObservablePonyfill(root) {
	var result;
	var Symbol = root.Symbol;

	if (typeof Symbol === 'function') {
		if (Symbol.observable) {
			result = Symbol.observable;
		} else {
			result = Symbol('observable');
			Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
}

/* global window */

var root;

if (typeof self !== 'undefined') {
  root = self;
} else if (typeof window !== 'undefined') {
  root = window;
} else if (typeof global !== 'undefined') {
  root = global;
} else if (typeof module !== 'undefined') {
  root = module;
} else {
  root = Function('return this')();
}

var result = symbolObservablePonyfill(root);

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var randomString = function randomString() {
  return Math.random().toString(36).substring(7).split('').join('.');
};

var ActionTypes = {
  INIT: "@@redux/INIT" + randomString(),
  REPLACE: "@@redux/REPLACE" + randomString(),
  PROBE_UNKNOWN_ACTION: function PROBE_UNKNOWN_ACTION() {
    return "@@redux/PROBE_UNKNOWN_ACTION" + randomString();
  }
};

/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false;
  var proto = obj;

  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */

function createStore(reducer, preloadedState, enhancer) {
  var _ref2;

  if (typeof preloadedState === 'function' && typeof enhancer === 'function' || typeof enhancer === 'function' && typeof arguments[3] === 'function') {
    throw new Error('It looks like you are passing several store enhancers to ' + 'createStore(). This is not supported. Instead, compose them ' + 'together to a single function');
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, preloadedState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = preloadedState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }
  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */


  function getState() {
    if (isDispatching) {
      throw new Error('You may not call store.getState() while the reducer is executing. ' + 'The reducer has already received the state as an argument. ' + 'Pass it down from the top reducer instead of reading it from the store.');
    }

    return currentState;
  }
  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */


  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.');
    }

    if (isDispatching) {
      throw new Error('You may not call store.subscribe() while the reducer is executing. ' + 'If you would like to be notified after the store has been updated, subscribe from a ' + 'component and invoke store.getState() in the callback to access the latest state. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
    }

    var isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      if (isDispatching) {
        throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ' + 'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.');
      }

      isSubscribed = false;
      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }
  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */


  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;

    for (var i = 0; i < listeners.length; i++) {
      var listener = listeners[i];
      listener();
    }

    return action;
  }
  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */


  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({
      type: ActionTypes.REPLACE
    });
  }
  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */


  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe: unsubscribe
        };
      }
    }, _ref[result] = function () {
      return this;
    }, _ref;
  } // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.


  dispatch({
    type: ActionTypes.INIT
  });
  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[result] = observable, _ref2;
}

/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */


  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
  } catch (e) {} // eslint-disable-line no-empty

}

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionDescription = actionType && "action \"" + String(actionType) + "\"" || 'an action';
  return "Given " + actionDescription + ", reducer \"" + key + "\" returned undefined. " + "To ignore an action, you must explicitly return the previous state. " + "If you want this reducer to hold no value, you can return null instead of undefined.";
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === ActionTypes.INIT ? 'preloadedState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!isPlainObject(inputState)) {
    return "The " + argumentName + " has unexpected type of \"" + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + "\". Expected argument to be an object with the following " + ("keys: \"" + reducerKeys.join('", "') + "\"");
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key];
  });
  unexpectedKeys.forEach(function (key) {
    unexpectedKeyCache[key] = true;
  });
  if (action && action.type === ActionTypes.REPLACE) return;

  if (unexpectedKeys.length > 0) {
    return "Unexpected " + (unexpectedKeys.length > 1 ? 'keys' : 'key') + " " + ("\"" + unexpectedKeys.join('", "') + "\" found in " + argumentName + ". ") + "Expected to find one of the known reducer keys instead: " + ("\"" + reducerKeys.join('", "') + "\". Unexpected keys will be ignored.");
  }
}

function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, {
      type: ActionTypes.INIT
    });

    if (typeof initialState === 'undefined') {
      throw new Error("Reducer \"" + key + "\" returned undefined during initialization. " + "If the state passed to the reducer is undefined, you must " + "explicitly return the initial state. The initial state may " + "not be undefined. If you don't want to set a value for this reducer, " + "you can use null instead of undefined.");
    }

    if (typeof reducer(undefined, {
      type: ActionTypes.PROBE_UNKNOWN_ACTION()
    }) === 'undefined') {
      throw new Error("Reducer \"" + key + "\" returned undefined when probed with a random type. " + ("Don't try to handle " + ActionTypes.INIT + " or other actions in \"redux/*\" ") + "namespace. They are considered private. Instead, you must return the " + "current state for any unknown actions, unless it is undefined, " + "in which case you must return the initial state, regardless of the " + "action type. The initial state may not be undefined, but can be null.");
    }
  });
}
/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */


function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};

  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning("No reducer provided for key \"" + key + "\"");
      }
    }

    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }

  var finalReducerKeys = Object.keys(finalReducers);
  var unexpectedKeyCache;

  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {};
  }

  var shapeAssertionError;

  try {
    assertReducerShape(finalReducers);
  } catch (e) {
    shapeAssertionError = e;
  }

  return function combination(state, action) {
    if (state === void 0) {
      state = {};
    }

    if (shapeAssertionError) {
      throw shapeAssertionError;
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);

      if (warningMessage) {
        warning(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};

    for (var _i = 0; _i < finalReducerKeys.length; _i++) {
      var _key = finalReducerKeys[_i];
      var reducer = finalReducers[_key];
      var previousStateForKey = state[_key];
      var nextStateForKey = reducer(previousStateForKey, action);

      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(_key, action);
        throw new Error(errorMessage);
      }

      nextState[_key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }

    return hasChanged ? nextState : state;
  };
}

function bindActionCreator(actionCreator, dispatch) {
  return function () {
    return dispatch(actionCreator.apply(this, arguments));
  };
}
/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */


function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error("bindActionCreators expected an object or a function, instead received " + (actionCreators === null ? 'null' : typeof actionCreators) + ". " + "Did you write \"import ActionCreators from\" instead of \"import * as ActionCreators from\"?");
  }

  var keys = Object.keys(actionCreators);
  var boundActionCreators = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var actionCreator = actionCreators[key];

    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return boundActionCreators;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);

    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
      }));
    }

    ownKeys.forEach(function (key) {
      _defineProperty(target, key, source[key]);
    });
  }

  return target;
}

/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
function compose() {
  for (var _len = arguments.length, funcs = new Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  }

  if (funcs.length === 1) {
    return funcs[0];
  }

  return funcs.reduce(function (a, b) {
    return function () {
      return a(b.apply(void 0, arguments));
    };
  });
}

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */

function applyMiddleware() {
  for (var _len = arguments.length, middlewares = new Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function () {
      var store = createStore.apply(void 0, arguments);

      var _dispatch = function dispatch() {
        throw new Error("Dispatching while constructing your middleware is not allowed. " + "Other middleware would not be applied to this dispatch.");
      };

      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch() {
          return _dispatch.apply(void 0, arguments);
        }
      };
      var chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = compose.apply(void 0, chain)(store.dispatch);
      return _objectSpread({}, store, {
        dispatch: _dispatch
      });
    };
  };
}

/*
 * This is a dummy function to check if the function name has been altered by minification.
 * If the function has been minified and NODE_ENV !== 'production', warn the user.
 */

function isCrushed() {}

if (process.env.NODE_ENV !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  warning('You are currently using minified code outside of NODE_ENV === "production". ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or setting mode to production in webpack (https://webpack.js.org/concepts/mode/) ' + 'to ensure you have the correct code for your production build.');
}

// Modified to expose all of `store` to middleware instead of just
var customApplyMiddleware = (function () {
  var middlewares = [], len = arguments.length;
  while ( len-- ) middlewares[ len ] = arguments[ len ];

  return function (createStore$$1) { return function (reducer, preloadedState, enhancer) {
  var store = createStore$$1(reducer, preloadedState, enhancer);
  var chain = middlewares.map(function (middleware) { return middleware(store); });
  store.dispatch = compose.apply(void 0, chain)(store.dispatch);
  return store;
}; };
});

function defaultEqualityCheck(a, b) {
  return a === b;
}

function areArgumentsShallowlyEqual(equalityCheck, prev, next) {
  if (prev === null || next === null || prev.length !== next.length) {
    return false;
  }

  // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
  var length = prev.length;
  for (var i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false;
    }
  }

  return true;
}

function defaultMemoize(func) {
  var equalityCheck = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultEqualityCheck;

  var lastArgs = null;
  var lastResult = null;
  // we reference arguments instead of spreading them for performance reasons
  return function () {
    if (!areArgumentsShallowlyEqual(equalityCheck, lastArgs, arguments)) {
      // apply arguments instead of spreading for performance.
      lastResult = func.apply(null, arguments);
    }

    lastArgs = arguments;
    return lastResult;
  };
}

function getDependencies(funcs) {
  var dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;

  if (!dependencies.every(function (dep) {
    return typeof dep === 'function';
  })) {
    var dependencyTypes = dependencies.map(function (dep) {
      return typeof dep;
    }).join(', ');
    throw new Error('Selector creators expect all input-selectors to be functions, ' + ('instead received the following types: [' + dependencyTypes + ']'));
  }

  return dependencies;
}

function createSelectorCreator(memoize) {
  for (var _len = arguments.length, memoizeOptions = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    memoizeOptions[_key - 1] = arguments[_key];
  }

  return function () {
    for (var _len2 = arguments.length, funcs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      funcs[_key2] = arguments[_key2];
    }

    var recomputations = 0;
    var resultFunc = funcs.pop();
    var dependencies = getDependencies(funcs);

    var memoizedResultFunc = memoize.apply(undefined, [function () {
      recomputations++;
      // apply arguments instead of spreading for performance.
      return resultFunc.apply(null, arguments);
    }].concat(memoizeOptions));

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    var selector = defaultMemoize(function () {
      var params = [];
      var length = dependencies.length;

      for (var i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        params.push(dependencies[i].apply(null, arguments));
      }

      // apply arguments instead of spreading for performance.
      return memoizedResultFunc.apply(null, params);
    });

    selector.resultFunc = resultFunc;
    selector.recomputations = function () {
      return recomputations;
    };
    selector.resetRecomputations = function () {
      return recomputations = 0;
    };
    return selector;
  };
}

var createSelector = createSelectorCreator(defaultMemoize);

var ensureFn = function (obj, name) {
  if (typeof name !== 'string') {
    return name;
  }

  var found = obj[name];

  if (!found) {
    throw Error('No selector ' + name + ' found on the obj.');
  }

  return found;
};

var createSelector$1 = function () {
  var fns = [], len = arguments.length;
  while ( len-- ) fns[ len ] = arguments[ len ];

  var resultFunc = fns.slice(-1)[0];

  var deferredSelector = function (obj, deps) {
    var newArgs = deps.map(function (fn) { return ensureFn(obj, fn); });
    newArgs.push(resultFunc);
    return createSelector.apply(void 0, newArgs);
  };

  deferredSelector.deps = fns.slice(0, -1);
  deferredSelector.resultFunc = resultFunc;
  return deferredSelector;
};
var resolveSelectors = function (obj) {
  // an item is resolved if it is either a
  // function with no dependencies or if
  // it's on the object with no dependencies
  var isResolved = function (name) { return name.call && !name.deps || !obj[name].deps; }; // flag for checking if we have *any*


  var hasAtLeastOneResolved = false; // extract all deps and any resolved items

  var loop = function ( selectorName ) {
    var fn = obj[selectorName];

    if (!isResolved(selectorName)) {
      fn.deps = fn.deps.map(function (val, index) {
        // if it is a function not a string
        if (val.call) {
          // look for it already on the object
          for (var key in obj) {
            if (obj[key] === val) {
              // return its name if found
              return key;
            }
          } // we didn't find it and it doesn't have a name
          // but if it's a fully resolved selector that's ok


          if (!val.deps) {
            hasAtLeastOneResolved = true;
            return val;
          }
        } // the `val` is a string that exists on the object return the string
        // we'll resolve it later


        if (obj[val]) { return val; } // if we get here, its a string that doesn't exist on the object
        // which won't work, so we throw a helpful error

        throw Error(("The input selector at index " + index + " for '" + selectorName + "' is missing from the object passed to resolveSelectors()"));
      });
    } else {
      hasAtLeastOneResolved = true;
    }
  };

  for (var selectorName in obj) loop( selectorName );

  if (!hasAtLeastOneResolved) {
    throw Error("You must pass at least one real selector. If they're all string references there's no");
  }

  var depsAreResolved = function (deps) { return deps.every(isResolved); };

  var resolve = function () {
    var hasUnresolved = false;

    for (var selectorName in obj) {
      var fn = obj[selectorName];

      if (!isResolved(selectorName)) {
        hasUnresolved = true;

        if (depsAreResolved(fn.deps)) {
          // we could just use `obj[selectorName] = fn(obj, fn.deps)`, but that
          // has a significant performance impact when trying to perform this
          // on a large object (> 1000). More on this here:
          // http://2ality.com/2014/01/object-assign.html
          var selectorFn = fn(obj, fn.deps);
          delete obj[selectorName];
          obj[selectorName] = selectorFn;
        }
      }
    }

    return hasUnresolved;
  };

  var startTime;

  while (resolve()) {
    if (!startTime) { startTime = Date.now(); }
    var duration = Date.now() - startTime;

    if (duration > 500) {
      throw Error('Could not resolve selector dependencies.');
    }
  }

  return obj;
};

var debug = false;

try {
  debug = !!window.localStorage.debug;
} catch (e) {}

var HAS_DEBUG_FLAG = debug || false;
var HAS_WINDOW = typeof window !== 'undefined';
var IS_BROWSER = HAS_WINDOW || typeof self !== 'undefined';
var IS_PROD = process.env.NODE_ENV === 'production';

var fallback = function (func) { return setTimeout(func, 0); };

var raf = IS_BROWSER && self.requestAnimationFrame ? self.requestAnimationFrame : fallback;
var ric = IS_BROWSER && self.requestIdleCallback ? self.requestIdleCallback : fallback; // can dump this once IE 11 support is no longer necessary

var isPassiveSupported = function () {
  var passiveSupported = false;

  try {
    var options = Object.defineProperty({}, 'passive', {
      get: function () {
        passiveSupported = true;
      }
    });
    window.addEventListener('test', options, options);
    window.removeEventListener('test', options, options);
  } catch (err) {
    passiveSupported = false;
  }

  return passiveSupported;
};
var PASSIVE_EVENTS_SUPPORTED = isPassiveSupported();
var startsWith = function (string, searchString) { return string.substr(0, searchString.length) === searchString; };
var flattenExtractedToObject = function (extracted) {
  var result = {};

  for (var appName in extracted) {
    Object.assign(result, extracted[appName]);
  }

  return result;
};
var flattenExtractedToArray = function (extracted) {
  var accum = [];

  for (var appName in extracted) {
    accum.push.apply(accum, extracted[appName]);
  }

  return accum;
};
var addGlobalListener = function (eventName, handler, opts) {
  if ( opts === void 0 ) opts = {
  passive: false
};

  if (IS_BROWSER) {
    if (opts.passive) {
      if (PASSIVE_EVENTS_SUPPORTED) {
        self.addEventListener(eventName, handler, {
          passive: true
        });
      } else {
        self.addEventListener(eventName, debounce(handler, 200), false);
      }
    } else {
      self.addEventListener(eventName, handler);
    }
  }
};
var selectorNameToValueName = function (name) {
  var start = name[0] === 's' ? 6 : 5;
  return name[start].toLowerCase() + name.slice(start + 1);
};
var debounce = function (fn, wait) {
  var timeout;

  var debounced = function () {
    var ctx = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      fn.apply(ctx, args);
    }, wait);
  };

  debounced.cancel = function () {
    clearTimeout(timeout);
  };

  return debounced;
};
var saveScrollPosition = function () {
  history.replaceState({
    height: window.innerHeight,
    width: window.innerWidth,
    y: window.scrollY,
    x: window.scrollX
  }, '');
};
var restoreScrollPosition = function () {
  var state = history.state;

  if (state) {
    // we'll force it to our known height since the DOM rendering may
    // be async and the height may not be restored yet.
    setTimeout(function () {
      var newStyle = "height: " + (state.height) + "px; width: " + (state.width) + "px;";
      document.body.setAttribute('style', newStyle);
      window.scrollTo(state.x, state.y);
      ric(function () { return document.body.removeAttribute('style'); });
    });
  }
};
var initScrollPosition = function () {
  if (!HAS_WINDOW) {
    return;
  } // turn off browser scroll restoration if available


  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }

  addGlobalListener('popstate', restoreScrollPosition);
  addGlobalListener('scroll', debounce(saveScrollPosition, 300), {
    passive: true
  });
  restoreScrollPosition();
};

var normalizeBundle = function (bundle) {
  var name = bundle.name;
  if (!name) { throw TypeError('bundles must have a "name" property'); }
  var result = {
    name: name,
    reducer: bundle.reducer || bundle.getReducer && bundle.getReducer() || null,
    init: bundle.init || null,
    extraArgCreators: bundle.getExtraArgs || null,
    middlewareCreators: bundle.getMiddleware,
    actionCreators: null,
    selectors: null,
    reactorNames: null,
    rawBundle: bundle
  };
  Object.keys(bundle).forEach(function (key) {
    if (startsWith(key, 'do')) {
      (result.actionCreators || (result.actionCreators = {}))[key] = bundle[key];
      return;
    }

    var isSelector = startsWith(key, 'select');
    var isReactor = startsWith(key, 'react');

    if (isSelector || isReactor) {
      (result.selectors || (result.selectors = {}))[key] = bundle[key];

      if (isReactor) {
        (result.reactorNames || (result.reactorNames = [])).push(key);
      }
    }
  });
  return result;
};
var createChunk = function (rawBundles) {
  var normalizedBundles = rawBundles.map(normalizeBundle);
  var result = {
    bundleNames: [],
    reducers: {},
    selectors: {},
    actionCreators: {},
    rawBundles: [],
    processedBundles: [],
    initMethods: [],
    middlewareCreators: [],
    extraArgCreators: [],
    reactorNames: []
  };
  normalizedBundles.forEach(function (bundle) {
    var obj, ref;

    result.bundleNames.push(bundle.name);
    Object.assign(result.selectors, bundle.selectors);
    Object.assign(result.actionCreators, bundle.actionCreators);

    if (bundle.reducer) {
      Object.assign(result.reducers, ( obj = {}, obj[bundle.name] = bundle.reducer, obj ));
    }

    if (bundle.init) { result.initMethods.push(bundle.init); }

    if (bundle.middlewareCreators) {
      result.middlewareCreators.push(bundle.middlewareCreators);
    }

    if (bundle.extraArgCreators) {
      result.extraArgCreators.push(bundle.extraArgCreators);
    }

    if (bundle.reactorNames) { (ref = result.reactorNames).push.apply(ref, bundle.reactorNames); }
    result.processedBundles.push(bundle);
    result.rawBundles.push(bundle.rawBundle);
  });
  return result;
};

var addBindingMethods = (function (store) {
  store.subscriptions = {
    watchedValues: {}
  };
  var subscriptions = store.subscriptions.set = new Set();
  var watchedSelectors = store.subscriptions.watchedSelectors = {};

  var watch = function (selectorName) {
    watchedSelectors[selectorName] = (watchedSelectors[selectorName] || 0) + 1;
  };

  var unwatch = function (selectorName) {
    var count = watchedSelectors[selectorName] - 1;

    if (count === 0) {
      delete watchedSelectors[selectorName];
    } else {
      watchedSelectors[selectorName] = count;
    }
  }; // add single store subscription for tracking watched changes


  store.subscribe(function () {
    var newValues = watchedSelectors.all ? store.selectAll() : store.select(Object.keys(watchedSelectors));
    var ref = store.subscriptions;
    var watchedValues = ref.watchedValues; // the only diffing in the app happens here

    var changed = {};

    for (var key in newValues) {
      var val = newValues[key];

      if (val !== watchedValues[key]) {
        changed[key] = val;
      }
    }

    store.subscriptions.watchedValues = newValues; // look through subscriptions to trigger

    subscriptions.forEach(function (subscription) {
      var relevantChanges = {};
      var hasChanged = false;

      if (subscription.names === 'all') {
        Object.assign(relevantChanges, changed);
        hasChanged = !!Object.keys(relevantChanges).length;
      } else {
        subscription.names.forEach(function (name) {
          if (changed.hasOwnProperty(name)) {
            relevantChanges[name] = changed[name];
            hasChanged = true;
          }
        });
      }

      if (hasChanged) {
        subscription.fn(relevantChanges);
      }
    });
  }); // this exists separately in order to support
  // subscribing to all changes even after lazy-loading
  // additional bundles

  store.subscribeToAllChanges = function (callback) { return store.subscribeToSelectors('all', callback); }; // given an array of selector names, it will call the
  // callback any time those have changed with an object
  // containing only changed values


  store.subscribeToSelectors = function (keys, callback) {
    var isAll = keys === 'all'; // re-use loop for double duty
    // extract names, but also ensure
    // selector actually exists on store

    var subscription = {
      fn: callback,
      names: isAll ? 'all' : keys.map(selectorNameToValueName)
    };
    subscriptions.add(subscription);
    isAll ? watch('all') : keys.forEach(watch); // make sure starting values are in watched so we can
    // track changes

    Object.assign(store.subscriptions.watchedValues, isAll ? store.selectAll() : store.select(keys)); // return function that can be used to unsubscribe

    return function () {
      subscriptions.delete(subscription);
      isAll ? unwatch('all') : keys.forEach(unwatch);
    };
  };
});

var bindSelectorsToStore = function (store, selectors) {
  var loop = function ( key ) {
    var selector = selectors[key];

    if (!store[key]) {
      store[key] = function () { return selector(store.getState()); };
    }
  };

  for (var key in selectors) loop( key );
};

var decorateStore = function (store, processed) {
  if (!store.meta) {
    store.meta = {
      chunks: [],
      unboundSelectors: {},
      unboundActionCreators: {},
      reactorNames: []
    };
  }

  var meta = store.meta; // attach for reference

  meta.chunks.push(processed); // grab existing unbound (but resolved) selectors, combine with new ones

  var combinedSelectors = Object.assign(meta.unboundSelectors, processed.selectors); // run resolver

  resolveSelectors(combinedSelectors); // update collection of resolved selectors

  meta.unboundSelectors = combinedSelectors; // make sure all selectors are bound (won't overwrite if already bound)

  bindSelectorsToStore(store, combinedSelectors); // build our list of reactor names

  meta.reactorNames = meta.reactorNames.concat(processed.reactorNames); // extend global collections with new stuff

  Object.assign(meta.unboundActionCreators, processed.actionCreators); // bind and attach only the next action creators to the store

  Object.assign(store, bindActionCreators(processed.actionCreators, store.dispatch)); // run any new init methods

  processed.initMethods.forEach(function (fn) { return fn(store); });
};

var enableBatchDispatch = function (reducer) { return function (state, action) {
  if (action.type === 'BATCH_ACTIONS') {
    return action.actions.reduce(reducer, state);
  }

  return reducer(state, action);
}; };

var enableReplaceState = function (reducer) { return function (state, action) {
  if (action.type === 'REPLACE_STATE') {
    return reducer(action.payload, action);
  }

  return reducer(state, action);
}; };

var enhanceReducer = compose(enableBatchDispatch, enableReplaceState);

var devTools = function () { return HAS_WINDOW && window.__REDUX_DEVTOOLS_EXTENSION__ && (HAS_DEBUG_FLAG || !IS_PROD) ? window.__REDUX_DEVTOOLS_EXTENSION__() : function (a) { return a; }; };

var composeBundles = function () {
  var bundles = [], len = arguments.length;
  while ( len-- ) bundles[ len ] = arguments[ len ];

  // build out object of extracted bundle info
  var firstChunk = createChunk(bundles);
  return function (data) {
    // actually init our store
    var store = createStore(enhanceReducer(combineReducers(firstChunk.reducers)), data, compose(customApplyMiddleware.apply(void 0, [ namedActionMiddleware, thunkMiddleware(firstChunk.extraArgCreators) ].concat( firstChunk.middlewareCreators.map(function (fn) { return fn(firstChunk); }) )), devTools())); // get values from an array of selector names

    store.select = function (selectorNames) { return selectorNames.reduce(function (obj, name) {
      if (!store[name]) { throw Error(("SelectorNotFound " + name)); }
      obj[selectorNameToValueName(name)] = store[name]();
      return obj;
    }, {}); }; // get all values from all available selectors (even if added later)


    store.selectAll = function () { return store.select(Object.keys(store.meta.unboundSelectors)); }; // add support for dispatching an action by name


    store.action = function (name, args) { return store[name].apply(store, args); }; // adds support for subscribing to changes from an array of selector strings


    addBindingMethods(store); // add all the gathered bundle data into the store

    decorateStore(store, firstChunk); // defines method for integrating other bundles later

    store.integrateBundles = function () {
      var bundlesToIntegrate = [], len = arguments.length;
      while ( len-- ) bundlesToIntegrate[ len ] = arguments[ len ];

      decorateStore(store, createChunk(bundlesToIntegrate));
      var allReducers = store.meta.chunks.reduce(function (accum, chunk) { return Object.assign(accum, chunk.reducers); }, {});
      store.replaceReducer(enhanceReducer(combineReducers(allReducers)));
      store.buildPersistActionMap && store.buildPersistActionMap();
    };

    return store;
  };
};

// regexes borrowed from backbone
var optionalParam = /\((.*?)\)/g;
var namedParam = /(\(\?)?:\w+/g;
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
var splatParam = /\*/g;

// Parses a URL pattern such as `/users/:id`
// and builds and returns a regex that can be used to
// match said pattern. Credit for these
// regexes belongs to Jeremy Ashkenas and the
// other maintainers of Backbone.js
//
// It has been modified for extraction of
// named paramaters from the URL
var parsePattern = function (pattern) {
  var names = [];
  pattern = pattern
    .replace(escapeRegExp, '\\$&')
    .replace(optionalParam, '(?:$1)?')
    .replace(namedParam, function (match, optional) {
      names.push(match.slice(1));
      return optional ? match : '([^/?]+)'
    })
    .replace(splatParam, function (match, optional) {
      names.push('path');
      return '([^?]*?)'
    });

  return {
    regExp: new RegExp('^' + pattern + '(?:\\?([\\s\\S]*))?$'),
    namedParams: names
  }
};

var featherRouteMatcher = function (routes, fallback) {
  var keys = Object.keys(routes);

  // loop through each route we're
  // and build the shell of our
  // route cache.
  for (var item in routes) {
    routes[item] = {
      value: routes[item]
    };
  }

  // main result is a function that can be called
  // with the url
  return function (url) {
    var params;
    var route;

    // start looking for matches
    var matchFound = keys.some(function (key) {
      var parsed;

      // fetch the route pattern from the cache
      // there will always be one
      route = routes[key];

      // if the route doesn't already have
      // a regex we never generated one
      // so we do that here lazily.
      // Parse the pattern to generate the
      // regex once, and store the result
      // for next time.
      if (!route.regExp) {
        parsed = parsePattern(key);
        route.regExp = parsed.regExp;
        route.namedParams = parsed.namedParams;
        route.pattern = key;
      }

      // run our cached regex
      var result = route.regExp.exec(url);

      // if null there was no match
      // returning falsy here continues
      // the `Array.prototype.some` loop
      if (!result) {
        return
      }

      // remove other cruft from result
      result = result.slice(1, -1);

      // reduce our match to an object of named paramaters
      // we've extracted from the url
      params = result.reduce(function (obj, val, index) {
        if (val) {
          obj[route.namedParams[index]] = val;
        }
        return obj
      }, {});

      // stops the loop
      return true
    });

    // no routes matched
    if (!matchFound) {
      if (fallback) {
        return {
          page: fallback,
          url: url,
          params: null
        }
      }
      return null
    }

    return {
      page: route.value,
      params: params,
      url: url,
      pattern: route.pattern
    }
  }
};

var defaults = {
  routeInfoSelector: 'selectPathname'
};
var createRoutingBundle = (function (routes, spec) {
  var opts = Object.assign({}, defaults, spec);
  var routeInfoSelector = opts.routeInfoSelector;
  var routeMatcher = featherRouteMatcher(routes);
  return {
    name: 'routes',
    selectRoutes: function () { return routes; },
    selectRouteMatcher: function () { return routeMatcher; },
    selectRouteInfo: createSelector$1(routeInfoSelector, routeMatcher),
    selectRouteParams: createSelector$1('selectRouteInfo', function (ref) {
      var params = ref.params;

      return params;
  }),
    selectRoute: createSelector$1('selectRouteInfo', function (ref) {
      var page = ref.page;

      return page;
  })
  };
});

var defaultOpts = {
  actionBaseType: null,
  staleAfter: 900000,
  // fifteen minutes
  retryAfter: 60000,
  // one minute,
  expireAfter: Infinity,
  checkIfOnline: true,
  persist: true
};
var createAsyncResourceBundle = (function (spec) {
  var opts = Object.assign({}, defaultOpts, spec);

  if (process.env.NODE_ENV !== 'production') {
    var requiredOptions = ['name', 'getPromise'];
    requiredOptions.forEach(function (requiredOption) {
      if (!opts[requiredOption]) {
        throw Error(("You must supply a " + requiredOption + " option when creating a resource bundle."));
      }
    });
  }

  var name = opts.name;
  var staleAfter = opts.staleAfter;
  var retryAfter = opts.retryAfter;
  var actionBaseType = opts.actionBaseType;
  var checkIfOnline = opts.checkIfOnline;
  var expireAfter = opts.expireAfter;
  var uCaseName = name.charAt(0).toUpperCase() + name.slice(1);
  var baseType = actionBaseType || name.toUpperCase(); // build selectors

  var inputSelectorName = "select" + uCaseName + "Raw";
  var dataSelectorName = "select" + uCaseName;
  var lastSuccessSelectorName = "select" + uCaseName + "LastSuccess";
  var isExpiredSelectorName = "select" + uCaseName + "IsExpired";
  var lastErrorSelectorName = "select" + uCaseName + "LastError";
  var isStaleSelectorName = "select" + uCaseName + "IsStale";
  var isWaitingToRetrySelectorName = "select" + uCaseName + "IsWaitingToRetry";
  var isLoadingSelectorName = "select" + uCaseName + "IsLoading";
  var failedPermanentlySelectorName = "select" + uCaseName + "FailedPermanently";
  var shouldUpdateSelectorName = "select" + uCaseName + "ShouldUpdate"; // action types

  var actions = {
    STARTED: (baseType + "_FETCH_STARTED"),
    FINISHED: (baseType + "_FETCH_FINISHED"),
    FAILED: (baseType + "_FETCH_FAILED"),
    CLEARED: (baseType + "_CLEARED"),
    OUTDATED: (baseType + "_OUTDATED"),
    EXPIRED: (baseType + "_EXPIRED") // action creators

  };

  var doFetchError = function (error) { return ({
    type: actions.FAILED,
    error: error
  }); };

  var doMarkAsOutdated = function () { return ({
    type: actions.OUTDATED
  }); };

  var doClear = function () { return ({
    type: actions.CLEARED
  }); };

  var doExpire = function () { return ({
    type: actions.EXPIRED
  }); };

  var doFetchSuccess = function (payload) { return ({
    type: actions.FINISHED,
    payload: payload
  }); };

  var doFetchData = function () { return function (args) {
    var dispatch = args.dispatch;
    dispatch({
      type: actions.STARTED
    });
    return opts.getPromise(args).then(function (payload) {
      dispatch(doFetchSuccess(payload));
    }, function (error) {
      dispatch(doFetchError(error));
    });
  }; };

  var initialState = {
    data: null,
    errorTimes: [],
    errorType: null,
    lastSuccess: null,
    isOutdated: false,
    isLoading: false,
    isExpired: false,
    failedPermanently: false
  };
  var result = {
    name: name,
    reducer: function (state, ref) {
      if ( state === void 0 ) state = initialState;
      var type = ref.type;
      var payload = ref.payload;
      var error = ref.error;
      var merge = ref.merge;

      if (type === actions.STARTED) {
        return Object.assign({}, state, {
          isLoading: true
        });
      }

      if (type === actions.FINISHED) {
        var updatedData;

        if (merge) {
          updatedData = Object.assign({}, state.data, payload);
        } else {
          updatedData = payload;
        }

        return Object.assign({}, state, {
          isLoading: false,
          data: updatedData,
          lastSuccess: Date.now(),
          errorTimes: [],
          errorType: null,
          failedPermanently: false,
          isOutdated: false,
          isExpired: false
        });
      }

      if (type === actions.FAILED) {
        var errorMessage = error && error.message || error;
        return Object.assign({}, state, {
          isLoading: false,
          errorTimes: state.errorTimes.concat([Date.now()]),
          errorType: errorMessage,
          failedPermanently: !!(error && error.permanent)
        });
      }

      if (type === actions.CLEARED) {
        return initialState;
      }

      if (type === actions.EXPIRED) {
        return Object.assign({}, initialState, {
          isExpired: true,
          errorTimes: state.errorTimes,
          errorType: state.errorType
        });
      }

      if (type === actions.OUTDATED) {
        return Object.assign({}, state, {
          isOutdated: true
        });
      }

      return state;
    }
  };
  result[inputSelectorName] = function (state) { return state[name]; };
  result[dataSelectorName] = createSelector$1(inputSelectorName, function (root) { return root.data; });
  result[isStaleSelectorName] = createSelector$1(inputSelectorName, lastSuccessSelectorName, 'selectAppTime', function (state, time, appTime) {
      if (state.isOutdated) {
        return true;
      }

      if (!time) {
        return false;
      }

      return appTime - time > staleAfter;
    });
  result[isExpiredSelectorName] = createSelector$1(inputSelectorName, function (root) { return root.isExpired; });
  result[lastErrorSelectorName] = createSelector$1(inputSelectorName, function (resource) { return resource.errorTimes.slice(-1)[0] || null; });
  result[lastSuccessSelectorName] = createSelector$1(inputSelectorName, function (root) { return root.lastSuccess; });
  result[isWaitingToRetrySelectorName] = createSelector$1(lastErrorSelectorName, 'selectAppTime', function (time, appTime) {
      if (!time) {
        return false;
      }

      return appTime - time < retryAfter;
    });
  result[isLoadingSelectorName] = createSelector$1(inputSelectorName, function (resourceState) { return resourceState.isLoading; });
  result[failedPermanentlySelectorName] = createSelector$1(inputSelectorName, function (resourceState) { return resourceState.failedPermanently; });
  result[shouldUpdateSelectorName] = createSelector$1(isLoadingSelectorName, failedPermanentlySelectorName, isWaitingToRetrySelectorName, dataSelectorName, isStaleSelectorName, 'selectIsOnline', function (isLoading, failedPermanently, isWaitingToRetry, data, isStale, isOnline) {
      if (checkIfOnline && !isOnline || isLoading || failedPermanently || isWaitingToRetry) {
        return false;
      }

      if (data === null) {
        return true;
      }

      return isStale;
    });
  result[("doFetch" + uCaseName)] = doFetchData;
  result[("doMark" + uCaseName + "AsOutdated")] = doMarkAsOutdated;
  result[("doClear" + uCaseName)] = doClear;
  result[("doExpire" + uCaseName)] = doExpire;

  if (opts.persist) {
    result.persistActions = [actions.FINISHED, actions.EXPIRED, actions.OUTDATED, actions.CLEARED];
  }

  if (expireAfter !== Infinity) {
    result[("reactExpire" + uCaseName)] = createSelector$1(lastSuccessSelectorName, 'selectAppTime', function (time, appTime) {
      if (!time) {
        return false;
      }

      if (appTime - time > expireAfter) {
        return doExpire();
      }
    });
  }

  return result;
});

var caching = (function (ref) {
  var cacheFn = ref.cacheFn;
  var logger = ref.logger;
  var enabled = ref.enabled; if ( enabled === void 0 ) enabled = IS_BROWSER;

  return {
    name: 'localCache',
    init: function (store) {
      store.buildPersistActionMap = function () {
        store.meta.persistActionMap = store.meta.chunks.reduce(function (actionMap, chunk) {
          chunk.rawBundles.forEach(function (bundle) {
            if (bundle.persistActions) {
              bundle.persistActions.forEach(function (type) {
                actionMap[type] || (actionMap[type] = []);
                actionMap[type].push(bundle.name);
              });
            }
          });
          return actionMap;
        }, {});
      };

      store.buildPersistActionMap();
    },
    getMiddleware: function () {
      return function (store) { return function (next) { return function (action) {
        var getState = store.getState;
        var meta = store.meta;
        var persistActionMap = meta.persistActionMap;
        var reducersToPersist = persistActionMap[action.type];
        var res = next(action);
        var state = getState();

        if (enabled && reducersToPersist) {
          ric(function () {
            Promise.all(reducersToPersist.map(function (key) { return cacheFn(key, state[key]); })).then(function () {
              if (logger) {
                logger(("cached " + (reducersToPersist.join(', ')) + " due to " + (action.type)));
              }
            });
          }, {
            timeout: 500
          });
        }

        return res;
      }; }; };
    }
  };
});

var getError = function (message, permanent) {
  if ( permanent === void 0 ) permanent = false;

  var err = new Error(message);
  if (permanent) { err.permanent = true; }
  return err;
};

var geoErrorArray = ['An unknown geolocation error occured', 'Geolocation permission denied', 'Geolocation unavailable', 'Geolocation request timed out'];
var defaultOpts$1 = {
  timeout: 60000,
  enableHighAccuracy: false,
  persist: true,
  staleAfter: 900000,
  // fifteen minutes
  retryAfter: 60000 // one minute,

};
var geolocation = (function (spec) {
  var opts = Object.assign({}, defaultOpts$1, spec);
  return createAsyncResourceBundle({
    name: 'geolocation',
    actionBaseType: 'GEOLOCATION_REQUEST',
    getPromise: function () { return new Promise(function (resolve, reject) {
      if (!IS_BROWSER || !navigator.geolocation) {
        reject(getError('Geolocation not supported', true));
      }

      var success = function (position) {
        var res = {};
        var coords = position.coords;

        for (var key in coords) {
          res[key] = coords[key];
        }

        res.timestamp = position.timestamp;
        resolve(res);
      };

      var fail = function (ref) {
        var code = ref.code;

        reject(getError(geoErrorArray[code], code === 1));
      };

      var geoOpts = {
        timeout: opts.timeout,
        enableHighAccuracy: opts.enableHighAccuracy
      };
      navigator.geolocation.getCurrentPosition(success, fail, geoOpts);
    }); },
    persist: opts.persist,
    staleAfter: opts.staleAfter,
    retryAfter: opts.retryAfter
  });
});

var defaults$1 = {
  idleTimeout: 30000,
  idleAction: 'APP_IDLE',
  doneCallback: null,
  stopWhenTabInactive: true,
  cancelIdleWhenDone: true
};
var ricOptions = {
  timeout: 500
};
var getIdleDispatcher = function (stopWhenInactive, timeout, fn) { return debounce(function () {
  // the requestAnimationFrame ensures it doesn't run when tab isn't active
  stopWhenInactive ? raf(function () { return ric(fn, ricOptions); }) : ric(fn, ricOptions);
}, timeout); };
var reactors = (function (spec) { return ({
  name: 'reactors',
  init: function (store) {
    var ref = Object.assign({}, defaults$1, spec);
    var idleAction = ref.idleAction;
    var idleTimeout = ref.idleTimeout;
    var cancelIdleWhenDone = ref.cancelIdleWhenDone;
    var doneCallback = ref.doneCallback;
    var stopWhenTabInactive = ref.stopWhenTabInactive;
    var idleDispatcher;

    if (idleTimeout) {
      idleDispatcher = getIdleDispatcher(stopWhenTabInactive, idleTimeout, function () { return store.dispatch({
        type: idleAction
      }); });
    }

    if (process.env.NODE_ENV !== 'production') {
      store.meta.reactorNames.forEach(function (name) {
        if (!store[name]) {
          throw Error(("Reactor '" + name + "' not found on the store. Make sure you're defining as selector by that name."));
        }
      });
    }

    var cancelIfDone = function () {
      if (!IS_BROWSER && !store.nextReaction && (!store.selectAsyncActive || !store.selectAsyncActive())) {
        idleDispatcher && idleDispatcher.cancel();
        doneCallback && doneCallback();
      }
    };

    var dispatchNext = function () {
      // one at a time
      if (store.nextReaction) {
        return;
      } // look for the next one


      store.meta.reactorNames.some(function (name) {
        var result = store[name]();

        if (result) {
          store.activeReactor = name;
          store.nextReaction = result;
        }

        return result;
      });

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
        setTimeout(function () {
          var nextReaction = store.nextReaction;
          store.activeReactor = null;
          store.nextReaction = null;
          store.dispatch(nextReaction);
        }, 0);
      }
    };

    var callback = function () {
      dispatchNext();

      if (idleDispatcher) {
        idleDispatcher();
        cancelIdleWhenDone && cancelIfDone();
      }
    };

    store.subscribe(callback);
    callback();
  }
}); });

var has = Object.prototype.hasOwnProperty
  , undef;

/**
 * Decode a URI encoded string.
 *
 * @param {String} input The URI encoded string.
 * @returns {String|Null} The decoded string.
 * @api private
 */
function decode(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '));
  } catch (e) {
    return null;
  }
}

/**
 * Simple query string parser.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object}
 * @api public
 */
function querystring(query) {
  var parser = /([^=?&]+)=?([^&]*)/g
    , result = {}
    , part;

  while (part = parser.exec(query)) {
    var key = decode(part[1])
      , value = decode(part[2]);

    //
    // Prevent overriding of existing properties. This ensures that build-in
    // methods like `toString` or __proto__ are not overriden by malicious
    // querystrings.
    //
    // In the case if failed decoding, we want to omit the key/value pairs
    // from the result.
    //
    if (key === null || value === null || key in result) continue;
    result[key] = value;
  }

  return result;
}

/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */
function querystringify(obj, prefix) {
  prefix = prefix || '';

  var pairs = []
    , value
    , key;

  //
  // Optionally prefix with a '?' if needed
  //
  if ('string' !== typeof prefix) prefix = '?';

  for (key in obj) {
    if (has.call(obj, key)) {
      value = obj[key];

      //
      // Edge cases where we actually want to encode the value to an empty
      // string instead of the stringified value.
      //
      if (!value && (value === null || value === undef || isNaN(value))) {
        value = '';
      }

      key = encodeURIComponent(key);
      value = encodeURIComponent(value);

      //
      // If we failed to encode the strings, we should bail out as we don't
      // want to add invalid strings to the query.
      //
      if (key === null || value === null) continue;
      pairs.push(key +'='+ value);
    }
  }

  return pairs.length ? prefix + pairs.join('&') : '';
}

//
// Expose the module.
//
var stringify = querystringify;
var parse = querystring;

var querystringify_1 = {
	stringify: stringify,
	parse: parse
};

var isString = function (obj) { return Object.prototype.toString.call(obj) === '[object String]'; };
var isDefined = function (thing) { return typeof thing !== 'undefined'; };
var ensureString = function (input) { return isString(input) ? input : querystringify_1.stringify(input); };
var IPRE = /^[0-9.]+$/;
var parseSubdomains = function (hostname, getBareHost) {
  if (IPRE.test(hostname)) { return []; }
  var parts = hostname.split('.');

  if (getBareHost) {
    return parts.slice(-2).join('.');
  }

  return hostname.split('.').slice(0, -2);
};
var removeLeading = function (char, string) { return string.charAt(0) === char ? string.slice(1) : string; };
var ensureLeading = function (char, string) {
  if (string === char || string === '') {
    return '';
  }

  return string.charAt(0) !== char ? char + string : string;
};

var loc = (function () {
  if (!HAS_WINDOW) { return {}; }
  return window.location;
})();

var defaults$2 = {
  name: 'url',
  inert: !HAS_WINDOW,
  actionType: 'URL_UPDATED',
  handleScrollRestoration: true
};

var makeSerializable = function (url) {
  var result = {};

  for (var key in url) {
    var val = url[key];

    if (isString(val)) {
      result[key] = val;
    }
  }

  return result;
};

var url = (function (opts) {
  var config = Object.assign({}, defaults$2, opts);
  var actionType = config.actionType;

  var selectUrlRaw = function (state) { return state[config.name]; };

  var selectUrlObject = createSelector$1(selectUrlRaw, function (urlState) { return makeSerializable(new URL(urlState.url)); });
  var selectQueryObject = createSelector$1(selectUrlObject, function (urlObj) { return querystringify_1.parse(urlObj.search); });
  var selectQueryString = createSelector$1(selectQueryObject, function (queryObj) { return querystringify_1.stringify(queryObj); });
  var selectPathname = createSelector$1(selectUrlObject, function (urlObj) { return urlObj.pathname; });
  var selectHash = createSelector$1(selectUrlObject, function (urlObj) { return removeLeading('#', urlObj.hash); });
  var selectHashObject = createSelector$1(selectHash, function (hash) { return querystringify_1.parse(hash); });
  var selectHostname = createSelector$1(selectUrlObject, function (urlObj) { return urlObj.hostname; });
  var selectSubdomains = createSelector$1(selectHostname, function (hostname) { return parseSubdomains(hostname); });

  var doUpdateUrl = function (newState, opts) {
    if ( opts === void 0 ) opts = {
    replace: false,
    maintainScrollPosition: false
  };

    return function (ref) {
    var dispatch = ref.dispatch;
    var getState = ref.getState;

    var state = newState;

    if (typeof newState === 'string') {
      var parsed = new URL(newState.charAt(0) === '/' ? 'http://example.com' + newState : newState);
      state = {
        pathname: parsed.pathname,
        query: parsed.search || '',
        hash: parsed.hash || ''
      };
    }

    var url = new URL(selectUrlRaw(getState()).url);
    if (isDefined(state.pathname)) { url.pathname = state.pathname; }
    if (isDefined(state.hash)) { url.hash = ensureString(state.hash); }
    if (isDefined(state.query)) { url.search = ensureString(state.query); }
    dispatch({
      type: actionType,
      payload: {
        url: url.href,
        replace: opts.replace,
        maintainScrollPosition: opts.maintainScrollPosition
      }
    });
  };
  };

  var doReplaceUrl = function (url) { return doUpdateUrl(url, {
    replace: true
  }); };

  var doUpdateQuery = function (query, opts) {
    if ( opts === void 0 ) opts = {
    replace: true
  };

    return doUpdateUrl({
    query: ensureString(query)
  }, opts);
  };

  var doUpdateHash = function (hash, opts) {
    if ( opts === void 0 ) opts = {
    replace: false
  };

    return doUpdateUrl({
    hash: ensureLeading('#', ensureString(hash))
  }, opts);
  };

  return {
    name: config.name,
    init: function (store) {
      if (config.inert) {
        return;
      }

      if (config.handleScrollRestoration) {
        initScrollPosition();
      }

      window.addEventListener('popstate', function () {
        store.doUpdateUrl({
          pathname: loc.pathname,
          hash: loc.hash,
          query: loc.search
        });
      });
      var lastState = store.selectUrlRaw();
      store.subscribe(function () {
        var newState = store.selectUrlRaw();
        var newUrl = newState.url;

        if (lastState !== newState && newUrl !== loc.href) {
          try {
            window.history[newState.replace ? 'replaceState' : 'pushState']({}, null, newState.url);

            if (config.handleScrollRestoration) {
              saveScrollPosition();
            }

            if (!newState.maintainScrollPosition) {
              window.scrollTo(0, 0);
            }
          } catch (e) {
            console.error(e);
          }
        }

        lastState = newState;
      });
    },
    getReducer: function () {
      var initialState = {
        url: !config.inert && HAS_WINDOW ? loc.href : '/',
        replace: false,
        maintainScrollPosition: false
      };
      return function (state, ref) {
        if ( state === void 0 ) state = initialState;
        var type = ref.type;
        var payload = ref.payload;

        if (typeof state === 'string') {
          return {
            url: state,
            replace: false,
            maintainScrollPosition: false
          };
        }

        if (type === actionType) {
          return Object.assign({
            url: payload.url || payload,
            replace: !!payload.replace,
            maintainScrollPosition: !!payload.maintainScrollPosition
          });
        }

        return state;
      };
    },
    doUpdateUrl: doUpdateUrl,
    doReplaceUrl: doReplaceUrl,
    doUpdateQuery: doUpdateQuery,
    doUpdateHash: doUpdateHash,
    selectUrlRaw: selectUrlRaw,
    selectUrlObject: selectUrlObject,
    selectQueryObject: selectQueryObject,
    selectQueryString: selectQueryString,
    selectPathname: selectPathname,
    selectHash: selectHash,
    selectHashObject: selectHashObject,
    selectHostname: selectHostname,
    selectSubdomains: selectSubdomains
  };
});

var version = "25.0.0";

var createDebug = (function (spec) {
  var ENABLE = 'DEBUG_ENABLED';
  var DISABLE = 'DEBUG_DISABLED';
  var colorBlue = 'color: #1676D2;';
  var colorGreen = 'color: #4CAF50;';
  var colorOrange = 'color: #F57C00;'; // cleans up color vars when used in node

  var log = function (toLog, ref) {
    var method = ref.method; if ( method === void 0 ) method = 'log';
    var label = ref.label;
    var color = ref.color;

    return console[method].apply(console, (IS_BROWSER ? [("%c" + label), color, toLog] : [label, toLog]));
  };

  var defaultOpts = {
    logSelectors: true,
    logState: true,
    logIdle: true,
    enabled: HAS_DEBUG_FLAG
  };
  var opts = Object.assign({}, defaultOpts, spec);
  return {
    name: 'debug',
    reducer: function (state, ref) {
      if ( state === void 0 ) state = opts.enabled;
      var type = ref.type;

      if (type === ENABLE) {
        return true;
      }

      if (type === DISABLE) {
        return false;
      }

      return state;
    },
    doEnableDebug: function () { return function (ref) {
      var dispatch = ref.dispatch;

      if (IS_BROWSER) {
        try {
          localStorage.debug = true;
        } catch (e) {}
      }

      dispatch({
        type: ENABLE
      });
    }; },
    doDisableDebug: function () { return function (ref) {
      var dispatch = ref.dispatch;

      if (IS_BROWSER) {
        try {
          delete localStorage.debug;
        } catch (e) {}
      }

      dispatch({
        type: DISABLE
      });
    }; },
    selectIsDebug: function (state) { return state.debug; },
    getMiddleware: function () { return function (store) { return function (next) { return function (action) {
      if (!opts.logIdle && action.type === 'APP_IDLE') {
        return next(action);
      }

      var isDebug = store.getState().debug;

      if (isDebug) {
        console.group(action.type);
        console.info('action:', action);
      }

      var result = next(action);

      if (isDebug) {
        opts.logState && console.debug('state:', store.getState());
        opts.logSelectors && store.doLogSelectors();
        store.doLogNextReaction && store.doLogNextReaction();
        console.groupEnd(action.type);
      }

      return result;
    }; }; }; },
    doLogBundles: function () { return function (ref) {
      var store = ref.store;

      log(store.meta.chunks.reduce(function (result, chunk) {
        result.push.apply(result, chunk.bundleNames);
        return result;
      }, []), {
        label: 'installed bundles:',
        color: colorBlue
      });
    }; },
    doLogSelectors: function () { return function (ref) {
      var store = ref.store;

      log(Object.keys(store.meta.unboundSelectors).sort().reduce(function (res, name$$1) {
        res[name$$1] = store[name$$1]();
        return res;
      }, {}), {
        label: 'selectors:',
        color: colorGreen
      });
    }; },
    doLogActionCreators: function () { return function (ref) {
      var store = ref.store;

      log(Object.keys(store.meta.unboundActionCreators).sort(), {
        label: 'action creators:',
        color: colorOrange
      });
    }; },
    doLogReactors: function () { return function (ref) {
      var store = ref.store;

      log(store.meta.reactorNames, {
        label: 'reactors:',
        color: colorOrange
      });
    }; },
    doLogNextReaction: function () { return function (ref) {
      var store = ref.store;

      var nextReaction = store.nextReaction;
      var activeReactor = store.activeReactor;

      if (nextReaction) {
        log(activeReactor, {
          color: colorOrange,
          label: ("next reaction: " + nextReaction)
        });
      }
    }; },
    doLogDebugSummary: function () { return function (ref) {
      var store = ref.store;

      store.doLogBundles();
      store.doLogSelectors();
      store.doLogActionCreators();
      store.doLogReactors();
      store.doLogNextReaction();
    }; },
    init: function (store) {
      if (store.selectIsDebug()) {
        if (IS_BROWSER) {
          self.store = store;
          console.groupCollapsed(("%credux bundler v" + version), colorBlue);
          store.doLogDebugSummary();
          console.groupEnd();
        }
      }
    }
  };
});

var OFFLINE = 'OFFLINE';
var ONLINE = 'ONLINE';
var online = {
  name: 'online',
  selectIsOnline: function (state) { return state.online; },
  getReducer: function () {
    var initialState = IS_BROWSER ? navigator.onLine : true;
    return function (state, ref) {
      if ( state === void 0 ) state = initialState;
      var type = ref.type;

      if (type === OFFLINE) { return false; }
      if (type === ONLINE) { return true; }
      return state;
    };
  },
  init: function (store) {
    addGlobalListener('online', function () { return store.dispatch({
      type: ONLINE
    }); });
    addGlobalListener('offline', function () { return store.dispatch({
      type: OFFLINE
    }); });
  }
};

var appTimeBundle = appTime;
var asyncCountBundle = asyncCount;
var createCacheBundle = caching;
var createRouteBundle = createRoutingBundle;
var createAsyncResourceBundle$1 = createAsyncResourceBundle;
var createReactorBundle = reactors;
var getIdleDispatcher$1 = getIdleDispatcher;
var onlineBundle = online;
var createUrlBundle = url;
var createDebugBundle = createDebug;
var composeBundlesRaw = composeBundles;
var createGeolocationBundle = geolocation;
var composeBundles$1 = function () {
  var userBundles = [], len = arguments.length;
  while ( len-- ) userBundles[ len ] = arguments[ len ];

  userBundles || (userBundles = []);
  var bundles = [appTime, asyncCount, online, url(), reactors(), createDebug() ].concat( userBundles);
  return composeBundles.apply(void 0, bundles);
};

exports.appTimeBundle = appTimeBundle;
exports.asyncCountBundle = asyncCountBundle;
exports.createCacheBundle = createCacheBundle;
exports.createRouteBundle = createRouteBundle;
exports.createAsyncResourceBundle = createAsyncResourceBundle$1;
exports.createReactorBundle = createReactorBundle;
exports.getIdleDispatcher = getIdleDispatcher$1;
exports.onlineBundle = onlineBundle;
exports.createUrlBundle = createUrlBundle;
exports.createDebugBundle = createDebugBundle;
exports.composeBundlesRaw = composeBundlesRaw;
exports.createGeolocationBundle = createGeolocationBundle;
exports.composeBundles = composeBundles$1;
exports.createSelector = createSelector$1;
exports.resolveSelectors = resolveSelectors;
exports.HAS_DEBUG_FLAG = HAS_DEBUG_FLAG;
exports.HAS_WINDOW = HAS_WINDOW;
exports.IS_BROWSER = IS_BROWSER;
exports.IS_PROD = IS_PROD;
exports.raf = raf;
exports.ric = ric;
exports.isPassiveSupported = isPassiveSupported;
exports.PASSIVE_EVENTS_SUPPORTED = PASSIVE_EVENTS_SUPPORTED;
exports.startsWith = startsWith;
exports.flattenExtractedToObject = flattenExtractedToObject;
exports.flattenExtractedToArray = flattenExtractedToArray;
exports.addGlobalListener = addGlobalListener;
exports.selectorNameToValueName = selectorNameToValueName;
exports.debounce = debounce;
exports.saveScrollPosition = saveScrollPosition;
exports.restoreScrollPosition = restoreScrollPosition;
exports.initScrollPosition = initScrollPosition;
exports.createStore = createStore;
exports.combineReducers = combineReducers;
exports.bindActionCreators = bindActionCreators;
exports.applyMiddleware = applyMiddleware;
exports.compose = compose;
exports.__DO_NOT_USE__ActionTypes = ActionTypes;
