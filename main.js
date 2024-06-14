class Subject {
    _observers = [];
    _name;

    constructor(name) {
        this._name = name;
    }

    next(value) {
        this._observers.forEach(observer => observer(value));
    }

    complete() {
        this._observers = [];
        this._name = null;
    }

    subscribe(observer) {
        this._observers.push(observer);
        return new Subscription(this, observer);
    }

    unsubscribe(observer) {
        this._observers = this._observers.filter(_observer => _observer !== observer)
    }

    pipe(...funcs) {
        let observerable = this;

        funcs.forEach(func => {
            observerable = func(observerable);
        })

        return observerable;
    }
}

class Subscription {
    _subjectInstance;
    _observer;

    constructor (subjectInstance, observer) {
        this._subjectInstance = subjectInstance;
        this._observer = observer;
    }

    unsubscribe() {
        this._subjectInstance.unsubscribe(this._observer);
        this._subjectInstance = null;
        this._observer = null;
    }

}

const pending$ = new Subject('subject1 - pending');

/**
 * Wait to take first element and unsubscribe
 * @returns {Subject}
 */
function first() {
    return function (subject) {
        const newSubject = new Subject('subject2 - first');

        const sub = subject.subscribe((value) => {
            if (newSubject._observers.length === 0) {
                return;
            }

            newSubject.next(value);
            newSubject.complete();
            sub.unsubscribe();
        });

        return newSubject;
    }
}

/**
 * Wait to take nth element and unsubscribe
 * @param {number} number 
 * @returns {Subject}
 */
function take(number) {
    return function (subject) {
        const newSubject = new Subject('subject3 - take');

        let countOfEmittedValue = 0;
        const sub = subject.subscribe(() => {
            
            if (newSubject._observers.length === 0) {
                return;
            }

            
            if (countOfEmittedValue >= number) {
                
                newSubject.complete();
                sub.unsubscribe();
                return;
            }

            newSubject.next();
            ++countOfEmittedValue;
        });

        return newSubject;
    }
}

/**
 * Takes firs value from takeUntilSubject and unsubscribe
 * @param {Subject} takeUntilSubject
 * @returns {Subject}
 */
function takeUntil(takeUntilSubject) {
    return function (subject) {
        const newSubject = new Subject('subject4 - takeUntil');

        const sub2 = subject.subscribe((value) => {
            if (newSubject._observers.length === 0) {
                return;
            }

            newSubject.next(value);
        });

        takeUntilSubject.subscribe(() => {
            sub2.unsubscribe();
            newSubject.complete();
        });
        
        return newSubject;
    }
}

function tap(func) {
    return function (subject) {
        subject.subscribe((value) => 
            func(value)
        );
        return subject;
    }
}

const sub = pending$
    .pipe(
        first(),
        tap((obj) => console.log('[Tap] sub1', obj))
    )
    .subscribe(() => console.log('Sub1 was pinged'));

const sub2 = pending$
    .pipe()
    .subscribe(() => console.log('Sub2 was pinged'));

const sub3 = pending$
    .pipe(take(3))
    .subscribe(() => console.log('Sub3 was pinged'));

const _destroy$ = new Subject();

const sub4 = pending$
    .pipe(takeUntil(_destroy$), tap((obj) => console.log('[Tap] sub4', obj)))
    .subscribe(() => console.log('Sub4 was pinged'));


// console.log(sub);
// console.log(sub2);
// console.log(sub3);

pending$.next({ name: 'Daniil' });

setTimeout(() => sub2.unsubscribe(), 1500);

setTimeout(() => {
    _destroy$.next();
    _destroy$.complete();
}, 3000);

setInterval(() => pending$.next({ name: 'Daniil', age: '22' }), 1000);