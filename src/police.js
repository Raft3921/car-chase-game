import * as THREE from "three";

export class PoliceCar {
  constructor(texture, position, speed) {
    this.position = position.clone();
    this.speed = speed;
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
      this.syncMesh();
      return this.position.distanceTo(targetPosition);
    }

    const desired = targetPosition.clone().sub(this.position);
    desired.y = 0;
    const distance = desired.length();
    if (distance > 0.01) {
      desired.normalize();
    }

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

    desired.addScaledVector(separation, 1.4).normalize();
    this.position.addScaledVector(desired, this.speed * dt);
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
