use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    env,
    fs,
    io::{BufRead, BufReader},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfoRequest {
    url: String,
    #[serde(flatten)]
    tools: VideoToolPaths,
    #[serde(default)]
    cookies_file: String,
    #[serde(default)]
    cookies_browser: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadTask {
    id: String,
    url: String,
    #[serde(flatten)]
    tools: VideoToolPaths,
    #[serde(default)]
    quality: String,
    #[serde(rename = "type", default)]
    media_type: String,
    #[serde(default)]
    subtitles: bool,
    #[serde(default)]
    subtitle_lang: String,
    #[serde(default)]
    output_dir: String,
    #[serde(default)]
    cookies_file: String,
    #[serde(default)]
    cookies_browser: String,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VideoToolPaths {
    yt_dlp_path: String,
    ffmpeg_path: String,
    ffprobe_path: String,
}

struct ValidatedTools {
    yt_dlp: PathBuf,
    ffmpeg: PathBuf,
    ffprobe: PathBuf,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    title: String,
    duration: f64,
    thumbnail: String,
    webpage_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    id: String,
    status: String,
    progress: Option<f64>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    id: String,
    output_dir: String,
}

fn hide_window(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
}

fn validate_tool(path: &str, expected_name: &str, label: &str) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err(format!("请在工具设置中选择 {expected_name}。"));
    }

    let path = PathBuf::from(path);
    if !path.is_file() {
        return Err(format!("{label} 工具路径不存在：{}", path.display()));
    }

    let file_name = path.file_name().and_then(|name| name.to_str()).unwrap_or_default();
    if !file_name.eq_ignore_ascii_case(expected_name) {
        return Err(format!("{label} 文件名必须是 {expected_name}。"));
    }

    Ok(path)
}

fn validate_tools(paths: &VideoToolPaths) -> Result<ValidatedTools, String> {
    Ok(ValidatedTools {
        yt_dlp: validate_tool(&paths.yt_dlp_path, "yt-dlp.exe", "yt-dlp")?,
        ffmpeg: validate_tool(&paths.ffmpeg_path, "ffmpeg.exe", "FFmpeg")?,
        ffprobe: validate_tool(&paths.ffprobe_path, "ffprobe.exe", "FFprobe")?,
    })
}

fn configure_media_path(command: &mut Command, tools: &ValidatedTools) -> Result<(), String> {
    let mut paths = Vec::new();
    if let Some(path) = tools.ffmpeg.parent() {
        paths.push(path.to_path_buf());
    }
    if let Some(path) = tools.ffprobe.parent()
        && !paths.iter().any(|existing| existing == path)
    {
        paths.push(path.to_path_buf());
    }
    if let Some(path) = env::var_os("PATH") {
        paths.extend(env::split_paths(&path));
    }

    let joined = env::join_paths(paths).map_err(|error| format!("无法配置视频工具 PATH：{error}"))?;
    command
        .env("PATH", joined)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1");
    Ok(())
}

fn base_args() -> Vec<String> {
    vec![
        "--no-update".into(),
        "--encoding".into(),
        "utf-8".into(),
        "--windows-filenames".into(),
    ]
}

fn temp_info_path() -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    env::temp_dir().join(format!("onetool-yt-dlp-{}-{nonce}.json", std::process::id()))
}

fn find_node_runtime() -> Option<PathBuf> {
    if let Some(path) = env::var_os("YTDLP_NODE_PATH").map(PathBuf::from)
        && path.is_file()
    {
        return Some(path);
    }

    #[cfg(windows)]
    let mut command = Command::new("where.exe");
    #[cfg(not(windows))]
    let mut command = Command::new("which");

    command.arg("node");
    hide_window(&mut command);
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .find(|path| path.is_file())
}

fn runtime_args() -> Vec<String> {
    find_node_runtime()
        .map(|path| {
            vec![
                "--js-runtimes".to_string(),
                format!("node:{}", path.to_string_lossy()),
            ]
        })
        .unwrap_or_default()
}

fn cookie_args(browser: &str, file: &str) -> Result<Vec<String>, String> {
    if !browser.is_empty() {
        if !["chrome", "edge", "firefox", "brave", "safari"].contains(&browser) {
            return Err(format!("不支持的 Cookie 浏览器：{browser}"));
        }
        return Ok(vec!["--cookies-from-browser".into(), browser.into()]);
    }

    if file.is_empty() {
        return Ok(Vec::new());
    }
    if !Path::new(file).is_file() {
        return Err(format!("cookies.txt 不存在：{file}"));
    }

    Ok(vec!["--cookies".into(), file.into()])
}

