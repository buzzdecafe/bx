import matrix from './matrix';
import {Ray, Point, id} from './types';
import merge from 'ramda/src/merge';

const of = Point.PointOf;

const right = (p) => ({
  left:   merge(p, {x: p.x + 1, y: p.y - 1}),
  center: merge(p, {x: p.x + 1, y: p.y    }),
  right:  merge(p, {x: p.x + 1, y: p.y + 1})
});

const left = (p) => ({
  left:   merge(p, {x: p.x - 1, y: p.y - 1}),
  center: merge(p, {x: p.x - 1, y: p.y    }),
  right:  merge(p, {x: p.x - 1, y: p.y + 1})
});

const down = (p) => ({
  left:   merge(p, {x: p.x - 1, y: p.y + 1}),
  center: merge(p, {x: p.x,     y: p.y + 1}),
  right:  merge(p, {x: p.x + 1, y: p.y + 1})
});

const up = (p) => ({
  left:   merge(p, {x: p.x - 1, y: p.y - 1}),
  center: merge(p, {x: p.x,     y: p.y - 1}),
  right:  merge(p, {x: p.x + 1, y: p.y - 1})
});

right.R = up;
right.L = down;

left.R = up;
left.L = down;

up.R = left;
up.L = right;

down.R = left;
down.L = right;

const error = s => () => { throw s; }

// firstStep :: Point -> Dir 
const firstStep = pt => pt.x === 0 ? right   :
                        pt.x === 9 ? left    :
                        pt.y === 0 ? down    :
                        pt.y === 9 ? up      :
                        error("Invalid step");

// exit :: (Dir, Point) -> Bool
const exit = (dir, pt) => {
  switch (dir) {
    case right: return pt.x === 9;
    case left:  return pt.x === 0;
    case down:  return pt.y === 9;
    case up:    return pt.y === 0;
  }
};

const edge = pt => pt.x === 0 || pt.x === 9 ||
                   pt.y === 0 || pt.y === 9;

// query :: [Point] -> Point -> Ray
export const queryOver = points => entryPt => {
  
  const contains = pt => Boolean(points.find(p => p.x === pt.x && p.y === pt.y));

  const aux = (currentPt, step) => {
    const ns = step(currentPt);
    
    if (exit(step, ns.center)) {
      return Ray.Exit(of(entryPt), of(ns.center));
    }

    if (contains(ns.center)) {
      return Ray.Hit(of(entryPt));
    }

    if (contains(ns.left)) {
      return edge(currentPt) || contains(ns.right) ? 
        Ray.Reflection(of(entryPt)) :
        aux(currentPt, step.L);
    }

    if (contains(ns.right)) {
      return edge(currentPt) ? 
        Ray.Reflection(of(entryPt)) : 
        aux(currentPt, step.R); 
    }

    return aux(ns.center, step);
  };

  return aux(entryPt, firstStep(entryPt));
};

