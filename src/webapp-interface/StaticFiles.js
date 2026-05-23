import path from "path-browserify";

export default class StaticFiles {
  static arrayBufferToBase64(buffer) {
    var binary = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static async readFile(filePath) {
    if (!filePath || filePath === "")
      throw new Error("File path cannot be null or empty");
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        return null;
      }
      const text = await response.clone().text();

      if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
        console.warn("Received HTML instead of file for:", filePath);
        return null;
      }

      return response.arrayBuffer();
    } catch (e) {
      console.log("Something went wrong with file:", filePath, "error =>", e);
      return "";
    }
  }

  static async fileExists(filePath) {
    if (!filePath || filePath === "") {
      console.warn("File path cannot be null or empty");
      return false;
    }
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        return false;
      }
      const text = await response.clone().text();

      if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
        console.warn("Received HTML instead of file for:", filePath);
        return false;
      }

      return true;
    } catch (e) {
      console.log("Something went wrong with file:", filePath, "error =>", e);
      return false;
    }
  }

  static async getFilenameFromStaticFiles(file, directory) {
    // if the filename is null throw
    if (!file || file === "") throw new Error("File cannot be null or empty");
    if (!__dirname || __dirname === "")
      throw new Error("Application dir is empty");

    const appRoot = path.join("", directory);

    // join on the application directory
    const filePath = path.join(appRoot, file);

    // check if the file exists
    const exists = await StaticFiles.fileExists(filePath);

    if (exists) {
      return filePath;
    }

    // console.log(filePath, "file does not exist.");

    // if not return null.
    return null;
  }
}

window.StaticFiles = StaticFiles;