import times from 'ramda/src/times';

var chosen = {};

const k = (x, y) => x + ',' + y;

const exists = (x, y) => chosen[k(x, y)];

const gen = g => parseInt(Math.random() * g, 10) + 1;

const randPt = size => _ => {
  const gridSize = size - 2;
  const x = gen(gridSize);
  const y = gen(gridSize);
  if (exists(x, y)) {
    return randPt(size)();
  }
  chosen[k(x, y)] = true;
  return {x: x, y: y};
}

export default function points(size, marbles) { return  times(randPt(size), marbles); }
