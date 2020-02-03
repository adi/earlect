export interface ILeaderWatcher {
    becomeLeader(): void;
    dropLeader(): void;
}
