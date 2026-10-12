export {};

declare global {
  type YoutubeCookieBrowser = "chrome" | "edge" | "firefox" | "brave" | "safari" | "";
  type YoutubeDownloadType = "video" | "audio";
  type YoutubeTaskStatus = "queued" | "loading" | "downloading" | "completed" | "error";

  interface VideoToolPaths {
    ytDlpPath: string;
    ffmpegPath: string;
    ffprobePath: string;
  }

  interface YoutubeInfoRequest extends VideoToolPaths {
    url: string;
    cookiesFile?: string;
    cookiesBrowser?: YoutubeCookieBrowser;
  }

  interface YoutubeVideoInfo {
    title: string;
    duration: number;
    thumbnail: string;
    webpageUrl: string;
  }

  interface YoutubeDownloadTask extends YoutubeInfoRequest {
    id: string;
    quality?: string;
    type?: YoutubeDownloadType;
    subtitles?: boolean;
    subtitleLang?: string;
    outputDir?: string;
  }

  interface YoutubeDownloadProgress {
    id: string;
    status: "downloading" | "completed" | "error";
    progress?: number;
    error?: string;
  }

  interface Window {
    toolsApi: {
      getVideoInfo: (payload: YoutubeInfoRequest) => Promise<YoutubeVideoInfo>;
      downloadTask: (task: YoutubeDownloadTask) => Promise<{ id: string; outputDir: string }>;
      selectDownloadDirectory: () => Promise<string | null>;
      selectCookiesFile: () => Promise<string | null>;
      selectVideoToolFile: (name: "yt-dlp.exe" | "ffmpeg.exe" | "ffprobe.exe") => Promise<string | null>;
      onDownloadProgress: (callback: (payload: YoutubeDownloadProgress) => void) => () => void;
    };
  }
}
