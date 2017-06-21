import flyd from 'flyd';
import filter from 'flyd/module/filter';


const getCoords = id => {
  let [_, x, y] = id.split('-');
  return {x: Number(x), y: Number(y)};
};

//--------------------------------
// Stream Transformers and Filters
//--------------------------------

const toCoords = e => {
  let coords = getCoords(e.target.id);
  return {
    x: coords.x,
    y: coords.y,
    src: e.target.id
  };
};

const cellRx = /\bcell\b/;
const isCell = e => cellRx.test(e.target.className);
const isOk = e => e.target.id === 'ok';

const isGrid = n => pt =>  pt.x > 0   && pt.y > 0 && 
                           pt.x < n-1 && pt.y < n-1;

const isCorner = n => pt => 
  (pt.x === 0   && pt.y === 0)   ||
  (pt.x === 0   && pt.y === n-1) ||
  (pt.x === n-1 && pt.y === 0)   ||
  (pt.x === n-1 && pt.y === n-1); 

const isEdge = n => pt => !isGrid(n)(pt) &&! isCorner(n)(pt);

//--------------------------------
// Streams
//--------------------------------

export const clicks = flyd.stream();

const es = flyd.stream(0);

export const edge = filter(isEdge(10), flyd.map(toCoords, filter(isCell, clicks)));

export const edgeCounter = flyd.map(_ => es(es() + 1)(), edge);

export const grid = filter(isGrid(10), flyd.map(toCoords, filter(isCell, clicks))); 

const gs = flyd.stream(0);

export const gridCounter = flyd.map(_ => gs(gs() + 1)(), grid);

export const check = flyd.stream();

export const ok = filter(isOk, flyd.stream());
