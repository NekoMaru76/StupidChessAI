window.totalBoards = parseInt(prompt(`How many boards?`));
window.totalAIs = parseInt(prompt(`How many AIs you want for each board?`));

window.log = function log(id, msg) {
  console.log(`Main-Worker #${id}:`, msg);
};

window.value = boolean => boolean ? "Yes" : "No";

window.change = function text(data) {
  data.text.innerHTML = `Ready: ${value(data.ready.reduce((a, b) => a && b))}<br />Check: ${value(data.game.in_check())}<br />Checkmate: ${value(data.game.in_checkmate())}<br />Draw: ${value(data.game.in_draw())}<br />Stalemate: ${value(data.game.in_stalemate())}<br />Threefold Repetition: ${value(data.game.in_threefold_repetition())}<br />Sufficient Material: ${value(data.game.insufficient_material())}`;
};

window.send = function send(worker, type, value) {
  worker.postMessage({
    type, value
  });
};

window.onload = () => {
  const boards = [];

  for (let i = 1; i <= totalBoards; i++) {
    const element = document.createElement("div");
    const text = document.createElement("a");

    document.body.appendChild(element);
    document.body.appendChild(text);

    element.style.width = "400px";
    element.id = `board-${i}`;

    const board = Chessboard(element, {
      draggable: false,
      position: "start",
      showNotation: true
    });
    const game = new Chess();
    const workers = {};
    const brain = new Brain(board, game, workers, element);
    const ready = [];
    const data = {
      element, board, ready, text, game, workers
    };

    for (let o = 1; o <= totalAIs; o++) {
      const worker = new Worker("/js/ai.js");
      const id = `${i}=${o}`;

      ready.push(false);
      send(worker, "id", id);

      workers[id] = worker;
      worker.onerror = e => {
        log(id, "Error is happening");
      };
      worker.onmessage = msg => {
        switch (msg.data.type) {
          case "ready": {
            log(id, `Ready!`);

            data.ready[o-1] = true;

            if (data.ready.reduce((a, b) => a && b))
              brain.think();

            break;
          }
          case "move": {
            brain.callback(id, msg.data.value.move?.move, msg.data.value.move?.score, msg.data.value.iterate, msg.data.value.start, msg.data.value.end);

            break;
          }
          case "log": {
            log(id, msg.data.value);

            break;
          }
        }
      };
    }

    setInterval(() => {
      change(data);
    }, 1000);
  }
};