fn normalize_error(output: &str, code: Option<i32>) -> String {
    let text = output.trim();
    let lower = text.to_lowercase();

    if lower.contains("dpapi") {
        return format!("无法解密浏览器 Cookie。请关闭浏览器后重试，或改用 cookies.txt。{text}");
    }
    if lower.contains("could not copy") && lower.contains("cookie") {
        return format!("无法读取浏览器 Cookie。请关闭浏览器后台进程后重试，或改用 cookies.txt。{text}");
    }
    if lower.contains("no supported javascript runtime")
        || lower.contains("javascript runtime")
        || lower.contains("--js-runtimes")
    {
        return format!(
            "系统未找到可用的 Node.js。请安装 Node.js 并加入 PATH，或设置 YTDLP_NODE_PATH。{text}"
        );
    }
    if lower.contains("errno 22") || lower.contains("invalid argument") {
        return format!(
            "yt-dlp 在 Windows 中遇到无效参数或输出句柄错误。请确认工具路径和下载目录有效。{text}"
        );
    }
    if lower.contains("sign in to confirm") || lower.contains("not a bot") {
        return format!("YouTube 需要 Cookie 登录验证：{text}");
    }
    if lower.contains("network")
        || lower.contains("timed out")
        || lower.contains("unable to download")
        || lower.contains("getaddrinfo")
        || lower.contains("connection")
    {
        return format!("网络请求失败：{text}");
    }
    if lower.contains("ffmpeg") || lower.contains("ffprobe") {
        return format!("ffmpeg 处理失败：{text}");
    }

    if text.is_empty() {
        format!("yt-dlp 退出，错误码：{}", code.unwrap_or(-1))
    } else {
        text.to_string()
    }
}

