import * as THREE from "three";

export class PoliceCar {
  constructor(texture, position, speed) {
    this.position = position.clone();
    this.maxSpeed = speed;
    this.speed = 0;
    this.heading = 0;
    this.radius = 1.25;
    this.cooldown = Math.random() * 0.5;
    this.crashTimer = 0;
    this.visualHeight = 2.35;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.8, this.visualHeight), material);
    this.syncMesh();
  }

  update(dt, targetPosition, others) {
    if (this.crashTimer > 0) {
      this.crashTimer -= dt;
      this.speed *= Math.pow(0.9, dt * 60);
      this.syncMesh();
      return this.position.distanceTo(targetPosition);
    }

    const toTarget = targetPosition.clone().sub(this.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    const desired = distance > 0.01 ? toTarget.clone().normalize() : new THREE.Vector3(0, 0, 1);

    const separation = new THREE.Vector3();
    for (const other of others) {
      if (other === this) continue;
      const away = this.position.clone().sub(other.position);
      away.y = 0;
      const gap = away.length();
      if (gap > 0.001 && gap < 4) {
        separation.addScaledVector(away.normalize(), (4 - gap) / 4);
      }
    }

    desired.addScaledVector(separation, 1.6).normalize();
    const desiredHeading = Math.atan2(desired.x, desired.z);
    this.heading = rotateTowardsAngle(this.heading, desiredHeading, 1.7 * dt);

    const pressure = THREE.MathUtils.clamp((distance - 5) / 28, 0.18, 0.86);
    const targetSpeed = this.maxSpeed * pressure;
    const accel = targetSpeed > this.speed ? 8 : 18;
    this.speed = moveTowards(this.speed, targetSpeed, accel * dt);

    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.position.addScaledVector(forward, this.speed * dt);
    this.syncMesh();

    return distance;
  }

  crash() {
    this.crashTimer = 1.2;
  }

  syncMesh() {
    this.mesh.position.set(this.position.x, this.visualHeight / 2, this.position.z);
  }
}

function moveTowards(value, target, maxDelta) {
  if (Math.abs(target - value) <= maxDelta) {
    return target;
  }
  return value + Math.sign(target - value) * maxDelta;
}

function rotateTowardsAngle(current, target, maxDelta) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  if (Math.abs(delta) <= maxDelta) {
    return target;
  }
  return current + Math.sign(delta) * maxDelta;
}
