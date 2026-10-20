// A game against the computer left mid-way (a reload, a closed tab) picks up where it was.
resumeGame().then(ok=>{document.getElementById('boot')?.remove();if(!ok)showStart()});