fn video_info_inner(request: VideoInfoRequest) -> Result<VideoInfo, String> {
    if request.url.trim().is_empty() {
        return Err("请输入有效的视频 URL。".into());
    }

    let tools = validate_tools(&request.tools)?;

    let mut args = base_args();
    args.extend(["-j".into(), "--no-playlist".into()]);
    args.extend(runtime_args());
    args.extend(cookie_args(
        &request.cookies_browser,
        &request.cookies_file,
    )?);
    args.push(request.url);

    let mut command = Command::new(&tools.yt_dlp);
    command.args(args);
    configure_media_path(&mut command, &tools)?;
    hide_window(&mut command);
    let info_path = temp_info_path();
    let info_output = fs::File::create(&info_path)
        .map_err(|error| format!("无法创建视频信息临时文件：{error}"))?;
    command
        .stdin(Stdio::null())
        .stdout(Stdio::from(info_output))
        .stderr(Stdio::piped());
    let output = match command.output() {
        Ok(output) => output,
        Err(error) => {
            let _ = fs::remove_file(&info_path);
            return Err(format!("无法启动 yt-dlp：{error}"));
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = fs::remove_file(&info_path);
        return Err(normalize_error(
            &stderr,
            output.status.code(),
        ));
    }

    let info_json = match fs::read(&info_path) {
        Ok(info) => info,
        Err(error) => {
            let _ = fs::remove_file(&info_path);
            return Err(format!("无法读取视频信息临时文件：{error}"));
        }
    };
    let _ = fs::remove_file(&info_path);
    let value: Value = serde_json::from_slice(&info_json)
        .map_err(|error| format!("yt-dlp 返回了无效数据：{error}"))?;

    Ok(VideoInfo {
        title: value["title"].as_str().unwrap_or_default().to_string(),
        duration: value["duration"].as_f64().unwrap_or_default(),
        thumbnail: value["thumbnail"].as_str().unwrap_or_default().to_string(),
        webpage_url: value["webpage_url"]
            .as_str()
            .or_else(|| value["original_url"].as_str())
            .unwrap_or_default()
            .to_string(),
    })
}

fn emit_progress(app: &AppHandle, payload: DownloadProgress) {
    let _ = app.emit("download-progress", payload);
}

fn progress_from_line(line: &str) -> Option<f64> {
    if !line.contains("[download]") {
        return None;
    }
    let percent_at = line.find('%')?;
    line[..percent_at]
        .split_whitespace()
        .next_back()?
        .parse::<f64>()
        .ok()
        .map(|value| value.clamp(0.0, 100.0))
}

fn download_inner(app: &AppHandle, task: DownloadTask) -> Result<DownloadResult, String> {
    if task.id.trim().is_empty() || task.url.trim().is_empty() {
        return Err("下载任务缺少 ID 或 URL。".into());
    }

    let tools = validate_tools(&task.tools)?;

    let output_dir = if task.output_dir.trim().is_empty() {
        app.path().download_dir().map_err(|error| error.to_string())?
    } else {
        PathBuf::from(&task.output_dir)
    };
    fs::create_dir_all(&output_dir)
        .map_err(|error| format!("无法创建下载目录：{error}"))?;

    let mut args = base_args();
    args.extend(["--newline".into(), "--no-playlist".into()]);
    args.extend(runtime_args());
    args.extend(cookie_args(&task.cookies_browser, &task.cookies_file)?);

    if task.media_type == "audio" {
        args.extend(["-f".into(), "bestaudio/best".into()]);
        args.extend(["-x".into(), "--audio-format".into(), "mp3".into()]);
    } else {
        let height = task.quality.parse::<u16>().unwrap_or(720);
        args.extend([
            "-f".into(),
            format!(
                "bestvideo[height<={height}]+bestaudio/best[height<={height}]/best[height<={height}]"
            ),
            "--merge-output-format".into(),
            "mp4".into(),
        ]);
    }

    if task.subtitles {
        args.extend([
            "--write-subs".into(),
            "--write-auto-subs".into(),
            "--sub-langs".into(),
            if task.subtitle_lang.trim().is_empty() {
                "en.*,zh.*".into()
            } else {
                task.subtitle_lang.clone()
            },
            "--convert-subs".into(),
            "srt".into(),
        ]);
    }

    args.extend([
        "-o".into(),
        output_dir
            .join("%(title)s.%(ext)s")
            .to_string_lossy()
            .into_owned(),
        task.url.clone(),
    ]);

    let mut command = Command::new(&tools.yt_dlp);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());
    configure_media_path(&mut command, &tools)?;
    hide_window(&mut command);

    emit_progress(
        app,
        DownloadProgress {
            id: task.id.clone(),
            status: "downloading".into(),
            progress: Some(0.0),
            error: None,
        },
    );

    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(error) => {
            let message = format!("无法启动 yt-dlp：{error}");
            emit_progress(
                app,
                DownloadProgress {
                    id: task.id,
                    status: "error".into(),
                    progress: None,
                    error: Some(message.clone()),
                },
            );
            return Err(message);
        }
    };

    let stderr = child.stderr.take().ok_or("无法读取 yt-dlp 错误输出。")?;

    let stderr_app = app.clone();
    let stderr_id = task.id.clone();
    let stderr_thread = thread::spawn(move || {
        let mut output = String::new();
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            output.push_str(&line);
            output.push('\n');
            if let Some(progress) = progress_from_line(&line) {
                emit_progress(
                    &stderr_app,
                    DownloadProgress {
                        id: stderr_id.clone(),
                        status: "downloading".into(),
                        progress: Some(progress),
                        error: None,
                    },
                );
            }
        }
        output
    });

    let status = child
        .wait()
        .map_err(|error| format!("等待 yt-dlp 结束时失败：{error}"))?;
    let error_output = stderr_thread.join().unwrap_or_default();

    if !status.success() {
        let message = normalize_error(&error_output, status.code());
        emit_progress(
            app,
            DownloadProgress {
                id: task.id,
                status: "error".into(),
                progress: None,
                error: Some(message.clone()),
            },
        );
        return Err(message);
    }

    emit_progress(
        app,
        DownloadProgress {
            id: task.id.clone(),
            status: "completed".into(),
            progress: Some(100.0),
            error: None,
        },
    );

    Ok(DownloadResult {
        id: task.id,
        output_dir: output_dir.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
pub async fn get_video_info(
    request: VideoInfoRequest,
) -> Result<VideoInfo, String> {
    tauri::async_runtime::spawn_blocking(move || video_info_inner(request))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn download_task(
    app: AppHandle,
    task: DownloadTask,
) -> Result<DownloadResult, String> {
    tauri::async_runtime::spawn_blocking(move || download_inner(&app, task))
        .await
        .map_err(|error| error.to_string())?
}
