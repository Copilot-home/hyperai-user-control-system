import { Audio } from 'expo-av';

class AudioService {
    private sound: Audio.Sound | null = null;

    async playSound(uri: string): Promise<void> {
        try {
            if (this.sound) {
                await this.sound.unloadAsync();
            }
            this.sound = new Audio.Sound();
            await this.sound.loadAsync({ uri });
            await this.sound.playAsync();
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    async stopSound(): Promise<void> {
        try {
            if (this.sound) {
                await this.sound.stopAsync();
            }
        } catch (error) {
            console.error('Error stopping sound:', error);
        }
    }

    async unloadSound(): Promise<void> {
        try {
            if (this.sound) {
                await this.sound.unloadAsync();
                this.sound = null;
            }
        } catch (error) {
            console.error('Error unloading sound:', error);
        }
    }
}

export default new AudioService();