import flyd from 'flyd';
import filter from 'flyd/module/filter';
import {id} from './types';


const getCoords = id => {
  let [_, x, y] = id.split('-');
  return {x: Number(x), y: Number(y)};
};

//--------------------------------
// Stream Transformers and Filters
//--------------------------------

const toEdgeCoords = e => {
  let coords = getCoords(e.target.id);
  return {
    x: coords.x,
    y: coords.y,
    id: id(),
    src: e.target.id
  };
};

const toGridCoords = e => {
  let coords = getCoords(e.target.id);
  return {
    x: coords.x,
    y: coords.y,
    src: e.target.id
  };
};


const cellRx = /\bcell\b/;
const isCell = e => cellRx.test(e.target.className);

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

export const edge = filter(isEdge(10), flyd.map(toEdgeCoords, filter(isCell, clicks)));

export const edgeCounter = flyd.map(_ => es(es() + 1)(), edge);

export const grid = filter(isGrid(10), flyd.map(toGridCoords, filter(isCell, clicks))); 

const gs = flyd.stream(0);

export const gridCounter = flyd.map(_ => gs(gs() + 1)(), grid);

export const check = flyd.stream();

