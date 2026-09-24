import RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsWorld {
    public world!: RAPIER.World;
    private tanks: Map<string, RAPIER.RigidBody> = new Map();
    private tankColliders: Map<string, RAPIER.Collider> = new Map();

    async init() {
        await RAPIER.init();
        // Каноничная гравитация для динамичного падения
        const gravity = new RAPIER.Vector3(0.0, -20.0, 0.0);
        this.world = new RAPIER.World(gravity);

        this.createStaticFloor();
    }

    private createStaticFloor() {
        const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
        // Толстая плита пола 300x4x300 на отметке Y=-2.0, чтобы верхняя грань была на Y=0
        const groundCollider = RAPIER.ColliderDesc.cuboid(150.0, 2.0, 150.0)
            .setTranslation(0, -2.0, 0)
            .setFriction(0.6)
            .setRestitution(0.0);
        this.world.createCollider(groundCollider, groundBody);
    }

    public spawnTank(id: string, x: number, y: number, z: number, mass: number = 2200) {
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(x, y, z)
            .setLinearDamping(0.8)
            .setAngularDamping(4.0)
            .setCcdEnabled(true)
            .setAdditionalMass(mass);

        const body = this.world.createRigidBody(bodyDesc);

        // Габариты хитбокса корпуса (~Вайкинг/Хантер)
        const colliderDesc = RAPIER.ColliderDesc.cuboid(1.4, 0.45, 2.2)
            .setTranslation(0, 0.45, 0)
            .setFriction(0.3)
            .setRestitution(0.0);

        const collider = this.world.createCollider(colliderDesc, body);
        this.tanks.set(id, body);
        this.tankColliders.set(id, collider);
    }

    public removeTank(id: string) {
        const body = this.tanks.get(id);
        if (body) {
            this.world.removeRigidBody(body);
            this.tanks.delete(id);
            this.tankColliders.delete(id);
        }
    }

    public applyInputs(id: string, driveInput: number, turnInput: number) {
        const body = this.tanks.get(id);
        if (!body) return;

        const rot = body.rotation();
        // Вектор направления корпуса "Вперёд" из кватерниона
        const forward = {
            x: 2 * (rot.x * rot.z + rot.w * rot.y),
            y: 2 * (rot.y * rot.z - rot.w * rot.x),
            z: 1 - 2 * (rot.x * rot.x + rot.y * rot.y)
        };

        const mass = body.mass();

        // 1. Линейная тяга
        if (driveInput !== 0) {
            const forceMagnitude = mass * 28.0 * driveInput;
            body.applyImpulse({
                x: forward.x * forceMagnitude * (1 / 60),
                y: 0,
                z: forward.z * forceMagnitude * (1 / 60)
            }, true);
        }

        // 2. Вращающий момент (поворот на месте / на ходу)
        if (turnInput !== 0) {
            const torqueMagnitude = mass * 18.0 * -turnInput;
            body.applyTorqueImpulse({ x: 0, y: torqueMagnitude * (1 / 60), z: 0 }, true);
        }
    }

    public step() {
        this.world.step();
    }

    public getTransform(id: string) {
        const body = this.tanks.get(id);
        if (!body) {
            return {
                x: 0, y: 0, z: 0,
                rx: 0, ry: 0, rz: 0, rw: 1,
                vx: 0, vy: 0, vz: 0
            };
        }

        const pos = body.translation();
        const rot = body.rotation();
        const vel = body.linvel();

        return {
            x: Number(pos.x.toFixed(3)),
            y: Number(pos.y.toFixed(3)),
            z: Number(pos.z.toFixed(3)),
            rx: Number(rot.x.toFixed(4)),
            ry: Number(rot.y.toFixed(4)),
            rz: Number(rot.z.toFixed(4)),
            rw: Number(rot.w.toFixed(4)),
            vx: Number(vel.x.toFixed(2)),
            vy: Number(vel.y.toFixed(2)),
            vz: Number(vel.z.toFixed(2))
        };
    }
}