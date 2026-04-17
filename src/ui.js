import { difficulties, vehicles } from "./config.js";

const screens = {
  title: document.querySelector("#title-screen"),
  difficulty: document.querySelector("#difficulty-screen"),
  vehicle: document.querySelector("#vehicle-screen"),
  intro: document.querySelector("#intro-screen"),
  result: document.querySelector("#result-screen"),
};

export class UI {
  constructor() {
    this.hud = document.querySelector("#hud");
    this.mobileControls = document.querySelector("#mobile-controls");
    this.timeLeft = document.querySelector("#time-left");
    this.policeCount = document.querySelector("#police-count");
    this.tauntCount = document.querySelector("#taunt-count");
    this.arrestFill = document.querySelector("#arrest-fill");
    this.dialogueText = document.querySelector("#dialogue-text");
    this.dialogueButton = document.querySelector("#dialogue-button");
    this.resultKicker = document.querySelector("#result-kicker");
    this.resultTitle = document.querySelector("#result-title");
    this.resultSummary = document.querySelector("#result-summary");

    this.buildDifficultyOptions();
    this.buildVehicleOptions();
  }

  onStart(callback) {
    document.querySelector("#start-button").addEventListener("click", callback);
  }

  onRestart(callback) {
    document.querySelector("#restart-button").addEventListener("click", callback);
  }

  onDifficulty(callback) {
    this.difficultyCallback = callback;
  }

  onVehicle(callback) {
    this.vehicleCallback = callback;
  }

  show(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
    if (screens[name]) screens[name].classList.add("is-active");
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

  buildDifficultyOptions() {
    const container = document.querySelector("#difficulty-options");
    difficulties.forEach((difficulty) => {
      const button = document.createElement("button");
      button.className = "choice-card";
      button.innerHTML = `<strong>${difficulty.label}</strong><span>${difficulty.description}</span>`;
      button.addEventListener("click", () => this.difficultyCallback?.(difficulty));
      container.append(button);
    });
  }

  buildVehicleOptions() {
    const container = document.querySelector("#vehicle-options");
    vehicles.forEach((vehicle) => {
      const button = document.createElement("button");
      button.className = "choice-card";
      button.innerHTML = `<strong>${vehicle.label}</strong><span>${vehicle.description}</span>`;
      button.addEventListener("click", () => this.vehicleCallback?.(vehicle));
      container.append(button);
    });
  }
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
