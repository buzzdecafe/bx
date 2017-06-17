import {Ray, Point} from './types';
import {firstStep, exit, edge} from './step';

const of = Point.PointOf;

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

