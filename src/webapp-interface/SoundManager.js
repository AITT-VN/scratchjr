import { dataStoreInstance } from "./ScratchJRDataStore";
import path from "path-browserify";
import StaticFiles from "./StaticFiles";
import OS from "../tablet/OS";

export default class SoundManager {
  constructor() {
    this.currentAudio = {};
  }

  async io_registersound(dir, name) {
    if (!this.currentAudio[name]) {
      const dataUri = await this.io_getAudioData(dir, name);
      this.loadSoundFromDataURI(name, dataUri);
    }
  }

  async io_getAudioData(dir, audioName) {
    console.log("io_getAudioData - looking for sound", dir, audioName);

    // try fishing out of the app directory first - pig.wav
    let filePath = await StaticFiles.getFilenameFromStaticFiles(audioName, dir);
    if (!filePath) {
      // if not pull from the sounds directory
      filePath = await StaticFiles.getFilenameFromStaticFiles(
        audioName,
        "sounds"
      );
    }
    if (!filePath) {
      // if not pull from the scratch document folder.
      console.log("...trying to look in the PROJECTFILE table", audioName);

      let projectDBFile = await dataStoreInstance.readProjectFileAsBase64EncodedString(
        audioName
      );
      if (!projectDBFile) {
        console.log("...WARNING: unable to find: ", audioName);
        return null;
      }
      if (projectDBFile.startsWith("data:")) {
        return projectDBFile;
      }
      const ext = path.extname(audioName).toLowerCase();
      if (ext === ".mp3") return `data:audio/mp3;base64,${projectDBFile}`;
      if (ext === ".wav") return `data:audio/wav;base64,${projectDBFile}`;
      if (ext === ".webm") return `data:audio/wav;base64,${projectDBFile}`;
      return `data:audio/wav;base64,${projectDBFile}`;
    }
    const data = await StaticFiles.readFile(filePath);
    if (!data) {
      console.log(
        "io_getAudioData - could not find on disk",
        audioName,
        filePath
      );
      return null;
    }
    const dataStr = StaticFiles.arrayBufferToBase64(data);
    const extension = path.extname(filePath);
    if (extension === ".mp3") {
      return `data:audio/mp3;base64,${dataStr}`;
    } else if (extension === ".wav") {
      return `data:audio/wav;base64,${dataStr}`;
    }
    else if (extension === ".webm") {
      return `data:audio/wav;base64,${dataStr}`;
    }
    else {
      console.log(
        "io_getAudioData - unknown sound format",
        audioName,
        filePath,
        extension
      );
      return null;
    }
  }

  loadSoundFromDataURI(name, dataUri) {
    if (!dataUri || !name) {
      console.log("loadSoundFromDataURI skipped", name, !!dataUri);
      return;
    }
    let src = dataUri;
    if (!src.startsWith("data:")) {
      const ext = (name.split(".").pop() || "").toLowerCase();
      const mime = ext === "mp3" ? "audio/mp3" : "audio/wav";
      src = `data:${mime};base64,${src}`;
    }
    console.log("loadSoundFromDataURI", name, "srcLen", src.length, "prefix", src.substring(0, 32));
    let audio = new window.Audio(src);
    audio.volume = 0.8; // don't oversaturate the speakers
    audio.onerror = function () {
      console.log("Audio load error for", name, audio.error && audio.error.code, audio.error && audio.error.message);
    };
    audio.onended = function () {
      // we need to tell ScratchJR the sound is done
      // so that it will progress to the next block.
      OS.soundDone(name); // eslint-disable-line no-undef
    };
    this.currentAudio[name] = audio;
  }


  async io_playsound(name) {
    if (!this.playSoundStartTime) {
      this.playSoundStartTime = new Date();
    }
    console.log("io_playsound", name);

    let audioElement = this.currentAudio[name];
    if (!audioElement) {
      // if there is no audio element it might mean that 
      // there sounds haven't loaded yet because of asynchronous 
      // process. So we will try for a few seconds and then quit.
      const timePassed = this.playSoundStartTime.getTime() - new Date().getTime();
      if (timePassed < 2000) {
        // busy wait to not overload the app
        await new Promise(resolve => setTimeout(resolve, 200));
        return this.io_playsound(name);
      }
      this.playSoundStartTime = null;
      console.log(
        "io_playsound: unable to play unregistered sound - skipping",
        name
      );
      // tell scratch the empty sound has finished - otherwise
      // the green blocks will not progress
      setTimeout(function () {
        OS.soundDone(name); // eslint-disable-line no-undef
      }, 1);

      return;
    }
    this.playSoundStartTime = null;

    //https://medium.com/@Jeff_Duke_io/working-with-html5-audio-in-electron-645b2d2202bd

    try {
      let playPromise = audioElement.play();
      // In browsers that don’t yet support this functionality,
      // playPromise won’t be defined.
      if (playPromise !== undefined) {
        playPromise
          .then(function () {
            // Automatic playback started!
          })
          .catch(function (error) {
            // Automatic playback failed.
            // Show a UI element to let the user manually start playback.
            console.log("automatic playback failed", error);
          });
      }
    } catch (e) {
      console.log("could not play sound", e);
    }
  }
}

const soundManagerInstance = new SoundManager();
export { soundManagerInstance };
