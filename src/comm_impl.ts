import { Client, connect } from "ts-nats";

import { CommunicationMediumError, ICommunicationMedium } from "./comm";

export class NatsCommunicationMedium implements ICommunicationMedium {
    public static async create(servers: string[]) {
        const natsClient = await connect({
            maxReconnectAttempts: -1,
            reconnect: true,
            reconnectTimeWait: 100,
            servers,
            waitOnFirstConnect: true,
        });
        const natsCommunicationMedium = new NatsCommunicationMedium(natsClient);
        return natsCommunicationMedium;
    }
    private constructor(private natsClient: Client) {}

    public send(subject: string, message: string): void {
        const natsCommunicationMedium = this;
        natsCommunicationMedium.natsClient.publish(subject, message);
    }
    public receive(subject: string, callback: (err: Error | null, msg: any) => void): void {
        const natsCommunicationMedium = this;
        natsCommunicationMedium.natsClient.subscribe(subject, (err, msg) => {
            if (err) {
                callback(new CommunicationMediumError("Setting receiveExclusively handler failed", err), undefined);
            } else {
                callback(null, msg);
            }
        });
    }
    public receiveExclusively(subject: string, callback: (err: Error | null, msg: any) => void): void {
        const natsCommunicationMedium = this;
        natsCommunicationMedium.natsClient.subscribe(subject, (err, msg) => {
            if (err) {
                callback(new CommunicationMediumError("Setting receiveExclusively handler failed", err), undefined);
            } else {
                callback(null, msg);
            }
        }, {queue: "NatsCommunicationMedium"});
    }
}

