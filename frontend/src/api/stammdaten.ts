import { apiGet } from "./client";
import type { Fahrzeug, FunktionDienststunden, FunktionEinsatz, Gruppe } from "./types";

export const holeFahrzeuge = (nurAktive = true) =>
  apiGet<Fahrzeug[]>("/stammdaten/fahrzeuge", { nur_aktive: nurAktive });

export const holeFunktionenEinsatz = (nurAktive = true) =>
  apiGet<FunktionEinsatz[]>("/stammdaten/funktionen-einsatz", { nur_aktive: nurAktive });

export const holeFunktionenDienststunden = (nurAktive = true) =>
  apiGet<FunktionDienststunden[]>("/stammdaten/funktionen-dienststunden", { nur_aktive: nurAktive });

export const holeGruppen = (nurAktive = true) =>
  apiGet<Gruppe[]>("/stammdaten/gruppen", { nur_aktive: nurAktive });
