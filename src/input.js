export class InputManager {
  constructor() {
    this.keys = new Set();
    this.touch = new Set();
    this.tauntQueued = false;

    window.addEventListener("keydown", (event) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault();
      }
      if (event.code === "Space" && !this.keys.has("Space")) {
        this.tauntQueued = true;
      }
      this.keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });

    document.querySelectorAll("[data-touch]").forEach((button) => {
      const action = button.dataset.touch;
      const hold = (event) => {
        event.preventDefault();
        this.touch.add(action);
        button.classList.add("is-held");
        if (action === "taunt") {
          this.tauntQueued = true;
        }
      };
      const release = (event) => {
        event.preventDefault();
        this.touch.delete(action);
        button.classList.remove("is-held");
      };
      button.addEventListener("pointerdown", hold);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });
  }

  snapshot() {
    const accelerate = this.keys.has("KeyW") || this.keys.has("ArrowUp") || this.touch.has("accelerate");
    const brake = this.keys.has("KeyS") || this.keys.has("ArrowDown") || this.touch.has("brake");
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft") || this.touch.has("left");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight") || this.touch.has("right");
    const taunt = this.tauntQueued;
    this.tauntQueued = false;

    return {
      throttle: (accelerate ? 1 : 0) + (brake ? -0.72 : 0),
      steer: (left ? 1 : 0) + (right ? -1 : 0),
      taunt,
    };
  }
}
