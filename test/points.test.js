import test from 'ava';
import points from '../src/points';

test('points is a function', t => {
  t.is(typeof points, 'function')
});

test('points takes two numbers (size, m) are returns an array of m {x, y} points', t => {
  const ps = points(10, 5);
  ps.forEach(p => {
    t.is(p.hasOwnProperty('x'), true);
    t.is(p.hasOwnProperty('y'), true);
  });

});

