/*
  IndexedDB as asynchronous Storage for nw.js

  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  https://developer.mozilla.org/en-US/docs/Web/API/Storage
  https://googlechrome.github.io/samples/idb-getall/
  http://nolanlawson.github.io/database-comparison/

  TODO: .key()
 */

let exp = Object.create(null)
let window
let db
let setup = false
let rwObjectStore
let readObjectStore

exp.init = function (win, fn) {
  window = win

  let request = window.indexedDB.open('state', 1)
  request.onerror = function () {
    if (typeof fn === 'function') fn(request.error)
  }
  request.onsuccess = function () {
    setup = true
    db = request.result
    if (typeof fn === 'function') fn()
  }
  request.onupgradeneeded = function () {
    db = request.result
    let store = db.createObjectStore('data', {keyPath: 'key'})
    store.transaction.oncomplete = function (ev) {
      setup = true
      if (typeof fn === 'function') fn()
    }
  }
}

exp.setItem = function (key, value, fn) {
  if (!setup) return console.error('Database not initialized')

  let request
  try {
    request = rwObjectStore.put({key, value})
  } catch (e) {
    rwObjectStore = db.transaction(['data'], 'readwrite').objectStore('data')
    request = rwObjectStore.put({key, value})
  }
  request.onsuccess = function () {
    if (typeof fn === 'function') fn()
  }
  request.onerror = function () {
    if (typeof fn === 'function') fn(request.error)
  }
}

exp.getItem = function (key, fn) {
  if (!setup) return console.error('Database not initialized')

  let request
  try {
    request = readObjectStore.get(key)
  } catch (e) {
    readObjectStore = db.transaction(['data']).objectStore('data')
    request = readObjectStore.get(key)
  }
  request.onsuccess = function () {
    if (typeof fn === 'function') {
      if (request.result) fn(request.result.value)
      else fn(null, 'not found')
    }
  }
  request.onerror = function () {
    if (typeof fn === 'function') fn(null, request.error)
  }
}

exp.removeItem = function (key, fn) {
  if (!setup) return console.error('Database not initialized')

  let request
  try {
    request = rwObjectStore.delete(key)
  } catch (e) {
    rwObjectStore = db.transaction(['data'], 'readwrite').objectStore('data')
    request = rwObjectStore.delete(key)
  }
  request.onsuccess = function () {
    if (typeof fn === 'function') fn()
  }
  request.onerror = function () {
    if (typeof fn === 'function') fn(request.error)
  }
}

exp.clear = function(fn) {
  if (!setup) return console.error('Database not initialized')

  let objectStore = db.transaction(['data'], 'readwrite').objectStore('data')
  let request = objectStore.clear()
  request.onsuccess = function () {
    if (typeof fn === 'function') fn()
  }
  request.onerror = function () {
    if (typeof fn === 'function') fn(request.error)
  }
}

exp.length = function(fn) {
  if (!setup) return console.error('Database not initialized')

  let objectStore = db.transaction(['data']).objectStore('data')
  let request = objectStore.count()
  request.onsuccess = function () {
    if (typeof fn === 'function') fn(request.result)
  }
  request.onerror = function () {
    if (typeof fn === 'function') fn(null, request.error)
  }
}

module.exports = exp
