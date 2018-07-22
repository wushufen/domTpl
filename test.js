var map = {}


console.time(1)
for (var i = 0; i < 1000; i++) {
    map['str' + i] = function() { /*...*/ }
}
console.timeEnd(1)


console.time(2)
for (var i = 0; i < 1000; i++) {
    map['str' + i] = function() { /*...*/ }
}
console.timeEnd(2)


console.time(3)
for (var i = 0; i < 1000; i++) {
    map['str' + i] = function() { /*...*/ }
}
console.timeEnd(3)
