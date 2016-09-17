/*
  IndexedDB as asynchronous Storage for nw.js using a sharedWorker

  https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
  https://developer.mozilla.org/en-US/docs/Web/API/Storage
  https://googlechrome.github.io/samples/idb-getall/
  window.indexedDB.deleteDatabase('dbName')

  TODO: Implement .length, .key(), .clear()
 */

  let exp = Object.create(null)
  let window

  let setup = false
  let swSetURL

  exp.init = function (win, fn) {
    window = win
    swSetURL = fn2sharedWorkerURL(sharedWorkerCode)
    let sw = new window.SharedWorker(swSetURL)
    sw.port.onmessage = function (e) {
      setup = true
      if (typeof fn === 'function') {
        if (e.data) fn(e.data)
        else fn()
      }
    }
    sw.port.postMessage({action: 'test'})
  }

  function fn2sharedWorkerURL(fn) {
    let blob = new window.Blob([`(${fn.toString()})()`], {type: 'application/javascript'})
    return window.URL.createObjectURL(blob)
  }
  function sharedWorkerCode() {
    let db
    let readWriteObjectStore
    // let readObjectStore

    function defineDB(fn) {
      let request = indexedDB.open('state', 1)
      request.onerror = function () {
      }
      request.onsuccess = function () {
        db = request.result
        if (typeof fn === 'function') fn()
      }
      request.onupgradeneeded = function () {
        db = request.result
        let store = db.createObjectStore('data', {keyPath: 'key'})
        store.transaction.oncomplete = function (ev) {
          if (typeof fn === 'function') fn()
        }
      }
    }

    onconnect = function (connectEvent) {
      let port = connectEvent.ports[0]
      if (!db) defineDB(handleConnection)
      else handleConnection()

      function handleConnection() {
        port.addEventListener('message', function (e) {
          if (e.data.action === 'set') {
            let request
            try {
              request = readWriteObjectStore.put({key: e.data.key, value: e.data.value})
            }
            catch (exception) {
              readWriteObjectStore = db.transaction(['data'], 'readwrite').objectStore('data')
              request = readWriteObjectStore.put({key: e.data.key, value: e.data.value})
            }
            // let objectStore = db.transaction(['data'], 'readwrite').objectStore('data')
            // let request = objectStore.put({key: e.data.key, value: e.data.value})
            request.onerror = function () {
              port.postMessage(request.error)
            }
            request.onsuccess = function () {
              port.postMessage('')
            }
          }
          else if (e.data.action === 'get') {
            // let request
            // try {
            //   request = readWriteObjectStore.get(e.data.key)
            // }
            // catch (exception) {
            //   readWriteObjectStore = db.transaction(['data']).objectStore('data')
            //   request = readWriteObjectStore.get(e.data.key)
            // }
            let objectStore = db.transaction(['data']).objectStore('data')
            let request = objectStore.get(e.data.key)
            request.onerror = function () {
              port.postMessage({res:null, err:request.error})
            }
            request.onsuccess = function () {
              port.postMessage({res:request.result.value, err:null})
            }
          }
          else if (e.data.action === 'remove') {
            // let request
            // try {
            //   request = readWriteObjectStore.delete(e.data.key)
            // }
            // catch (exception) {
            //   readWriteObjectStore = db.transaction(['data'], 'readwrite').objectStore('data')
            //   request = readWriteObjectStore.delete(e.data.key)
            // }
            let objectStore = db.transaction(['data'], 'readwrite').objectStore('data')
            let request = objectStore.delete(e.data.key)
            request.onsuccess = function () {
              port.postMessage('')
            }
            request.onerror = function () {
              port.postMessage(request.error)
            }
          }
          else if (e.data.action === 'test') {
            if (!db) port.postMessage('init failed')
            else port.postMessage('')
          }
          else {
            port.postMessage('invalid sharedWorker action')
          }
        })
        port.start()
      }
    }
  }

  exp.setItem = function (key, value, fn) {
    if (!setup) return console.error('Database not initialized')

    let sw = new window.SharedWorker(swSetURL)
    sw.port.onmessage = function (e) {
      if (typeof fn === 'function') {
        if (e.data) fn(e.data)
        else fn()
      }
    }
    sw.port.postMessage({action: 'set', key, value})
  }

  exp.getItem = function (key, fn) {
    if (!setup) return console.error('Database not initialized')

    let sw = new window.SharedWorker(swSetURL)
    sw.port.onmessage = function (e) {
      if (typeof fn === 'function') {
        if (e.data.err) fn(null, e.data.err)
        else fn(e.data.res)
      }
    }
    sw.port.postMessage({action: 'get', key})
  }

  exp.removeItem = function (key, fn) {
    if (!setup) return console.error('Database not initialized')

    let sw = new window.SharedWorker(swSetURL)
    sw.port.onmessage = function (e) {
      if (typeof fn === 'function') {
        if (e.data) fn(e.data)
        else fn()
      }
    }
    sw.port.postMessage({action: 'remove', key})
  }

  // non-shared worker test

  // exp.workerSet = function (key, value, fn) {
  //   if (!setup) return console.error('Database not initialized')
  //
  //   function fn2worker(fn) {
  //     let blob = new window.Blob([`(${fn.toString()})()`], {type: 'application/javascript'})
  //     let blobURL = window.URL.createObjectURL(blob)
  //     return new window.Worker(blobURL)
  //   }
  //
  //   let worker = fn2worker(function () {
  //     onmessage = function (e) {
  //       let open = indexedDB.open('state', 1)
  //       open.onerror = function () {
  //         console.error(open.error)
  //         close()
  //       }
  //       open.onsuccess = function () {
  //         runRequest(e.data.key, e.data.value, open.result)
  //       }
  //       open.onupgradeneeded = function () {
  //         let tx = open.result.createObjectStore('data', {keyPath: 'key'})
  //         tx.transaction.oncomplete = function() {
  //           runRequest(e.data.key, e.data.value, open.result)
  //         }
  //       }
  //       function runRequest (key, value, db) {
  //         let objectStore = db.transaction(['data'], 'readwrite').objectStore('data')
  //         let request = objectStore.put({key, value})
  //         request.onsuccess = function () {
  //           postMessage('')
  //           close()
  //         }
  //         request.onerror = function () {
  //           postMessage(request.error)
  //           close()
  //         }
  //       }
  //     }
  //   })
  //   worker.onmessage = function (e) {
  //     if (e.data) fn(e.data)
  //     else fn()
  //   }
  //   worker.postMessage({key, value})
  //
  // }

module.exports = exp
