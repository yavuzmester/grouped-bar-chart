
// Helper to create a date from an array of arguments to be passed to the Date constructor.
// This is not usually possible, see: http://stackoverflow.com/questions/181348
var offset = (new Date()).getTimezoneOffset() * 60000;
function dateConstructor(args) {
    return new Date(Date.UTC.apply(null, arr) + offset);
}

// Constructor for Autoincrement instances.
function Autoincrement(number) {
    // The valueOf implementation.
    function valueOf() {
        // Notify all observers.
        for (var i = 0; i < observers.length; i++) observers[i](number);
        return number++;
    }

    // Notify implementation. Kinda Object-Observer pattern. Kinda.
    var observers = [];
    function notify(callback) { observers.push(callback); }

    // We'll use defineProperty if available.
    if (Object.defineProperty) {
        Object.defineProperty(this, 'valueOf', {value: valueOf});
        Object.defineProperty(this,  'notify', {value:  notify});
    } else {
        this.valueOf = valueOf;
        this.notify  = notify;
    }

    // Freeze, if possible.
    if (Object.freeze) Object.freeze(this);
}

// Returns a new Autoincrement object from either a starting number or
// arguments to be passed to Date constructor.
Autoincrement.prototype.from = function(n) {
    if (arguments.length === 1 && typeof n === 'number') {
        return new Autoincrement(n);
    }
    var date = dateConstructor([].slice.call(arguments));
    return new Autoincrement(+date);
};

// The export is an instance.
module.exports = new Autoincrement(+new Date);
