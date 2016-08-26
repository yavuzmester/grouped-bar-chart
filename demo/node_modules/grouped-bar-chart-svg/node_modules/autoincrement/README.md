# autoincrement
Clever auto-incrementing variable that works by magic.

```bash
npm install autoincrement
```

### What is it?

A magical variable that will always be equal to its last value, plus one.

```js
var autoincrement = require('autoincrement');
autoincrement == (autoincrement + 1);
```

Note how we used the `==` loose comparison operator. Because, this is not a number, even if it behaves like one.

If it was a real number, we couldn't do this:

```js
var foo = autoincrement;
foo == (foo + 1);
foo == (autoincrement + 1);
autoincrement == (foo + 1);
```

As you can see, they behave like true aliases. If you want a true number that's passed by value, you can:

```js
var byRef = autoincrement;
var byVal = +autoincrement;
typof byRef === 'object';
typof byVal === 'number';
```

But in some cases you don't even need to:

```js
var className = 'incrementing-thing-' + autoincrement;
var isRecent = autoIncrementedNumber > autoincrement - 100;
```

Just remember to use number coercion (`+autoincrement`) when you need the number and not an auto-incrementing object.

### What number is it? Does it start from one?

It doesn't start from one! And that is another feature.

Consider that you'll at some point reboot the server. You still want new auto-incrementing numbers later, but you don't want having to persist the last one in a database, that's too much hassle. Still, you want the next run of your app to have auto-incrementing numbers that don't start over again.

The solution to this, is dates! Every time you start your app and `require('autoincrement')`, the number used will be the current UTC unix time in milliseconds.

In other words, as long as the auto-incrementing variable hasn't been used more than *a thousand times per second* since the last time your app has been started, you'll be guaranteed to have always bigger numbers. This is a very permissive restriction, and note that during the app's runtime, you can use them as frequently as you want (even in peaks of more than 1k/s, if you manage to have them).

### Why not just use `+new Date` then?

Because the number would be the same if you use it twice in the same millisecond, which is a likely scenario. Using it more than 1000 times per second on average for the whole lifespan of the app is, however, a lot less likely.

### Isn't that kind of number too big?

Not at all, a number like this fits pretty comfortably in javascript's (and most languages') number representation, and since they're sequential, intense usage in web resources will be gzipped out with great ease.

Still, note that if you plan to insert them into some other language, 64-bit ints would be necessary. If that's not possible, read on:

### What if I want it to start from one?

That's fine too! Just do this:

```js
var startFromOne = require('autoincrement').from(1);
startFromOne == 1;
startFromOne == 2;
```

You can start from arbitrary numbers, but also dates: just pass a string parameter with an ISO-like date, or numbers representing the date. For example:

```js
var autoincrement = require('autoincrement');
var startFromBirthday1 = autoincrement.from('July 17, 1990 04:30:00');
var startFromBirthday2 = autoincrement.from('1990-07-17T04:30:00');
var startFromBirthday3 = autoincrement.from(1990, 6, 17);
var startFromBirthday4 = autoincrement.from(1990, 6, 17, 4, 30, 0);
```

These are all arguments valid for the [javascript `Date` constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date).

In these cases, the actual number used will be the count of milliseconds since that date. To protect the user from mistakes, an error will be thrown if the resulting number would have been negative.

### How can I persist the value?

In case you want to use just the auto-incrementing feature and want to go the more traditional route of persisting the value into a database, which is boring as fuck, but gives you the advantage of sequential numbers, you can use the following method:

```js
autoincrement.notify(function(currentNumber) {
    doSomethingWith(currentNumber);
});
```

Then at the next time the app is ran:

```js
var autoincrement = require('autoincrement').from(previousCurrentNumber + 1);
```

However, I think you'll find the default usage far nicer, and sufficient for most use cases.

### How does it work?

I thought you'd never ask! Read up on [`valueOf`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/valueOf). That's what's being used here.

In other words, this will work on *any* browser and on *any* javascript engine.
