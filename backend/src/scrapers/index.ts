import type { SourceDefinition } from "./_shared/types";
import { source as ncbr } from "./ncbr";
import { source as ppm } from "./ppm";
import { source as baztol } from "./baztol";
import { source as epo } from "./epo";
import { source as uprp } from "./uprp";
import { source as pbn } from "./pbn";
import { source as pan } from "./pan";
import { source as interreg } from "./interreg";

/** Rejestr źródeł w kolejności uruchamiania przez scrape:all */
export const SOURCES: SourceDefinition[] = [ncbr, baztol, epo, uprp, ppm, pbn, pan, interreg];
