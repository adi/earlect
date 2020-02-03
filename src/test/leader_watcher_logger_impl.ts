import { ILeaderWatcher } from "../";

import pino from "pino";
const logger = pino();

export class LeaderWatcherLogger implements ILeaderWatcher {
    public static async create() {
        const leaderWatcherLogger = new LeaderWatcherLogger();
        return leaderWatcherLogger;
    }
    private constructor() {}
    public becomeLeader(): void {
        logger.info("Become Leader");
    }
    public dropLeader(): void {
        logger.info("Drop Leader");
    }
}
