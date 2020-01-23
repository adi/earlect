import { Client, connect } from "ts-nats";
import { Viking } from "./viking";

import pino from "pino";
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

    public static async connect() {
        const hall = new Hall();
        try {
            hall.natsClient = await connect({
                servers: ["nats://127.0.0.1:4222"],
            });
        } catch (e) {
            logger.error(e);
            process.exit(1);
        }
        logger.info("Connected to Hall");
        return hall;
    }

    private static CHALLENGES_QUEUE = "challenges";

    private natsClient!: Client;

    private constructor() {
    }

    public registerViking(viking: Viking) {
        const hall = this;
        hall.natsClient.subscribe(HallMessages.LEADER_SHOUT, (err, msg) => {
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
        hall.natsClient.subscribe(HallMessages.CHALLENGE, (err, msg) => {
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
        }, {queue: Hall.CHALLENGES_QUEUE});
        hall.natsClient.subscribe(HallMessages.CHALLENGE_RUMOUR, (err, msg) => {
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
        hall.natsClient.publish(HallMessages.CHALLENGE, JSON.stringify(challenge));
        hall.natsClient.publish(HallMessages.CHALLENGE_RUMOUR, JSON.stringify(challenge));
    }

    public sendLeaderShout(leaderShout: ILeaderShout) {
        const hall = this;
        hall.natsClient.publish(HallMessages.LEADER_SHOUT, JSON.stringify(leaderShout));
    }

    public receiveCommunicationProblemReport(err: Error) {
        logger.error("Communication Problem reported:");
        logger.error(err);
    }

}
