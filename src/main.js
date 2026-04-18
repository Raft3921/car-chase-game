import { Game } from "./game.js";
import { InputManager } from "./input.js";
import { UI } from "./ui.js";

const root = document.querySelector("#game-root");
const ui = new UI(root);
const input = new InputManager();
const canvas = ui.canvas;
const game = new Game(canvas, input, ui);

ui.onStart(() => game.chooseDifficulty());
ui.onDifficulty((difficulty) => game.chooseVehicle(difficulty));
ui.onVehicle((vehicle) => game.startIntro(vehicle));
ui.onRestart(() => game.showAttract());

game.showAttract();
