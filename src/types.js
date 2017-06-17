import Type from 'union-type';

const isCoord = n => n >= 0 && n <= 9;

export const Point = Type({
  Point: {
    x: isCoord, 
    y: isCoord, 
    src: String
  }
});

export const Ray = Type({
  Hit: [Point],
  Reflection: [Point],
  Exit: [Point, Point]
});

export const Solution = Type({
  Impossible: [],
  Valid     : [String],
  Invalid   : [String]
});

