import { Client, connect, NatsError } from "ts-nats";
import { Viking } from "./viking";

import pino from "pino";
import { setImmediate } from "timers";
import { ICommunicationMedium } from "./comm";
const logger = pino();

export enum HallMessages {
    LEADER_SHOUT = "earlect.leader_shout",
    CHALLENGE = "earlect.challenge",
    CHALLENGE_RUMOUR = "earlect.challenge_rumour",
}

export interface ILeaderShout {
    leaderName: string;
}

export interface IChallenge {
    challengerName: string;
    power: number;
}

export class Hall {
    public static async create(communicationMedium: ICommunicationMedium) {
        const hall = new Hall(communicationMedium);
        return hall;
    }

    private constructor(private communicationMedium: ICommunicationMedium) {}

    public registerViking(viking: Viking) {
        const hall = this;
        hall.communicationMedium.receive(HallMessages.LEADER_SHOUT, (err, msg) => {
            if (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            let leaderShout: ILeaderShout;
            try {
                leaderShout = JSON.parse(msg.data);
            } catch (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            viking.receiveLeaderShout(leaderShout);
        });
        hall.communicationMedium.receiveExclusively(HallMessages.CHALLENGE, (err, msg) => {
            if (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            let challenge: IChallenge;
            try {
                challenge = JSON.parse(msg.data);
            } catch (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            viking.receiveChallenge(challenge);
        });
        hall.communicationMedium.receive(HallMessages.CHALLENGE_RUMOUR, (err, msg) => {
            if (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            let challenge: IChallenge;
            try {
                challenge = JSON.parse(msg.data);
            } catch (err) {
                hall.receiveCommunicationProblemReport(err);
                return;
            }
            viking.receiveChallengeRumour(challenge);
        });
    }

    public sendChallenge(challenge: IChallenge) {
        const hall = this;
        try {
            hall.communicationMedium.send(HallMessages.CHALLENGE, JSON.stringify(challenge));
            hall.communicationMedium.send(HallMessages.CHALLENGE_RUMOUR, JSON.stringify(challenge));
        } catch (err) {
            hall.receiveCommunicationProblemReport(err);
        }
    }

    public sendLeaderShout(leaderShout: ILeaderShout) {
        const hall = this;
        try {
            hall.communicationMedium.send(HallMessages.LEADER_SHOUT, JSON.stringify(leaderShout));
        } catch (err) {
            hall.receiveCommunicationProblemReport(err);
        }
    }

    public receiveCommunicationProblemReport(err: Error) {
        const hall = this;
        logger.error("Communication Problem reported:");
        logger.error(err);
    }

}
