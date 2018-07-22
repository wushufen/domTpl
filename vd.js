
function lazy(fn, time) {
    var t, lastDate = 0;
    return function() {
        var now = new Date;
        if (now - time > lastDate) {
            fn();
            lastDate = now;
        } else {
            clearTimeout(t);
            t = _setTimeout(fn, time)
        }
    }
}