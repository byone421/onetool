import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

window.toolsApi = {
  getVideoInfo: (request) => invoke("get_video_info", { request }),
  downloadTask: (task) => invoke("download_task", { task }),
  selectDownloadDirectory: async () => {
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === "string" ? selected : null;
  },
  selectCookiesFile: async () => {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: [{ name: "Cookies", extensions: ["txt"] }],
    });
    return typeof selected === "string" ? selected : null;
  },
  selectVideoToolFile: async (name) => {
    const selected = await open({
      directory: false,
      multiple: false,
      title: `选择 ${name}`,
      filters: [{ name, extensions: ["exe"] }],
    });
    return typeof selected === "string" ? selected : null;
  },
  onDownloadProgress: (callback) => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listen<YoutubeDownloadProgress>("download-progress", (event) => {
      callback(event.payload);
    }).then((stop) => {
      if (disposed) stop();
      else unlisten = stop;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  },
};
