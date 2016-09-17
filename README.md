# IndexedDB-as-Storage-in-NWJS

This takes the window object from nwjs context and puts it into a node module to use IndexedDB with or without a Worker in node context places. You initialize it when your app starts and even your node modules will be able to use your database.

This also wraps IndexedDB into a Storage-like API: setItem, getItem, removeItem, clear, and length. The main difference is that they're asynchronous now, so they require a callback function.

You need a recent-ish version of NW.js to run this. No clue if it will work in versions older than 0.14.7.

If you have 0.12.3 or the SDK version of NW.js downloaded, open the console to see the status of the sharedWorker inserts. It takes significantly longer to use a sharedWorker than the standard (blocking) IndexedDB operations, as in 0.1ms or less vs 4-5ms when doing a lot of operations at the same time, but it's only about 2ms vs 4-5ms for a single operation. 

But you'll note that the setItem async operation *does* block the DOM with enough setItem operations (100,000 or so).  

Sync operations aren't actually synchronous, they're just doing the test where setItem is called, and when it finishes it runs the next setItem. Async just runs all the setItems immediately and handles them as they are finished. For the blocking non-worker method, Async is faster for multiple calls but also takes a while. You can chnge the number of runs in app.html.

Overall, I'd recommend db-sw.js because of the small actual performance penalty and the non-blocking nature of workers.

## Usage

Look at app.html for an actual implementation and test of db.js and db-sw.js

`let db = require('./db.js')` or `let db = require('./db-sw.js')`

`db.init(window, err => { /* do something when done */ })`
You *need* to call init(window) from a nwjs context, but it only needs to be done once due to module caching in node.js. That means you can do something like `require('./db.js').init(window)` at the beginning of your app, then require it later in modules or in any other context and use it.

`db.setItem(key, value, err => { if (err) console.error(err) })`

`db.getItem(key, (res, err) => { err ? console.error(err) : console.log(res) })`

`db.removeItem(key, err => { if (err) console.error(err) })`

`db.clear(err => {if (err) console.log(err) })`

`db.length((res, err) => { err ? console.error(err) : console.log(res) })`


## Random notes

`db.transaction(['data'], 'readwrite').objectStore('data')` is the biggest time sink and the reason why the Worker implementation is slower in large numbers of quick transactions. The transaction won't stay open for long enough to take multiple operations before it finishes, while in the non-worker implementation, it does stay open.
