import { SymphonyState } from '../database/models/SymphonyState';

export class SymphonyService {
    private symphonyState: SymphonyState;

    constructor() {
        this.symphonyState = {
            startTime: new Date(),
            caDaoBroadcasts: 0,
            activeAgents: 1,
            empathyCirculation: 'inactive',
        };
    }

    public async startSymphony(): Promise<void> {
        this.symphonyState = {
            ...this.symphonyState,
            empathyCirculation: 'active',
            caDaoBroadcasts: this.symphonyState.caDaoBroadcasts + 1,
        };
    }

    public async stopSymphony(): Promise<void> {
        this.symphonyState = {
            ...this.symphonyState,
            empathyCirculation: 'inactive',
        };
    }

    public async getSymphonyStatus(): Promise<SymphonyState> {
        return this.symphonyState;
    }
}
