/* Card text presentation. The engine reads the complete printed rules (c.rules);
   this file only derives what to show: a compact face that keeps every operative
   word, and a detail panel that adds each keyword's reminder once plus flavor. */

// Keywords whose parenthetical reminder can leave the card face. A reminder is only
// moved when it follows one of these keywords (or quotes one) AND reads like that
// keyword's standard explanation; any other parenthetical stays on the face.
const KEYWORD=/(shield trigger|double breaker|triple breaker|crew breaker\s*[—-]\s*[a-z ]+?|power attacker \+\d+|speed attacker|(?:[a-z]+ (?:and [a-z]+ )?)?blocker|(?:[a-z]+ (?:and [a-z]+ )?)?slayer|[a-z]+ stealth|survivor|silent skill|wave striker|charger|turbo rush)$/i;
const QUOTED_KEYWORD=/"\s*(shield trigger|double breaker|triple breaker|power attacker \+\d+|speed attacker|blocker|slayer)\s*[.,]?\s*"/gi;
const REMINDER=[
  /\bbreaks? (?:\d+|one more) shields?\b/,
  /\btap (?:this creature|a creature that has blocker) to stop the attack\b/,
  /\bchange the attack target of your opponent's creature to this creature\b/,
  /\bwhile attacking, .*gets \+\d+ power\b/,/\bgets \+\d+ power while attacking\b/,
  /\bput into your hand from your shield zone, you may\b/,
  /\bis put into your mana zone tapped\b/,
  /\beach of your survivors has this creature's ability\b/,
  /\bat the start of each of your turns, if this creature is tapped\b/,
  /\bother creatures in the battle zone have wave striker\b/,
  /\bdoesn't get summoning sickness\b/,
  /\bafter you cast this spell, put it into your mana zone\b/,
  /\bif any of your other creatures broke any shields this turn\b/,
  /\bdestroy the other creature\b/,
  /\bcan't be blocked while your opponent has any \w+ cards in his mana zone\b/
];
// OCR-era spacing such as `opponent 's` or `" slayer."` reads badly at small sizes.
// Quotes are paired in order, so `say "A " or " B"` becomes `say "A" or "B"`.
const tidyQuotes=t=>{let open=false;return t.replace(/\s*"\s*/g,(m,i)=>{open=!open;
  const before=/^\s/.test(m)&&open?' ':'',after=/\s$/.test(m)&&!open?' ':'';return before+'"'+after})};
const tidyText=t=>tidyQuotes(String(t).replace(/\s+'s\b/g,"'s").replace(/s '(?=\s)/g,"s'"))
  .replace(/\s*—\s*/g,' — ').replace(/\(\s+/g,'(').replace(/\s+([.,)])/g,'$1').replace(/\s+/g,' ')
  // also "non- evolution", "owners'hands", and sentences starting in lower case after a full stop:
  // every view of a card (its face, the zoom view, prompts) reads the tidied text
  .replace(/\bnon- /g,'non-').replace(/s'(?=[a-z])/g,"s' ").replace(/([.!?] )([a-z])/g,(m,a,b)=>a+b.toUpperCase()).trim();
const reminderKey=t=>tidyText(t).toLowerCase().replace(/"/g,'');
const capital=t=>t.charAt(0).toUpperCase()+t.slice(1);

// Splits a rule into plain text and top-level parentheticals, honouring nesting.
function ruleSegments(rule){
  const out=[];let depth=0,start=0;
  for(let i=0;i<rule.length;i++){
    if(rule[i]==='('){if(depth===0){out.push({text:rule.slice(start,i)});start=i+1}depth++}
    else if(rule[i]===')'&&depth>0&&--depth===0){out.push({text:rule.slice(start,i),paren:true});start=i+1}
  }
  if(depth>0)return [{text:rule}]; // unbalanced OCR text: keep it whole
  out.push({text:rule.slice(start)});
  return out.filter(s=>s.paren||s.text.trim());
}
// Returns the keyword a parenthetical explains, or null when it is operative text.
function reminderTerm(head,paren){
  const body=reminderKey(paren);
  if(!REMINDER.some(r=>r.test(body)))return null;
  const h=tidyText(head).replace(/[\s".,]+$/,'');
  if(!h)return /mana zone tapped/.test(body)?'Multicolored':null;
  const own=KEYWORD.exec(h);
  if(own)return capital(own[1].replace(/\s+/g,' '));
  const quoted=[...h.matchAll(QUOTED_KEYWORD)].pop();
  return quoted?capital(quoted[1].toLowerCase()):null;
}
// face: compact lines for the card. rules: [{text, reminders:[{term,text}]}] for the
// detail panel, one entry per face line, where each distinct reminder appears once.
// flavor: narrative only, never an ability.
function cardTextView(c){
  const face=[],rules=[],seen=new Set();
  for(const printed of c.rules||[]){
    // Keyword lines separated only by their reminders become separate lines.
    const lines=[];let line='',head='',reminders=[];
    const close=()=>{if(line.trim()||reminders.length)lines.push({text:line.trim(),reminders});line='';reminders=[]};
    for(const s of ruleSegments(printed)){
      if(!s.paren){head=s.text;line+=(line&&!/\s$/.test(line)&&!/^\s/.test(s.text)?' ':'')+s.text;continue}
      const term=reminderTerm(head,s.text);head='';
      if(!term){line+=(line?' ':'')+'('+s.text+')';continue}
      const key=reminderKey(s.text);
      if(!seen.has(key)){seen.add(key);reminders.push({term,text:tidyText(s.text)})}
      close();
    }
    close();
    // A reminder inside quotes (has " Blocker (...) ") leaves only the closing quote behind.
    for(let i=lines.length-1;i>0;i--)if(/^["'.,;:]/.test(lines[i].text)){
      lines[i-1].text+=(/^"\s*[a-z]/i.test(lines[i].text)?' ':'')+lines[i].text;lines[i-1].reminders.push(...lines[i].reminders);lines.splice(i,1)}
    for(const l of lines){l.text=tidyText(l.text);if(l.text)face.push(l.text);rules.push(l)}
  }
  const flavor=(typeof window!=='undefined'&&window.CARD_FLAVOR&&window.CARD_FLAVOR[c.archiveId])||'';
  return {face,rules,flavor};
}
