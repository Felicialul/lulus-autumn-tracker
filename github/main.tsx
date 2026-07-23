import { FormEvent, StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";
import { clearGithubToken, getStoredGithubToken, storeGithubToken, validateGithubToken } from "../lib/github-data-store";

window.__LULU_API_BASE_URL__ = import.meta.env.VITE_API_BASE_URL || "";
window.__LULU_GITHUB_DATA__ = { owner: "Felicialul", repo: "lulus-autumn-data" };

function GithubConnection() {
  const [token, setToken] = useState(getStoredGithubToken());
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [error, setError] = useState("");

  useEffect(() => {
    const invalidate = () => {
      clearGithubToken();
      setConnected(false);
      setChecking(false);
      setError("访问密钥已失效，请重新填写。");
    };
    window.addEventListener("lulu-github-auth-invalid", invalidate);
    if (token) {
      validateGithubToken(token)
        .then(() => setConnected(true))
        .catch(caught => {
          clearGithubToken();
          setError(caught instanceof Error ? caught.message : "连接失败");
        })
        .finally(() => setChecking(false));
    }
    return () => window.removeEventListener("lulu-github-auth-invalid", invalidate);
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError("");
    try {
      await validateGithubToken(token);
      storeGithubToken(token);
      setConnected(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "连接失败");
    } finally {
      setChecking(false);
    }
  }

  if (connected) return <Home />;
  return <main className="github-connect-shell">
    <section className="github-connect-card">
      <div className="github-connect-mark">L</div>
      <span className="section-kicker">LULU&apos;S CAREER OS</span>
      <h1>{checking ? "正在连接私人数据…" : "连接你的私人数据"}</h1>
      <p>投递记录已放在只有你能访问的 GitHub 私有仓库。每台设备首次打开时，只需填写一次访问密钥。</p>
      {!checking && <>
        <ol>
          <li>打开 GitHub 的 Fine-grained tokens 页面并新建密钥</li>
          <li>Repository access 只选择 <b>lulus-autumn-data</b></li>
          <li>Repository permissions → Contents 选择 <b>Read and write</b></li>
        </ol>
        <a className="github-token-link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">去 GitHub 创建访问密钥 ↗</a>
        <form onSubmit={connect}>
          <label htmlFor="github-token">GitHub 访问密钥</label>
          <input id="github-token" type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="github_pat_…" autoComplete="off" required />
          {error && <div className="github-connect-error">{error}</div>}
          <button className="primary" disabled={checking}>{checking ? "正在验证…" : "连接并打开管家"}</button>
        </form>
        <small>密钥仅保存在当前浏览器，不会提交到公开仓库。换手机或电脑时需再填写一次。</small>
      </>}
      {checking && <div className="github-connect-loader" aria-label="正在连接" />}
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GithubConnection />
  </StrictMode>,
);
