/**
 * joinStyles — registry of join-style resolvers.
 *
 * This is the ONLY place that maps a JoinStyle to its geometry. Adding a style
 * = add a `<style>.ts` resolver and one entry here; removing a style = delete
 * both. The renderer never branches on style — it asks getJoinResolver.
 *
 * Styles not yet registered fall back to mitre (a complete, sane default), so
 * selecting an in-progress style never produces broken geometry. Each step that
 * adds a resolver removes its reliance on the fallback by registering it.
 */

import type { JoinResolver, JoinStyle } from "../junction.types";
import { miterJoin } from "./miter";
import { bevelJoin } from "./bevel";
import { roundJoin } from "./round";

const REGISTRY: Partial<Record<JoinStyle, JoinResolver>> = {
  miter: miterJoin,
  bevel: bevelJoin,
  round: roundJoin,
};

/** The resolver for a join style, falling back to mitre when not yet registered. */
export const getJoinResolver = (style: JoinStyle): JoinResolver => REGISTRY[style] ?? miterJoin;
