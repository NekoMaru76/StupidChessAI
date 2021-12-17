let id, moves = [], game;
const log = m => console.log(`Worker #${id}:`, m);
const send = (type, value) => postMessage({
  type, value
});
const promosify = f => new Promise(($, _) => {
  setTimeout(async () => {
    try {
      $(await f());
    } catch (e) {
      _(e);
    }
  });
});
const scores = {
  w: {
    P: -1,
    N: -3,
    B: -3,
    R: -5,
    Q: -9,
    K: -90000000,
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 90000000
  },
  b: {
    P: 1,
    N: 3,
    B: 3,
    R: 5,
    Q: 9,
    K: 90000000,
    p: -1,
    n: -3,
    b: -3,
    r: -5,
    q: -9,
    k: -90000000
  }
};

self.window = self;
onmessage = msg => {
  switch (msg.data.type) {
    case "moves": {
      moves = msg.data.value;

      break;
    }
    case "board": {
      game.load_pgn(msg.data.value);

      break;
    }
    case "id": {
      id = msg.data.value;

      break;
    }
    case "move": {
      check();

      break;
    }
  }
};

function getScore(turn, raw) {
  const captured = game.in_checkmate() ? "k" : raw.captured;

  return scores[turn][turn === "b" ? captured?.toUpperCase() : captured?.toLowerCase()] || 0;
}

function compare(a, b) {
  return a === b ? (Math.random() > .5) : (
    a < b
  );
}

async function check(topScore = 0, current = 0, max = 3, start = Date.now()) {
  let final, iterate = 0;

  current++;

  if (max < current) return { iterate };

  const top = current === 1;

  for (const move of (top ? moves : game?.moves()) || []) {
    iterate++;

    const turn = game.turn();
    const raw = game.move(move);

    if (!raw) continue;

    const score = getScore(turn, raw);
    const { move: leave, iterate: _iterate } = await promosify(() => check(score, current, max, iterate));
    const result = {
      raw, score: score-leave?.score, move: move
    };

    iterate += _iterate;

    game.undo();

    if (!final || compare(topScore-result.score, topScore-final.score))
      final = result;
  }

  if (top)
    send("move", { move: final, iterate, start, end: Date.now() });

  return { move: final, iterate };
}

(async () => {
  for (const [name, url] of Object.entries({
    Chess: "https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.12.0/chess.min.js"
  })) {
    const define = f => window[name] = f();

    eval(await fetch(url).then(r => r.text()));
  }

  game = new Chess();

  send("ready");
})();
