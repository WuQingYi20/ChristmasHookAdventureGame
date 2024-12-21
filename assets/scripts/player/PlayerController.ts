import { _decorator, Component, Node, Vec3, input, Input, EventKeyboard, KeyCode, RigidBody, CCFloat, ERigidBodyType } from 'cc';
const { ccclass, property } = _decorator;

// 玩家状态枚举
export enum PlayerState {
    IDLE,
    RUNNING,
    JUMPING,
    FALLING
}

@ccclass('PlayerController')
export class PlayerController extends Component {
    // 移动相关属性
    @property({ type: CCFloat })
    public moveSpeed: number = 5;

    @property({ type: CCFloat })
    public jumpForce: number = 10;

    @property({ type: CCFloat })
    public gravity: number = -20;

    // 状态控制
    private velocity: Vec3 = new Vec3();
    private isGrounded: boolean = true;
    private canJump: boolean = true;
    private currentState: PlayerState = PlayerState.IDLE;
    private rigidBody: RigidBody | null = null;

    // 输入控制
    private inputDirection: Vec3 = new Vec3();
    private keys: Map<KeyCode, boolean> = new Map();

    // 生命周期方法
    onLoad() {
        this.rigidBody = this.getComponent(RigidBody);
        if (this.rigidBody) {
            // 设置更合适的物理属性
            this.rigidBody.allowSleep = false;
            this.rigidBody.linearDamping = 0.1;
            this.rigidBody.angularDamping = 1;
            // 防止旋转
            this.rigidBody.type = ERigidBodyType.DYNAMIC;
            this.rigidBody.angularFactor = Vec3.ZERO;
        }
        this.initializeInput();
    }

    start() {
        // 初始化其他组件和状态
    }

    update(deltaTime: number) {
        this.handleMovement(deltaTime);
        this.updateState();
        this.applyGravity(deltaTime);
    }

    // 输入处理
    private initializeInput() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: EventKeyboard) {
        this.keys.set(event.keyCode, true);
        if (event.keyCode === KeyCode.SPACE) {
            this.tryJump();
        }
    }

    private onKeyUp(event: EventKeyboard) {
        this.keys.set(event.keyCode, false);
    }

    // 移动逻辑
    private handleMovement(deltaTime: number) {
        this.inputDirection.set(0, 0, 0);

        if (this.keys.get(KeyCode.KEY_A) || this.keys.get(KeyCode.ARROW_LEFT)) {
            this.inputDirection.x -= 1;
        }
        if (this.keys.get(KeyCode.KEY_D) || this.keys.get(KeyCode.ARROW_RIGHT)) {
            this.inputDirection.x += 1;
        }

        // 标准化输入方向
        if (!this.inputDirection.equals(Vec3.ZERO)) {
            this.inputDirection.normalize();
        }

        // 应用移动
        const movement = new Vec3(
            this.inputDirection.x * this.moveSpeed * deltaTime,
            this.velocity.y,
            0
        );

        if (this.rigidBody) {
            const currentVel = new Vec3();
            this.rigidBody.getLinearVelocity(currentVel);
            currentVel.x = movement.x;
            currentVel.y = movement.y;
            this.rigidBody.setLinearVelocity(currentVel);
        } else {
            const currentPos = this.node.position;
            this.node.setPosition(
                currentPos.x + movement.x,
                currentPos.y + movement.y,
                currentPos.z
            );
        }
    }

    private tryJump() {
        if (this.isGrounded && this.canJump) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.canJump = false;
            this.currentState = PlayerState.JUMPING;

            if (this.rigidBody) {
                const currentVel = new Vec3();
                this.rigidBody.getLinearVelocity(currentVel);
                currentVel.y = this.jumpForce;
                this.rigidBody.setLinearVelocity(currentVel);
            }

            // 添加跳跃冷却
            this.scheduleOnce(() => {
                this.canJump = true;
            }, 0.1);
        }
    }

    private applyGravity(deltaTime: number) {
        if (!this.isGrounded && !this.rigidBody) {
            this.velocity.y += this.gravity * deltaTime;
        }
    }

    // 状态更新
    private updateState() {
        if (this.inputDirection.equals(Vec3.ZERO)) {
            if (this.isGrounded) {
                this.currentState = PlayerState.IDLE;
            }
        } else {
            if (this.isGrounded) {
                this.currentState = PlayerState.RUNNING;
            }
        }
    }

    // 碰撞检测
    onBeginContact() {
        this.isGrounded = true;
        if (this.currentState === PlayerState.JUMPING) {
            this.currentState = PlayerState.IDLE;
        }
    }

    // 添加碰撞结束的处理
    onEndContact() {
        this.isGrounded = false;
        if (this.currentState !== PlayerState.JUMPING) {
            this.currentState = PlayerState.FALLING;
        }
    }

    // 清理
    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }
}
