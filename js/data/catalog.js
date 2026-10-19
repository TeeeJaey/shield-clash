const CATALOG=makeCardCatalog(window.CARD_DATABASE);
const DEFS=CATALOG.filter(c=>c.playable&&c.duelId===c.id);
const DEF=Object.fromEntries(CATALOG.map(c=>[c.id,c]));
const archiveCivilization=c=>CIV[c.e]||{n:'Unspecified',c:'#68717d'};
