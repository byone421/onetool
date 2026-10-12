import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Input,
  List,
  Modal,
  Progress,
  Select,
  Space,
  Tag
} from 'antd';
import {
  ClearOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { ToolHeader } from './ToolHeader';

const { TextArea } = Input;

type CookieSource = YoutubeCookieBrowser | 'file' | 'none';
type VideoToolKey = keyof VideoToolPaths;

const VIDEO_TOOLS_KEY = 'onetool:video-tool-paths';
const emptyToolPaths: VideoToolPaths = { ytDlpPath: '', ffmpegPath: '', ffprobePath: '' };
const toolFields: Array<{ key: VideoToolKey; label: string; fileName: 'yt-dlp.exe' | 'ffmpeg.exe' | 'ffprobe.exe' }> = [
  { key: 'ytDlpPath', label: 'yt-dlp', fileName: 'yt-dlp.exe' },
  { key: 'ffmpegPath', label: 'FFmpeg', fileName: 'ffmpeg.exe' },
  { key: 'ffprobePath', label: 'FFprobe', fileName: 'ffprobe.exe' }
];

const readToolPaths = (): VideoToolPaths => {
  try {
    const saved = JSON.parse(localStorage.getItem(VIDEO_TOOLS_KEY) ?? '{}') as Partial<VideoToolPaths>;
    return {
      ytDlpPath: typeof saved.ytDlpPath === 'string' ? saved.ytDlpPath : '',
      ffmpegPath: typeof saved.ffmpegPath === 'string' ? saved.ffmpegPath : '',
      ffprobePath: typeof saved.ffprobePath === 'string' ? saved.ffprobePath : ''
    };
  } catch {
    return emptyToolPaths;
  }
};

interface VideoTask {
  id: string;
  url: string;
  title: string;
  duration: number;
  thumbnail: string;
  progress: number;
  status: YoutubeTaskStatus;
  error: string;
}

const statusLabels: Record<YoutubeTaskStatus, string> = {
  queued: '等待',
  loading: '读取',
  downloading: '下载',
  completed: '完成',
  error: '错误'
};

const statusColors: Record<YoutubeTaskStatus, string> = {
  queued: 'default',
  loading: 'processing',
  downloading: 'processing',
  completed: 'success',
  error: 'error'
};

const splitUrls = (input: string): Array<string> =>
  input
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

const createTask = (url: string): VideoTask => ({
  id: `${Date.now()}-${crypto.randomUUID()}`,
  url,
  title: '',
  duration: 0,
  thumbnail: '',
  progress: 0,
  status: 'queued',
  error: ''
});

const formatDuration = (seconds: number): string => {
  if (!seconds) {
    return '--:--';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const YoutubeDownloaderTool = () => {
  const [toolPaths, setToolPaths] = useState<VideoToolPaths>(readToolPaths);
  const [draftToolPaths, setDraftToolPaths] = useState<VideoToolPaths>(toolPaths);
  const [toolSettingsOpen, setToolSettingsOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [cookieSource, setCookieSource] = useState<CookieSource>('firefox');
  const [cookiesFile, setCookiesFile] = useState('');
  const [quality, setQuality] = useState('480');
  const [downloadType, setDownloadType] = useState<YoutubeDownloadType>('video');
  const [subtitles, setSubtitles] = useState(false);
  const [subtitleLang, setSubtitleLang] = useState('en.*,zh.*');
  const [tasks, setTasks] = useState<Array<VideoTask>>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0],
    [selectedTaskId, tasks]
  );
  const pendingTasks = tasks.filter((task) => task.status === 'queued');
  const toolsConfigured = Object.values(toolPaths).every(Boolean);
  const draftToolsConfigured = Object.values(draftToolPaths).every(Boolean);
  const canStart = toolsConfigured && pendingTasks.length > 0 && Boolean(outputDir) && !isQueueRunning;
  const shouldSuggestCookieHelp = /cookie|cookies|bot|sign in|登录|DPAPI/i.test(globalError);
  const shouldSuggestToolSettings = /yt-dlp|ffmpeg|ffprobe|工具路径|文件名/i.test(globalError);

  useEffect(
    () =>
      window.toolsApi.onDownloadProgress((payload) => {
        setTasks((items) =>
          items.map((task) =>
            task.id === payload.id
              ? {
                  ...task,
                  progress: typeof payload.progress === 'number' ? payload.progress : task.progress,
                  status: payload.status,
                  error: payload.error ?? task.error
                }
              : task
          )
        );
      }),
    []
  );

  const updateTask = (id: string, patch: Partial<VideoTask>): void => {
    setTasks((items) => items.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  };

  const getCookieOptions = (): Pick<YoutubeInfoRequest, 'cookiesBrowser' | 'cookiesFile'> => ({
    cookiesBrowser:
      cookieSource !== 'file' && cookieSource !== 'none'
        ? cookieSource
        : '',
    cookiesFile: cookieSource === 'file' ? cookiesFile : ''
  });

  const openToolSettings = (): void => {
    setDraftToolPaths(toolPaths);
    setToolSettingsOpen(true);
  };

  const chooseVideoTool = async (
    key: VideoToolKey,
    fileName: 'yt-dlp.exe' | 'ffmpeg.exe' | 'ffprobe.exe'
  ): Promise<void> => {
    const selected = await window.toolsApi.selectVideoToolFile(fileName);
    if (selected) {
      setDraftToolPaths((current) => ({ ...current, [key]: selected }));
    }
  };

  const saveToolSettings = (): void => {
    localStorage.setItem(VIDEO_TOOLS_KEY, JSON.stringify(draftToolPaths));
    setToolPaths(draftToolPaths);
    setToolSettingsOpen(false);
    setGlobalError('');
  };

  const addTasks = (): void => {
    setGlobalError('');
    const urls = splitUrls(urlInput);

    if (urls.length === 0) {
      setGlobalError('请输入至少一个 URL。');
      return;
    }

    const existingUrls = new Set(tasks.map((task) => task.url));
    const nextTasks = urls.filter((url) => !existingUrls.has(url)).map(createTask);

    if (nextTasks.length === 0) {
      setGlobalError('这些 URL 已经在队列中。');
      return;
    }

    setTasks((items) => [...items, ...nextTasks]);
    setSelectedTaskId((current) => current || nextTasks[0].id);
    setUrlInput('');
  };

  const loadVideoInfo = async (task: VideoTask): Promise<YoutubeVideoInfo> => {
    setGlobalError('');
    updateTask(task.id, { status: 'loading', error: '' });

    try {
      const info = await window.toolsApi.getVideoInfo({
        url: task.url,
        ...toolPaths,
        ...getCookieOptions()
      });
      updateTask(task.id, {
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        status: 'queued'
      });
      return info;
    } catch (error) {
      const message = getErrorMessage(error);
      updateTask(task.id, { status: 'error', error: message });
      setGlobalError(message);
      throw error;
    }
  };

  const fetchSelectedInfo = async (): Promise<void> => {
    if (selectedTask) {
      await loadVideoInfo(selectedTask).catch(() => undefined);
    }
  };

  const fetchAllInfo = async (): Promise<void> => {
    for (const task of tasks) {
      if (!task.title && task.status !== 'downloading' && task.status !== 'completed') {
        await loadVideoInfo(task).catch(() => undefined);
      }
    }
  };

  const chooseOutputDir = async (): Promise<void> => {
    const dir = await window.toolsApi.selectDownloadDirectory();

    if (dir) {
      setOutputDir(dir);
    }
  };

  const chooseCookiesFile = async (): Promise<void> => {
    const file = await window.toolsApi.selectCookiesFile();

    if (file) {
      setCookiesFile(file);
    }
  };

  const startQueue = async (): Promise<void> => {
    if (!canStart) {
      setGlobalError(outputDir ? '没有待下载任务。' : '请选择下载目录。');
      return;
    }

    if (cookieSource === 'file' && !cookiesFile) {
      setGlobalError('请选择 cookies.txt，或把 Cookie 来源改为 Chrome/Edge。');
      setShowCookieHelp(true);
      return;
    }

    setIsQueueRunning(true);
    setGlobalError('');

    for (const task of pendingTasks) {
      let taskInfo = task;

      try {
        updateTask(task.id, { error: '', progress: 0 });

        if (!task.title) {
          const info = await loadVideoInfo(task);
          taskInfo = { ...task, ...info };
        }

        await window.toolsApi.downloadTask({
          id: task.id,
          url: task.url,
          quality,
          type: downloadType,
          subtitles,
          subtitleLang,
          outputDir,
          ...toolPaths,
          ...getCookieOptions()
        });
      } catch (error) {
        const message = getErrorMessage(error);
        updateTask(taskInfo.id, { status: 'error', error: message });
        setGlobalError(message);
      }
    }

    setIsQueueRunning(false);
  };

  const retryTask = (task: VideoTask): void => {
    updateTask(task.id, { progress: 0, status: 'queued', error: '' });
  };

  const removeTask = (taskId: string): void => {
    setTasks((items) => items.filter((task) => task.id !== taskId));
    setSelectedTaskId((current) => {
      if (current !== taskId) {
        return current;
      }

      return tasks.find((task) => task.id !== taskId)?.id ?? '';
    });
  };

  const clearFinished = (): void => {
    setTasks((items) => items.filter((task) => !['completed', 'error'].includes(task.status)));
    setSelectedTaskId((current) => {
      const nextTasks = tasks.filter((task) => !['completed', 'error'].includes(task.status));
      return nextTasks.some((task) => task.id === current) ? current : nextTasks[0]?.id ?? '';
    });
  };

  return (
    <section className="tool-page youtube-downloader-tool">
      <ToolHeader title="油管视频下载" description="批量下载 YouTube 视频、音频和字幕。" />

      <Alert
        className="video-tool-status"
        type={toolsConfigured ? 'success' : 'warning'}
        showIcon
        message={toolsConfigured ? '外部工具已配置' : '请先配置视频工具'}
        description={toolsConfigured ? '将使用已选择的 yt-dlp、FFmpeg 和 FFprobe。' : '需要手动选择 yt-dlp.exe、ffmpeg.exe 和 ffprobe.exe。'}
        action={
          <Button icon={<SettingOutlined />} onClick={openToolSettings}>
            {toolsConfigured ? '工具设置' : '配置工具'}
          </Button>
        }
      />

      {globalError ? (
        <Alert
          action={
            shouldSuggestToolSettings ? (
              <Button size="small" onClick={openToolSettings}>
                重新配置
              </Button>
            ) : shouldSuggestCookieHelp ? (
              <Button
                size="small"
                onClick={() => {
                  setCookieSource('file');
                  setShowCookieHelp(true);
                }}
              >
                改用 cookies.txt
              </Button>
            ) : null
          }
          message={globalError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div className="youtube-grid">
        <div className="youtube-main">
          <Card
            title="URL 队列"
            extra={
              <Button icon={<ClearOutlined />} onClick={clearFinished}>
                清理完成项
              </Button>
            }
          >
            <TextArea
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="每行一个 YouTube URL"
              rows={5}
            />
            <div className="tool-actions">
              <Button type="primary" icon={<PlusOutlined />} onClick={addTasks}>
                加入队列
              </Button>
              <Button icon={<FileSearchOutlined />} disabled={!selectedTask || !toolsConfigured} onClick={() => void fetchSelectedInfo()}>
                获取选中信息
              </Button>
              <Button icon={<FileSearchOutlined />} disabled={tasks.length === 0 || !toolsConfigured} onClick={() => void fetchAllInfo()}>
                获取全部信息
              </Button>
            </div>
          </Card>

          <Card title="下载设置">
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <Input.Search
                value={outputDir}
                readOnly
                enterButton={<FolderOpenOutlined />}
                placeholder="选择下载目录"
                onSearch={() => void chooseOutputDir()}
              />

              <div className="youtube-settings-grid">
                <label>
                  <span>Cookie来源</span>
                  <Select
                    value={cookieSource}
                    options={[
                      { value: 'chrome', label: 'Chrome' },
                      { value: 'edge', label: 'Edge' },
                      { value: 'firefox', label: 'Firefox' },
                      { value: 'brave', label: 'Brave' },
                      { value: 'safari', label: 'Safari' },
                      { value: 'file', label: 'cookies.txt 文件' },
                      { value: 'none', label: '不使用 Cookie' }
                    ]}
                    onChange={setCookieSource}
                  />
                </label>

                <label>
                  <span>类型</span>
                  <Select
                    value={downloadType}
                    options={[
                      { value: 'video', label: '视频' },
                      { value: 'audio', label: '音频 MP3' }
                    ]}
                    onChange={setDownloadType}
                  />
                </label>

                <label>
                  <span>清晰度</span>
                  <Select
                    value={quality}
                    disabled={downloadType === 'audio'}
                    options={[
                      { value: '360', label: '360p' },
                      { value: '480', label: '480p' },
                      { value: '720', label: '720p' },
                      { value: '1080', label: '1080p' }
                    ]}
                    onChange={setQuality}
                  />
                </label>
              </div>

              {cookieSource === 'file' ? (
                <Input.Search
                  value={cookiesFile}
                  readOnly
                  enterButton={<FolderOpenOutlined />}
                  placeholder="选择导出的 cookies.txt"
                  onSearch={() => void chooseCookiesFile()}
                />
              ) : null}

              <Flex wrap gap={12} align="center">
                <Checkbox checked={subtitles} onChange={(event) => setSubtitles(event.target.checked)}>
                  下载字幕
                </Checkbox>
                {subtitles ? (
                  <Input
                    className="youtube-subtitle-input"
                    value={subtitleLang}
                    placeholder="en.*,zh.*"
                    onChange={(event) => setSubtitleLang(event.target.value)}
                  />
                ) : null}
                <Button type="link" onClick={() => setShowCookieHelp(true)}>
                  cookies.txt
                </Button>
              </Flex>

              <Button
                type="primary"
                size="large"
                icon={<DownloadOutlined />}
                disabled={!canStart}
                loading={isQueueRunning}
                onClick={() => void startQueue()}
              >
                开始下载队列
              </Button>
            </Space>
          </Card>
        </div>

        <div className="youtube-side">
          <Card title="预览">
            <div className="youtube-preview">
              {selectedTask?.thumbnail ? (
                <img src={selectedTask.thumbnail} alt="" />
              ) : (
                <div className="youtube-preview-empty">预览</div>
              )}
              <strong>{selectedTask?.title || '未选择视频'}</strong>
              <span>{selectedTask ? formatDuration(selectedTask.duration) : '--:--'}</span>
            </div>
          </Card>

          <Card title={`任务队列 ${tasks.length}`}>
            {tasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="队列为空" />
            ) : (
              <List
                className="youtube-task-list"
                dataSource={tasks}
                renderItem={(task) => (
                  <List.Item
                    className={task.id === selectedTask?.id ? 'selected' : ''}
                    onClick={() => setSelectedTaskId(task.id)}
                    actions={[
                      task.status === 'error' ? (
                        <Button
                          key="retry"
                          type="text"
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={(event) => {
                            event.stopPropagation();
                            retryTask(task);
                          }}
                        />
                      ) : null,
                      <Button
                        key="remove"
                        type="text"
                        size="small"
                        danger
                        disabled={task.status === 'downloading' || task.status === 'loading'}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeTask(task.id);
                        }}
                      >
                        移除
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Flex justify="space-between" gap={8}>
                          <span className="youtube-task-title">{task.title || task.url}</span>
                          <Tag color={statusColors[task.status]}>{statusLabels[task.status]}</Tag>
                        </Flex>
                      }
                      description={
                        <>
                          <Progress percent={Math.round(task.progress)} size="small" status={task.status === 'error' ? 'exception' : undefined} />
                          {task.error ? <div className="youtube-task-error">{task.error}</div> : null}
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </div>
      </div>

      <Modal
        title="视频工具设置"
        open={toolSettingsOpen}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !draftToolsConfigured }}
        onOk={saveToolSettings}
        onCancel={() => setToolSettingsOpen(false)}
      >
        <div className="video-tool-settings">
          {toolFields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <Input.Search
                value={draftToolPaths[field.key]}
                readOnly
                enterButton={<FolderOpenOutlined />}
                placeholder={`选择 ${field.fileName}`}
                onSearch={() => void chooseVideoTool(field.key, field.fileName)}
              />
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        title="获取 cookies.txt"
        open={showCookieHelp}
        okText="使用 cookies.txt 文件"
        cancelText="关闭"
        onCancel={() => setShowCookieHelp(false)}
        onOk={() => {
          setCookieSource('file');
          setShowCookieHelp(false);
        }}
      >
        <ol className="youtube-help-steps">
          <li>在 Chrome 或 Edge 中登录 YouTube，并打开 youtube.com。</li>
          <li>安装浏览器扩展 “Get cookies.txt LOCALLY”。</li>
          <li>在 youtube.com 页面使用扩展导出 cookies.txt。</li>
          <li>回到本工具，把 Cookie 来源改成 “cookies.txt 文件”，然后选择导出的文件。</li>
        </ol>
        <Alert
          message="cookies.txt 等同于你的登录凭据，只保存在本机，不要发给别人，也不要提交到代码仓库。"
          type="warning"
          showIcon
        />
      </Modal>
    </section>
  );
};
