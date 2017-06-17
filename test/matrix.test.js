import test from 'ava';
import matrix from '../src/matrix';

test('matrix is a function', t => {
  t.is(typeof matrix, 'function')
});

test('matrix takes two numbers are returns HTMLElement', t => {
  const m5 = matrix(5, 5);
  t.is(m5 instanceof HTMLElement, true); 
});

test('matrix root element is class "board"', t => {
  const m = matrix(10, 10);
  t.is(m.className, 'board'); 
});

test('matrix contains width * height cells', t => {
  t.is(matrix(8, 7).querySelectorAll('.cell').length, 56); 
  t.is(matrix(5, 5).querySelectorAll('.cell').length, 25); 
  t.is(matrix(10, 10).querySelectorAll('.cell').length, 100); 
});

