import { difficulties, vehicles } from "./config.js";

export class UI {
  constructor(root) {
    this.root = root;
    this.screens = {};
    this.root.replaceChildren();
    this.canvas = element("canvas", { id: "game-canvas" });
    this.root.append(this.canvas);

    this.createScreens();
    this.createHud();
    this.createMobileControls();
    this.buildDifficultyOptions();
    this.buildVehicleOptions();
  }

  onStart(callback) {
    this.startButton.addEventListener("click", callback);
  }

  onRestart(callback) {
    this.restartButton.addEventListener("click", callback);
  }

  onDifficulty(callback) {
    this.difficultyCallback = callback;
  }

  onVehicle(callback) {
    this.vehicleCallback = callback;
  }

  show(name) {
    Object.values(this.screens).forEach((screen) => screen.classList.remove("is-active"));
    if (this.screens[name]) this.screens[name].classList.add("is-active");
    const playing = name === "play";
    this.hud.hidden = !playing;
    this.mobileControls.hidden = !playing;
  }

  setDialogue(line, buttonLabel = "進む") {
    this.dialogueText.textContent = line;
    this.dialogueButton.textContent = buttonLabel;
  }

  waitDialogue() {
    return new Promise((resolve) => {
      const done = () => {
        this.dialogueButton.removeEventListener("click", done);
        resolve();
      };
      this.dialogueButton.addEventListener("click", done);
    });
  }

  updateHud(state) {
    this.timeLeft.textContent = formatTime(state.remaining);
    this.policeCount.textContent = String(state.policeCount);
    this.tauntCount.textContent = String(state.taunts);
    this.arrestFill.style.width = `${Math.round(state.arrest * 100)}%`;
  }

  showResult({ won, difficulty, taunts, maxPolice, survived }) {
    this.resultKicker.textContent = won ? "逃走成功" : "逃走失敗";
    this.resultTitle.textContent = won ? "逃げ切った！" : "逮捕された";
    this.resultSummary.textContent = `難易度：${difficulty.label} / 生存：${formatTime(survived)} / 煽り：${taunts}回 / 最大パトカー：${maxPolice}台`;
    this.show("result");
  }

  createScreens() {
    const titleBlock = element("div", { className: "title-block" }, [
      element("p", { className: "kicker", text: "ハリボテ3Dカーチェイス" }),
      element("h1", { text: "20時間逃げ切れ！" }),
      element("p", { className: "lead", text: "理不尽な逮捕から逃げ続けろ。煽るほど、追っ手は増える。" }),
    ]);
    this.startButton = element("button", { id: "start-button", className: "primary-button", text: "スタート" });
    titleBlock.append(this.startButton);
    this.screens.title = element("section", { id: "title-screen", className: "screen is-active" }, [titleBlock]);

    this.difficultyOptions = element("div", { id: "difficulty-options", className: "choice-row" });
    this.screens.difficulty = element("section", { id: "difficulty-screen", className: "screen difficulty-screen" }, [
      element("div", { className: "choice-panel" }, [
        element("p", { className: "kicker", text: "難易度選択" }),
        element("h2", { text: "逃げ切る時間を選べ" }),
        this.difficultyOptions,
      ]),
    ]);

    this.vehicleOptions = element("div", { id: "vehicle-options", className: "choice-row vehicle-row" });
    this.screens.vehicle = element("section", { id: "vehicle-screen", className: "screen vehicle-screen" }, [
      element("div", { className: "choice-panel" }, [
        element("p", { className: "kicker", text: "車種選択" }),
        element("h2", { text: "今回の逃走車" }),
        this.vehicleOptions,
      ]),
    ]);

    this.dialogueText = element("p", { id: "dialogue-text", text: "そこの車、止まってください。" });
    this.dialogueButton = element("button", { id: "dialogue-button", className: "primary-button", text: "進む" });
    this.screens.intro = element("section", { id: "intro-screen", className: "screen dialogue-screen" }, [
      element("div", { className: "dialogue-box" }, [this.dialogueText, this.dialogueButton]),
    ]);

    this.resultKicker = element("p", { id: "result-kicker", className: "kicker", text: "逃走終了" });
    this.resultTitle = element("h2", { id: "result-title", text: "ゲームオーバー" });
    this.resultSummary = element("p", { id: "result-summary" });
    this.restartButton = element("button", { id: "restart-button", className: "primary-button", text: "タイトルへ" });
    this.screens.result = element("section", { id: "result-screen", className: "screen result-screen" }, [
      element("div", { className: "result-box" }, [
        this.resultKicker,
        this.resultTitle,
        this.resultSummary,
        this.restartButton,
      ]),
    ]);

    this.root.append(
      this.screens.title,
      this.screens.difficulty,
      this.screens.vehicle,
      this.screens.intro,
      this.screens.result
    );
  }

  createHud() {
    this.timeLeft = element("strong", { id: "time-left", text: "00:00:00;00" });
    this.policeCount = element("strong", { id: "police-count", text: "1" });
    this.tauntCount = element("strong", { id: "taunt-count", text: "0" });
    this.arrestFill = element("span", { id: "arrest-fill" });

    this.hud = element("div", { id: "hud", className: "hud" }, [
      element("div", { className: "hud-cluster" }, [
        hudItem("残り", this.timeLeft),
        hudItem("パトカー", this.policeCount),
        hudItem("煽り", this.tauntCount),
      ]),
      element("div", { className: "arrest-meter", ariaLabel: "逮捕ゲージ" }, [this.arrestFill]),
    ]);
    this.hud.hidden = true;
    this.root.append(this.hud);
  }

  createMobileControls() {
    this.mobileControls = element("div", { id: "mobile-controls", className: "mobile-controls" }, [
      element("div", { className: "steer-controls" }, [
        element("button", { dataTouch: "left", ariaLabel: "左", text: "←" }),
        element("button", { dataTouch: "right", ariaLabel: "右", text: "→" }),
      ]),
      element("div", { className: "drive-controls" }, [
        element("button", { dataTouch: "taunt", ariaLabel: "煽り", className: "taunt-button", text: "煽" }),
        element("button", { dataTouch: "brake", ariaLabel: "ブレーキ", text: "B" }),
        element("button", { dataTouch: "accelerate", ariaLabel: "アクセル", text: "A" }),
      ]),
    ]);
    this.mobileControls.hidden = true;
    this.root.append(this.mobileControls);
  }

  buildDifficultyOptions() {
    difficulties.forEach((difficulty) => {
      const button = element("button", { className: "choice-card" }, [
        element("strong", { text: difficulty.label }),
        element("span", { text: difficulty.description }),
      ]);
      button.addEventListener("click", () => this.difficultyCallback?.(difficulty));
      this.difficultyOptions.append(button);
    });
  }

  buildVehicleOptions() {
    vehicles.forEach((vehicle) => {
      const button = element("button", { className: "choice-card" }, [
        element("strong", { text: vehicle.label }),
        element("span", { text: vehicle.description }),
      ]);
      button.addEventListener("click", () => this.vehicleCallback?.(vehicle));
      this.vehicleOptions.append(button);
    });
  }
}

function hudItem(label, valueElement) {
  return element("div", { className: "hud-item" }, [
    element("span", { text: label }),
    valueElement,
  ]);
}

function element(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.id) node.id = options.id;
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.ariaLabel) node.setAttribute("aria-label", options.ariaLabel);
  if (options.dataTouch) node.dataset.touch = options.dataTouch;
  node.append(...children);
  return node;
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  const frames = Math.floor((Math.max(0, seconds) % 1) * 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)};${pad(frames)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
