import { Audio } from 'expo-av';

let soundObj: Audio.Sound | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

export async function playNotificationSound(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    if (soundObj) {
      await soundObj.stopAsync();
      await soundObj.unloadAsync();
      soundObj = null;
    }
    if (stopTimer) {
      clearTimeout(stopTimer);
      stopTimer = null;
    }
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/blackberry.wav'),
      { shouldPlay: true, volume: 1.0 },
    );
    soundObj = sound;

    stopTimer = setTimeout(async () => {
      try {
        if (soundObj) {
          await soundObj.stopAsync();
          await soundObj.unloadAsync();
          soundObj = null;
        }
      } catch {}
      stopTimer = null;
    }, 2000);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
        sound.unloadAsync();
        soundObj = null;
      }
    });
  } catch {}
}
