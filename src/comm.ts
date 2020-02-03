export interface ICommunicationMedium {
    send(subject: string, message: string): void;
    receive(subject: string, callback: (err: Error | null, msg: any) => void): void;
    receiveExclusively(subject: string, callback: (err: Error | null, msg: any) => void): void;
}
export class CommunicationMediumError extends Error {
    private rootCause: Error;
    constructor(message: string, rootCause: Error) {
        super(message); // 'Error' breaks prototype chain here
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = CommunicationMediumError.name; // stack traces display correctly now
        this.rootCause = rootCause;
    }
}
