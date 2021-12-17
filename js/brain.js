function chunkify(a, n, balanced) {
  if (n < 2) return [a];

  let len = a.length,
    out = [],
    i = 0,
    size;

  if (len % n === 0) {
    size = Math.floor(len / n);
    while (i < len) {
      out.push(a.slice(i, (i += size)));
    }
  } else if (balanced) {
    while (i < len) {
      size = Math.ceil((len - i) / n--);
      out.push(a.slice(i, (i += size)));
    }
  } else {
    n--;
    size = Math.floor(len / n);
    if (len % size === 0) size--;
    while (i < size * n) {
      out.push(a.slice(i, (i += size)));
    }
    out.push(a.slice(size * n));
  }

  return out;
}

window.Brain = class Brain {
  send(type, message) {
    let i = 0;

    for (const worker of Object.values(this.workers))
      send(
        worker,
        type,
        typeof message === "function"
          ? message(i++, this.workers.length)
          : message
      );
  }
  constructor(board, game, workers, element, data) {
    this.board = board;
    this.workers = workers;
    this.game = game;
    this.data = data;
    this.element = element;
    this.results = {};
  }
  think() {
    const { game } = this;
    const moves = game.moves();
    const split = chunkify(moves, moves.length, true);

    this.results = {};

    this.send("moves", (i) => split[i]);
    this.send("board", game.pgn());
    this.send("move");
  }
  callback(id, move, score, iterate, start, end) {
    const { results, workers, game, element, board } = this;

    results[id] = { move, score };

    const entries = Object.entries(results);

    log(id, `${iterate} iterations, ${(end - start).toLocaleString()}ms`);

    if (entries.length >= Object.values(workers).length) {
      let final;

      for (const [id, { move, score }] of entries) {
        if (move && (!final || final.score < score)) final = { move, score };
      }

      if (final) {
        const r = game.move(final.move, { sloppy: true });

        board.move(`${r.from}-${r.to}`);

        if (r.promotion) board.position(game.fen());

        if (!(game.in_checkmate() || game.in_draw())) {
          this.think();
          //setTimeout(() => this.think(), 500);
        }
      } else console.log(`Board #${element.id} has no move from workers!`);
    }
  }
  move(move) {
    return this.game.move(move);
  }
};
