import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { CodeOutlined, FieldTimeOutlined, FileTextOutlined, GlobalOutlined, HomeOutlined, LockOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SearchOutlined, SwapOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Layout, Menu } from "antd";
import { PomodoroTool } from "./PomodoroTool";
import { YoutubeDownloaderTool } from "./YoutubeDownloaderTool";
import { TimestampConverterTool } from "./tools/timestamp/TimestampConverterTool";
import { ColorConverterTool } from "./tools/color/ColorConverterTool";
import { XmlFormatterTool } from "./tools/xml/XmlFormatterTool";
import { SqlFormatterTool } from "./tools/sql/SqlFormatterTool";
import { CronGeneratorTool } from "./tools/cron/CronGeneratorTool";
import { JsonEditorTool } from "./tools/json/JsonEditorTool";
import { JsonFormatterTool } from "./tools/json/JsonFormatterTool";
import { Base64Tool } from "./tools/base64/Base64Tool";
import { JwtDecoderTool } from "./tools/jwt/JwtDecoderTool";
import { RsaKeyGeneratorTool } from "./tools/crypto/RsaKeyGeneratorTool";
import { SmKeyGeneratorTool } from "./tools/crypto/SmKeyGeneratorTool";
import { SymmetricCryptoTool } from "./tools/crypto/SymmetricCryptoTool";
import { TextCompressTool } from "./tools/text/TextCompressTool";
import { TextCompareTool } from "./tools/text/TextCompareTool";
import { Ipv4CidrCalculatorTool } from "./tools/network/Ipv4CidrCalculatorTool";
import "./App.css";
import "./MigratedTools.css";

interface ToolDefinition { id: string; title: string; description: string; categoryId: string; component: ComponentType; }
const toolGroups = [
  { id: "focus", title: "专注", icon: <FieldTimeOutlined /> }, { id: "convert", title: "转换", icon: <SwapOutlined /> },
  { id: "develop", title: "开发", icon: <CodeOutlined /> }, { id: "json", title: "JSON", icon: <FileTextOutlined /> },
  { id: "crypto", title: "加密", icon: <LockOutlined /> }, { id: "text", title: "文本", icon: <FileTextOutlined /> },
  { id: "network", title: "网络", icon: <GlobalOutlined /> }, { id: "video", title: "视频", icon: <VideoCameraOutlined /> },
] as const;
const tools: ToolDefinition[] = [
  ["timestamp", "时间戳转换", "Unix 时间戳与日期时间互转。", "convert", TimestampConverterTool], ["color", "颜色转换", "在 HEX、RGB、HSL 和 CSS 名称之间转换颜色。", "convert", ColorConverterTool],
  ["xml", "XML 编辑", "编辑、校验并以树形结构查看 XML 数据。", "develop", XmlFormatterTool], ["sql", "SQL 格式化", "格式化主流关系型数据库 SQL。", "develop", SqlFormatterTool], ["cron", "Cron 表达式生成器", "生成 Cron 表达式并预览未来运行时间。", "develop", CronGeneratorTool],
  ["json-editor", "JSON 编辑", "编辑、校验并以树形结构查看 JSON 数据。", "json", JsonEditorTool], ["json", "JSON 对比", "格式化、校验并对比两个 JSON 字符串。", "json", JsonFormatterTool],
  ["base64", "BASE64", "文本与 Base64 编码互转。", "crypto", Base64Tool], ["jwt", "JWT", "解析 JWT Header 与 Payload。", "crypto", JwtDecoderTool], ["rsa-keygen", "RSA 密钥生成", "生成 RSA 公钥和私钥。", "crypto", RsaKeyGeneratorTool], ["sm-keygen", "国密密钥生成", "生成 SM2 公钥和私钥。", "crypto", SmKeyGeneratorTool], ["symmetric-crypto", "对称加密", "使用 AES、SM4 或 RC4 加密和解密文本。", "crypto", SymmetricCryptoTool],
  ["text-compress", "文本压缩", "将多行文本压缩成一行。", "text", TextCompressTool], ["text-compare", "文本对比", "比较两个文本并查看差异。", "text", TextCompareTool], ["ipv4-cidr", "IPv4 子网计算器", "解析 IPv4 CIDR 块并计算子网信息。", "network", Ipv4CidrCalculatorTool],
  ["pomodoro", "番茄钟", "用专注与休息交替的节奏完成当前任务。", "focus", PomodoroTool], ["youtube-downloader", "油管视频下载", "批量下载 YouTube 视频、音频和字幕。", "video", YoutubeDownloaderTool],
].map(([id, title, description, categoryId, component]) => ({ id, title, description, categoryId, component })) as ToolDefinition[];
const categoryTitleById = Object.fromEntries(toolGroups.map((group) => [group.id, group.title]));
const HomePage = ({ onSelectTool }: { onSelectTool: (id: string) => void }) => { const [keyword, setKeyword] = useState(""); const filtered = tools.filter((tool) => [tool.title, tool.description, categoryTitleById[tool.categoryId]].join(" ").toLowerCase().includes(keyword.trim().toLowerCase())); return <section className="home-page"><div className="home-toolbar"><div><h1>工具箱</h1><p>{tools.length} 个工具</p></div><Input className="tool-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<SearchOutlined />} allowClear placeholder="搜索工具" /></div>{filtered.length ? <div className="tool-directory">{filtered.map((tool) => <button className="tool-directory-item" key={tool.id} type="button" onClick={() => onSelectTool(tool.id)}><span className="tool-directory-category">{categoryTitleById[tool.categoryId]}</span><strong>{tool.title}</strong><span>{tool.description}</span></button>)}</div> : <Empty description="没有匹配的工具" />}</section>; };
const { Sider, Content } = Layout;
function App() { const [activeKey, setActiveKey] = useState("home"); const [collapsed, setCollapsed] = useState(false); const activeTool = useMemo(() => tools.find((tool) => tool.id === activeKey), [activeKey]); const ToolComponent = activeTool?.component; return <Layout className="app-shell"><Sider className="app-sider" width={260} collapsed={collapsed} theme="light"><div className="app-brand">{collapsed ? "OT" : "OneTool"}<Button aria-label={collapsed ? "展开菜单" : "折叠菜单"} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} size="small" type="text" onClick={() => setCollapsed((value) => !value)} /></div><div className="app-sidebar-scroll"><Menu mode="inline" selectedKeys={[activeKey]} inlineCollapsed={collapsed} items={[{ key: "home", icon: <HomeOutlined />, label: "首页" }, ...toolGroups.map((group) => ({ key: `group-${group.id}`, icon: group.icon, label: group.title, children: tools.filter((tool) => tool.categoryId === group.id).map((tool) => ({ key: tool.id, label: tool.title })) }))]} onClick={({ key }) => setActiveKey(key)} /></div></Sider><Content className="app-content">{ToolComponent ? <ToolComponent /> : <HomePage onSelectTool={setActiveKey} />}</Content></Layout>; }
export default App;
