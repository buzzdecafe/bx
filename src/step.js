import merge from 'ramda/src/merge';

export const right = (p) => ({
  left:   merge(p, {x: p.x + 1, y: p.y - 1}),
  center: merge(p, {x: p.x + 1, y: p.y    }),
  right:  merge(p, {x: p.x + 1, y: p.y + 1})
});

export const left = (p) => ({
  left:   merge(p, {x: p.x - 1, y: p.y - 1}),
  center: merge(p, {x: p.x - 1, y: p.y    }),
  right:  merge(p, {x: p.x - 1, y: p.y + 1})
});

export const down = (p) => ({
  left:   merge(p, {x: p.x - 1, y: p.y + 1}),
  center: merge(p, {x: p.x,     y: p.y + 1}),
  right:  merge(p, {x: p.x + 1, y: p.y + 1})
});

export const up = (p) => ({
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
export const firstStep = pt => pt.x === 0 ? right   :
                               pt.x === 9 ? left    :
                               pt.y === 0 ? down    :
                               pt.y === 9 ? up      :
                               error("Invalid step");

// exit :: (Dir, Point) -> Bool
export const exit = (dir, pt) => {
  switch (dir) {
    case right: return pt.x === 9;
    case left:  return pt.x === 0;
    case down:  return pt.y === 9;
    case up:    return pt.y === 0;
  }
};

// edge :: Point -> Bool
export const edge = pt => pt.x === 0 || pt.x === 9 ||
                          pt.y === 0 || pt.y === 9;

