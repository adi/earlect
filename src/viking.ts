import crypto from "crypto";
import { EventEmitter } from "events";
import pino from "pino";
const logger = pino();

import { Hall, IChallenge, ILeaderShout } from "./hall";
import { ILeaderWatcher } from "./leader_watcher";

export enum VikingState {
    WANDERER = "Wanderer",
    FOLLOWER = "Follower",
    CHALLENGER = "Challenger",
    LEADER = "Leader",
}

export enum VikingEvent {
    LEADER_SHOUT = "Leader Shout",
    CHALLENGE = "Challenge",
    CHALLENGE_RUMOUR = "Challenge Rumour",
}

export class Viking {

    public static async createInHall(hall: Hall) {
        const viking = new Viking(hall);
        hall.registerViking(viking);
        viking.setLeaderShoutTimeout();
        viking.comm.on(VikingEvent.LEADER_SHOUT, (leaderShout: ILeaderShout) => {
            viking.resetLeaderShoutTimeout();
            if (viking.state === VikingState.WANDERER ||
                viking.state === VikingState.CHALLENGER) {
                viking.setLeaderName(leaderShout.leaderName);
                viking.changeStateTo(VikingState.FOLLOWER);
            } else if (viking.state === VikingState.FOLLOWER) {
                viking.setLeaderName(leaderShout.leaderName);
            } else if (viking.state === VikingState.LEADER && leaderShout.leaderName !== viking.name) {
                logger.debug(`We have another leader '${leaderShout.leaderName}'. Going rogue...`);
                viking.setLeaderName(Viking.NO_LEADER_NAME);
                viking.changeStateTo(VikingState.CHALLENGER);
            }
        });
        viking.comm.on(VikingEvent.CHALLENGE, (challenge: IChallenge) => {
            if (viking.state === VikingState.CHALLENGER) {
                viking.resetChallengeTimeout();
                logger.debug(`I still have ${viking.challengerHP} ...`);
                viking.challengerHP -= challenge.power;
                if (viking.challengerHP <= 0) {
                    logger.debug("... and I lose all my force");
                    viking.changeStateTo(VikingState.FOLLOWER);
                } else {
                    logger.debug("... and I still fight");
                }
            }
        });
        viking.comm.on(VikingEvent.CHALLENGE_RUMOUR, (challenge: IChallenge) => {
            if (viking.state === VikingState.CHALLENGER && viking.name !== challenge.challengerName) {
                logger.debug("Hearing noise of battle...");
                viking.resetChallengeTimeout();
            }
        });
        setInterval(() => {
            if (viking.state === VikingState.LEADER) {
                const leaderShout = { leaderName: viking.name } as ILeaderShout;
                hall.sendLeaderShout(leaderShout);
            }
        }, Viking.LEADER_SHOUT_INTERVAL_MS);
        setInterval(() => {
            if (viking.state === VikingState.CHALLENGER) {
                const challenge = {
                    challengerName : viking.name,
                    power: Viking.generateChallengePower(),
                } as IChallenge;
                hall.sendChallenge(challenge);
            }
        }, Viking.CHALLENGE_SEND_INTERVAL_MS);
        return viking;
    }

    private static INITIAL_HP = 100;
    private static MIN_CHALLENGE_HP = 30;
    private static MAX_CHALLENGE_HP = 50;
    private static LEADER_SHOUT_INTERVAL_MS = 100;
    private static LEADER_SHOUT_TIMEOUT_MS = 2000;
    private static CHALLENGE_SEND_INTERVAL_MS = 100;
    private static CHALLENGE_TIMEOUT_MS = 1000;
    private static NO_LEADER_NAME = "";

    private static generateChallengePower() {
        return Viking.MIN_CHALLENGE_HP
            + Math.floor((Viking.MAX_CHALLENGE_HP - Viking.MIN_CHALLENGE_HP) * Math.random());
    }

