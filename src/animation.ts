import { Clock } from "three";
import { PlayerObject } from "./model";

export interface IAnimation {
	play(player: PlayerObject, time: number): void;
}

export type AnimationFn = (player: PlayerObject, time: number) => void;

export type Animation = AnimationFn | IAnimation;

export function invokeAnimation(animation: Animation, player: PlayerObject, time: number) {
	if (animation instanceof Function) {
		animation(player, time);
	} else {
		// must be IAnimation here
		animation.play(player, time);
	}
}

// This interface is used to control animations
export interface AnimationHandle {
	speed: number;
	paused: boolean;
	progress: number;
	readonly animation: Animation;

	reset(): void;
}

export interface SubAnimationHandle extends AnimationHandle {
	remove(): void;
	resetAndRemove(): void;
}

class AnimationWrapper implements SubAnimationHandle, IAnimation {
	speed: number = 1.0;
	paused: boolean = false;
	progress: number = 0;
	readonly animation: Animation;

	private lastTime: number = 0;
	private started: boolean = false;
	private toResetAndRemove: boolean = false;

	constructor(animation: Animation) {
		this.animation = animation;
	}

	play(player: PlayerObject, time: number) {
		if (this.toResetAndRemove) {
			invokeAnimation(this.animation, player, 0);
			this.remove();
			return;
		}

		let delta: number;
		if (this.started) {
			delta = time - this.lastTime;
		} else {
			delta = 0;
			this.started = true;
		}
		this.lastTime = time;
		if (!this.paused) {
			this.progress += delta * this.speed;
		}
		invokeAnimation(this.animation, player, this.progress);
	}

	reset() {
		this.progress = 0;
	}

	remove() {
		// stub get's overriden
	}

	resetAndRemove() {
		this.toResetAndRemove = true;
	}
}

export class CompositeAnimation implements IAnimation {

	readonly handles: Set<AnimationHandle & IAnimation> = new Set();

	add(animation: Animation): AnimationHandle {
		const handle = new AnimationWrapper(animation);
		handle.remove = () => {
			this.handles.delete(handle);
		};
		this.handles.add(handle);
		return handle;
	}

	play(player: PlayerObject, time: number) {
		this.handles.forEach(handle => handle.play(player, time));
	}
}

export class RootAnimation extends CompositeAnimation implements AnimationHandle {
	speed: number = 1.0;
	progress: number = 0.0;
	readonly clock: Clock = new Clock(true);

	get animation() {
		return this;
	}

	get paused() {
		return !this.clock.running;
	}

	set paused(value) {
		if (value) {
			this.clock.stop();
		} else {
			this.clock.start();
		}
	}

	runAnimationLoop(player: PlayerObject): void {
		if (this.handles.size === 0) {
			return;
		}
		this.progress += this.clock.getDelta() * this.speed;
		this.play(player, this.progress);
	}

	reset() {
		this.progress = 0;
	}
}

export const WalkingAnimation: Animation = (player, time) => {
	const skin = player.skin;

	// Multiply by animation's natural speed
	time *= 8;

	// Leg swing
	skin.leftLeg.rotation.x = Math.sin(time) * 0.5;
	skin.rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.5;

	// Arm swing
	skin.leftArm.rotation.x = Math.sin(time + Math.PI) * 0.5;
	skin.rightArm.rotation.x = Math.sin(time) * 0.5;
	const basicArmRotationZ = Math.PI * 0.02;
	skin.leftArm.rotation.z = Math.cos(time) * 0.03 + basicArmRotationZ;
	skin.rightArm.rotation.z = Math.cos(time + Math.PI) * 0.03 - basicArmRotationZ;

	// Head shaking with different frequency & amplitude
	skin.head.rotation.y = Math.sin(time / 4) * 0.2;
	skin.head.rotation.x = Math.sin(time / 5) * 0.1;

	// Always add an angle for cape around the x axis
	const basicCapeRotationX = Math.PI * 0.06;
	player.cape.rotation.x = Math.sin(time / 1.5) * 0.06 + basicCapeRotationX;
};

export const RunningAnimation: Animation = (player, time) => {
	const skin = player.skin;

	time *= 15;

	// Leg swing with larger amplitude
	skin.leftLeg.rotation.x = Math.cos(time + Math.PI) * 1.3;
	skin.rightLeg.rotation.x = Math.cos(time) * 1.3;

	// Arm swing
	skin.leftArm.rotation.x = Math.cos(time) * 1.5;
	skin.rightArm.rotation.x = Math.cos(time + Math.PI) * 1.5;
	const basicArmRotationZ = Math.PI * 0.1;
	skin.leftArm.rotation.z = Math.cos(time) * 0.1 + basicArmRotationZ;
	skin.rightArm.rotation.z = Math.cos(time + Math.PI) * 0.1 - basicArmRotationZ;

	// Jumping
	player.position.y = Math.cos(time * 2);
	// Dodging when running
	player.position.x = Math.cos(time) * 0.15;
	// Slightly tilting when running
	player.rotation.z = Math.cos(time + Math.PI) * 0.01;

	// Apply higher swing frequency, lower amplitude,
	// and greater basic rotation around x axis,
	// to cape when running.
	const basicCapeRotationX = Math.PI * 0.3;
	player.cape.rotation.x = Math.sin(time * 2) * 0.1 + basicCapeRotationX;

	// What about head shaking?
	// You shouldn't glance right and left when running dude :P
};

export const RotatingAnimation: Animation = (player, time) => {
	player.rotation.y = time;
};