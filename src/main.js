import { Game } from "./game.js";
import { InputManager } from "./input.js";
import { UI } from "./ui.js";

const canvas = document.querySelector("#game-canvas");
const input = new InputManager();
const ui = new UI();
const game = new Game(canvas, input, ui);

ui.onStart(() => game.chooseDifficulty());
ui.onDifficulty((difficulty) => game.chooseVehicle(difficulty));
ui.onVehicle((vehicle) => game.startIntro(vehicle));
ui.onRestart(() => game.showAttract());

game.showAttract();