    private name = crypto.randomBytes(13).toString("hex");
    private leaderName = Viking.NO_LEADER_NAME;
    private state = VikingState.WANDERER;
    private comm = new EventEmitter();
    private leaderShoutTimeout?: NodeJS.Timeout;
    private challengeTimeout?: NodeJS.Timeout;
    private challengerHP = 0;
    private leaderWatchers = [] as ILeaderWatcher[];

    private constructor(private hall: Hall) {}

    public receiveLeaderShout(leaderShout: ILeaderShout) {
        const viking = this;
        viking.comm.emit(VikingEvent.LEADER_SHOUT, leaderShout);
    }

    public receiveChallenge(challenge: IChallenge) {
        const viking = this;
        if (challenge.challengerName !== viking.name) {
            viking.comm.emit(VikingEvent.CHALLENGE, challenge);
        }
    }

    public receiveChallengeRumour(challenge: IChallenge) {
        const viking = this;
        viking.comm.emit(VikingEvent.CHALLENGE_RUMOUR, challenge);
    }

    public addLeaderWatcher(leaderWatcher: ILeaderWatcher) {
        const viking = this;
        viking.leaderWatchers.push(leaderWatcher);
        if (viking.state === VikingState.LEADER) {
            leaderWatcher.becomeLeader();
        } else {
            leaderWatcher.dropLeader();
        }
    }

    private setLeaderName(leaderName: string) {
        const viking = this;
        viking.leaderName = leaderName;
    }

    private changeStateTo(newState: VikingState) {
        const viking = this;
        logger.debug(`${viking.state} => ${newState}`);
        // Before state change actions
        if (viking.state === VikingState.CHALLENGER) {
            viking.cancelChallengeTimeout();
        } else if (viking.state === VikingState.LEADER) {
            for (const leaderWatcher of viking.leaderWatchers) {
                leaderWatcher.dropLeader();
            }
        }
        // State change
        viking.state = newState;
        // After state change actions
        if (viking.state === VikingState.CHALLENGER) {
            viking.challengerHP = Viking.INITIAL_HP;
            viking.setChallengeTimeout();
        } else if (viking.state === VikingState.LEADER) {
            for (const leaderWatcher of viking.leaderWatchers) {
                leaderWatcher.becomeLeader();
            }
        }
    }

    private setLeaderShoutTimeout() {
        const viking = this;
        viking.leaderShoutTimeout = setTimeout(() => {
            if (viking.state === VikingState.WANDERER
                || viking.state === VikingState.FOLLOWER) {
                logger.debug(viking.state + ": No leader viking around => becoming a Challenger");
                viking.changeStateTo(VikingState.CHALLENGER);
            } else if (viking.state === VikingState.LEADER) {
                logger.debug(viking.state + ": Can't hear any leader shout... Not even my own... Have I been raptured??? => becoming a Wanderer");
                viking.changeStateTo(VikingState.WANDERER);
            }
        }, Viking.LEADER_SHOUT_TIMEOUT_MS);
    }

    private cancelLeaderShoutTimeout() {
        const viking = this;
        if (viking.leaderShoutTimeout) {
            clearTimeout(viking.leaderShoutTimeout);
        }
    }

    private resetLeaderShoutTimeout() {
        const viking = this;
        viking.cancelLeaderShoutTimeout();
        viking.setLeaderShoutTimeout();
    }

    private setChallengeTimeout() {
        const viking = this;
        viking.challengeTimeout = setTimeout(() => {
            logger.debug(viking.state + ": No other viking challenged me => becoming a Leader");
            viking.changeStateTo(VikingState.LEADER);
        }, Viking.CHALLENGE_TIMEOUT_MS);
    }

    private cancelChallengeTimeout() {
        const viking = this;
        if (viking.challengeTimeout) {
            clearTimeout(viking.challengeTimeout);
        }
    }

    private resetChallengeTimeout() {
        const viking = this;
        viking.cancelChallengeTimeout();
        viking.setChallengeTimeout();
    }

}
