import test from 'ava';
import {queryOver} from '../src/query';

const ps =[{x: 1, y: 2}, {x: 4, y: 5}, {x: 6, y: 3}, {x: 1, y: 7}, {x: 4, y: 8}] ;

test('queryOver is a function', t => {
  t.is(typeof queryOver, 'function')
});

test('queryOver take a list of points and return a function from Point -> Ray', t => {
  t.is(typeof queryOver(ps), 'function');
});

test('query Point -> Ray function', t => {
  const query = queryOver(ps);
  t.pass();
  // hit
  // reflection
  // exit
});

